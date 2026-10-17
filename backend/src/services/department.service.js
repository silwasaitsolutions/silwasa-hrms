import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

export async function listDepartments() {
  const [rows] = await pool.query(
    `SELECT d.*, (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id) AS employee_count
     FROM departments d ORDER BY d.name ASC`
  );
  return rows;
}

export async function getDepartmentById(id) {
  const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Department not found');
  return rows[0];
}

export async function createDepartment({ name, description }) {
  const [existing] = await pool.query('SELECT id FROM departments WHERE name = ?', [name]);
  if (existing.length > 0) throw new ApiError(409, 'Department already exists');

  const [result] = await pool.query(
    'INSERT INTO departments (name, description) VALUES (?, ?)',
    [name, description || null]
  );
  return getDepartmentById(result.insertId);
}

export async function updateDepartment(id, updates) {
  await getDepartmentById(id);
  const fieldMap = { name: 'name', description: 'description', isActive: 'is_active' };
  const setClauses = [];
  const params = [];
  for (const [key, column] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      setClauses.push(`${column} = ?`);
      params.push(updates[key]);
    }
  }
  if (setClauses.length === 0) return getDepartmentById(id);
  params.push(id);
  await pool.query(`UPDATE departments SET ${setClauses.join(', ')} WHERE id = ?`, params);
  return getDepartmentById(id);
}

export async function deleteDepartment(id) {
  await getDepartmentById(id);
  await pool.query('DELETE FROM departments WHERE id = ?', [id]);
}
