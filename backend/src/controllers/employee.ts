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
    const { employeeid, firstname, lastname, email, status, position, department, password } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'INSERT INTO employees (employeeid, firstname, lastname, email, status, position, department) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [employeeid, firstname, lastname, email, status, position, department]
      );

      if (email && password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await client.query(
          `INSERT INTO users (email, password, role, first_name, last_name, employee_id, department, position, join_date)
           VALUES ($1, $2, 'employee', $3, $4, $5, $6, $7, CURRENT_DATE)
           ON CONFLICT (email) DO UPDATE
             SET password = EXCLUDED.password,
                 first_name = EXCLUDED.first_name,
                 last_name = EXCLUDED.last_name,
                 employee_id = EXCLUDED.employee_id,
                 department = EXCLUDED.department,
                 position = EXCLUDED.position
          `,
          [email.toLowerCase(), hashedPassword, firstname, lastname, employeeid, department, position]
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
    const { employeeid, firstname, lastname, email, status, position, department, password } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'UPDATE employees SET employeeid=$1, firstname=$2, lastname=$3, email=$4, status=$5, position=$6, department=$7 WHERE id=$8 RETURNING *',
        [employeeid, firstname, lastname, email, status, position, department, id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Employee not found' });
      }

      if (email) {
        const updates: string[] = ['email = $1', 'first_name = $2', 'last_name = $3', 'employee_id = $4', 'department = $5', 'position = $6'];
        const values: any[] = [email.toLowerCase(), firstname, lastname, employeeid, department, position];

        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          updates.push(`password = $${updates.length + 1}`);
          values.push(hashedPassword);
        }

        const employeeIdentifierIndex = values.length + 1;
        values.push(result.rows[0].employeeid || employeeid);
        const emailIdentifierIndex = values.length + 1;
        values.push(email.toLowerCase());

        await client.query(
          `UPDATE users
             SET ${updates.join(', ')}
           WHERE employee_id = $${employeeIdentifierIndex}
              OR email = $${emailIdentifierIndex}
          `,
          values
        );
      }

      await client.query('COMMIT');
      res.json(result.rows[0]);
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
