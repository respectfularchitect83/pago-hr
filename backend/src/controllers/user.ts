import { Request, Response } from 'express';
import pool from '../config/db';

// List all users (HR, admin, employees)
export const listUsers = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Create a new user (HR, admin, employee)
export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, role, first_name, last_name, employee_id, department, position, join_date } = req.body;
    // Password should be hashed in model, but for now, store as plain text for demo (FIXME: hash in production)
    const result = await pool.query(
      `INSERT INTO users (email, password, role, first_name, last_name, employee_id, department, position, join_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [email, password, role, first_name, last_name, employee_id, department, position, join_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Get a user by id
export const getUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Update a user by id
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, role, first_name, last_name, employee_id, department, position, join_date } = req.body;
    const result = await pool.query(
      `UPDATE users SET email=$1, role=$2, first_name=$3, last_name=$4, employee_id=$5, department=$6, position=$7, join_date=$8 WHERE id=$9 RETURNING *`,
      [email, role, first_name, last_name, employee_id, department, position, join_date, id]
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
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
