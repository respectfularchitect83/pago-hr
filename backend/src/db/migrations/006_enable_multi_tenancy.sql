-- 006_enable_multi_tenancy.sql

-- Ensure the legacy company_settings table is converted into a multi-tenant companies table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = 'company_settings'
    ) AND NOT EXISTS (
        SELECT 1
          FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = 'companies'
    ) THEN
        ALTER TABLE company_settings RENAME TO companies;
    END IF;
END;
$$;

-- Base companies table definition (idempotent)
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT,
    address TEXT,
    country TEXT,
    branches JSONB DEFAULT '[]'::jsonb,
    logo_url TEXT,
    leave_settings JSONB DEFAULT '{}'::jsonb,
    subscription_status TEXT DEFAULT 'trial',
    primary_contact_email TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add/align columns for existing installations
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS slug TEXT,
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
    ADD COLUMN IF NOT EXISTS primary_contact_email TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Normalise legacy column names
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS leave_settings JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS branches JSONB DEFAULT '[]'::jsonb;

-- Ensure slug values are present and unique
WITH existing AS (
    SELECT id, slug
      FROM companies
)
UPDATE companies
   SET slug = COALESCE(NULLIF(TRIM(LOWER(slug)), ''), 'default')
 WHERE slug IS NULL
    OR TRIM(slug) = '';

DO $$
DECLARE
    default_exists BOOLEAN;
BEGIN
    SELECT TRUE
      INTO default_exists
      FROM companies
     WHERE slug = 'default'
     LIMIT 1;

    IF NOT FOUND THEN
        INSERT INTO companies (slug, name, country)
        VALUES ('default', 'PAGO Payroll Solutions', 'South Africa');
    END IF;
END;
$$;

-- Helper function to ensure a column, fk and index exist for a table
CREATE OR REPLACE FUNCTION ensure_company_column(target_table TEXT)
RETURNS VOID AS $$
DECLARE
    fk_name TEXT := target_table || '_company_id_fkey';
    idx_name TEXT := 'idx_' || target_table || '_company_id';
    default_company_id INT;
BEGIN
    SELECT id INTO default_company_id FROM companies WHERE slug = 'default' LIMIT 1;

    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS company_id INTEGER', target_table);
    EXECUTE format('UPDATE %I SET company_id = COALESCE(company_id, %s)', target_table, default_company_id);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN company_id SET NOT NULL', target_table);

    IF NOT EXISTS (
        SELECT 1
          FROM information_schema.table_constraints
         WHERE table_schema = 'public'
           AND table_name = target_table
           AND constraint_name = fk_name
    ) THEN
        EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
            target_table,
            fk_name
        );
    END IF;

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(company_id)', idx_name, target_table);
END;
$$ LANGUAGE plpgsql;

-- Users table
DO $$
BEGIN
    IF to_regclass('public.users') IS NOT NULL THEN
        PERFORM ensure_company_column('users');

        -- Ensure email uniqueness is scoped per company
        IF EXISTS (
            SELECT 1
              FROM information_schema.table_constraints
             WHERE table_schema = 'public'
               AND table_name = 'users'
               AND constraint_name = 'users_email_key'
        ) THEN
            ALTER TABLE users DROP CONSTRAINT users_email_key;
        END IF;

        CREATE UNIQUE INDEX IF NOT EXISTS users_company_email_unique ON users(company_id, LOWER(email));
    END IF;
END;
$$;

-- Employees table
DO $$
BEGIN
    IF to_regclass('public.employees') IS NOT NULL THEN
        PERFORM ensure_company_column('employees');

        IF EXISTS (
            SELECT 1
              FROM information_schema.table_constraints
             WHERE table_schema = 'public'
               AND table_name = 'employees'
               AND constraint_name = 'employees_employeeid_key'
        ) THEN
            ALTER TABLE employees DROP CONSTRAINT employees_employeeid_key;
        END IF;

        CREATE UNIQUE INDEX IF NOT EXISTS employees_company_employeeid_unique
            ON employees(company_id, LOWER(employeeid))
         WHERE employeeid IS NOT NULL;
    END IF;
END;
$$;

-- Payslips table (populate via employees when available)
DO $$
DECLARE
    default_company_id INT;
BEGIN
    IF to_regclass('public.payslips') IS NOT NULL THEN
        PERFORM ensure_company_column('payslips');

        SELECT id INTO default_company_id FROM companies WHERE slug = 'default' LIMIT 1;

        IF to_regclass('public.employees') IS NOT NULL THEN
            UPDATE payslips p
               SET company_id = e.company_id
              FROM employees e
             WHERE p.employee_id = e.id
               AND p.company_id <> e.company_id;
        END IF;

        UPDATE payslips
           SET company_id = COALESCE(company_id, default_company_id)
         WHERE company_id IS NULL;
    END IF;
END;
$$;

-- Leave requests table
DO $$
DECLARE
    default_company_id INT;
BEGIN
    IF to_regclass('public.leave_requests') IS NOT NULL THEN
        PERFORM ensure_company_column('leave_requests');

        SELECT id INTO default_company_id FROM companies WHERE slug = 'default' LIMIT 1;

        UPDATE leave_requests lr
           SET company_id = COALESCE(u.company_id, lr.company_id, default_company_id)
          FROM users u
         WHERE lr.user_id = u.id
           AND lr.company_id <> u.company_id;
    END IF;
END;
$$;

-- Leave balances table
DO $$
DECLARE
    default_company_id INT;
BEGIN
    IF to_regclass('public.leave_balances') IS NOT NULL THEN
        PERFORM ensure_company_column('leave_balances');

        SELECT id INTO default_company_id FROM companies WHERE slug = 'default' LIMIT 1;

        UPDATE leave_balances lb
           SET company_id = COALESCE(u.company_id, lb.company_id, default_company_id)
          FROM users u
         WHERE lb.user_id = u.id
           AND lb.company_id <> u.company_id;
    END IF;
END;
$$;

-- Messages table
DO $$
DECLARE
    default_company_id INT;
BEGIN
    IF to_regclass('public.messages') IS NOT NULL THEN
        PERFORM ensure_company_column('messages');

        SELECT id INTO default_company_id FROM companies WHERE slug = 'default' LIMIT 1;

        UPDATE messages m
           SET company_id = COALESCE(sender.company_id, recipient.company_id, default_company_id)
          FROM users sender
          LEFT JOIN users recipient ON recipient.id = m.recipient_id
         WHERE m.sender_id = sender.id
           AND m.company_id IS DISTINCT FROM COALESCE(sender.company_id, recipient.company_id, default_company_id);
    END IF;
END;
$$;

-- Cleanup helper
DROP FUNCTION IF EXISTS ensure_company_column(TEXT);
