import client from './client.js';

export const listEmployees = (params) =>
  client.get('/employees', { params }).then((r) => r.data);

export const getEmployee = (id) =>
  client.get(`/employees/${id}`).then((r) => r.data.data);

export const getMyProfile = () =>
  client.get('/employees/me').then((r) => r.data.data);

export const createEmployee = (payload) =>
  client.post('/employees', payload).then((r) => r.data.data);

export const updateEmployee = (id, payload) =>
  client.patch(`/employees/${id}`, payload).then((r) => r.data.data);

export const deleteEmployee = (id) =>
  client.delete(`/employees/${id}`).then((r) => r.data);

export const exportEmployeesCsvUrl = (params) => {
  const query = new URLSearchParams(params).toString();
  return `${import.meta.env.VITE_API_BASE_URL || '/api'}/employees/export/csv?${query}`;
};

// The list endpoint caps page size at 100, so walk all pages (used by dropdowns/pickers).
export async function listAllEmployees() {
  let page = 1;
  let totalPages = 1;
  const items = [];
  do {
    const res = await listEmployees({ page, limit: 100 });
    items.push(...res.items);
    totalPages = res.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);
  return items;
}
