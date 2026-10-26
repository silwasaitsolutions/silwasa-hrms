import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { sanitizeTemplateHtml, htmlIsEmpty } from './pdf.service.js';
import { manualFieldsFor } from '../utils/hrPlaceholders.js';

const LIST_SELECT = `
  SELECT t.id, t.name, t.category, t.reference_prefix, t.show_signature, t.is_active, t.created_at, t.updated_at,
         (SELECT COUNT(*) FROM issued_documents i WHERE i.template_id = t.id) AS issued_count
  FROM document_templates t
`;

const shape = (t) => ({ ...t, show_signature: !!t.show_signature, is_active: !!t.is_active });

export async function listTemplates({ search, category, status } = {}) {
  const conditions = [];
  const params = [];
  if (search) { conditions.push('t.name LIKE ?'); params.push(`%${search}%`); }
  if (category) { conditions.push('t.category = ?'); params.push(category); }
  if (status) { conditions.push('t.is_active = ?'); params.push(status === 'active'); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`${LIST_SELECT} ${where} ORDER BY t.name`, params);
  return rows.map(shape);
}

export async function getTemplate(id, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM document_templates WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Template not found');
  const t = shape(rows[0]);
  return { ...t, manual_fields: manualFieldsFor(t.body_html) };
}

function cleanBody(bodyHtml) {
  const clean = sanitizeTemplateHtml(bodyHtml);
  if (htmlIsEmpty(clean)) throw new ApiError(400, 'Template body cannot be empty');
  return clean;
}

export async function createTemplate(data, userId) {
  const [result] = await pool.query(
    `INSERT INTO document_templates (name, category, reference_prefix, body_html, show_signature, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.category, data.referencePrefix, cleanBody(data.bodyHtml), data.showSignature, data.isActive, userId]
  );
  return getTemplate(result.insertId);
}

export async function updateTemplate(id, updates) {
  await getTemplate(id);
  const map = {
    name: 'name', category: 'category', referencePrefix: 'reference_prefix',
    showSignature: 'show_signature', isActive: 'is_active',
  };
  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) { sets.push(`${column} = ?`); params.push(updates[key]); }
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'bodyHtml')) {
    sets.push('body_html = ?');
    params.push(cleanBody(updates.bodyHtml));
  }
  if (sets.length) {
    params.push(id);
    await pool.query(`UPDATE document_templates SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  return getTemplate(id);
}

export async function duplicateTemplate(id, userId) {
  const t = await getTemplate(id);
  return createTemplate({
    name: `${t.name} (Copy)`.slice(0, 150), category: t.category, referencePrefix: t.reference_prefix,
    bodyHtml: t.body_html, showSignature: t.show_signature, isActive: true,
  }, userId);
}

export async function deleteTemplate(id) {
  await getTemplate(id);
  // Issued documents keep a snapshot of the template name (template_id becomes NULL)
  await pool.query('DELETE FROM document_templates WHERE id = ?', [id]);
}
