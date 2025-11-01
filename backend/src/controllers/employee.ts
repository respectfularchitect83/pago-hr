import { Response } from 'express';
import pool from '../config/db';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth';
import { mapPayslipRow } from './payslip';
import { TenantRequest } from '../middleware/tenant';

const sanitizeEmployeeIdentifier = (value: unknown): string => {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
};

const normalizeEmailSegment = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
};

const buildFallbackEmployeeEmail = (
  companySlug: string | undefined,
  companyId: number,
  employeeDbId: number,
  employeeIdentifier: string,
): string => {
  const localSegmentBase = normalizeEmailSegment(employeeIdentifier) || `emp-${employeeDbId}`;
  const localPart = `${localSegmentBase}-c${companyId}`.slice(0, 64);
  const slugSegment = normalizeEmailSegment(companySlug ?? '') || `company-${companyId}`;
  const domain = `${slugSegment}.employees.pago.local`;
  return `${localPart}@${domain}`;
};

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

    const normalizedEmployeeId = sanitizeEmployeeIdentifier(employeeid);
    if (!normalizedEmployeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

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
  const emailLower = email ? String(email).trim().toLowerCase() : null;
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
          normalizedEmployeeId,
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

      const createdEmployee = result.rows[0];
      const fallbackEmail = buildFallbackEmployeeEmail(
        req.tenant?.slug,
        companyId,
        createdEmployee.id,
        normalizedEmployeeId,
      );
      const loginEmail = (emailToPersist ?? fallbackEmail).toLowerCase();

      if (!hashedPassword) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Password is required to create or update user account' });
      }

      if (emailToPersist) {
        const existingByEmail = await client.query(
          'SELECT id, company_id, employee_id FROM users WHERE email = $1 LIMIT 1',
          [emailToPersist]
        );

        if (
          existingByEmail.rows.length > 0 &&
          (existingByEmail.rows[0].company_id !== companyId ||
            (existingByEmail.rows[0].employee_id && existingByEmail.rows[0].employee_id !== normalizedEmployeeId))
        ) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'Email already associated with another user' });
        }
      }

      const resolvedFirstName = firstname || createdEmployee.firstname || 'Employee';
      const resolvedLastName = lastname || createdEmployee.lastname || 'User';
      const resolvedDepartment = (department ?? createdEmployee.department) || null;
      const resolvedPosition = (position ?? createdEmployee.position) || null;
      const resolvedPhotoUrl = photo_url || createdEmployee.photo_url || null;

      await client.query(
        `INSERT INTO users (email, password, role, first_name, last_name, employee_id, department, position, join_date, photo_url, company_id)
         VALUES ($1, $2, 'employee', $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (employee_id) DO UPDATE
           SET email = EXCLUDED.email,
               password = COALESCE(EXCLUDED.password, users.password),
               first_name = EXCLUDED.first_name,
               last_name = EXCLUDED.last_name,
               department = EXCLUDED.department,
               position = EXCLUDED.position,
               join_date = COALESCE(EXCLUDED.join_date, users.join_date),
               photo_url = COALESCE(EXCLUDED.photo_url, users.photo_url),
               company_id = EXCLUDED.company_id
        `,
        [
          loginEmail,
          hashedPassword,
          resolvedFirstName,
          resolvedLastName,
          normalizedEmployeeId,
          resolvedDepartment,
          resolvedPosition,
          joinDate,
          resolvedPhotoUrl,
          companyId,
        ]
      );

      await client.query('COMMIT');
      res.status(201).json(createdEmployee);
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
    const emailLower = email ? String(email).trim().toLowerCase() : null;
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
      const requestedEmployeeId = sanitizeEmployeeIdentifier(employeeid);
      const existingEmployeeId = sanitizeEmployeeIdentifier(existingEmployee.employeeid);
      const resolvedEmployeeId = requestedEmployeeId || existingEmployeeId;
      if (!resolvedEmployeeId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Employee ID is required' });
      }

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
          resolvedEmployeeId,
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

      const joinDateForUser = startdate && startdate !== ''
        ? startdate
        : updatedEmployee.startdate || existingEmployee.startdate || new Date().toISOString().split('T')[0];
      const fallbackEmail = buildFallbackEmployeeEmail(
        req.tenant?.slug,
        companyId,
        updatedEmployee.id,
        resolvedEmployeeId,
      );
      const accountEmail = (emailToPersist ?? fallbackEmail).toLowerCase();

      if (emailLower) {
        const emailConflict = await client.query(
          'SELECT id, company_id, employee_id FROM users WHERE email = $1 LIMIT 1',
          [emailLower]
        );
        if (
          emailConflict.rows.length > 0 &&
          (emailConflict.rows[0].company_id !== companyId ||
            (emailConflict.rows[0].employee_id && emailConflict.rows[0].employee_id !== resolvedEmployeeId))
        ) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'Email already associated with another user' });
        }
      }

      const existingUserResult = await client.query(
        'SELECT * FROM users WHERE employee_id = $1 AND company_id = $2 LIMIT 1',
        [resolvedEmployeeId, companyId]
      );
      const existingUser = existingUserResult.rows[0] ?? null;

      const resolvedFirstName = firstname || updatedEmployee.firstname || existingEmployee.firstname || 'Employee';
      const resolvedLastName = lastname || updatedEmployee.lastname || existingEmployee.lastname || 'User';
      const resolvedDepartment = (department ?? updatedEmployee.department ?? existingEmployee.department) || null;
      const resolvedPosition = (position ?? updatedEmployee.position ?? existingEmployee.position) || null;
      const resolvedPhotoUrl = photo_url || updatedEmployee.photo_url || existingEmployee.photo_url || null;

      if (existingUser) {
        const passwordToPersist = hashedPassword ?? existingUser.password;
        if (!passwordToPersist) {
          await client.query('ROLLBACK');
          return res.status(500).json({ error: 'Unable to update employee credentials' });
        }

        await client.query(
          `UPDATE users
              SET email = $1,
                  password = $2,
                  first_name = $3,
                  last_name = $4,
                  employee_id = $5,
                  department = $6,
                  position = $7,
                  join_date = $8,
                  photo_url = $9,
                  company_id = $10,
                  updated_at = NOW()
            WHERE id = $11`,
          [
            accountEmail,
            passwordToPersist,
            resolvedFirstName,
            resolvedLastName,
            resolvedEmployeeId,
            resolvedDepartment,
            resolvedPosition,
            joinDateForUser,
            resolvedPhotoUrl,
            companyId,
            existingUser.id,
          ]
        );
      } else if (hashedPassword) {
        await client.query(
          `INSERT INTO users (email, password, role, first_name, last_name, employee_id, department, position, join_date, photo_url, company_id)
           VALUES ($1, $2, 'employee', $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            accountEmail,
            hashedPassword,
            resolvedFirstName,
            resolvedLastName,
            resolvedEmployeeId,
            resolvedDepartment,
            resolvedPosition,
            joinDateForUser,
            resolvedPhotoUrl,
            companyId,
          ]
        );
      } else {
        logger.warn('Skipping creation of employee user account due to missing password', {
          employeeId: resolvedEmployeeId,
        });
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
    const deletedEmployeeId = sanitizeEmployeeIdentifier(deletedEmployee?.employeeid);
    if (deletedEmployeeId) {
      await pool.query('DELETE FROM users WHERE employee_id = $1 AND company_id = $2', [deletedEmployeeId, companyId]);
    }
    if (deletedEmployee?.email) {
      await pool.query('DELETE FROM users WHERE email = $1 AND company_id = $2', [deletedEmployee.email.toLowerCase(), companyId]);
    }

    res.json({ message: 'Employee deleted' });
  } catch (err) {
    logger.error('Failed to delete employee', { error: err instanceof Error ? err.message : err });
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};
