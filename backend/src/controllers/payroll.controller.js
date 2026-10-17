import { asyncHandler } from '../utils/asyncHandler.js';
import * as payrollService from '../services/payroll.service.js';
import * as employeeService from '../services/employee.service.js';

export const generatePayroll = asyncHandler(async (req, res) => {
  const data = await payrollService.generatePayroll(req.body);
  res.status(201).json({ success: true, data });
});

export const generateBulkPayroll = asyncHandler(async (req, res) => {
  const data = await payrollService.generateBulkPayroll(req.body);
  res.status(201).json({ success: true, data, count: data.length });
});

export const listPayroll = asyncHandler(async (req, res) => {
  let query = { ...req.query };
  if (req.user.role !== 'admin') {
    const myProfile = await employeeService.getEmployeeByUserId(req.user.id);
    query.employeeId = myProfile.id;
  }
  const result = await payrollService.listPayroll(query);
  res.json({ success: true, ...result });
});

// A payslip is simply the formatted view of a single payroll record.
export const getPayslip = asyncHandler(async (req, res) => {
  const record = await payrollService.getPayrollById(req.params.id);

  if (req.user.role !== 'admin') {
    const myProfile = await employeeService.getEmployeeByUserId(req.user.id);
    if (record.employee_id !== myProfile.id) {
      return res.status(403).json({ success: false, message: 'You cannot view this payslip' });
    }
  }

  res.json({
    success: true,
    data: {
      ...record,
      pay_period: `${record.pay_month}/${record.pay_year}`,
    },
  });
});

export const updatePayrollStatus = asyncHandler(async (req, res) => {
  const data = await payrollService.updatePayrollStatus(req.params.id, req.body.status);
  res.json({ success: true, data });
});
