import { asyncHandler } from '../utils/asyncHandler.js';
import * as leaveService from '../services/leave.service.js';
import * as employeeService from '../services/employee.service.js';
import * as balanceService from '../services/leaveBalance.service.js';

export const listLeaveTypes = asyncHandler(async (req, res) => {
  const data = await leaveService.listLeaveTypes();
  res.json({ success: true, data });
});

export const createLeaveRequest = asyncHandler(async (req, res) => {
  const myProfile = await employeeService.getEmployeeByUserId(req.user.id);
  const data = await leaveService.createLeaveRequest(myProfile.id, req.body);
  res.status(201).json({ success: true, data });
});

export const listLeaveRequests = asyncHandler(async (req, res) => {
  let query = { ...req.query };
  if (req.user.role !== 'admin') {
    const myProfile = await employeeService.getEmployeeByUserId(req.user.id);
    query.employeeId = myProfile.id;
  }
  const result = await leaveService.listLeaveRequests(query);
  res.json({ success: true, ...result });
});

export const reviewLeaveRequest = asyncHandler(async (req, res) => {
  const data = await leaveService.reviewLeaveRequest(req.params.id, req.user.id, req.body);
  res.json({ success: true, data });
});

export const cancelLeaveRequest = asyncHandler(async (req, res) => {
  const myProfile = await employeeService.getEmployeeByUserId(req.user.id);
  const data = await leaveService.cancelLeaveRequest(req.params.id, myProfile.id);
  res.json({ success: true, data });
});

// Own balance (employee), or any employee's balance when an admin passes ?employeeId=
export const getBalance = asyncHandler(async (req, res) => {
  let employeeId;
  if (req.user.role === 'admin' && req.query.employeeId) {
    employeeId = Number(req.query.employeeId);
  } else {
    employeeId = await employeeService.findEmployeeIdByUserId(req.user.id);
  }
  if (!employeeId) return res.json({ success: true, data: { hasProfile: false } });

  const data = await balanceService.getBalance(employeeId);
  res.json({ success: true, data: { hasProfile: true, ...data } });
});

export const listBalances = asyncHandler(async (req, res) => {
  const data = await balanceService.listBalances({ search: req.query.search });
  res.json({ success: true, data });
});
