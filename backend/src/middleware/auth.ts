import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { findUserById } from '../models/user';
import { TenantRequest } from './tenant';

export interface AuthRequest extends TenantRequest {
  user?: any;
}

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const payload = decoded as { id: number; role: string; companyId?: number };

    const tenantCompanyId = req.tenant?.id;
    const tokenCompanyId = payload.companyId;

    if (tenantCompanyId && tokenCompanyId && tenantCompanyId !== tokenCompanyId) {
      return res.status(403).json({ error: 'Token does not belong to this company' });
    }

    const user = await findUserById(payload.id, tenantCompanyId ?? tokenCompanyId);

    if (!user) {
      throw new Error();
    }

    if (tenantCompanyId && user.company_id !== tenantCompanyId) {
      return res.status(403).json({ error: 'Access denied for this company' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

export const requireRole = (roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};