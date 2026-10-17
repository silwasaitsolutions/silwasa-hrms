import client from './client.js';

export const listDepartments = () => client.get('/departments').then((r) => r.data.data);
export const createDepartment = (payload) => client.post('/departments', payload).then((r) => r.data.data);
export const updateDepartment = (id, payload) => client.patch(`/departments/${id}`, payload).then((r) => r.data.data);
export const deleteDepartment = (id) => client.delete(`/departments/${id}`).then((r) => r.data);
