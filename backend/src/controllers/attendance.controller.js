import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as attendanceService from '../services/attendance.service.js';
import * as gpsService from '../services/gpsAttendance.service.js';
import * as employeeService from '../services/employee.service.js';

async function requireEmployeeId(req) {
  const id = await employeeService.findEmployeeIdByUserId(req.user.id);
  if (!id) throw new ApiError(403, 'No employee profile is linked to this account');
  return id;
}

export const checkIn = asyncHandler(async (req, res) => {
  const data = await gpsService.punch(await requireEmployeeId(req), 'check_in', req.body);
  res.status(201).json({ success: true, data });
});

export const checkOut = asyncHandler(async (req, res) => {
  const data = await gpsService.punch(await requireEmployeeId(req), 'check_out', req.body);
  res.json({ success: true, data });
});

export const getToday = asyncHandler(async (req, res) => {
  const employeeId = await employeeService.findEmployeeIdByUserId(req.user.id);
  if (!employeeId) return res.json({ success: true, data: { hasProfile: false } });
  const data = await attendanceService.getTodayStatus(employeeId);
  res.json({ success: true, data: { hasProfile: true, ...data } });
});

export const listAttendance = asyncHandler(async (req, res) => {
  const query = { ...req.query };
  if (req.user.role !== 'admin') query.employeeId = await requireEmployeeId(req);
  const result = await attendanceService.listAttendance(query);
  res.json({ success: true, ...result });
});

export const listGpsLogs = asyncHandler(async (req, res) => {
  const query = { ...req.query };
  if (req.user.role !== 'admin') query.employeeId = await requireEmployeeId(req);
  const result = await attendanceService.listGpsLogs(query);
  res.json({ success: true, ...result });
});

export const getSummary = asyncHandler(async (req, res) => {
  let employeeId = req.query.employeeId;
  if (req.user.role !== 'admin') employeeId = await requireEmployeeId(req);
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();
  const summary = await attendanceService.getAttendanceSummary(employeeId, month, year);
  res.json({ success: true, data: summary });
});

export const overrideAttendance = asyncHandler(async (req, res) => {
  const data = await attendanceService.overrideAttendance(req.body, req.user.id);
  res.json({ success: true, data });
});

export const listOverrides = asyncHandler(async (req, res) => {
  const result = await attendanceService.listOverrides(req.query);
  res.json({ success: true, ...result });
});
