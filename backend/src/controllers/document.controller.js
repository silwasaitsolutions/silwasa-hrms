import fs from 'fs';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as documentService from '../services/document.service.js';
import * as employeeService from '../services/employee.service.js';
import { uploadDocumentBodySchema } from '../validators/document.validator.js';

export const uploadDocuments = asyncHandler(async (req, res) => {
  const files = req.files || [];
  try {
    if (files.length === 0) throw new ApiError(400, 'No files uploaded');
    const parsed = uploadDocumentBodySchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(422, 'Invalid document category', parsed.error.flatten());

    const data = await documentService.addDocuments(
      req.params.employeeId, files, parsed.data.category, req.user.id
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    await documentService.removeFiles(files); // don't leave orphaned files behind
    throw err;
  }
});

export const listEmployeeDocuments = asyncHandler(async (req, res) => {
  const data = await documentService.listDocuments(req.params.employeeId);
  res.json({ success: true, data });
});

export const listMyDocuments = asyncHandler(async (req, res) => {
  const employeeId = await employeeService.findEmployeeIdByUserId(req.user.id);
  if (!employeeId) return res.json({ success: true, data: [] });
  const data = await documentService.listDocuments(employeeId);
  res.json({ success: true, data });
});

// Admins can download anything; employees only their own documents.
export const downloadDocument = asyncHandler(async (req, res) => {
  const { doc, filePath } = await documentService.getDocumentFile(req.params.id);

  if (req.user.role !== 'admin') {
    const myEmployeeId = await employeeService.findEmployeeIdByUserId(req.user.id);
    if (doc.employee_id !== myEmployeeId) {
      throw new ApiError(403, 'You do not have access to this document');
    }
  }

  if (!fs.existsSync(filePath)) throw new ApiError(404, 'File is missing from storage');
  res.download(filePath, doc.original_name);
});

export const deleteDocument = asyncHandler(async (req, res) => {
  await documentService.deleteDocument(req.params.id);
  res.json({ success: true, message: 'Document deleted successfully' });
});
