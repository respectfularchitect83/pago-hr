import { Response } from 'express';
import pool from '../config/db';
import { TenantRequest } from '../middleware/tenant';
import { AuthRequest } from '../middleware/auth';

export const getLeaveBalance = (req: TenantRequest, res: Response) => {
  res.json({ message: 'Get leave balance (not implemented)' });
};

export const approveLeaveRequest = (req: AuthRequest, res: Response) => {
  res.json({ message: 'Approve leave request (not implemented)' });
};

export const rejectLeaveRequest = (req: AuthRequest, res: Response) => {
  res.json({ message: 'Reject leave request (not implemented)' });
};

export const listLeaveRequests = async (req: TenantRequest, res: Response) => {
  try {
    const companyId = req.tenant?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'Tenant context missing' });
    }

    const result = await pool.query(
      'SELECT * FROM leave_requests WHERE company_id = $1 ORDER BY created_at DESC',
      [companyId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};

export const createLeaveRequest = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.tenant?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'Tenant context missing' });
    }

    const { user_id, leave_type, start_date, end_date, days_count, status, reason, approved_by, approved_at } = req.body;
    const result = await pool.query(
      `INSERT INTO leave_requests (company_id, user_id, leave_type, start_date, end_date, days_count, status, reason, approved_by, approved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [companyId, user_id, leave_type, start_date, end_date, days_count, status, reason, approved_by, approved_at]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create leave request' });
  }
};

export const getLeaveRequest = async (req: TenantRequest, res: Response) => {
  try {
    const companyId = req.tenant?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'Tenant context missing' });
    }

    const { id } = req.params;
    const result = await pool.query('SELECT * FROM leave_requests WHERE id = $1 AND company_id = $2', [id, companyId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leave request' });
  }
};

export const updateLeaveRequest = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.tenant?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'Tenant context missing' });
    }

    const { id } = req.params;
    const { user_id, leave_type, start_date, end_date, days_count, status, reason, approved_by, approved_at } = req.body;
    const result = await pool.query(
      `UPDATE leave_requests
          SET user_id=$1,
              leave_type=$2,
              start_date=$3,
              end_date=$4,
              days_count=$5,
              status=$6,
              reason=$7,
              approved_by=$8,
              approved_at=$9,
              updated_at = NOW()
        WHERE id=$10 AND company_id=$11
        RETURNING *`,
      [user_id, leave_type, start_date, end_date, days_count, status, reason, approved_by, approved_at, id, companyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update leave request' });
  }
};

export const deleteLeaveRequest = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.tenant?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'Tenant context missing' });
    }

    const { id } = req.params;
    const result = await pool.query('DELETE FROM leave_requests WHERE id = $1 AND company_id = $2 RETURNING *', [id, companyId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    res.json({ message: 'Leave request deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete leave request' });
  }
};
