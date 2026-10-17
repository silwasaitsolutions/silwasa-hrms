import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { localNow } from '../utils/time.js';
import { getAllowedOffices } from './office.service.js';

const normTime = (t) => (t ? (t.length === 5 ? `${t}:00` : t) : null);

// ---------- Today's status for the check-in screen ----------
// Office coordinates are deliberately NOT returned to employees: only name and radius.
export async function getTodayStatus(employeeId) {
  const now = localNow();
  const [rows] = await pool.query(
    'SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?', [employeeId, now.date]
  );
  const offices = await getAllowedOffices(pool, employeeId);
  return {
    workDate: now.date,
    attendance: rows[0] || null,
    offices: offices.map((o) => ({ id: o.id, name: o.name, address: o.address, radius_m: o.radius_m })),
    maxAccuracyM: Number(process.env.GPS_MAX_ACCURACY_M) || 100,
  };
}

// ---------- History (daily rows, with measured distances from the GPS log) ----------
export async function listAttendance({ employeeId, startDate, endDate, page, limit }) {
  const conditions = [];
  const params = [];
  if (employeeId) { conditions.push('a.employee_id = ?'); params.push(employeeId); }
  if (startDate) { conditions.push('a.work_date >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('a.work_date <= ?'); params.push(endDate); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  // At most one accepted check_in and one accepted check_out exist per employee/day
  // (enforced in punch()), so these joins stay one-to-one.
  const [rows] = await pool.query(
    `SELECT a.*, e.employee_code, e.first_name, e.last_name,
            li.distance_m AS check_in_distance_m, li.office_name AS check_in_office,
            lo.distance_m AS check_out_distance_m, lo.office_name AS check_out_office,
            (SELECT COUNT(*) FROM attendance_overrides o
              WHERE o.employee_id = a.employee_id AND o.work_date = a.work_date) AS correction_count
     FROM attendance a
     JOIN employees e ON e.id = a.employee_id
     LEFT JOIN attendance_logs li ON li.employee_id = a.employee_id AND li.work_date = a.work_date
          AND li.punch_type = 'check_in' AND li.accepted = TRUE
     LEFT JOIN attendance_logs lo ON lo.employee_id = a.employee_id AND lo.work_date = a.work_date
          AND lo.punch_type = 'check_out' AND lo.accepted = TRUE
     ${where} ORDER BY a.work_date DESC, e.first_name LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM attendance a ${where}`, params);

  return {
    items: rows.map((r) => ({
      ...r,
      check_in_distance_m: r.check_in_distance_m == null ? null : Number(r.check_in_distance_m),
      check_out_distance_m: r.check_out_distance_m == null ? null : Number(r.check_out_distance_m),
    })),
    pagination: { page, limit, total: countRows[0].total, totalPages: Math.ceil(countRows[0].total / limit) },
  };
}

export async function getAttendanceSummary(employeeId, month, year) {
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) AS count FROM attendance
     WHERE employee_id = ? AND MONTH(work_date) = ? AND YEAR(work_date) = ?
     GROUP BY status`,
    [employeeId, month, year]
  );
  const summary = { present: 0, absent: 0, half_day: 0, on_leave: 0, holiday: 0 };
  rows.forEach((r) => { summary[r.status] = r.count; });
  return summary;
}

// ---------- GPS log (every attempt, accepted or rejected) ----------
export async function listGpsLogs({ employeeId, startDate, endDate, accepted, page, limit }) {
  const conditions = [];
  const params = [];
  if (employeeId) { conditions.push('l.employee_id = ?'); params.push(employeeId); }
  if (startDate) { conditions.push('l.work_date >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('l.work_date <= ?'); params.push(endDate); }
  if (accepted) { conditions.push('l.accepted = ?'); params.push(accepted === 'true'); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT l.*, e.employee_code, e.first_name, e.last_name
     FROM attendance_logs l JOIN employees e ON e.id = l.employee_id
     ${where} ORDER BY l.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM attendance_logs l ${where}`, params);

  return {
    items: rows.map((r) => ({
      ...r,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      accuracy_m: r.accuracy_m == null ? null : Number(r.accuracy_m),
      distance_m: r.distance_m == null ? null : Number(r.distance_m),
      accepted: !!r.accepted,
    })),
    pagination: { page, limit, total: countRows[0].total, totalPages: Math.ceil(countRows[0].total / limit) },
  };
}

// ---------- Admin correction (override) with mandatory reason + audit trail ----------
const snapshot = (r) => (r ? { status: r.status, check_in: r.check_in, check_out: r.check_out, remarks: r.remarks } : null);

export async function overrideAttendance({ employeeId, workDate, status, checkIn, checkOut, reason }, adminUserId) {
  if (workDate > localNow().date) throw new ApiError(400, 'Cannot correct attendance for a future date');

  const keepTimes = ['present', 'half_day'].includes(status);
  const inTime = keepTimes ? normTime(checkIn) : null;
  const outTime = keepTimes ? normTime(checkOut) : null;
  if (inTime && outTime && outTime <= inTime) throw new ApiError(400, 'Check-out must be after check-in');

  const remarks = `Admin correction: ${reason}`.slice(0, 255);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [emp] = await conn.query('SELECT id FROM employees WHERE id = ? FOR UPDATE', [employeeId]);
    if (!emp[0]) throw new ApiError(404, 'Employee not found');

    const [rows] = await conn.query(
      'SELECT * FROM attendance WHERE employee_id = ? AND work_date = ? FOR UPDATE', [employeeId, workDate]
    );
    const old = rows[0] || null;

    if (old) {
      await conn.query(
        'UPDATE attendance SET status = ?, check_in = ?, check_out = ?, remarks = ? WHERE id = ?',
        [status, inTime, outTime, remarks, old.id]
      );
    } else {
      await conn.query(
        'INSERT INTO attendance (employee_id, work_date, status, check_in, check_out, remarks) VALUES (?, ?, ?, ?, ?, ?)',
        [employeeId, workDate, status, inTime, outTime, remarks]
      );
    }

    const newValues = { status, check_in: inTime, check_out: outTime, remarks };
    await conn.query(
      `INSERT INTO attendance_overrides (employee_id, work_date, old_values, new_values, reason, overridden_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [employeeId, workDate, old ? JSON.stringify(snapshot(old)) : null, JSON.stringify(newValues), reason, adminUserId]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const [result] = await pool.query(
    'SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?', [employeeId, workDate]
  );
  return result[0];
}

const parseJson = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

export async function listOverrides({ employeeId, page, limit }) {
  const params = [];
  let where = '';
  if (employeeId) { where = 'WHERE o.employee_id = ?'; params.push(employeeId); }
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT o.*, e.employee_code, e.first_name, e.last_name, u.email AS admin_email
     FROM attendance_overrides o
     JOIN employees e ON e.id = o.employee_id
     LEFT JOIN users u ON u.id = o.overridden_by
     ${where} ORDER BY o.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM attendance_overrides o ${where}`, params);

  return {
    items: rows.map((r) => ({ ...r, old_values: parseJson(r.old_values), new_values: parseJson(r.new_values) })),
    pagination: { page, limit, total: countRows[0].total, totalPages: Math.ceil(countRows[0].total / limit) },
  };
}
