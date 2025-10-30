import pool from '../config/db';
import logger from '../utils/logger';

/**
 * Ensures the database schema contains the newest columns required by the
 * current application build. This is a defensive safety net in case the SQL
 * migrations have not been applied yet in a target environment.
 */
export const ensureLatestSchema = async (): Promise<void> => {
  try {
    // Ensure payslip enhancements exist
    await pool.query(`
      ALTER TABLE payslips
        ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES employees(id);
    `);
    await pool.query(`
      ALTER TABLE payslips
        ADD COLUMN IF NOT EXISTS earnings_breakdown JSONB DEFAULT '[]'::jsonb;
    `);
    await pool.query(`
      ALTER TABLE payslips
        ADD COLUMN IF NOT EXISTS deductions_breakdown JSONB DEFAULT '[]'::jsonb;
    `);
    await pool.query(`
      ALTER TABLE payslips
        ADD COLUMN IF NOT EXISTS normal_overtime_hours NUMERIC(10,2) DEFAULT 0;
    `);
    await pool.query(`
      ALTER TABLE payslips
        ADD COLUMN IF NOT EXISTS double_overtime_hours NUMERIC(10,2) DEFAULT 0;
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payslips_employee_id ON payslips(employee_id);
    `);

    // Ensure employees table can persist leave history
    await pool.query(`
      ALTER TABLE employees
        ADD COLUMN IF NOT EXISTS leave_records JSONB DEFAULT '[]'::jsonb;
    `);
    await pool.query(`
      UPDATE employees
         SET leave_records = '[]'::jsonb
       WHERE leave_records IS NULL;
    `);

    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS photo_url TEXT;
    `);
  } catch (error) {
    logger.error('Failed to ensure latest database schema', {
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
};

export default ensureLatestSchema;
