-- Leave balance, balance ledger, and employee documents.
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS leave_balances (
  employee_id INT PRIMARY KEY,
  balance DECIMAL(6,2) NOT NULL DEFAULT 0,
  last_credited_month CHAR(7) DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_balance_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Every balance change is logged here (audit trail; also what makes refunds traceable).
CREATE TABLE IF NOT EXISTS leave_balance_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  change_amount DECIMAL(6,2) NOT NULL,
  balance_after DECIMAL(6,2) NOT NULL,
  reason ENUM('monthly_credit', 'leave_request', 'leave_rejected', 'leave_cancelled', 'manual_adjustment') NOT NULL,
  leave_request_id INT DEFAULT NULL,
  note VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ledger_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_ledger_leave FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE SET NULL,
  INDEX idx_ledger_employee (employee_id, created_at)
);

CREATE TABLE IF NOT EXISTS employee_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  category VARCHAR(50) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(100) NOT NULL,
  mime_type VARCHAR(100) DEFAULT NULL,
  file_size INT NOT NULL DEFAULT 0,
  uploaded_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_document_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_document_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_documents_employee (employee_id)
);
