import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import pool from '../config/db';
import { sanitizeSlug, getCompanyBySlug } from '../models/company';

interface RegisterTenantBody {
  companyName?: string;
  slug?: string;
  adminEmail?: string;
  password?: string;
  adminFirstName?: string;
  adminLastName?: string;
  country?: string;
}

const deriveSlug = (candidateName?: string, providedSlug?: string): string => {
  const firstCandidate = providedSlug && providedSlug.trim().length > 0 ? providedSlug : candidateName ?? '';
  let normalized = sanitizeSlug(firstCandidate);
  if (!normalized) {
    normalized = `tenant-${Date.now()}`;
  }
  return normalized;
};

export const registerTenant = async (req: Request<unknown, unknown, RegisterTenantBody>, res: Response) => {
  try {
    const {
      companyName,
      slug,
      adminEmail,
      password,
      adminFirstName,
      adminLastName,
      country,
    } = req.body;

    if (!companyName || companyName.trim().length === 0) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    if (!adminEmail || adminEmail.trim().length === 0) {
      return res.status(400).json({ error: 'Admin email is required' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const normalizedSlug = deriveSlug(companyName, slug);
    const existingCompany = await getCompanyBySlug(normalizedSlug);
    if (existingCompany) {
      return res.status(409).json({ error: 'That domain is already in use. Please choose another name.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const companyResult = await client.query(
        `INSERT INTO companies (slug, name, primary_contact_email, country)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          normalizedSlug,
          companyName.trim(),
          adminEmail.trim().toLowerCase(),
          country || 'South Africa',
        ]
      );

      const companyRow = companyResult.rows[0];
      const passwordHash = await bcrypt.hash(password, 10);

      const userResult = await client.query(
        `INSERT INTO users (
            email,
            password,
            role,
            first_name,
            last_name,
            company_id
         ) VALUES ($1, $2, 'admin', $3, $4, $5)
         RETURNING id, email, role, first_name, last_name, company_id, created_at, updated_at` ,
        [
          adminEmail.trim().toLowerCase(),
          passwordHash,
          adminFirstName?.trim() || companyName.trim().split(' ')[0] || 'Admin',
          adminLastName?.trim() || '',
          companyRow.id,
        ]
      );

      const jwtSecret = (process.env.JWT_SECRET ?? '').trim();
      if (!jwtSecret) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'JWT secret is not configured' });
      }

      await client.query('COMMIT');

      const adminUser = userResult.rows[0];
      const payload = {
        id: adminUser.id,
        role: adminUser.role,
        companyId: adminUser.company_id,
      };

      const expiresIn = (process.env.JWT_EXPIRES_IN ?? '12h') as SignOptions['expiresIn'];

      const token = jwt.sign(payload, jwtSecret as Secret, {
        expiresIn,
      });

      res.status(201).json({
        company: {
          id: companyRow.id,
          slug: companyRow.slug,
          name: companyRow.name,
          country: companyRow.country,
        },
        admin: {
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.first_name,
          lastName: adminUser.last_name,
          role: adminUser.role,
        },
        token,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Tenant registration failed', error);
      res.status(500).json({ error: 'Failed to create tenant' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Tenant registration error', error);
    res.status(500).json({ error: 'Failed to register tenant' });
  }
};
