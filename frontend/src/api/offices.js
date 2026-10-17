import client from './client.js';

export const listOffices = () => client.get('/offices').then((r) => r.data.data);
export const createOffice = (payload) => client.post('/offices', payload).then((r) => r.data.data);
export const updateOffice = (id, payload) => client.patch(`/offices/${id}`, payload).then((r) => r.data.data);
export const deleteOffice = (id) => client.delete(`/offices/${id}`).then((r) => r.data);
export const getOfficeEmployees = (id) => client.get(`/offices/${id}/employees`).then((r) => r.data.data);
export const setOfficeEmployees = (id, employeeIds) =>
  client.put(`/offices/${id}/employees`, { employeeIds }).then((r) => r.data.data);
