import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { distanceMetres } from '../utils/geo.js';
import { localNow } from '../utils/time.js';
import { getAllowedOffices } from './office.service.js';

const maxAccuracyM = () => Number(process.env.GPS_MAX_ACCURACY_M) || 100;
const round1 = (n) => Math.round(n * 10) / 10;
const hhmm = (t) => String(t).slice(0, 5);

// Decides whether a reported position is inside the permitted zone. All distances are
// computed here on the server from the coordinates; nothing the client says about
// "being near the office" is trusted.
export function evaluateLocation(offices, { latitude, longitude, accuracy }) {
  const measured = offices
    .map((office) => ({
      office,
      distance: distanceMetres(latitude, longitude, Number(office.latitude), Number(office.longitude)),
    }))
    .sort((a, b) => a.distance - b.distance);

  const nearest = measured[0];
  const inside = measured.find((m) => m.distance <= m.office.radius_m);
  const target = inside || nearest; // office to record: the matched one, else the closest

  const base = {
    office: target.office,
    distanceM: round1(target.distance),
    radiusM: target.office.radius_m,
  };

  if (accuracy != null && accuracy > maxAccuracyM()) {
    return {
      ...base, ok: false,
      message: `GPS accuracy is too low (±${Math.round(accuracy)} m, need ±${maxAccuracyM()} m or better). Turn on precise location, move near a window or outdoors, and try again.`,
    };
  }
  if (!inside) {
    return {
      ...base, ok: false,
      message: `You are ${Math.round(target.distance)} m from ${target.office.name}. You must be within ${target.office.radius_m} m to mark attendance.`,
    };
  }
  return { ...base, ok: true, message: null };
}

// punchType: 'check_in' | 'check_out'. Everything (state checks, location check, the attendance
// write and the log row) happens in one transaction with the employee row locked, so double
// taps and parallel requests can't create duplicate punches.
export async function punch(employeeId, punchType, location) {
  const now = localNow(); // server clock, never the client's
  const conn = await pool.getConnection();
  let rejection = null;
  let result = null;

  try {
    await conn.beginTransaction();

    const [emp] = await conn.query('SELECT employment_status FROM employees WHERE id = ? FOR UPDATE', [employeeId]);
    if (!emp[0]) throw new ApiError(404, 'Employee not found');
    if (['terminated', 'resigned'].includes(emp[0].employment_status)) {
      throw new ApiError(403, 'Former employees cannot mark attendance');
    }

    const [rows] = await conn.query(
      'SELECT * FROM attendance WHERE employee_id = ? AND work_date = ? FOR UPDATE', [employeeId, now.date]
    );
    const existing = rows[0];

    if (punchType === 'check_in') {
      if (existing && ['on_leave', 'holiday', 'absent'].includes(existing.status)) {
        throw new ApiError(409, `Today is already marked as "${existing.status.replace('_', ' ')}". Contact your admin if this is wrong.`);
      }
      if (existing?.check_in) throw new ApiError(409, `You already checked in today at ${hhmm(existing.check_in)}`);
    } else {
      if (!existing?.check_in) throw new ApiError(409, 'You have not checked in today');
      if (existing.check_out) throw new ApiError(409, `You already checked out today at ${hhmm(existing.check_out)}`);
    }

    const offices = await getAllowedOffices(conn, employeeId);
    if (offices.length === 0) {
      throw new ApiError(400, 'No active office location is assigned to you. Please contact your admin.');
    }

    const evaluation = evaluateLocation(offices, location);
    const message = evaluation.ok
      ? `${punchType === 'check_in' ? 'Checked in' : 'Checked out'} at ${evaluation.office.name}`
      : evaluation.message;

    await conn.query(
      `INSERT INTO attendance_logs
         (employee_id, work_date, punch_type, punched_at, latitude, longitude, accuracy_m,
          office_id, office_name, distance_m, radius_m, accepted, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, now.date, punchType, now.dateTime, location.latitude, location.longitude,
       location.accuracy ?? null, evaluation.office.id, evaluation.office.name,
       evaluation.distanceM, evaluation.radiusM, evaluation.ok, message]
    );

    if (!evaluation.ok) {
      // Keep the rejected attempt in the log (commit below), then report it to the caller.
      rejection = new ApiError(403, evaluation.message, {
        distanceM: evaluation.distanceM, radiusM: evaluation.radiusM, office: evaluation.office.name,
      });
    } else {
      if (punchType === 'check_in') {
        if (existing) {
          await conn.query("UPDATE attendance SET check_in = ?, status = 'present' WHERE id = ?", [now.time, existing.id]);
        } else {
          await conn.query(
            "INSERT INTO attendance (employee_id, work_date, check_in, status) VALUES (?, ?, ?, 'present')",
            [employeeId, now.date, now.time]
          );
        }
      } else {
        await conn.query('UPDATE attendance SET check_out = ? WHERE id = ?', [now.time, existing.id]);
      }
      result = {
        punchType, workDate: now.date, time: now.time, message,
        office: { id: evaluation.office.id, name: evaluation.office.name },
        distanceM: evaluation.distanceM, radiusM: evaluation.radiusM,
      };
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  if (rejection) throw rejection;
  return result;
}
