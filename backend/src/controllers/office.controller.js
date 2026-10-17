import { asyncHandler } from '../utils/asyncHandler.js';
import * as officeService from '../services/office.service.js';

export const listOffices = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await officeService.listOffices() });
});
export const createOffice = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await officeService.createOffice(req.body) });
});
export const updateOffice = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await officeService.updateOffice(req.params.id, req.body) });
});
export const deleteOffice = asyncHandler(async (req, res) => {
  await officeService.deleteOffice(req.params.id);
  res.json({ success: true, message: 'Office deleted successfully' });
});
export const getAssignedEmployees = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await officeService.getAssignedEmployeeIds(req.params.id) });
});
export const setAssignedEmployees = asyncHandler(async (req, res) => {
  const count = await officeService.setAssignedEmployees(req.params.id, req.body.employeeIds);
  res.json({ success: true, data: { assigned: count } });
});
