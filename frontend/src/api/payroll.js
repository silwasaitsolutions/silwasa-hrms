import client from './client.js';

export const listPayroll = (params) => client.get('/payroll', { params }).then((r) => r.data);
export const generatePayroll = (payload) => client.post('/payroll/generate', payload).then((r) => r.data.data);
export const generateBulkPayroll = (payload) => client.post('/payroll/generate-bulk', payload).then((r) => r.data);
export const getPayslip = (id) => client.get(`/payroll/${id}/payslip`).then((r) => r.data.data);
export const updatePayrollStatus = (id, status) => client.patch(`/payroll/${id}/status`, { status }).then((r) => r.data.data);
