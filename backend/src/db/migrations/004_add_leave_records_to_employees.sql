-- 004_add_leave_records_to_employees.sql

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS leave_records JSONB DEFAULT '[]'::jsonb;

UPDATE employees
   SET leave_records = '[]'::jsonb
 WHERE leave_records IS NULL;
