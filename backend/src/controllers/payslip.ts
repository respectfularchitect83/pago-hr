import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';

type EarningsInput = { description?: string; amount?: number | string; taxable?: boolean };
type DeductionInput = { description?: string; amount?: number | string };

const sanitizeMonetaryEntries = <T extends EarningsInput | DeductionInput>(
  entries: unknown,
  defaultTaxable = true
) => {
  if (!Array.isArray(entries)) {
    return [] as (EarningsInput & { amount: number; description: string; taxable?: boolean })[];
  }

  return entries
    .filter((entry): entry is T => typeof entry === 'object' && entry !== null)
    .map((entry) => {
      const description = typeof entry.description === 'string' ? entry.description : '';
      const amount = Number((entry as any).amount ?? 0);

      return {
        description,
        amount: Number.isFinite(amount) ? amount : 0,
        taxable: 'taxable' in entry ? Boolean((entry as EarningsInput).taxable) : defaultTaxable,
      };
    })
    .filter((entry) => entry.description.trim().length > 0);
};

const mapPayslipRow = (row: any) => {
  const earningsRaw = row?.earnings_breakdown ?? row?.earnings ?? [];
  const deductionsRaw = row?.deductions_breakdown ?? [];

  const earnings = sanitizeMonetaryEntries<EarningsInput>(earningsRaw, true).map((entry) => ({
    description: entry.description,
    amount: entry.amount,
    taxable: entry.taxable ?? true,
  }));

  const deductions = sanitizeMonetaryEntries<DeductionInput>(deductionsRaw, false).map((entry) => ({
    description: entry.description,
    amount: entry.amount,
  }));

  return {
    id: row?.id ? String(row.id) : undefined,
    employeeId: row?.employee_id ? String(row.employee_id) : undefined,
    userId: row?.user_id ? String(row.user_id) : undefined,
    payPeriodStart: row?.period_start,
    payPeriodEnd: row?.period_end,
    payDate: row?.payment_date,
    status: row?.status,
    earnings,
    deductions,
    normalOvertimeHours: Number(row?.normal_overtime_hours ?? 0),
    doubleOvertimeHours: Number(row?.double_overtime_hours ?? 0),
    netSalary: Number(row?.net_salary ?? 0),
    basicSalary: Number(row?.basic_salary ?? 0),
    allowancesTotal: Number(row?.allowances ?? 0),
    deductionsTotal: Number(row?.deductions ?? 0),
    taxTotal: Number(row?.tax ?? 0),
    createdAt: row?.created_at,
    updatedAt: row?.updated_at,
  };
};

const findEmployeeWithUser = async (employeeId: string | number) => {
  const idValue = Number(employeeId);
  if (!Number.isFinite(idValue)) {
    return null;
  }

  const employeeResult = await pool.query(
    'SELECT id, email, employeeid, firstname, lastname FROM employees WHERE id = $1',
    [idValue]
  );

  if (employeeResult.rows.length === 0) {
    return null;
  }

  const employee = employeeResult.rows[0];
  if (!employee.email) {
    return { employee, userId: null };
  }

  const userResult = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [employee.email]);
  const userId = userResult.rows[0]?.id ?? null;
  return { employee, userId };
};

export const listPayslips = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.query;

    const params: any[] = [];
    let query = 'SELECT * FROM payslips';

    if (employeeId) {
      query += ' WHERE employee_id = $1';
      params.push(employeeId);
    }

    query += ' ORDER BY payment_date DESC NULLS LAST, created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows.map(mapPayslipRow));
  } catch (err) {
    logger.error('Failed to fetch payslips', { error: err instanceof Error ? err.message : err });
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
};

export const createPayslip = async (req: AuthRequest, res: Response) => {
  try {
    const {
      employeeId,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      earnings = [],
      deductions = [],
      normalOvertimeHours = 0,
      doubleOvertimeHours = 0,
      status = 'draft',
    } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }

    const employeeWithUser = await findEmployeeWithUser(employeeId);
    if (!employeeWithUser) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (!payPeriodStart || !payPeriodEnd || !payDate) {
      return res.status(400).json({ error: 'payPeriodStart, payPeriodEnd and payDate are required' });
    }

    const sanitizedEarnings = sanitizeMonetaryEntries<EarningsInput>(earnings, true);
    const sanitizedDeductions = sanitizeMonetaryEntries<DeductionInput>(deductions, false);

    const totalEarnings = sanitizedEarnings.reduce((sum, entry) => sum + entry.amount, 0);
    const totalDeductions = sanitizedDeductions.reduce((sum, entry) => sum + entry.amount, 0);
    const netSalary = totalEarnings - totalDeductions;

    const baseSalaryEntry = sanitizedEarnings.find(
      (entry) => entry.description.toLowerCase() === 'regular pay'
    ) ?? sanitizedEarnings[0];
    const basicSalary = baseSalaryEntry ? baseSalaryEntry.amount : totalEarnings;
    const allowancesTotal = Math.max(totalEarnings - basicSalary, 0);
    const taxTotal = sanitizedDeductions.reduce((sum, entry) => {
      const label = entry.description.toLowerCase();
      if (label.includes('tax') || label.includes('paye')) {
        return sum + entry.amount;
      }
      return sum;
    }, 0);

    const insertResult = await pool.query(
      `INSERT INTO payslips (
         employee_id,
         user_id,
         period_start,
         period_end,
         basic_salary,
         allowances,
         deductions,
         tax,
         net_salary,
         status,
         payment_date,
         earnings_breakdown,
         deductions_breakdown,
         normal_overtime_hours,
         double_overtime_hours
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
         $12::jsonb, $13::jsonb, $14, $15
       ) RETURNING *`,
      [
        employeeWithUser.employee.id,
        employeeWithUser.userId,
        payPeriodStart,
        payPeriodEnd,
        basicSalary,
        allowancesTotal,
        totalDeductions,
        taxTotal,
        netSalary,
        status,
        payDate,
        JSON.stringify(sanitizedEarnings),
        JSON.stringify(sanitizedDeductions),
        Number(normalOvertimeHours) || 0,
        Number(doubleOvertimeHours) || 0,
      ]
    );

    res.status(201).json(mapPayslipRow(insertResult.rows[0]));
  } catch (err) {
    logger.error('Failed to create payslip', { error: err instanceof Error ? err.message : err });
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

    res.json(mapPayslipRow(result.rows[0]));
  } catch (err) {
    logger.error('Failed to fetch payslip', { error: err instanceof Error ? err.message : err });
    res.status(500).json({ error: 'Failed to fetch payslip' });
  }
};

export const updatePayslip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      payPeriodStart,
      payPeriodEnd,
      payDate,
      earnings = [],
      deductions = [],
      normalOvertimeHours = 0,
      doubleOvertimeHours = 0,
      status,
    } = req.body;

    const existingResult = await pool.query('SELECT * FROM payslips WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

  const sanitizedEarnings = sanitizeMonetaryEntries<EarningsInput>(earnings, true);
    const sanitizedDeductions = sanitizeMonetaryEntries<DeductionInput>(deductions, false);

    const totalEarnings = sanitizedEarnings.reduce((sum, entry) => sum + entry.amount, 0);
    const totalDeductions = sanitizedDeductions.reduce((sum, entry) => sum + entry.amount, 0);
    const netSalary = totalEarnings - totalDeductions;

    const baseSalaryEntry = sanitizedEarnings.find(
      (entry) => entry.description.toLowerCase() === 'regular pay'
    ) ?? sanitizedEarnings[0];
    const basicSalary = baseSalaryEntry ? baseSalaryEntry.amount : totalEarnings;
    const allowancesTotal = Math.max(totalEarnings - basicSalary, 0);
    const taxTotal = sanitizedDeductions.reduce((sum, entry) => {
      const label = entry.description.toLowerCase();
      if (label.includes('tax') || label.includes('paye')) {
        return sum + entry.amount;
      }
      return sum;
    }, 0);

    const updateResult = await pool.query(
      `UPDATE payslips SET
         period_start = $1,
         period_end = $2,
         payment_date = $3,
         status = COALESCE($4, status),
         basic_salary = $5,
         allowances = $6,
         deductions = $7,
         tax = $8,
         net_salary = $9,
         earnings_breakdown = $10::jsonb,
         deductions_breakdown = $11::jsonb,
         normal_overtime_hours = $12,
         double_overtime_hours = $13,
         updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        payPeriodStart ?? existingResult.rows[0].period_start,
        payPeriodEnd ?? existingResult.rows[0].period_end,
        payDate ?? existingResult.rows[0].payment_date,
        status,
        basicSalary,
        allowancesTotal,
        totalDeductions,
        taxTotal,
        netSalary,
        JSON.stringify(sanitizedEarnings),
        JSON.stringify(sanitizedDeductions),
        Number(normalOvertimeHours) || 0,
        Number(doubleOvertimeHours) || 0,
        id,
      ]
    );

    res.json(mapPayslipRow(updateResult.rows[0]));
  } catch (err) {
    logger.error('Failed to update payslip', { error: err instanceof Error ? err.message : err });
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
    logger.error('Failed to delete payslip', { error: err instanceof Error ? err.message : err });
    res.status(500).json({ error: 'Failed to delete payslip' });
  }
};

export const publishPayslip = (req: Request, res: Response) => {
  res.json({ message: 'Publish payslip (not implemented)' });
};

export const downloadPayslip = (req: Request, res: Response) => {
  res.json({ message: 'Download payslip (not implemented)' });
};
