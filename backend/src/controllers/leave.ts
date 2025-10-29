export const getLeaveBalance = (req: Request, res: Response) => {
  res.json({ message: 'Get leave balance (not implemented)' });
};

export const approveLeaveRequest = (req: Request, res: Response) => {
  res.json({ message: 'Approve leave request (not implemented)' });
};

export const rejectLeaveRequest = (req: Request, res: Response) => {
  res.json({ message: 'Reject leave request (not implemented)' });
};
import { Request, Response } from 'express';
import pool from '../config/db';

export const listLeaveRequests = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM leave_requests');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};

export const createLeaveRequest = async (req: Request, res: Response) => {
  try {
    const { user_id, leave_type, start_date, end_date, days_count, status, reason, approved_by, approved_at } = req.body;
    const result = await pool.query(
      `INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, days_count, status, reason, approved_by, approved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [user_id, leave_type, start_date, end_date, days_count, status, reason, approved_by, approved_at]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create leave request' });
  }
};

export const getLeaveRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leave request' });
  }
};

export const updateLeaveRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id, leave_type, start_date, end_date, days_count, status, reason, approved_by, approved_at } = req.body;
    const result = await pool.query(
      `UPDATE leave_requests SET user_id=$1, leave_type=$2, start_date=$3, end_date=$4, days_count=$5, status=$6, reason=$7, approved_by=$8, approved_at=$9 WHERE id=$10 RETURNING *`,
      [user_id, leave_type, start_date, end_date, days_count, status, reason, approved_by, approved_at, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update leave request' });
  }
};

export const deleteLeaveRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM leave_requests WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    res.json({ message: 'Leave request deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete leave request' });
  }
};
