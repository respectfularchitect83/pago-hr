import { Response } from 'express';
import logger from '../utils/logger';
import { TenantRequest } from '../middleware/tenant';
import { Company, updateCompanySettings as updateCompanyRecord } from '../models/company';

const DEFAULT_COMPANY = {
  name: 'PAGO Payroll Solutions',
  address: '',
  country: 'South Africa',
  branches: [] as string[],
  logoUrl: undefined as string | undefined,
  leaveSettings: {} as Record<string, number>,
};

const toResponsePayload = (company: Company | undefined) => {
  if (!company) {
    return { ...DEFAULT_COMPANY };
  }

  return {
    name: company.name ?? DEFAULT_COMPANY.name,
    address: company.address ?? DEFAULT_COMPANY.address,
    country: company.country ?? DEFAULT_COMPANY.country,
    branches: company.branches ?? DEFAULT_COMPANY.branches,
    logoUrl: company.logo_url ?? DEFAULT_COMPANY.logoUrl,
    leaveSettings: company.leave_settings ?? DEFAULT_COMPANY.leaveSettings,
  };
};

export const getCompanySettings = async (req: TenantRequest, res: Response) => {
  try {
    const company = req.tenant?.company;
    res.json(toResponsePayload(company));
  } catch (error) {
    logger.error('Failed to fetch company settings', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to fetch company settings' });
  }
};

export const updateCompanySettings = async (req: TenantRequest, res: Response) => {
  try {
    const companyId = req.tenant?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'Tenant context missing' });
    }

    const {
      name,
      address,
      country,
      branches,
      logoUrl,
      leaveSettings,
    } = req.body;

    const normalizedBranches = Array.isArray(branches)
      ? branches.map((branch: unknown) => String(branch).trim()).filter(Boolean)
      : undefined;

    const normalizedLeaveSettings = leaveSettings && typeof leaveSettings === 'object' && !Array.isArray(leaveSettings)
      ? Object.entries(leaveSettings).reduce<Record<string, number>>((acc, [key, value]) => {
          const numeric = Number(value);
          if (!Number.isNaN(numeric)) {
            acc[key] = numeric;
          }
          return acc;
        }, {})
      : undefined;

    const updated = await updateCompanyRecord(companyId, {
      name: typeof name === 'string' ? name : undefined,
      address: typeof address === 'string' ? address : undefined,
      country: typeof country === 'string' ? country : undefined,
      branches: normalizedBranches,
      logoUrl: typeof logoUrl === 'string' && logoUrl.trim() !== '' ? logoUrl : null,
      leaveSettings: normalizedLeaveSettings,
    });

    // Refresh tenant snapshot for downstream middleware consumers
    if (req.tenant) {
      req.tenant.company = updated;
      res.locals.company = updated;
    }

    res.json(toResponsePayload(updated));
  } catch (error) {
    logger.error('Failed to update company settings', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to update company settings' });
  }
};
