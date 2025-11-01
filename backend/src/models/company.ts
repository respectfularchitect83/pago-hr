import pool from '../config/db';

export interface Company {
  id: number;
  slug: string;
  name: string | null;
  address: string | null;
  country: string | null;
  branches: string[];
  logo_url: string | null;
  leave_settings: Record<string, number>;
  subscription_status: string | null;
  primary_contact_email: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

const parseCompanyRow = (row: any): Company => {
  const toArray = (value: any): string[] => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item));
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map((item: unknown) => String(item)) : [];
      } catch (error) {
        return [];
      }
    }
    return [];
  };

  const toRecord = (value: any): Record<string, number> => {
    if (!value) {
      return {};
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      return Object.entries(value).reduce<Record<string, number>>((acc, [key, raw]) => {
        const numeric = Number(raw);
        if (!Number.isNaN(numeric)) {
          acc[key] = numeric;
        }
        return acc;
      }, {});
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return Object.entries(parsed).reduce<Record<string, number>>((acc, [key, raw]) => {
            const numeric = Number(raw);
            if (!Number.isNaN(numeric)) {
              acc[key] = numeric;
            }
            return acc;
          }, {});
        }
      } catch (error) {
        return {};
      }
    }
    return {};
  };

  const metadata = (() => {
    const value = row?.metadata;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch (error) {
        return {};
      }
    }
    return {};
  })();

  return {
    id: Number(row.id),
    slug: String(row.slug),
    name: row.name ?? null,
    address: row.address ?? null,
    country: row.country ?? null,
    branches: toArray(row.branches),
    logo_url: row.logo_url ?? null,
    leave_settings: toRecord(row.leave_settings),
    subscription_status: row.subscription_status ?? null,
    primary_contact_email: row.primary_contact_email ?? null,
    metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export const getCompanyBySlug = async (slug: string): Promise<Company | null> => {
  const result = await pool.query('SELECT * FROM companies WHERE slug = $1 LIMIT 1', [slug.toLowerCase()]);
  if (result.rows.length === 0) {
    return null;
  }
  return parseCompanyRow(result.rows[0]);
};

export const getCompanyById = async (companyId: number): Promise<Company | null> => {
  const result = await pool.query('SELECT * FROM companies WHERE id = $1 LIMIT 1', [companyId]);
  if (result.rows.length === 0) {
    return null;
  }
  return parseCompanyRow(result.rows[0]);
};

export const createCompany = async (
  slug: string,
  name: string,
  options: {
    address?: string;
    country?: string;
    branches?: string[];
    primaryContactEmail?: string;
  } = {}
): Promise<Company> => {
  const result = await pool.query(
    `INSERT INTO companies (slug, name, address, country, branches, primary_contact_email)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     RETURNING *`,
    [
      slug.toLowerCase(),
      name,
      options.address ?? null,
      options.country ?? null,
      JSON.stringify(options.branches ?? []),
      options.primaryContactEmail ?? null,
    ]
  );

  return parseCompanyRow(result.rows[0]);
};

export const updateCompanySettings = async (
  companyId: number,
  payload: {
    name?: string;
    address?: string;
    country?: string;
    branches?: string[];
    logoUrl?: string | null;
    leaveSettings?: Record<string, number>;
    primaryContactEmail?: string | null;
    metadataPatch?: Record<string, string | null>;
  }
): Promise<Company> => {
  const existing = await getCompanyById(companyId);
  if (!existing) {
    throw new Error(`Company ${companyId} not found`);
  }

  const nextBranches = payload.branches ?? existing.branches;
  const nextLeaveSettings = payload.leaveSettings ?? existing.leave_settings;
  const nextMetadata = (() => {
    const current = existing.metadata ?? {};
    if (!payload.metadataPatch) {
      return current;
    }
    const updated = { ...current } as Record<string, unknown>;
    Object.entries(payload.metadataPatch).forEach(([key, value]) => {
      if (value === null) {
        delete updated[key];
      } else {
        updated[key] = value;
      }
    });
    return updated;
  })();

  const result = await pool.query(
    `UPDATE companies
        SET name = $1,
            address = $2,
            country = $3,
            branches = $4::jsonb,
            logo_url = $5,
            leave_settings = $6::jsonb,
            primary_contact_email = $7,
            metadata = $8::jsonb,
            updated_at = NOW()
      WHERE id = $9
      RETURNING *`,
    [
      payload.name ?? existing.name,
      payload.address ?? existing.address,
      payload.country ?? existing.country,
      JSON.stringify(nextBranches),
      payload.logoUrl ?? existing.logo_url,
      JSON.stringify(nextLeaveSettings),
      payload.primaryContactEmail ?? existing.primary_contact_email,
      JSON.stringify(nextMetadata),
      companyId,
    ]
  );

  return parseCompanyRow(result.rows[0]);
};

export const ensureDefaultCompany = async (): Promise<Company> => {
  const existing = await getCompanyBySlug('default');
  if (existing) {
    return existing;
  }
  return createCompany('default', 'PAGO Payroll Solutions', { country: 'South Africa' });
};

export const sanitizeSlug = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
};
