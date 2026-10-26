import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { localNow } from '../utils/time.js';
import { getIssuedDocDir } from '../utils/upload.js';
import {
  buildBuiltinValues, fillTemplate, isIsoDate, describeManualField, extractTokens, isBuiltin,
} from '../utils/hrPlaceholders.js';
import { getSettingsRow } from './companySettings.service.js';
import { getTemplate } from './hrTemplate.service.js';
import { renderPdf, sanitizeTemplateHtml, htmlIsEmpty } from './pdf.service.js';

async function loadEmployee(conn, employeeId) {
  const [rows] = await conn.query(
    `SELECT e.*, u.email, d.name AS department_name, dg.title AS designation_title,
            TRIM(CONCAT(COALESCE(m.first_name, ''), ' ', COALESCE(m.last_name, ''))) AS manager_name
     FROM employees e
     JOIN users u ON u.id = e.user_id
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN designations dg ON dg.id = e.designation_id
     LEFT JOIN employees m ON m.id = e.reporting_manager_id
     WHERE e.id = ?`,
    [employeeId]
  );
  if (!rows[0]) throw new ApiError(404, 'Employee not found');
  return rows[0];
}

// Fills the template for one employee and renders the PDF. `problems` lists anything that
// could not be filled (preview shows it as a warning; issuing refuses to continue).
async function generate(conn, { bodyHtml, showSignature, employeeId, issueDate, manualValues, referenceNo, preview, title }) {
  const clean = sanitizeTemplateHtml(bodyHtml);
  if (htmlIsEmpty(clean)) throw new ApiError(400, 'Template body cannot be empty');

  const [employee, company] = await Promise.all([loadEmployee(conn, employeeId), getSettingsRow(conn)]);
  const builtin = buildBuiltinValues({ employee, company, issueDate, referenceNo, manual: manualValues });
  const filled = fillTemplate(clean, builtin, manualValues);

  const pdf = await renderPdf({
    bodyHtml: filled.html, company, showSignature, referenceNo, issueDate, preview, title,
  });
  const problems = {
    missingManual: filled.missingManual.map((k) => describeManualField(k).label),
    emptyBuiltin: filled.emptyBuiltin,
    invalid: filled.invalid,
  };
  problems.any = !!(problems.missingManual.length || problems.emptyBuiltin.length || problems.invalid.length);
  return { pdf, problems };
}

export async function previewDocument({ employeeId, templateId, bodyHtml, showSignature, issueDate, manualValues }) {
  let body = bodyHtml;
  let signature = showSignature;
  if (templateId) {
    const t = await getTemplate(templateId);
    body = bodyHtml ?? t.body_html; // unsaved editor content wins over the stored template
    signature = showSignature ?? t.show_signature;
  }
  return generate(pool, {
    bodyHtml: body, showSignature: signature ?? true, employeeId,
    issueDate: issueDate || localNow().date, manualValues, referenceNo: 'PREVIEW', preview: true, title: 'Preview',
  });
}

function describeProblems(p) {
  const parts = [];
  if (p.missingManual.length) parts.push(`fill in: ${p.missingManual.join(', ')}`);
  if (p.emptyBuiltin.length) parts.push(`employee/company data missing for: ${p.emptyBuiltin.join(', ')}`);
  if (p.invalid.length) parts.push(`invalid placeholder: ${p.invalid.join(', ')}`);
  return parts.join('; ');
}

// Reference numbers look like OFR-2026-0001. The counter row is locked by the surrounding
// transaction, so concurrent issuing can never hand out the same number twice.
async function nextReference(conn, prefix, year) {
  await conn.query(
    `INSERT INTO document_sequences (prefix, seq_year, last_number) VALUES (?, ?, LAST_INSERT_ID(1))
     ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)`,
    [prefix, year]
  );
  const [[{ n }]] = await conn.query('SELECT LAST_INSERT_ID() AS n');
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`;
}

export async function issueDocument({ templateId, employeeId, issueDate, manualValues }, issuedBy) {
  const date = issueDate || localNow().date;
  if (!isIsoDate(date)) throw new ApiError(400, 'Invalid issue date');

  const conn = await pool.getConnection();
  let writtenFile = null;
  try {
    await conn.beginTransaction();

    const template = await getTemplate(templateId, conn);
    if (!template.is_active) throw new ApiError(400, 'This template is deactivated. Activate it before issuing documents.');

    const employee = await loadEmployee(conn, employeeId);
    const year = Number(date.slice(0, 4));
    const referenceNo = await nextReference(conn, template.reference_prefix, year);

    // The body always comes from the stored template, never from the client.
    const { pdf, problems } = await generate(conn, {
      bodyHtml: template.body_html, showSignature: template.show_signature, employeeId, issueDate: date,
      manualValues, referenceNo, preview: false, title: `${template.name} - ${referenceNo}`,
    });
    if (problems.any) {
      throw new ApiError(422, `Cannot issue yet - ${describeProblems(problems)}`, problems);
    }

    const dir = getIssuedDocDir(employeeId);
    await fs.mkdir(dir, { recursive: true });
    const stored = `${crypto.randomUUID()}.pdf`;
    writtenFile = path.join(dir, stored);
    await fs.writeFile(writtenFile, pdf);

    // Only the manual values this template actually uses are recorded
    const used = extractTokens(template.body_html).filter((k) => !isBuiltin(k));
    const recorded = Object.fromEntries(used.map((k) => [k, manualValues[k] ?? '']));

    const [result] = await conn.query(
      `INSERT INTO issued_documents
         (reference_no, template_id, template_name, category, employee_id, issue_date, field_values, pdf_file, file_size, issued_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [referenceNo, template.id, template.name, template.category, employee.id, date,
       JSON.stringify(recorded), stored, pdf.length, issuedBy]
    );

    await conn.commit();
    return getIssuedDocument(result.insertId);
  } catch (err) {
    await conn.rollback();
    if (writtenFile) await fs.rm(writtenFile, { force: true }); // don't leave an orphan PDF behind
    throw err;
  } finally {
    conn.release();
  }
}

const ISSUED_SELECT = `
  SELECT i.id, i.reference_no, i.template_id, i.template_name, i.category, i.employee_id, i.issue_date,
         i.file_size, i.status, i.revoked_reason, i.revoked_at, i.created_at,
         e.employee_code, e.first_name, e.last_name,
         iu.email AS issued_by_email, ru.email AS revoked_by_email
  FROM issued_documents i
  JOIN employees e ON e.id = i.employee_id
  LEFT JOIN users iu ON iu.id = i.issued_by
  LEFT JOIN users ru ON ru.id = i.revoked_by
`;

export async function getIssuedDocument(id) {
  const [rows] = await pool.query(`${ISSUED_SELECT} WHERE i.id = ?`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Document not found');
  return rows[0];
}

export async function listIssued({ search, category, status, employeeId, page, limit }) {
  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('(i.reference_no LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR i.template_name LIKE ?)');
    const t = `%${search}%`;
    params.push(t, t, t, t, t);
  }
  if (category) { conditions.push('i.category = ?'); params.push(category); }
  if (status) { conditions.push('i.status = ?'); params.push(status); }
  if (employeeId) { conditions.push('i.employee_id = ?'); params.push(employeeId); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(`${ISSUED_SELECT} ${where} ORDER BY i.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM issued_documents i JOIN employees e ON e.id = i.employee_id ${where}`, params
  );
  return { items: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// Employees only ever see documents that are still valid (not revoked).
export async function listIssuedForEmployee(employeeId) {
  const [rows] = await pool.query(
    `SELECT i.id, i.reference_no, i.template_name, i.category, i.issue_date, i.file_size
     FROM issued_documents i WHERE i.employee_id = ? AND i.status = 'issued' ORDER BY i.issue_date DESC, i.id DESC`,
    [employeeId]
  );
  return rows;
}

export async function revokeDocument(id, reason, adminUserId) {
  const doc = await getIssuedDocument(id);
  if (doc.status === 'revoked') throw new ApiError(400, 'This document is already revoked');
  await pool.query(
    "UPDATE issued_documents SET status = 'revoked', revoked_reason = ?, revoked_at = NOW(), revoked_by = ? WHERE id = ?",
    [reason, adminUserId, id]
  );
  return getIssuedDocument(id);
}

// viewerEmployeeId = null for admins (can open anything, including revoked documents).
export async function getIssuedFile(id, { isAdmin, employeeId }) {
  const [rows] = await pool.query('SELECT * FROM issued_documents WHERE id = ?', [id]);
  const doc = rows[0];
  if (!doc) throw new ApiError(404, 'Document not found');
  if (!isAdmin && (doc.employee_id !== employeeId || doc.status !== 'issued')) {
    throw new ApiError(404, 'Document not found'); // same answer as "missing": don't reveal other people's documents
  }
  return { doc, filePath: path.join(getIssuedDocDir(doc.employee_id), doc.pdf_file) };
}
