-- HR document generation: company branding, templates, reference-number sequences and
-- issued documents. Idempotent: safe to run multiple times.

-- Single row (id = 1) holding the details printed on every document.
CREATE TABLE IF NOT EXISTS company_settings (
  id TINYINT PRIMARY KEY,
  company_name VARCHAR(150) NOT NULL DEFAULT 'Your Company Name',
  address VARCHAR(500) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  website VARCHAR(150) DEFAULT NULL,
  registration_no VARCHAR(100) DEFAULT NULL,
  footer_text VARCHAR(255) DEFAULT NULL,
  signatory_name VARCHAR(100) DEFAULT NULL,
  signatory_designation VARCHAR(100) DEFAULT NULL,
  currency_symbol VARCHAR(10) NOT NULL DEFAULT 'Rs.',
  currency_word VARCHAR(30) NOT NULL DEFAULT 'Rupees',
  logo_file VARCHAR(120) DEFAULT NULL,
  signature_file VARCHAR(120) DEFAULT NULL,
  templates_seeded BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT IGNORE INTO company_settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS document_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'other',
  reference_prefix VARCHAR(10) NOT NULL DEFAULT 'DOC',
  body_html MEDIUMTEXT NOT NULL,
  show_signature BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_template_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_template_active (is_active)
);

-- Per prefix + year counter used to build reference numbers such as OFR-2026-0001.
CREATE TABLE IF NOT EXISTS document_sequences (
  prefix VARCHAR(10) NOT NULL,
  seq_year SMALLINT NOT NULL,
  last_number INT NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix, seq_year)
);

-- An issued document is frozen: the PDF is stored as generated. template_name is a snapshot
-- so history stays readable if the template is later renamed or deleted.
CREATE TABLE IF NOT EXISTS issued_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference_no VARCHAR(40) NOT NULL UNIQUE,
  template_id INT DEFAULT NULL,
  template_name VARCHAR(150) NOT NULL,
  category VARCHAR(40) NOT NULL,
  employee_id INT NOT NULL,
  issue_date DATE NOT NULL,
  field_values TEXT DEFAULT NULL,
  pdf_file VARCHAR(100) NOT NULL,
  file_size INT NOT NULL DEFAULT 0,
  status ENUM('issued', 'revoked') NOT NULL DEFAULT 'issued',
  revoked_reason VARCHAR(500) DEFAULT NULL,
  revoked_at TIMESTAMP NULL DEFAULT NULL,
  revoked_by INT DEFAULT NULL,
  issued_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_issued_template FOREIGN KEY (template_id) REFERENCES document_templates(id) ON DELETE SET NULL,
  CONSTRAINT fk_issued_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_issued_by FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_issued_revoked_by FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_issued_employee (employee_id),
  INDEX idx_issued_category (category),
  INDEX idx_issued_date (issue_date)
);
