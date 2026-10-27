import client from './client.js';

export const getDashboardSummary = () => client.get('/reports/dashboard').then((r) => r.data.data);
export const getAttendanceReport = (params) => client.get('/reports/attendance', { params }).then((r) => r.data.data);
export const getLeaveReport = (params) => client.get('/reports/leave', { params }).then((r) => r.data.data);
export const getPayrollReport = (params) => client.get('/reports/payroll', { params }).then((r) => r.data.data);

const base = () => import.meta.env.VITE_API_BASE_URL || '/api';
export const attendanceExportUrl = (params) => `${base()}/reports/attendance/export?${new URLSearchParams(params)}`;
export const leaveExportUrl = (params) => `${base()}/reports/leave/export?${new URLSearchParams(params)}`;
export const payrollExportUrl = (params) => `${base()}/reports/payroll/export?${new URLSearchParams(params)}`;

// new download csv code addedd

export const downloadAttendanceReport = (params) =>
  client.get('/reports/attendance/export', {
    params,
    responseType: 'blob',
  });

export const downloadLeaveReport = (params) =>
  client.get('/reports/leave/export', {
    params,
    responseType: 'blob',
  });

export const downloadPayrollReport = (params) =>
  client.get('/reports/payroll/export', {
    params,
    responseType: 'blob',
  });
