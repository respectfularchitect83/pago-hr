import { Request, Response } from 'express';
import pool from '../config/db';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth';
import { mapPayslipRow } from './payslip';

export const listEmployees = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM employees');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const {
      employeeid,
      firstname,
      lastname,
      email,
      status,
      position,
      department,
      password,
      startdate,
      taxnumber,
      idnumber,
      phonenumber,
      address,
      bankdetails,
      terminationdate,
      basicsalary,
      appointmenthours,
      branch,
      gender,
      photo_url,
      leaverecords,
    } = req.body;

    const toNumberOrNull = (value: any) => {
      if (value === undefined || value === null || value === '') {
        return null;
      }
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const normalizedBankDetails = bankdetails
      ? (typeof bankdetails === 'string' ? bankdetails : JSON.stringify(bankdetails))
      : JSON.stringify({ bankName: '', accountNumber: '' });
    const normalizedTerminationDate = terminationdate && terminationdate !== '' ? terminationdate : null;
    const parsedBasicSalary = toNumberOrNull(basicsalary);
    const parsedAppointmentHours = toNumberOrNull(appointmenthours);
    const joinDate = startdate && startdate !== '' ? startdate : new Date().toISOString().split('T')[0];
    const emailLower = email ? email.toLowerCase() : null;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const normalizedLeaveRecords = leaverecords
      ? (typeof leaverecords === 'string' ? leaverecords : JSON.stringify(leaverecords))
      : JSON.stringify([]);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const emailToPersist = emailLower || null;
      const result = await client.query(
        `INSERT INTO employees (
            employeeid,
            firstname,
            lastname,
            email,
            status,
            position,
            department,
            startdate,
            taxnumber,
            idnumber,
            phonenumber,
            address,
            bankdetails,
            terminationdate,
            basicsalary,
            appointmenthours,
            branch,
            gender,
            photo_url,
            leave_records
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13::jsonb,
            $14, $15, $16, $17, $18, $19, $20::jsonb
          )
          RETURNING *`,
        [
          employeeid,
          firstname,
          lastname,
          emailToPersist,
          status,
          position,
          department,
          startdate && startdate !== '' ? startdate : null,
          taxnumber || null,
          idnumber || null,
          phonenumber || null,
          address || null,
          normalizedBankDetails,
          normalizedTerminationDate,
          parsedBasicSalary,
          parsedAppointmentHours,
          branch || null,
          gender || null,
          photo_url || null,
          normalizedLeaveRecords,
        ]
      );

      if (emailToPersist) {
        let passwordForUpsert = hashedPassword;
        if (!passwordForUpsert) {
          const existingUser = await client.query('SELECT password FROM users WHERE email = $1', [emailToPersist]);
          passwordForUpsert = existingUser.rows[0]?.password || null;
        }

        if (!passwordForUpsert) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Password is required to create or update user account' });
        }

        await client.query(
          `INSERT INTO users (email, password, role, first_name, last_name, employee_id, department, position, join_date)
           VALUES ($1, $2, 'employee', $3, $4, $5, $6, $7, $8)
           ON CONFLICT (email) DO UPDATE
             SET password = COALESCE(EXCLUDED.password, users.password),
                 first_name = EXCLUDED.first_name,
                 last_name = EXCLUDED.last_name,
                 employee_id = EXCLUDED.employee_id,
                 department = EXCLUDED.department,
                 position = EXCLUDED.position,
                 join_date = COALESCE(EXCLUDED.join_date, users.join_date)
          `,
          [
            emailToPersist,
            passwordForUpsert,
            firstname,
            lastname,
            employeeid,
            department,
            position,
            joinDate,
          ]
        );
      }

      await client.query('COMMIT');
      res.status(201).json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('Failed to create employee', { error: err instanceof Error ? err.message : err });
    res.status(500).json({ error: 'Failed to create employee' });
  }
};

export const getEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
};

export const getSelfProfile = async (req: AuthRequest, res: Response) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ error: 'Please authenticate' });
    }

    if (authUser.role !== 'employee') {
      return res.status(403).json({ error: 'Only employees can access this profile' });
    }

    let employeeRow: any | null = null;

    if (authUser.employee_id) {
      const byEmployeeId = await pool.query('SELECT * FROM employees WHERE employeeid = $1 LIMIT 1', [authUser.employee_id]);
      employeeRow = byEmployeeId.rows[0] ?? null;
    }

    if (!employeeRow && authUser.email) {
      const byEmail = await pool.query('SELECT * FROM employees WHERE LOWER(email) = LOWER($1) LIMIT 1', [authUser.email]);
      employeeRow = byEmail.rows[0] ?? null;
    }

    if (!employeeRow) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    const payslipsResult = await pool.query(
      `SELECT *
         FROM payslips
        WHERE employee_id = $1
           OR user_id = $2
        ORDER BY payment_date DESC NULLS LAST, created_at DESC`,
      [employeeRow.id, authUser.id]
    );

    const payslips = payslipsResult.rows.map(mapPayslipRow);

    res.json({
      ...employeeRow,
      leave_records: employeeRow.leave_records ?? [],
      payslips,
    });
  } catch (error) {
    logger.error('Failed to load self employee profile', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ error: 'Failed to load employee profile' });
  }
};

export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      employeeid,
      firstname,
      lastname,
      email,
      status,
      position,
      department,
      password,
      startdate,
      taxnumber,
      idnumber,
      phonenumber,
      address,
      bankdetails,
      terminationdate,
      basicsalary,
      appointmenthours,
      branch,
      gender,
      photo_url,
      leaverecords,
    } = req.body;

    const toNumberOrNull = (value: any) => {
      if (value === undefined || value === null || value === '') {
        return null;
      }
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const normalizedBankDetails = bankdetails
      ? (typeof bankdetails === 'string' ? bankdetails : JSON.stringify(bankdetails))
      : JSON.stringify({ bankName: '', accountNumber: '' });
    const normalizedTerminationDate = terminationdate && terminationdate !== '' ? terminationdate : null;
    const parsedBasicSalary = toNumberOrNull(basicsalary);
    const parsedAppointmentHours = toNumberOrNull(appointmenthours);
    const emailLower = email ? email.toLowerCase() : null;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const normalizedLeaveRecords = leaverecords
      ? (typeof leaverecords === 'string' ? leaverecords : JSON.stringify(leaverecords))
      : JSON.stringify([]);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingResult = await client.query('SELECT * FROM employees WHERE id = $1', [id]);
      if (existingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Employee not found' });
      }
      const existingEmployee = existingResult.rows[0];

      const emailToPersist = emailLower ?? (existingEmployee.email ? existingEmployee.email.toLowerCase() : null);

      const updateResult = await client.query(
    `UPDATE employees
      SET employeeid=$1,
        firstname=$2,
        lastname=$3,
        email=$4,
        status=$5,
        position=$6,
        department=$7,
        startdate=$8,
        taxnumber=$9,
        idnumber=$10,
        phonenumber=$11,
        address=$12,
        bankdetails=$13::jsonb,
        terminationdate=$14,
        basicsalary=$15,
        appointmenthours=$16,
        branch=$17,
        gender=$18,
        photo_url=$19,
        leave_records=$20::jsonb,
        updated_at=NOW()
      WHERE id=$21
      RETURNING *`,
        [
          employeeid,
          firstname,
          lastname,
          emailToPersist,
          status,
          position,
          department,
          startdate && startdate !== '' ? startdate : null,
          taxnumber || null,
          idnumber || null,
          phonenumber || null,
          address || null,
          normalizedBankDetails,
          normalizedTerminationDate,
          parsedBasicSalary,
          parsedAppointmentHours,
          branch || null,
          gender || null,
          photo_url || null,
          normalizedLeaveRecords,
          id,
        ]
      );

      const updatedEmployee = updateResult.rows[0];

      const targetEmail = (emailToPersist || existingEmployee.email || '').toLowerCase();
      if (targetEmail) {
        const joinDate = startdate && startdate !== ''
          ? startdate
          : updatedEmployee.startdate || existingEmployee.startdate || new Date().toISOString().split('T')[0];

        let passwordForUpsert = hashedPassword;
        if (!passwordForUpsert) {
          const existingUser = await client.query('SELECT password FROM users WHERE email = $1', [targetEmail]);
          passwordForUpsert = existingUser.rows[0]?.password || null;
        }

        if (!passwordForUpsert) {
          logger.warn('Skipping user upsert due to missing password', { employeeId: employeeid, email: targetEmail });
        } else {
        await client.query(
          `INSERT INTO users (email, password, role, first_name, last_name, employee_id, department, position, join_date)
           VALUES ($1, $2, 'employee', $3, $4, $5, $6, $7, $8)
           ON CONFLICT (email) DO UPDATE
             SET password = COALESCE(EXCLUDED.password, users.password),
                 first_name = EXCLUDED.first_name,
                 last_name = EXCLUDED.last_name,
                 employee_id = EXCLUDED.employee_id,
                 department = EXCLUDED.department,
                 position = EXCLUDED.position,
                 join_date = COALESCE(EXCLUDED.join_date, users.join_date)
          `,
          [
            targetEmail,
            passwordForUpsert,
            firstname || updatedEmployee.firstname || existingEmployee.firstname,
            lastname || updatedEmployee.lastname || existingEmployee.lastname,
            updatedEmployee.employeeid || existingEmployee.employeeid,
            department || updatedEmployee.department || existingEmployee.department,
            position || updatedEmployee.position || existingEmployee.position,
            joinDate,
          ]
        );

        const previousEmail = existingEmployee.email ? existingEmployee.email.toLowerCase() : null;
        if (previousEmail && previousEmail !== targetEmail) {
          await client.query('DELETE FROM users WHERE email = $1', [previousEmail]);
        }
        }
      }

      await client.query('COMMIT');
      res.json(updatedEmployee);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('Failed to update employee', { error: err instanceof Error ? err.message : err });
    res.status(500).json({ error: 'Failed to update employee' });
  }
};

export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM employees WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    logger.error('Failed to delete employee', { error: err instanceof Error ? err.message : err });
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};
