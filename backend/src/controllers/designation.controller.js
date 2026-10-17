import { asyncHandler } from '../utils/asyncHandler.js';
import * as designationService from '../services/designation.service.js';

export const listDesignations = asyncHandler(async (req, res) => {
  const data = await designationService.listDesignations(req.query.departmentId);
  res.json({ success: true, data });
});

export const getDesignation = asyncHandler(async (req, res) => {
  const data = await designationService.getDesignationById(req.params.id);
  res.json({ success: true, data });
});

export const createDesignation = asyncHandler(async (req, res) => {
  const data = await designationService.createDesignation(req.body);
  res.status(201).json({ success: true, data });
});

export const updateDesignation = asyncHandler(async (req, res) => {
  const data = await designationService.updateDesignation(req.params.id, req.body);
  res.json({ success: true, data });
});

export const deleteDesignation = asyncHandler(async (req, res) => {
  await designationService.deleteDesignation(req.params.id);
  res.json({ success: true, message: 'Designation deleted successfully' });
});
