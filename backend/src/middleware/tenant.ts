import { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';
import {
  Company,
  ensureDefaultCompany,
  getCompanyBySlug,
  sanitizeSlug,
} from '../models/company';

export interface TenantContext {
  id: number;
  slug: string;
  company: Company;
}

export interface TenantRequest extends Request {
  tenant?: TenantContext;
}

const DEFAULT_SLUG = process.env.DEFAULT_COMPANY_SLUG || 'default';
const ROOT_APP_DOMAIN = (process.env.ROOT_APP_DOMAIN || 'pago-hr.com').toLowerCase();
const SKIP_PATHS = new Set(['/health', '/metrics']);

const extractSlugFromHost = (hostHeader: string | undefined): string | null => {
  if (!hostHeader) {
    return null;
  }

  const hostWithoutPort = hostHeader.split(':')[0].toLowerCase();

  if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') {
    return null;
  }

  if (hostWithoutPort === ROOT_APP_DOMAIN) {
    return null;
  }

  if (hostWithoutPort.endsWith(`.${ROOT_APP_DOMAIN}`)) {
    const withoutDomain = hostWithoutPort.slice(0, hostWithoutPort.length - ROOT_APP_DOMAIN.length - 1);
    if (!withoutDomain) {
      return null;
    }
    const slugCandidate = withoutDomain.split('.')[0];
    return sanitizeSlug(slugCandidate);
  }

  return null;
};

const extractSlug = (req: Request): string => {
  const headerSlug = (req.headers['x-company-slug'] as string | undefined)?.trim();
  if (headerSlug) {
    const sanitized = sanitizeSlug(headerSlug);
    if (sanitized) {
      return sanitized;
    }
  }

  const querySlug = typeof req.query.company === 'string' ? req.query.company.trim() : '';
  if (querySlug) {
    const sanitized = sanitizeSlug(querySlug);
    if (sanitized) {
      return sanitized;
    }
  }

  const hostSlug = extractSlugFromHost(req.headers.host);
  if (hostSlug) {
    return hostSlug;
  }

  return DEFAULT_SLUG;
};

const shouldBypassTenantResolution = (req: Request): boolean => {
  const fullPath = `${req.baseUrl || ''}${req.path || ''}`;
  if (SKIP_PATHS.has(fullPath)) {
    return true;
  }

  if (fullPath.startsWith('/api/tenants')) {
    return true;
  }

  return false;
};

export const tenantResolver = async (req: TenantRequest, res: Response, next: NextFunction) => {
  if (shouldBypassTenantResolution(req)) {
    return next();
  }

  try {
    const slug = extractSlug(req);

    let company = await getCompanyBySlug(slug);

    if (!company) {
      if (slug === DEFAULT_SLUG) {
        company = await ensureDefaultCompany();
      } else {
        logger.warn('Tenant slug not found', { slug, url: req.originalUrl });
        return res.status(404).json({ error: 'Company not found' });
      }
    }

    req.tenant = {
      id: company.id,
      slug: company.slug,
      company,
    };
    res.locals.company = company;
    res.locals.companyId = company.id;
    res.locals.companySlug = company.slug;

    return next();
  } catch (error) {
    logger.error('Failed to resolve tenant context', {
      error: error instanceof Error ? error.message : error,
      url: req.originalUrl,
    });
    return res.status(500).json({ error: 'Unable to resolve tenant context' });
  }
};
