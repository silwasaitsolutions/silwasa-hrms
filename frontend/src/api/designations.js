import client from './client.js';

export const listDesignations = (departmentId) =>
  client.get('/designations', { params: departmentId ? { departmentId } : {} }).then((r) => r.data.data);
export const createDesignation = (payload) => client.post('/designations', payload).then((r) => r.data.data);
export const updateDesignation = (id, payload) => client.patch(`/designations/${id}`, payload).then((r) => r.data.data);
export const deleteDesignation = (id) => client.delete(`/designations/${id}`).then((r) => r.data);
