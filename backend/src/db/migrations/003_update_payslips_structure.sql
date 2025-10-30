-- 003_update_payslips_structure.sql

-- Add richer payslip data to support earnings/deductions breakdowns and link to employees
ALTER TABLE payslips
  ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES employees(id);

ALTER TABLE payslips
  ADD COLUMN IF NOT EXISTS earnings_breakdown JSONB DEFAULT '[]'::jsonb;

ALTER TABLE payslips
  ADD COLUMN IF NOT EXISTS deductions_breakdown JSONB DEFAULT '[]'::jsonb;

ALTER TABLE payslips
  ADD COLUMN IF NOT EXISTS normal_overtime_hours NUMERIC(10,2) DEFAULT 0;

ALTER TABLE payslips
  ADD COLUMN IF NOT EXISTS double_overtime_hours NUMERIC(10,2) DEFAULT 0;

-- Try to backfill employee_id for existing rows using linked user emails
UPDATE payslips p
SET employee_id = e.id
FROM employees e
JOIN users u ON u.id = p.user_id
WHERE e.email IS NOT NULL
  AND u.email IS NOT NULL
  AND LOWER(e.email) = LOWER(u.email)
  AND p.employee_id IS NULL;

-- Helpful index for lookups by employee
CREATE INDEX IF NOT EXISTS idx_payslips_employee_id ON payslips(employee_id);
