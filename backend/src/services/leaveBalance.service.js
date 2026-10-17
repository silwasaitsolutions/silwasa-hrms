import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

// Env is read lazily (not at import time) because dotenv loads after ES imports are evaluated.
const monthlyCredit = () => Number(process.env.LEAVE_MONTHLY_CREDIT) || 1.5;
const timezone = () => process.env.APP_TIMEZONE || 'Asia/Kolkata';

// "YYYY-MM" for the given date in the company timezone.
export function currentYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone(), year: 'numeric', month: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}`;
}

function monthsBetween(fromYm, toYm) {
  const [fy, fm] = fromYm.split('-').map(Number);
  const [ty, tm] = toYm.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

// All functions below taking `conn` expect to run inside a transaction owned by the caller.

// Creates the balance row if missing, locks it, and returns the current balance as a number.
export async function lockBalance(conn, employeeId) {
  await conn.query('INSERT IGNORE INTO leave_balances (employee_id, balance) VALUES (?, 0)', [employeeId]);
  const [rows] = await conn.query('SELECT balance FROM leave_balances WHERE employee_id = ? FOR UPDATE', [employeeId]);
  return Number(rows[0].balance);
}

export async function changeBalance(conn, { employeeId, amount, reason, leaveRequestId = null, note = null }) {
  await conn.query('UPDATE leave_balances SET balance = balance + ? WHERE employee_id = ?', [amount, employeeId]);
  const [rows] = await conn.query('SELECT balance FROM leave_balances WHERE employee_id = ?', [employeeId]);
  await conn.query(
    `INSERT INTO leave_balance_ledger (employee_id, change_amount, balance_after, reason, leave_request_id, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [employeeId, amount, rows[0].balance, reason, leaveRequestId, note]
  );
}

// Credits the monthly allowance if this month hasn't been credited yet.
// Idempotent: calling it repeatedly in the same month does nothing. If the server missed
// earlier months (e.g. it was down on the 1st), those months are credited too.
export async function creditEmployee(conn, employeeId) {
  await lockBalance(conn, employeeId);
  const [rows] = await conn.query('SELECT last_credited_month FROM leave_balances WHERE employee_id = ?', [employeeId]);
  const last = rows[0].last_credited_month;
  const ym = currentYearMonth();
  if (last === ym) return 0;

  const months = last ? monthsBetween(last, ym) : 1;
  if (months <= 0) return 0;

  const amount = months * monthlyCredit();
  await conn.query('UPDATE leave_balances SET last_credited_month = ? WHERE employee_id = ?', [ym, employeeId]);
  await changeBalance(conn, {
    employeeId, amount, reason: 'monthly_credit',
    note: months === 1 ? `Monthly credit for ${ym}` : `Credit for ${months} months up to ${ym}`,
  });
  return amount;
}

// Runs for every current employee. Called by the monthly cron job and on server start.
export async function creditAllEmployees() {
  const [employees] = await pool.query(
    "SELECT id FROM employees WHERE employment_status IN ('active', 'on_leave')"
  );
  let credited = 0;
  for (const { id } of employees) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const amount = await creditEmployee(conn, id);
      await conn.commit();
      if (amount > 0) credited += 1;
    } catch (err) {
      await conn.rollback();
      console.error(`Leave credit failed for employee ${id}:`, err.message);
    } finally {
      conn.release();
    }
  }
  return credited;
}

export async function getBalance(employeeId) {
  const [rows] = await pool.query(
    'SELECT balance, last_credited_month FROM leave_balances WHERE employee_id = ?',
    [employeeId]
  );
  if (!rows[0]) return { balance: 0, lastCreditedMonth: null };
  return { balance: Number(rows[0].balance), lastCreditedMonth: rows[0].last_credited_month };
}

export async function listBalances({ search } = {}) {
  const params = [];
  let where = '';
  if (search) {
    where = 'WHERE (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  const [rows] = await pool.query(
    `SELECT e.id AS employee_id, e.employee_code, e.first_name, e.last_name, e.employment_status,
            d.name AS department_name,
            COALESCE(lb.balance, 0) AS balance, lb.last_credited_month
     FROM employees e
     LEFT JOIN leave_balances lb ON lb.employee_id = e.id
     LEFT JOIN departments d ON d.id = e.department_id
     ${where}
     ORDER BY e.first_name, e.last_name`,
    params
  );
  return rows.map((r) => ({ ...r, balance: Number(r.balance) }));
}

export function assertEnough(balance, requested) {
  if (balance < requested) {
    throw new ApiError(
      400,
      `Insufficient leave balance: ${balance} day(s) available, ${requested} requested. ` +
        'Please select Unpaid Leave as the leave type.'
    );
  }
}
