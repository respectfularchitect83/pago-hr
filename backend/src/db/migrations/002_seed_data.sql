-- 002_seed_data.sql

-- Sample Departments
INSERT INTO users (email, password, role, first_name, last_name, department, position, join_date)
VALUES
  -- HR Team
  ('sarah.hr@pago-hr.com', '$2b$10$rk2PeVhM2nIXeZ1XwjGG7O5kfDBAQ9RKrxUz1JWYSJUYOd1IHnGPm', 'hr', 'Sarah', 'Johnson', 'HR', 'HR Manager', '2024-01-15'),
  ('mike.hr@pago-hr.com', '$2b$10$rk2PeVhM2nIXeZ1XwjGG7O5kfDBAQ9RKrxUz1JWYSJUYOd1IHnGPm', 'hr', 'Mike', 'Wilson', 'HR', 'HR Specialist', '2024-02-01'),
  
  -- Engineering
  ('john.dev@pago-hr.com', '$2b$10$rk2PeVhM2nIXeZ1XwjGG7O5kfDBAQ9RKrxUz1JWYSJUYOd1IHnGPm', 'employee', 'John', 'Smith', 'Engineering', 'Senior Developer', '2024-01-10'),
  ('alice.dev@pago-hr.com', '$2b$10$rk2PeVhM2nIXeZ1XwjGG7O5kfDBAQ9RKrxUz1JWYSJUYOd1IHnGPm', 'employee', 'Alice', 'Brown', 'Engineering', 'Frontend Developer', '2024-03-15'),
  
  -- Finance
  ('robert.fin@pago-hr.com', '$2b$10$rk2PeVhM2nIXeZ1XwjGG7O5kfDBAQ9RKrxUz1JWYSJUYOd1IHnGPm', 'employee', 'Robert', 'Davis', 'Finance', 'Financial Analyst', '2024-02-20'),
  ('emma.fin@pago-hr.com', '$2b$10$rk2PeVhM2nIXeZ1XwjGG7O5kfDBAQ9RKrxUz1JWYSJUYOd1IHnGPm', 'employee', 'Emma', 'Clark', 'Finance', 'Accountant', '2024-03-01');

-- Sample Leave Balances (for 2024)
INSERT INTO leave_balances (user_id, leave_type, year, total_days, used_days)
SELECT 
  u.id,
  leave_type,
  2024,
  CASE 
    WHEN leave_type = 'annual' THEN 20
    WHEN leave_type = 'sick' THEN 10
    ELSE 0
  END,
  0
FROM users u
CROSS JOIN (
  VALUES ('annual'), ('sick'), ('unpaid')
) AS leave_types(leave_type)
WHERE u.role != 'admin';

-- Sample Leave Requests
INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, days_count, status, reason, approved_by, approved_at)
VALUES
  -- John's approved vacation
  ((SELECT id FROM users WHERE email = 'john.dev@pago-hr.com'),
   'annual', '2024-07-01', '2024-07-05', 5, 'approved',
   'Summer vacation',
   (SELECT id FROM users WHERE email = 'sarah.hr@pago-hr.com'),
   '2024-06-15'),
   
  -- Alice's pending sick leave
  ((SELECT id FROM users WHERE email = 'alice.dev@pago-hr.com'),
   'sick', '2024-04-10', '2024-04-11', 2, 'pending',
   'Not feeling well', NULL, NULL);

-- Sample Payslips
INSERT INTO payslips (user_id, period_start, period_end, basic_salary, allowances, deductions, tax, net_salary, status, payment_date)
SELECT
  u.id,
  '2024-03-01',
  '2024-03-31',
  CASE 
    WHEN u.position LIKE '%Manager%' THEN 8000
    WHEN u.position LIKE '%Senior%' THEN 7000
    ELSE 5000
  END as basic_salary,
  1000 as allowances,
  500 as deductions,
  CASE 
    WHEN u.position LIKE '%Manager%' THEN 1600
    WHEN u.position LIKE '%Senior%' THEN 1400
    ELSE 1000
  END as tax,
  CASE 
    WHEN u.position LIKE '%Manager%' THEN 6900
    WHEN u.position LIKE '%Senior%' THEN 6100
    ELSE 4500
  END as net_salary,
  'paid',
  '2024-03-31'
FROM users u
WHERE u.role != 'admin';

-- Sample Messages
INSERT INTO messages (sender_id, recipient_id, subject, content, is_read)
VALUES
  -- HR announcement to all employees
  ((SELECT id FROM users WHERE email = 'sarah.hr@pago-hr.com'),
   (SELECT id FROM users WHERE email = 'john.dev@pago-hr.com'),
   'New HR Policy Update',
   'Please review the updated leave policy in the HR portal.',
   false),
   
  -- Leave request discussion
  ((SELECT id FROM users WHERE email = 'alice.dev@pago-hr.com'),
   (SELECT id FROM users WHERE email = 'sarah.hr@pago-hr.com'),
   'Question about Leave Balance',
   'Hi Sarah, could you please check my remaining annual leave days?',
   true);