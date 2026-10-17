import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

const SELECT = `
  SELECT o.*, (SELECT COUNT(*) FROM employee_offices eo WHERE eo.office_id = o.id) AS employee_count
  FROM offices o
`;

const shape = (o) => ({
  ...o,
  latitude: Number(o.latitude),
  longitude: Number(o.longitude),
  is_active: !!o.is_active,
});

export async function listOffices() {
  const [rows] = await pool.query(`${SELECT} ORDER BY o.name`);
  return rows.map(shape);
}

export async function getOfficeById(id) {
  const [rows] = await pool.query(`${SELECT} WHERE o.id = ?`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Office not found');
  return shape(rows[0]);
}

async function assertNameFree(name, exceptId = null) {
  const [rows] = await pool.query('SELECT id FROM offices WHERE name = ? AND id <> ?', [name, exceptId || 0]);
  if (rows.length) throw new ApiError(409, 'An office with this name already exists');
}

export async function createOffice({ name, address, latitude, longitude, radiusM, isActive }) {
  await assertNameFree(name);
  const [result] = await pool.query(
    'INSERT INTO offices (name, address, latitude, longitude, radius_m, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    [name, address || null, latitude, longitude, radiusM, isActive]
  );
  return getOfficeById(result.insertId);
}

export async function updateOffice(id, updates) {
  await getOfficeById(id);
  if (updates.name) await assertNameFree(updates.name, Number(id));

  const fieldMap = {
    name: 'name', address: 'address', latitude: 'latitude', longitude: 'longitude',
    radiusM: 'radius_m', isActive: 'is_active',
  };
  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sets.push(`${column} = ?`);
      params.push(key === 'address' ? updates[key] || null : updates[key]);
    }
  }
  if (sets.length) {
    params.push(id);
    await pool.query(`UPDATE offices SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  return getOfficeById(id);
}

export async function deleteOffice(id) {
  await getOfficeById(id);
  await pool.query('DELETE FROM offices WHERE id = ?', [id]);
}

export async function getAssignedEmployeeIds(officeId) {
  await getOfficeById(officeId);
  const [rows] = await pool.query('SELECT employee_id FROM employee_offices WHERE office_id = ?', [officeId]);
  return rows.map((r) => r.employee_id);
}

// Replaces the full set of employees assigned to this office.
export async function setAssignedEmployees(officeId, employeeIds) {
  await getOfficeById(officeId);
  const ids = [...new Set(employeeIds)];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (ids.length) {
      const [found] = await conn.query('SELECT id FROM employees WHERE id IN (?)', [ids]);
      if (found.length !== ids.length) throw new ApiError(400, 'One or more employees do not exist');
    }
    await conn.query('DELETE FROM employee_offices WHERE office_id = ?', [officeId]);
    if (ids.length) {
      await conn.query('INSERT INTO employee_offices (employee_id, office_id) VALUES ?', [ids.map((e) => [e, officeId])]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return ids.length;
}

// Active offices this employee may punch at: their assigned ones, or every active office
// when they have no assignments at all.
export async function getAllowedOffices(conn, employeeId) {
  const [[{ assigned }]] = await conn.query(
    'SELECT COUNT(*) AS assigned FROM employee_offices WHERE employee_id = ?', [employeeId]
  );
  const [rows] = assigned > 0
    ? await conn.query(
        `SELECT o.* FROM offices o JOIN employee_offices eo ON eo.office_id = o.id
         WHERE eo.employee_id = ? AND o.is_active = TRUE ORDER BY o.name`, [employeeId])
    : await conn.query('SELECT * FROM offices WHERE is_active = TRUE ORDER BY name');
  return rows;
}
