import fs from 'fs/promises';
import path from 'path';
import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { getEmployeeDocDir } from '../utils/upload.js';

const SELECT = `
  SELECT d.id, d.employee_id, d.category, d.original_name, d.mime_type, d.file_size, d.created_at,
         u.email AS uploaded_by_email
  FROM employee_documents d
  LEFT JOIN users u ON u.id = d.uploaded_by
`;

export async function employeeExists(employeeId) {
  const [rows] = await pool.query('SELECT id FROM employees WHERE id = ?', [employeeId]);
  return rows.length > 0;
}

export async function addDocuments(employeeId, files, category, uploadedBy) {
  const ids = [];
  for (const file of files) {
    // multer decodes multipart filenames as latin1; restore UTF-8 names
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const [result] = await pool.query(
      `INSERT INTO employee_documents
         (employee_id, category, original_name, stored_name, mime_type, file_size, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, category, originalName.slice(0, 255), file.filename, file.mimetype, file.size, uploadedBy]
    );
    ids.push(result.insertId);
  }
  const [rows] = await pool.query(`${SELECT} WHERE d.id IN (?) ORDER BY d.id`, [ids]);
  return rows;
}

export async function listDocuments(employeeId) {
  const [rows] = await pool.query(`${SELECT} WHERE d.employee_id = ? ORDER BY d.created_at DESC, d.id DESC`, [employeeId]);
  return rows;
}

async function getDocumentRow(id) {
  const [rows] = await pool.query('SELECT * FROM employee_documents WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Document not found');
  return rows[0];
}

// Returns the DB row plus the absolute file path (built from the random stored name only).
export async function getDocumentFile(id) {
  const doc = await getDocumentRow(id);
  return { doc, filePath: path.join(getEmployeeDocDir(doc.employee_id), doc.stored_name) };
}

export async function deleteDocument(id) {
  const { doc, filePath } = await getDocumentFile(id);
  await pool.query('DELETE FROM employee_documents WHERE id = ?', [doc.id]);
  await fs.rm(filePath, { force: true });
}

export async function removeFiles(files = []) {
  await Promise.all(files.map((f) => fs.rm(f.path, { force: true })));
}
