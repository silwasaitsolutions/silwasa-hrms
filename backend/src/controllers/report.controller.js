import { asyncHandler } from '../utils/asyncHandler.js';
import * as reportService from '../services/report.service.js';
import { toCsv } from '../utils/csv.js';

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const data = await reportService.getDashboardSummary();
  res.json({ success: true, data });
});

export const getAttendanceReport = asyncHandler(async (req, res) => {
  const data = await reportService.getAttendanceReport(req.query);
  res.json({ success: true, data });
});

export const exportAttendanceCsv = asyncHandler(async (req, res) => {
  const rows = await reportService.getAttendanceReport(req.query);
  const csv = toCsv(rows, [
    { key: 'work_date', header: 'Date' },
    { key: 'employee_code', header: 'Employee Code' },
    { key: 'first_name', header: 'First Name' },
    { key: 'last_name', header: 'Last Name' },
    { key: 'department_name', header: 'Department' },
    { key: 'status', header: 'Status' },
  ]);
  res.header('Content-Type', 'text/csv');
  res.attachment('attendance-report.csv');
  res.send(csv);
});

export const getLeaveReport = asyncHandler(async (req, res) => {
  const data = await reportService.getLeaveReport(req.query);
  res.json({ success: true, data });
});

export const exportLeaveCsv = asyncHandler(async (req, res) => {
  const rows = await reportService.getLeaveReport(req.query);
  const csv = toCsv(rows, [
    { key: 'employee_code', header: 'Employee Code' },
    { key: 'first_name', header: 'First Name' },
    { key: 'last_name', header: 'Last Name' },
    { key: 'leave_type', header: 'Leave Type' },
    { key: 'start_date', header: 'Start Date' },
    { key: 'end_date', header: 'End Date' },
    { key: 'total_days', header: 'Total Days' },
    { key: 'status', header: 'Status' },
  ]);
  res.header('Content-Type', 'text/csv');
  res.attachment('leave-report.csv');
  res.send(csv);
});

export const getPayrollReport = asyncHandler(async (req, res) => {
  const data = await reportService.getPayrollReport(req.query);
  res.json({ success: true, data });
});

export const exportPayrollCsv = asyncHandler(async (req, res) => {
  const rows = await reportService.getPayrollReport(req.query);
  const csv = toCsv(rows, [
    { key: 'employee_code', header: 'Employee Code' },
    { key: 'first_name', header: 'First Name' },
    { key: 'last_name', header: 'Last Name' },
    { key: 'pay_month', header: 'Month' },
    { key: 'pay_year', header: 'Year' },
    { key: 'basic_salary', header: 'Basic Salary' },
    { key: 'allowances', header: 'Allowances' },
    { key: 'deductions', header: 'Deductions' },
    { key: 'net_salary', header: 'Net Salary' },
    { key: 'status', header: 'Status' },
  ]);
  res.header('Content-Type', 'text/csv');
  res.attachment('payroll-report.csv');
  res.send(csv);
});
