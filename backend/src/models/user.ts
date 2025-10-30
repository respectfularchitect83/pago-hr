import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import pool from '../config/db';

export interface User {
  id: number;
  email: string;
  password: string;
  role: 'admin' | 'hr' | 'employee';
  first_name: string;
  last_name: string;
  employee_id?: string;
  department?: string;
  position?: string;
  join_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export async function createUser(userData: Partial<User>): Promise<User> {
  const { email, password, role, first_name, last_name, ...rest } = userData;
  
  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password!, salt);
  
  const result = await pool.query(
    `INSERT INTO users (
      email, password, role, first_name, last_name,
      employee_id, department, position, join_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
    RETURNING *`,
    [
      email, hashedPassword, role, first_name, last_name,
      rest.employee_id, rest.department, rest.position, rest.join_date
    ]
  );
  
  return result.rows[0];
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  
  return result.rows[0] || null;
}

export async function findUserById(id: number): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  
  return result.rows[0] || null;
}

export async function findUserByEmployeeId(employeeId: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE employee_id = $1',
    [employeeId]
  );

  return result.rows[0] || null;
}

export async function validatePassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password);
}