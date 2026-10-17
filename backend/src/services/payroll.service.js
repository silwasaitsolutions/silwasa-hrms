import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

const SELECT = `
  SELECT p.*, e.employee_code, e.first_name, e.last_name, d.name AS department_name
  FROM payroll_runs p
  JOIN employees e ON e.id = p.employee_id
  LEFT JOIN departments d ON d.id = e.department_id
`;

// Counts working days present/on-leave for the given month, used to compute payroll.
async function getAttendanceCounts(employeeId, month, year) {
  const [rows] = await pool.query(
    `SELECT
       SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS days_present,
       SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) AS days_on_leave
     FROM attendance
     WHERE employee_id = ? AND MONTH(work_date) = ? AND YEAR(work_date) = ?`,
    [employeeId, month, year]
  );
  return {
    daysPresent: rows[0].days_present || 0,
    daysOnLeave: rows[0].days_on_leave || 0,
  };
}

export async function generatePayroll({ employeeId, payMonth, payYear, allowances = 0, deductions = 0 }) {
  const [empRows] = await pool.query('SELECT base_salary FROM employees WHERE id = ?', [employeeId]);
  if (!empRows[0]) throw new ApiError(404, 'Employee not found');

  const baseSalary = Number(empRows[0].base_salary);
  const { daysPresent, daysOnLeave } = await getAttendanceCounts(employeeId, payMonth, payYear);
  const netSalary = baseSalary + Number(allowances) - Number(deductions);

  await pool.query(
    `INSERT INTO payroll_runs
       (employee_id, pay_month, pay_year, basic_salary, allowances, deductions, net_salary, days_present, days_on_leave, status, generated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated', NOW())
     ON DUPLICATE KEY UPDATE
       basic_salary = VALUES(basic_salary), allowances = VALUES(allowances), deductions = VALUES(deductions),
       net_salary = VALUES(net_salary), days_present = VALUES(days_present), days_on_leave = VALUES(days_on_leave),
       status = 'generated', generated_at = NOW()`,
    [employeeId, payMonth, payYear, baseSalary, allowances, deductions, netSalary, daysPresent, daysOnLeave]
  );

  const [rows] = await pool.query(
    `${SELECT} WHERE p.employee_id = ? AND p.pay_month = ? AND p.pay_year = ?`,
    [employeeId, payMonth, payYear]
  );
  return rows[0];
}

export async function generateBulkPayroll({ payMonth, payYear }) {
  const [employees] = await pool.query('SELECT id FROM employees WHERE employment_status = "active"');
  const results = [];
  for (const emp of employees) {
    const record = await generatePayroll({ employeeId: emp.id, payMonth, payYear });
    results.push(record);
  }
  return results;
}

export async function listPayroll({ employeeId, payMonth, payYear, page, limit }) {
  const conditions = [];
  const params = [];
  if (employeeId) { conditions.push('p.employee_id = ?'); params.push(employeeId); }
  if (payMonth) { conditions.push('p.pay_month = ?'); params.push(payMonth); }
  if (payYear) { conditions.push('p.pay_year = ?'); params.push(payYear); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `${SELECT} ${where} ORDER BY p.pay_year DESC, p.pay_month DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM payroll_runs p ${where}`, params);

  return {
    items: rows,
    pagination: { page, limit, total: countRows[0].total, totalPages: Math.ceil(countRows[0].total / limit) },
  };
}

export async function getPayrollById(id) {
  const [rows] = await pool.query(`${SELECT} WHERE p.id = ?`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Payroll record not found');
  return rows[0];
}

export async function updatePayrollStatus(id, status) {
  await getPayrollById(id);
  const paidAtClause = status === 'paid' ? ', paid_at = NOW()' : '';
  await pool.query(`UPDATE payroll_runs SET status = ? ${paidAtClause} WHERE id = ?`, [status, id]);
  return getPayrollById(id);
}
