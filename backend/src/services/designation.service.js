import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

const SELECT = `
  SELECT dg.*, d.name AS department_name
  FROM designations dg
  LEFT JOIN departments d ON d.id = dg.department_id
`;

export async function listDesignations(departmentId) {
  const conditions = [];
  const params = [];
  if (departmentId) {
    conditions.push('dg.department_id = ?');
    params.push(departmentId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`${SELECT} ${where} ORDER BY dg.title ASC`, params);
  return rows;
}

export async function getDesignationById(id) {
  const [rows] = await pool.query(`${SELECT} WHERE dg.id = ?`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Designation not found');
  return rows[0];
}

export async function createDesignation({ title, departmentId }) {
  const [result] = await pool.query(
    'INSERT INTO designations (title, department_id) VALUES (?, ?)',
    [title, departmentId || null]
  );
  return getDesignationById(result.insertId);
}

export async function updateDesignation(id, updates) {
  await getDesignationById(id);
  const fieldMap = { title: 'title', departmentId: 'department_id', isActive: 'is_active' };
  const setClauses = [];
  const params = [];
  for (const [key, column] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      setClauses.push(`${column} = ?`);
      params.push(updates[key]);
    }
  }
  if (setClauses.length === 0) return getDesignationById(id);
  params.push(id);
  await pool.query(`UPDATE designations SET ${setClauses.join(', ')} WHERE id = ?`, params);
  return getDesignationById(id);
}

export async function deleteDesignation(id) {
  await getDesignationById(id);
  await pool.query('DELETE FROM designations WHERE id = ?', [id]);
}
