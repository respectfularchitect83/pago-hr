export const publishPayslip = (req: Request, res: Response) => {
  res.json({ message: 'Publish payslip (not implemented)' });
};

export const downloadPayslip = (req: Request, res: Response) => {
  res.json({ message: 'Download payslip (not implemented)' });
};
import { Request, Response } from 'express';
import pool from '../config/db';

export const listPayslips = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM payslips');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
};

export const createPayslip = async (req: Request, res: Response) => {
  try {
    const { user_id, period_start, period_end, basic_salary, allowances, deductions, tax, net_salary, status, payment_date } = req.body;
    const result = await pool.query(
      `INSERT INTO payslips (user_id, period_start, period_end, basic_salary, allowances, deductions, tax, net_salary, status, payment_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [user_id, period_start, period_end, basic_salary, allowances, deductions, tax, net_salary, status, payment_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create payslip' });
  }
};

export const getPayslip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM payslips WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payslip' });
  }
};

export const updatePayslip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id, period_start, period_end, basic_salary, allowances, deductions, tax, net_salary, status, payment_date } = req.body;
    const result = await pool.query(
      `UPDATE payslips SET user_id=$1, period_start=$2, period_end=$3, basic_salary=$4, allowances=$5, deductions=$6, tax=$7, net_salary=$8, status=$9, payment_date=$10 WHERE id=$11 RETURNING *`,
      [user_id, period_start, period_end, basic_salary, allowances, deductions, tax, net_salary, status, payment_date, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update payslip' });
  }
};

export const deletePayslip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM payslips WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }
    res.json({ message: 'Payslip deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete payslip' });
  }
};
