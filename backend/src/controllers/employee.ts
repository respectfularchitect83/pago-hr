import { Response } from 'express';
import pool from '../config/db';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth';
import { mapPayslipRow } from './payslip';
import { TenantRequest } from '../middleware/tenant';

export const listEmployees = async (req: TenantRequest, res: Response) => {
  try {
    const companyId = req.tenant?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'Tenant context missing' });
    }

    const result = await pool.query(
      'SELECT * FROM employees WHERE company_id = $1 ORDER BY firstname ASC, lastname ASC',
      [companyId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

export const createEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.tenant?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'Tenant context missing' });
    }

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
      socialsecuritynumber,
      social_security_number,
      socialSecurityNumber,
      uifnumber,
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
    const rawSocialSecurityNumberCreate = socialsecuritynumber
      ?? social_security_number
      ?? socialSecurityNumber
      ?? uifnumber;
    const normalizedSocialSecurityNumber = typeof rawSocialSecurityNumberCreate === 'string'
      ? (rawSocialSecurityNumberCreate.trim() || null)
      : rawSocialSecurityNumberCreate ?? null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const emailToPersist = emailLower || null;
      const result = await client.query(
        `INSERT INTO employees (
            company_id,
            employeeid,
            firstname,
            lastname,
            email,
            status,
            position,
            department,
            startdate,
            taxnumber,
            socialsecuritynumber,
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
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15::jsonb,
            $16, $17, $18, $19, $20, $21, $22::jsonb
          )
          RETURNING *`,
        [
          companyId,
          employeeid,
          firstname,
          lastname,
          emailToPersist,
          status,
          position,
          department,
          startdate && startdate !== '' ? startdate : null,
          taxnumber || null,
          normalizedSocialSecurityNumber,
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
          const existingUser = await client.query(
            'SELECT password, company_id FROM users WHERE email = $1',
            [emailToPersist]
          );

          if (
            existingUser.rows.length > 0 &&
            existingUser.rows[0].company_id !== companyId
          ) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Email already associated with another company' });
          }

          passwordForUpsert = existingUser.rows[0]?.password || null;
        }

        if (!passwordForUpsert) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Password is required to create or update user account' });
        }

        await client.query(
          `INSERT INTO users (email, password, role, first_name, last_name, employee_id, department, position, join_date, photo_url, company_id)
           VALUES ($1, $2, 'employee', $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (email) DO UPDATE
             SET password = COALESCE(EXCLUDED.password, users.password),
                 first_name = EXCLUDED.first_name,
                 last_name = EXCLUDED.last_name,
                 employee_id = EXCLUDED.employee_id,
                 department = EXCLUDED.department,
                 position = EXCLUDED.position,
                 join_date = COALESCE(EXCLUDED.join_date, users.join_date),
                 photo_url = COALESCE(EXCLUDED.photo_url, users.photo_url),
                 company_id = EXCLUDED.company_id
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
            photo_url || null,
            companyId,
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

export const getEmployee = async (req: TenantRequest, res: Response) => {
  try {
    const companyId = req.tenant?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'Tenant context missing' });
    }

    const { id } = req.params;
    const result = await pool.query('SELECT * FROM employees WHERE id = $1 AND company_id = $2', [id, companyId]);
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
    const companyId = req.tenant?.id;
    if (!authUser) {
      return res.status(401).json({ error: 'Please authenticate' });
    }

    if (authUser.role !== 'employee') {
      return res.status(403).json({ error: 'Only employees can access this profile' });
    }

    let employeeRow: any | null = null;

    if (authUser.employee_id) {
      const byEmployeeId = await pool.query(
        'SELECT * FROM employees WHERE employeeid = $1 AND company_id = $2 LIMIT 1',
        [authUser.employee_id, companyId]
      );
      employeeRow = byEmployeeId.rows[0] ?? null;
    }

    if (!employeeRow && authUser.email) {
      const byEmail = await pool.query(
        'SELECT * FROM employees WHERE LOWER(email) = LOWER($1) AND company_id = $2 LIMIT 1',
        [authUser.email, companyId]
      );
      employeeRow = byEmail.rows[0] ?? null;
    }

    if (!employeeRow) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    if (companyId && employeeRow.company_id !== companyId) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    const payslipsResult = await pool.query(
      `SELECT *
         FROM payslips
        WHERE company_id = $1
          AND (employee_id = $2 OR user_id = $3)
        ORDER BY payment_date DESC NULLS LAST, created_at DESC`,
      [companyId, employeeRow.id, authUser.id]
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

export const updateEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.tenant?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'Tenant context missing' });
    }

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
      socialsecuritynumber,
      social_security_number,
      socialSecurityNumber,
      uifnumber,
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
    const rawSocialSecurityNumberUpdate = socialsecuritynumber
      ?? social_security_number
      ?? socialSecurityNumber
      ?? uifnumber;
    const normalizedSocialSecurityNumber = typeof rawSocialSecurityNumberUpdate === 'string'
      ? (rawSocialSecurityNumberUpdate.trim() || null)
      : rawSocialSecurityNumberUpdate ?? null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingResult = await client.query('SELECT * FROM employees WHERE id = $1 AND company_id = $2', [id, companyId]);
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
        socialsecuritynumber=$10,
        idnumber=$11,
        phonenumber=$12,
        address=$13,
        bankdetails=$14::jsonb,
        terminationdate=$15,
        basicsalary=$16,
        appointmenthours=$17,
        branch=$18,
        gender=$19,
        photo_url=$20,
        leave_records=$21::jsonb,
        updated_at=NOW()
      WHERE id=$22 AND company_id=$23
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
          normalizedSocialSecurityNumber,
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
          companyId,
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
          const existingUser = await client.query('SELECT password, company_id FROM users WHERE email = $1', [targetEmail]);

          if (
            existingUser.rows.length > 0 &&
            existingUser.rows[0].company_id !== companyId
          ) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Email already associated with another company' });
          }

          passwordForUpsert = existingUser.rows[0]?.password || null;
        }

        if (!passwordForUpsert) {
          logger.warn('Skipping user upsert due to missing password', { employeeId: employeeid, email: targetEmail });
        } else {
        await client.query(
          `INSERT INTO users (email, password, role, first_name, last_name, employee_id, department, position, join_date, photo_url, company_id)
           VALUES ($1, $2, 'employee', $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (email) DO UPDATE
             SET password = COALESCE(EXCLUDED.password, users.password),
                 first_name = EXCLUDED.first_name,
                 last_name = EXCLUDED.last_name,
                 employee_id = EXCLUDED.employee_id,
                 department = EXCLUDED.department,
                 position = EXCLUDED.position,
                 join_date = COALESCE(EXCLUDED.join_date, users.join_date),
                 photo_url = COALESCE(EXCLUDED.photo_url, users.photo_url),
                 company_id = EXCLUDED.company_id
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
            photo_url || updatedEmployee.photo_url || existingEmployee.photo_url || null,
            companyId,
          ]
        );

        const previousEmail = existingEmployee.email ? existingEmployee.email.toLowerCase() : null;
        if (previousEmail && previousEmail !== targetEmail) {
          await client.query('DELETE FROM users WHERE email = $1 AND company_id = $2', [previousEmail, companyId]);
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

export const deleteEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.tenant?.id;
    if (!companyId) {
      return res.status(400).json({ error: 'Tenant context missing' });
    }

    const { id } = req.params;
    const result = await pool.query('DELETE FROM employees WHERE id = $1 AND company_id = $2 RETURNING *', [id, companyId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const deletedEmployee = result.rows[0];
    if (deletedEmployee?.email) {
      await pool.query('DELETE FROM users WHERE email = $1 AND company_id = $2', [deletedEmployee.email.toLowerCase(), companyId]);
    }

    res.json({ message: 'Employee deleted' });
  } catch (err) {
    logger.error('Failed to delete employee', { error: err instanceof Error ? err.message : err });
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};
