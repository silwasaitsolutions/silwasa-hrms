import pool from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

export async function listHolidays(year) {
  const params = [];
  let where = '';
  if (year) {
    where = 'WHERE YEAR(holiday_date) = ?';
    params.push(year);
  }
  const [rows] = await pool.query(`SELECT * FROM holidays ${where} ORDER BY holiday_date ASC`, params);
  return rows;
}

export async function getHolidayById(id) {
  const [rows] = await pool.query('SELECT * FROM holidays WHERE id = ?', [id]);
  if (!rows[0]) throw new ApiError(404, 'Holiday not found');
  return rows[0];
}

export async function createHoliday({ name, holidayDate, description }) {
  const [result] = await pool.query(
    'INSERT INTO holidays (name, holiday_date, description) VALUES (?, ?, ?)',
    [name, holidayDate, description || null]
  );
  return getHolidayById(result.insertId);
}

export async function updateHoliday(id, updates) {
  await getHolidayById(id);
  const fieldMap = { name: 'name', holidayDate: 'holiday_date', description: 'description' };
  const setClauses = [];
  const params = [];
  for (const [key, column] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      setClauses.push(`${column} = ?`);
      params.push(updates[key]);
    }
  }
  if (setClauses.length === 0) return getHolidayById(id);
  params.push(id);
  await pool.query(`UPDATE holidays SET ${setClauses.join(', ')} WHERE id = ?`, params);
  return getHolidayById(id);
}

export async function deleteHoliday(id) {
  await getHolidayById(id);
  await pool.query('DELETE FROM holidays WHERE id = ?', [id]);
}
