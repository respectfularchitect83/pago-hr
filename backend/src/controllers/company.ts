import { Request, Response } from 'express';
import pool from '../config/db';
import logger from '../utils/logger';

const DEFAULT_COMPANY = {
  name: 'PAGO Payroll Solutions',
  address: '',
  country: 'South Africa',
  branches: [] as string[],
  logoUrl: undefined as string | undefined,
  leaveSettings: {} as Record<string, number>,
};

let companyTableEnsured = false;
const ensureCompanyTable = async () => {
  if (companyTableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id SERIAL PRIMARY KEY,
      name TEXT,
      address TEXT,
      country TEXT,
      branches JSONB DEFAULT '[]'::jsonb,
      logo_url TEXT,
      leave_settings JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  companyTableEnsured = true;
};

const mapCompanyRow = (row: any) => {
  if (!row) {
    return { ...DEFAULT_COMPANY };
  }

  const branchesRaw = row.branches;
  let branches: string[] = [];
  if (Array.isArray(branchesRaw)) {
    branches = branchesRaw.map((b: any) => String(b));
  } else if (typeof branchesRaw === 'string') {
    try {
      const parsed = JSON.parse(branchesRaw);
      if (Array.isArray(parsed)) {
        branches = parsed.map((b: any) => String(b));
      }
    } catch (error) {
      logger.warn('Failed to parse branches JSON', { error });
    }
  }

  const leaveSettingsRaw = row.leave_settings;
  let leaveSettings: Record<string, number> = {};
  if (leaveSettingsRaw && typeof leaveSettingsRaw === 'object' && !Array.isArray(leaveSettingsRaw)) {
    leaveSettings = Object.keys(leaveSettingsRaw).reduce((acc: Record<string, number>, key) => {
      const value = Number((leaveSettingsRaw as Record<string, unknown>)[key]);
      if (!Number.isNaN(value)) {
        acc[key] = value;
      }
      return acc;
    }, {});
  } else if (typeof leaveSettingsRaw === 'string') {
    try {
      const parsed = JSON.parse(leaveSettingsRaw);
      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([key, value]) => {
          const numeric = Number(value);
          if (!Number.isNaN(numeric)) {
            leaveSettings[key] = numeric;
          }
        });
      }
    } catch (error) {
      logger.warn('Failed to parse leave settings JSON', { error });
    }
  }

  return {
    name: row.name ?? DEFAULT_COMPANY.name,
    address: row.address ?? DEFAULT_COMPANY.address,
    country: row.country ?? DEFAULT_COMPANY.country,
    branches,
    logoUrl: row.logo_url ?? DEFAULT_COMPANY.logoUrl,
    leaveSettings,
  };
};

export const getCompanySettings = async (req: Request, res: Response) => {
  try {
    await ensureCompanyTable();
    const result = await pool.query('SELECT * FROM company_settings ORDER BY id ASC LIMIT 1');
    const company = mapCompanyRow(result.rows[0]);
    res.json(company);
  } catch (error) {
    logger.error('Failed to fetch company settings', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to fetch company settings' });
  }
};

export const updateCompanySettings = async (req: Request, res: Response) => {
  try {
    await ensureCompanyTable();
    const {
      name,
      address,
      country,
      branches,
      logoUrl,
      leaveSettings,
    } = req.body;

    const normalizedName = typeof name === 'string' ? name.trim() : DEFAULT_COMPANY.name;
    const normalizedAddress = typeof address === 'string' ? address : DEFAULT_COMPANY.address;
    const normalizedCountry = typeof country === 'string' ? country : DEFAULT_COMPANY.country;
    const normalizedBranches = Array.isArray(branches)
      ? branches.map(b => String(b).trim()).filter(Boolean)
      : DEFAULT_COMPANY.branches;
    const normalizedLogoUrl = typeof logoUrl === 'string' && logoUrl.trim() !== '' ? logoUrl : undefined;
    const normalizedLeaveSettings = leaveSettings && typeof leaveSettings === 'object' && !Array.isArray(leaveSettings)
      ? Object.entries(leaveSettings).reduce((acc: Record<string, number>, [key, value]) => {
          const numeric = Number(value);
          if (!Number.isNaN(numeric)) {
            acc[key] = numeric;
          }
          return acc;
        }, {})
      : DEFAULT_COMPANY.leaveSettings;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query('SELECT id FROM company_settings ORDER BY id ASC LIMIT 1');

      let row;
      if (existing.rows.length === 0) {
        const insert = await client.query(
          `INSERT INTO company_settings (name, address, country, branches, logo_url, leave_settings)
           VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb)
           RETURNING *`,
          [
            normalizedName,
            normalizedAddress,
            normalizedCountry,
            JSON.stringify(normalizedBranches),
            normalizedLogoUrl ?? null,
            JSON.stringify(normalizedLeaveSettings),
          ]
        );
        row = insert.rows[0];
      } else {
        const update = await client.query(
          `UPDATE company_settings
             SET name = $1,
                 address = $2,
                 country = $3,
                 branches = $4::jsonb,
                 logo_url = $5,
                 leave_settings = $6::jsonb,
                 updated_at = NOW()
           WHERE id = $7
           RETURNING *`,
          [
            normalizedName,
            normalizedAddress,
            normalizedCountry,
            JSON.stringify(normalizedBranches),
            normalizedLogoUrl ?? null,
            JSON.stringify(normalizedLeaveSettings),
            existing.rows[0].id,
          ]
        );
        row = update.rows[0];
      }

      await client.query('COMMIT');
      res.json(mapCompanyRow(row));
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update company settings', { error: error instanceof Error ? error.message : error });
      res.status(500).json({ error: 'Failed to update company settings' });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Failed to process company settings update', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to update company settings' });
  }
};
