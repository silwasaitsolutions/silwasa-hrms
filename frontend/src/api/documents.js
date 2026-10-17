import client from './client.js';

export const listMyDocuments = () => client.get('/documents/my').then((r) => r.data.data);
export const listEmployeeDocuments = (employeeId) =>
  client.get(`/documents/employee/${employeeId}`).then((r) => r.data.data);

export const uploadEmployeeDocuments = (employeeId, files, category) => {
  const form = new FormData();
  form.append('category', category); // text fields first
  files.forEach((file) => form.append('files', file));
  return client.post(`/documents/employee/${employeeId}`, form).then((r) => r.data.data);
};

export const deleteDocument = (id) => client.delete(`/documents/${id}`).then((r) => r.data);

// Downloads go through the authenticated API (the token is a header, so a plain link can't be used).
export async function downloadDocument(doc) {
  const res = await client.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.original_name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
