-- GPS attendance: office locations, employee-office assignment, per-punch location log,
-- and an audit trail for admin corrections. Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS offices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  address VARCHAR(255) DEFAULT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  radius_m INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_office_radius CHECK (radius_m BETWEEN 150 AND 400)
);

-- Employees with NO rows here may use any active office; employees with rows are
-- limited to their assigned offices.
CREATE TABLE IF NOT EXISTS employee_offices (
  employee_id INT NOT NULL,
  office_id INT NOT NULL,
  PRIMARY KEY (employee_id, office_id),
  CONSTRAINT fk_eo_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_eo_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
);

-- One row per check-in/check-out ATTEMPT, accepted or rejected. office_name and radius_m are
-- snapshots so history stays accurate if an office is later renamed, resized or deleted.
-- punched_at is the company-local time (APP_TIMEZONE).
CREATE TABLE IF NOT EXISTS attendance_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  work_date DATE NOT NULL,
  punch_type ENUM('check_in', 'check_out') NOT NULL,
  punched_at DATETIME NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  accuracy_m DECIMAL(8,1) DEFAULT NULL,
  office_id INT DEFAULT NULL,
  office_name VARCHAR(100) DEFAULT NULL,
  distance_m DECIMAL(9,1) DEFAULT NULL,
  radius_m INT DEFAULT NULL,
  accepted BOOLEAN NOT NULL,
  message VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_log_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE SET NULL,
  INDEX idx_logs_employee_date (employee_id, work_date),
  INDEX idx_logs_date (work_date)
);

-- Every admin correction with the mandatory reason, plus before/after values.
CREATE TABLE IF NOT EXISTS attendance_overrides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  work_date DATE NOT NULL,
  old_values TEXT DEFAULT NULL,
  new_values TEXT NOT NULL,
  reason VARCHAR(500) NOT NULL,
  overridden_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_override_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_override_admin FOREIGN KEY (overridden_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_override_employee_date (employee_id, work_date)
);
