import client from './client.js';

export const listHolidays = (year) => client.get('/holidays', { params: year ? { year } : {} }).then((r) => r.data.data);
export const createHoliday = (payload) => client.post('/holidays', payload).then((r) => r.data.data);
export const updateHoliday = (id, payload) => client.patch(`/holidays/${id}`, payload).then((r) => r.data.data);
export const deleteHoliday = (id) => client.delete(`/holidays/${id}`).then((r) => r.data);
