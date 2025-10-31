import { Response } from 'express';
import pool from '../config/db';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import { TenantRequest } from '../middleware/tenant';

// List all users (HR, admin, employees)
export const listUsers = async (req: TenantRequest, res: Response) => {
  try {
    const companyId = req.tenant?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'Tenant context missing' });
    }

    const result = await pool.query(
      'SELECT id, email, role, first_name, last_name, employee_id, department, position, join_date, photo_url, created_at, updated_at FROM users WHERE company_id = $1',
      [companyId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Create a new user (HR, admin, employee)
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.tenant?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'Tenant context missing' });
    }

    const {
      email,
      username,
      password,
      role,
      first_name,
      firstName,
      last_name,
      lastName,
      employee_id,
      employeeId,
      department,
      position,
      join_date,
      joinDate,
      photo_url,
      photoUrl,
    } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const emailSource = (email || username || '').toLowerCase().trim();
    if (!emailSource) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const resolvedFirstName = (first_name || firstName || emailSource.split('@')[0] || 'User').split(/[\s._-]+/)[0];
    const resolvedLastName = last_name || lastName || '';

    const result = await pool.query(
      `INSERT INTO users (email, password, role, first_name, last_name, employee_id, department, position, join_date, photo_url, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        emailSource,
        hashedPassword,
        role || 'hr',
        resolvedFirstName,
        resolvedLastName,
        employee_id || employeeId || null,
        department || null,
        position || null,
        join_date || joinDate || null,
        photo_url || photoUrl || null,
        companyId,
      ]
    );
    const { password: _password, ...user } = result.rows[0];
    res.status(201).json(user);
  } catch (err) {
    if ((err as any)?.code === '23505') {
      return res.status(400).json({ error: 'User already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Get a user by id
export const getUser = async (req: TenantRequest, res: Response) => {
  try {
    const companyId = req.tenant?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'Tenant context missing' });
    }

    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, email, role, first_name, last_name, employee_id, department, position, join_date, photo_url, created_at, updated_at FROM users WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Update a user by id
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.tenant?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'Tenant context missing' });
    }

    const { id } = req.params;
    const {
      email,
      username,
      password,
      role,
      first_name,
      firstName,
      last_name,
      lastName,
      employee_id,
      employeeId,
      department,
      position,
      join_date,
      joinDate,
      photo_url,
      photoUrl,
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let index = 1;

    const resolvedEmail = (email || username || '').toLowerCase().trim();
    if (resolvedEmail) {
      updates.push(`email = $${index++}`);
      values.push(resolvedEmail);
    }

    if (role) {
      updates.push(`role = $${index++}`);
      values.push(role);
    }

    const resolvedFirstName = first_name || firstName;
    if (resolvedFirstName) {
      updates.push(`first_name = $${index++}`);
      values.push(resolvedFirstName);
    }

    const resolvedLastName = last_name || lastName;
    if (resolvedLastName) {
      updates.push(`last_name = $${index++}`);
      values.push(resolvedLastName);
    }

    if (employee_id || employeeId) {
      updates.push(`employee_id = $${index++}`);
      values.push(employee_id || employeeId);
    }

    if (department) {
      updates.push(`department = $${index++}`);
      values.push(department);
    }

    if (position) {
      updates.push(`position = $${index++}`);
      values.push(position);
    }

    if (join_date || joinDate) {
      updates.push(`join_date = $${index++}`);
      values.push(join_date || joinDate);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password = $${index++}`);
      values.push(hashedPassword);
    }

    if (photo_url !== undefined || photoUrl !== undefined) {
      updates.push(`photo_url = $${index++}`);
      values.push(photo_url ?? photoUrl ?? null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No update fields provided' });
    }

    values.push(id);
    values.push(companyId);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id=$${index} AND company_id=$${index + 1} RETURNING id, email, role, first_name, last_name, employee_id, department, position, join_date, photo_url, created_at, updated_at`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete a user by id
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.tenant?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'Tenant context missing' });
    }

    const { id } = req.params;
    const targetResult = await pool.query('SELECT id, role FROM users WHERE id = $1 AND company_id = $2', [id, companyId]);
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUserRole = req.user?.role;
    const targetUser = targetResult.rows[0];

    if (targetUser.role === 'admin' && currentUserRole !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete admin users' });
    }

    if (currentUserRole === 'hr' && targetUser.role !== 'hr') {
      return res.status(403).json({ error: 'HR users can only delete HR accounts' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE leave_requests SET approved_by = NULL WHERE approved_by = $1 AND company_id = $2', [id, companyId]);
      await client.query('DELETE FROM leave_requests WHERE user_id = $1 AND company_id = $2', [id, companyId]);
      await client.query('DELETE FROM leave_balances WHERE user_id = $1 AND company_id = $2', [id, companyId]);
      await client.query('DELETE FROM messages WHERE company_id = $1 AND (sender_id = $2 OR recipient_id = $2)', [companyId, id]);
      await client.query('UPDATE payslips SET user_id = NULL WHERE user_id = $1 AND company_id = $2', [id, companyId]);
      await client.query('DELETE FROM users WHERE id = $1 AND company_id = $2', [id, companyId]);
      await client.query('COMMIT');
      res.json({ message: 'User deleted' });
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Failed to cascade delete user', {
        userId: id,
        error: err instanceof Error ? err.message : err,
      });
      return res.status(500).json({ error: 'Failed to delete user' });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
