import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import fs from 'fs/promises';
import { hashPassword } from '../utils/password.js';
import { creditEmployee } from './leaveBalance.service.js';
import { getEmployeeDocDir } from '../utils/upload.js';

const EMPLOYEE_SELECT = `
  SELECT e.id, e.employee_code, e.first_name, e.last_name, e.phone, e.gender,
         e.date_of_birth, e.address, e.department_id, d.name AS department_name,
         e.designation_id, dg.title AS designation_title, e.date_of_joining,
         e.employment_status, e.reporting_manager_id, e.profile_photo_url,
         e.base_salary, u.id AS user_id, u.email, r.name AS role, u.is_active,
         e.created_at, e.updated_at
  FROM employees e
  JOIN users u ON u.id = e.user_id
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN departments d ON d.id = e.department_id
  LEFT JOIN designations dg ON dg.id = e.designation_id
`;

export async function createEmployee(payload) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existingUser] = await conn.query('SELECT id FROM users WHERE email = ?', [payload.email]);
    if (existingUser.length > 0) {
      throw new ApiError(409, 'A user with this email already exists');
    }

    const [existingCode] = await conn.query(
      'SELECT id FROM employees WHERE employee_code = ?',
      [payload.employeeCode]
    );
    if (existingCode.length > 0) {
      throw new ApiError(409, 'This employee code is already in use');
    }

    const [roleRows] = await conn.query('SELECT id FROM roles WHERE name = ?', [payload.role]);
    if (roleRows.length === 0) throw new ApiError(400, 'Invalid role');

    const passwordHash = await hashPassword(payload.password);
    const [userResult] = await conn.query(
      'INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)',
      [payload.email, passwordHash, roleRows[0].id]
    );

    const [empResult] = await conn.query(
      `INSERT INTO employees
        (user_id, employee_code, first_name, last_name, phone, gender, date_of_birth,
         address, department_id, designation_id, date_of_joining, reporting_manager_id, base_salary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userResult.insertId,
        payload.employeeCode,
        payload.firstName,
        payload.lastName,
        payload.phone || null,
        payload.gender || null,
        payload.dateOfBirth || null,
        payload.address || null,
        payload.departmentId || null,
        payload.designationId || null,
        payload.dateOfJoining || null,
        payload.reportingManagerId || null,
        payload.baseSalary || 0,
      ]
    );

    // New employees start with this month's leave credit
    await creditEmployee(conn, empResult.insertId);

    await conn.commit();
    return getEmployeeById(empResult.insertId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function listEmployees({ page, limit, search, departmentId, designationId, status }) {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR u.email LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }
  if (departmentId) {
    conditions.push('e.department_id = ?');
    params.push(departmentId);
  }
  if (designationId) {
    conditions.push('e.designation_id = ?');
    params.push(designationId);
  }
  if (status) {
    conditions.push('e.employment_status = ?');
    params.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `${EMPLOYEE_SELECT} ${whereClause} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM employees e JOIN users u ON u.id = e.user_id ${whereClause}`,
    params
  );

  return {
    items: rows,
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  };
}

export async function getEmployeeById(id) {
  const [rows] = await pool.query(`${EMPLOYEE_SELECT} WHERE e.id = ?`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Employee not found');
  return rows[0];
}

export async function findEmployeeIdByUserId(userId) {
  const [rows] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
  return rows[0]?.id || null;
}

export async function getEmployeeByUserId(userId) {
  const [rows] = await pool.query(`${EMPLOYEE_SELECT} WHERE e.user_id = ?`, [userId]);
  if (!rows[0]) throw new ApiError(404, 'Employee profile not found');
  return rows[0];
}

export async function updateEmployee(id, updates) {
  await getEmployeeById(id); // ensures existence

  const fieldMap = {
    firstName: 'first_name',
    lastName: 'last_name',
    phone: 'phone',
    gender: 'gender',
    dateOfBirth: 'date_of_birth',
    address: 'address',
    departmentId: 'department_id',
    designationId: 'designation_id',
    dateOfJoining: 'date_of_joining',
    employmentStatus: 'employment_status',
    reportingManagerId: 'reporting_manager_id',
    profilePhotoUrl: 'profile_photo_url',
    baseSalary: 'base_salary',
  };

  const setClauses = [];
  const params = [];
  for (const [key, column] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      setClauses.push(`${column} = ?`);
      params.push(updates[key]);
    }
  }

  if (setClauses.length === 0) {
    return getEmployeeById(id);
  }

  params.push(id);
  await pool.query(`UPDATE employees SET ${setClauses.join(', ')} WHERE id = ?`, params);
  return getEmployeeById(id);
}

export async function deleteEmployee(id) {
  const employee = await getEmployeeById(id);
  // Deleting the user cascades to the employee row (FK ON DELETE CASCADE)
  await pool.query('DELETE FROM users WHERE id = ?', [employee.user_id]);
  // Document rows are removed by FK cascade; remove the files from disk too
  await fs.rm(getEmployeeDocDir(id), { recursive: true, force: true });
}
