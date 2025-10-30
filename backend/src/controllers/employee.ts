import { Request, Response } from 'express';
import pool from '../config/db';
import bcrypt from 'bcrypt';

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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

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
            photo_url
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13::jsonb,
            $14, $15, $16, $17, $18, $19
          )
          RETURNING *`,
        [
          employeeid,
          firstname,
          lastname,
          emailLower,
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
        ]
      );

      if (emailLower) {
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
            emailLower,
            hashedPassword,
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingResult = await client.query('SELECT * FROM employees WHERE id = $1', [id]);
      if (existingResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Employee not found' });
      }
      const existingEmployee = existingResult.rows[0];

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
                updated_at=NOW()
          WHERE id=$20
          RETURNING *`,
        [
          employeeid,
          firstname,
          lastname,
          emailLower,
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
          id,
        ]
      );

      const updatedEmployee = updateResult.rows[0];

      const targetEmail = (emailLower || updatedEmployee.email || existingEmployee.email || '').toLowerCase();
      if (targetEmail) {
        const joinDate = startdate && startdate !== ''
          ? startdate
          : updatedEmployee.startdate || existingEmployee.startdate || new Date().toISOString().split('T')[0];

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
            hashedPassword,
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

      await client.query('COMMIT');
      res.json(updatedEmployee);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
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
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};
