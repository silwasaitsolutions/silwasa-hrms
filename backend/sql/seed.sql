-- ============================================================
-- Seed data for local development.
-- Default admin login: admin@hrms.com / Admin@123
-- (bcrypt hash below corresponds to "Admin@123")
-- ============================================================
USE hrms_db;

INSERT INTO departments (name, description) VALUES
  ('Engineering', 'Software development team'),
  ('Human Resources', 'HR and recruitment'),
  ('Sales', 'Sales and business development')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO designations (title, department_id) VALUES
  ('Software Engineer', 1),
  ('Engineering Manager', 1),
  ('HR Executive', 2),
  ('Sales Executive', 3)
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- NOTE: the default admin user is created by `npm run db:init`
-- (src/config/initDb.js), not here, so the password hash is always
-- generated correctly by bcrypt at seed time rather than hardcoded.
