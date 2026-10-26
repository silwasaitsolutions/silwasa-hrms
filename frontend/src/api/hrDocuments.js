import client from './client.js';

const unwrap = (r) => r.data.data;

// ---- templates ----
export const getPlaceholders = () => client.get('/hr-documents/placeholders').then(unwrap);
export const listTemplates = (params) => client.get('/hr-documents/templates', { params }).then(unwrap);
export const getTemplate = (id) => client.get(`/hr-documents/templates/${id}`).then(unwrap);
export const createTemplate = (payload) => client.post('/hr-documents/templates', payload).then(unwrap);
export const updateTemplate = (id, payload) => client.patch(`/hr-documents/templates/${id}`, payload).then(unwrap);
export const duplicateTemplate = (id) => client.post(`/hr-documents/templates/${id}/duplicate`).then(unwrap);
export const deleteTemplate = (id) => client.delete(`/hr-documents/templates/${id}`).then((r) => r.data);

// ---- preview / issue ----
// Returns { url, warnings }: url is a blob URL of the PDF (revoke it when done).
export async function previewPdf(payload) {
  try {
    const res = await client.post('/hr-documents/preview', payload, { responseType: 'blob' });
    let warnings = null;
    try {
      const raw = res.headers['x-document-warnings'];
      warnings = raw ? JSON.parse(decodeURIComponent(raw)) : null;
    } catch { /* header is optional */ }
    return { url: URL.createObjectURL(res.data), warnings };
  } catch (err) {
    // With responseType 'blob' error bodies arrive as Blobs; turn them back into JSON.
    if (err.response?.data instanceof Blob) {
      try { err.response.data = JSON.parse(await err.response.data.text()); } catch { /* keep as is */ }
    }
    throw err;
  }
}
export const issueDocument = (payload) => client.post('/hr-documents/issue', payload).then(unwrap);

// ---- history ----
export const listIssued = (params) => client.get('/hr-documents/issued', { params }).then((r) => r.data);
export const listMyIssued = () => client.get('/hr-documents/issued/my').then(unwrap);
export const revokeDocument = (id, reason) => client.post(`/hr-documents/issued/${id}/revoke`, { reason }).then(unwrap);
export const downloadIssuedBlob = (id) =>
  client.get(`/hr-documents/issued/${id}/download`, { responseType: 'blob' }).then((r) => r.data);

// ---- company branding ----
export const getSettings = () => client.get('/hr-documents/settings').then(unwrap);
export const updateSettings = (payload) => client.put('/hr-documents/settings', payload).then(unwrap);
export const uploadAsset = (kind, file) => {
  const form = new FormData();
  form.append('file', file);
  return client.post(`/hr-documents/settings/${kind}`, form).then(unwrap);
};
export const removeAsset = (kind) => client.delete(`/hr-documents/settings/${kind}`).then(unwrap);
export const fetchAssetUrl = (kind) =>
  client.get(`/hr-documents/settings/${kind}/image`, { responseType: 'blob' }).then((r) => URL.createObjectURL(r.data));
