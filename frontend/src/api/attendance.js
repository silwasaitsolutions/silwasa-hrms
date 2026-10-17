import client from './client.js';

export const listAttendance = (params) => client.get('/attendance', { params }).then((r) => r.data);
export const getAttendanceSummary = (params) => client.get('/attendance/summary', { params }).then((r) => r.data.data);
export const getToday = () => client.get('/attendance/today').then((r) => r.data.data);

// Location is sent for the server to validate; the server decides whether it is accepted.
export const checkIn = (position) => client.post('/attendance/check-in', position).then((r) => r.data.data);
export const checkOut = (position) => client.post('/attendance/check-out', position).then((r) => r.data.data);

export const listGpsLogs = (params) => client.get('/attendance/logs', { params }).then((r) => r.data);

// Admin only
export const overrideAttendance = (payload) => client.post('/attendance/override', payload).then((r) => r.data.data);
export const listOverrides = (params) => client.get('/attendance/overrides', { params }).then((r) => r.data);
