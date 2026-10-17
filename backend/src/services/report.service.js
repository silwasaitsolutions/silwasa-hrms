import pool from '../config/db.js';

export async function getDashboardSummary() {
  const [[employeeCount]] = await pool.query(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN employment_status = 'active' THEN 1 ELSE 0 END) AS active
     FROM employees`
  );
  const [[departmentCount]] = await pool.query('SELECT COUNT(*) AS total FROM departments');
  const [[pendingLeaves]] = await pool.query(
    `SELECT COUNT(*) AS total FROM leave_requests WHERE status = 'pending'`
  );
  const today = new Date().toISOString().slice(0, 10);
  const [[todayAttendance]] = await pool.query(
    `SELECT
       SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present,
       SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent,
       SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) AS on_leave
     FROM attendance WHERE work_date = ?`,
    [today]
  );

  return {
    totalEmployees: employeeCount.total,
    activeEmployees: employeeCount.active || 0,
    totalDepartments: departmentCount.total,
    pendingLeaveRequests: pendingLeaves.total,
    todayAttendance: {
      present: todayAttendance.present || 0,
      absent: todayAttendance.absent || 0,
      onLeave: todayAttendance.on_leave || 0,
    },
  };
}

export async function getAttendanceReport({ startDate, endDate }) {
  const conditions = [];
  const params = [];
  if (startDate) { conditions.push('a.work_date >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('a.work_date <= ?'); params.push(endDate); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT a.work_date, a.status, e.employee_code, e.first_name, e.last_name, d.name AS department_name
     FROM attendance a
     JOIN employees e ON e.id = a.employee_id
     LEFT JOIN departments d ON d.id = e.department_id
     ${where}
     ORDER BY a.work_date DESC`,
    params
  );
  return rows;
}

export async function getLeaveReport({ startDate, endDate }) {
  const conditions = [];
  const params = [];
  if (startDate) { conditions.push('lr.start_date >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('lr.end_date <= ?'); params.push(endDate); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT lr.start_date, lr.end_date, lr.total_days, lr.status, lt.name AS leave_type,
            e.employee_code, e.first_name, e.last_name
     FROM leave_requests lr
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     JOIN employees e ON e.id = lr.employee_id
     ${where}
     ORDER BY lr.start_date DESC`,
    params
  );
  return rows;
}

export async function getPayrollReport({ payMonth, payYear }) {
  const conditions = [];
  const params = [];
  if (payMonth) { conditions.push('p.pay_month = ?'); params.push(payMonth); }
  if (payYear) { conditions.push('p.pay_year = ?'); params.push(payYear); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT p.pay_month, p.pay_year, p.basic_salary, p.allowances, p.deductions, p.net_salary,
            p.status, e.employee_code, e.first_name, e.last_name
     FROM payroll_runs p
     JOIN employees e ON e.id = p.employee_id
     ${where}
     ORDER BY p.pay_year DESC, p.pay_month DESC`,
    params
  );
  return rows;
}
