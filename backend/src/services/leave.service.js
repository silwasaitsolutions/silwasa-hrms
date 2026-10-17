import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { lockBalance, changeBalance, creditEmployee, assertEnough } from './leaveBalance.service.js';

const SELECT = `
  SELECT lr.*, lt.name AS leave_type_name, lt.uses_balance,
         e.employee_code, e.first_name, e.last_name
  FROM leave_requests lr
  JOIN leave_types lt ON lt.id = lr.leave_type_id
  JOIN employees e ON e.id = lr.employee_id
`;

export async function listLeaveTypes() {
  const [rows] = await pool.query('SELECT * FROM leave_types WHERE is_active = TRUE ORDER BY id');
  return rows.map((r) => ({ ...r, uses_balance: !!r.uses_balance }));
}

export async function getLeaveRequestById(id, conn = pool) {
  const [rows] = await conn.query(`${SELECT} WHERE lr.id = ?`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Leave request not found');
  return rows[0];
}

// Balance-backed leave types are deducted when the request is submitted (the days are
// reserved so the same balance can't be requested twice). Rejection/cancellation refunds
// them; approval changes nothing further.
export async function createLeaveRequest(employeeId, payload) {
  if (new Date(payload.endDate) < new Date(payload.startDate)) {
    throw new ApiError(400, 'End date cannot be before start date');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [emp] = await conn.query('SELECT employment_status FROM employees WHERE id = ?', [employeeId]);
    if (!emp[0]) throw new ApiError(404, 'Employee not found');
    if (['terminated', 'resigned'].includes(emp[0].employment_status)) {
      throw new ApiError(403, 'Former employees cannot request leave');
    }

    const [types] = await conn.query(
      'SELECT id, uses_balance FROM leave_types WHERE id = ? AND is_active = TRUE',
      [payload.leaveTypeId]
    );
    if (!types[0]) throw new ApiError(400, 'Invalid leave type');
    const usesBalance = !!types[0].uses_balance;

    if (usesBalance) {
      await creditEmployee(conn, employeeId); // makes sure this month's credit exists
      const balance = await lockBalance(conn, employeeId);
      assertEnough(balance, payload.totalDays);
    }

    const [result] = await conn.query(
      `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [employeeId, payload.leaveTypeId, payload.startDate, payload.endDate, payload.totalDays, payload.reason || null]
    );

    if (usesBalance) {
      await changeBalance(conn, {
        employeeId, amount: -payload.totalDays, reason: 'leave_request',
        leaveRequestId: result.insertId, note: `${payload.startDate} to ${payload.endDate}`,
      });
    }

    await conn.commit();
    return getLeaveRequestById(result.insertId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function listLeaveRequests({ employeeId, status, page, limit }) {
  const conditions = [];
  const params = [];
  if (employeeId) { conditions.push('lr.employee_id = ?'); params.push(employeeId); }
  if (status) { conditions.push('lr.status = ?'); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `${SELECT} ${where} ORDER BY lr.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM leave_requests lr ${where}`, params);

  return {
    items: rows.map((r) => ({ ...r, uses_balance: !!r.uses_balance })),
    pagination: { page, limit, total: countRows[0].total, totalPages: Math.ceil(countRows[0].total / limit) },
  };
}

// What was actually deducted for this request (0 if nothing, e.g. requests made before this
// feature existed). Refunds use this, so we can never refund more than was taken.
async function getDeductedAmount(conn, leaveRequestId) {
  const [rows] = await conn.query(
    `SELECT COALESCE(SUM(change_amount), 0) AS net FROM leave_balance_ledger
     WHERE leave_request_id = ? AND reason = 'leave_request'`,
    [leaveRequestId]
  );
  return Math.abs(Number(rows[0].net));
}

// Locks the request row so two admins (or a double click) can never refund twice.
async function lockPendingRequest(conn, id) {
  const [rows] = await conn.query(
    `SELECT lr.*, lt.uses_balance FROM leave_requests lr
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.id = ? FOR UPDATE`,
    [id]
  );
  if (!rows[0]) throw new ApiError(404, 'Leave request not found');
  return rows[0];
}

export async function reviewLeaveRequest(id, reviewerId, { status, reviewComment }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const leave = await lockPendingRequest(conn, id);
    if (leave.status !== 'pending') {
      throw new ApiError(400, 'Only pending leave requests can be reviewed');
    }

    await conn.query(
      `UPDATE leave_requests
       SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_comment = ?
       WHERE id = ?`,
      [status, reviewerId, reviewComment || null, id]
    );

    if (status === 'rejected') {
      const deducted = await getDeductedAmount(conn, id);
      if (deducted > 0) {
        await lockBalance(conn, leave.employee_id);
        await changeBalance(conn, {
          employeeId: leave.employee_id, amount: deducted,
          reason: 'leave_rejected', leaveRequestId: id, note: 'Leave request rejected',
        });
      }
    }

    if (status === 'approved') {
      const cursor = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      while (cursor <= end) {
        await conn.query(
          `INSERT INTO attendance (employee_id, work_date, status) VALUES (?, ?, 'on_leave')
           ON DUPLICATE KEY UPDATE status = 'on_leave'`,
          [leave.employee_id, cursor.toISOString().slice(0, 10)]
        );
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    await conn.commit();
    return getLeaveRequestById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function cancelLeaveRequest(id, employeeId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const leave = await lockPendingRequest(conn, id);
    if (leave.employee_id !== employeeId) {
      throw new ApiError(403, 'You can only cancel your own leave requests');
    }
    if (leave.status !== 'pending') {
      throw new ApiError(400, 'Only pending leave requests can be cancelled');
    }

    await conn.query("UPDATE leave_requests SET status = 'cancelled' WHERE id = ?", [id]);

    const deducted = await getDeductedAmount(conn, id);
    if (deducted > 0) {
      await lockBalance(conn, employeeId);
      await changeBalance(conn, {
        employeeId, amount: deducted,
        reason: 'leave_cancelled', leaveRequestId: id, note: 'Leave request cancelled',
      });
    }

    await conn.commit();
    return getLeaveRequestById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
