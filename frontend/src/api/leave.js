import client from './client.js';

export const listLeaveTypes = () => client.get('/leave/types').then((r) => r.data.data);
export const listLeaveRequests = (params) => client.get('/leave', { params }).then((r) => r.data);
export const createLeaveRequest = (payload) => client.post('/leave', payload).then((r) => r.data.data);
export const reviewLeaveRequest = (id, payload) => client.patch(`/leave/${id}/review`, payload).then((r) => r.data.data);
export const cancelLeaveRequest = (id) => client.patch(`/leave/${id}/cancel`).then((r) => r.data.data);

export const getMyBalance = () => client.get('/leave/balance').then((r) => r.data.data);
export const listBalances = (params) => client.get('/leave/balances', { params }).then((r) => r.data.data);
