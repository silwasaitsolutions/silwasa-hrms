import fs from 'fs';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { BUILTIN_GROUPS, MANUAL_SUGGESTIONS } from '../utils/hrPlaceholders.js';
import * as templateService from '../services/hrTemplate.service.js';
import * as documentService from '../services/hrDocument.service.js';
import * as settingsService from '../services/companySettings.service.js';
import * as employeeService from '../services/employee.service.js';

// ---- placeholders & templates ----
export const getPlaceholders = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { builtin: BUILTIN_GROUPS, manual: MANUAL_SUGGESTIONS } });
});
export const listTemplates = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await templateService.listTemplates(req.query) });
});
export const getTemplate = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await templateService.getTemplate(req.params.id) });
});
export const createTemplate = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await templateService.createTemplate(req.body, req.user.id) });
});
export const updateTemplate = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await templateService.updateTemplate(req.params.id, req.body) });
});
export const duplicateTemplate = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await templateService.duplicateTemplate(req.params.id, req.user.id) });
});
export const deleteTemplate = asyncHandler(async (req, res) => {
  await templateService.deleteTemplate(req.params.id);
  res.json({ success: true, message: 'Template deleted successfully' });
});

// ---- preview / issue ----
export const preview = asyncHandler(async (req, res) => {
  const { pdf, problems } = await documentService.previewDocument(req.body);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'inline; filename="preview.pdf"',
    'X-Document-Warnings': encodeURIComponent(JSON.stringify(problems)),
    'Cache-Control': 'no-store',
  });
  res.send(pdf);
});

export const issue = asyncHandler(async (req, res) => {
  const data = await documentService.issueDocument(req.body, req.user.id);
  res.status(201).json({ success: true, data });
});

// ---- history / download ----
export const listIssued = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await documentService.listIssued(req.query)) });
});

export const listMyIssued = asyncHandler(async (req, res) => {
  const employeeId = await employeeService.findEmployeeIdByUserId(req.user.id);
  const data = employeeId ? await documentService.listIssuedForEmployee(employeeId) : [];
  res.json({ success: true, data });
});

export const downloadIssued = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const employeeId = isAdmin ? null : await employeeService.findEmployeeIdByUserId(req.user.id);
  const { doc, filePath } = await documentService.getIssuedFile(req.params.id, { isAdmin, employeeId });
  if (!fs.existsSync(filePath)) throw new ApiError(404, 'File is missing from storage');
  res.download(filePath, `${doc.reference_no}.pdf`);
});

export const revoke = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await documentService.revokeDocument(req.params.id, req.body.reason, req.user.id) });
});

// ---- company branding ----
export const getSettings = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await settingsService.getSettings() });
});
export const updateSettings = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await settingsService.updateSettings(req.body) });
});
export const uploadAsset = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await settingsService.setAsset(req.params.kind, req.file) });
});
export const removeAsset = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await settingsService.removeAsset(req.params.kind) });
});
export const getAssetImage = asyncHandler(async (req, res) => {
  const filePath = await settingsService.getAssetPath(req.params.kind);
  if (!fs.existsSync(filePath)) throw new ApiError(404, 'Image file is missing');
  res.set('Cache-Control', 'no-store');
  res.sendFile(filePath);
});
