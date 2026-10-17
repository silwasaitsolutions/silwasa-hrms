import { asyncHandler } from '../utils/asyncHandler.js';
import * as employeeService from '../services/employee.service.js';
import { toCsv } from '../utils/csv.js';

export const createEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.createEmployee(req.body);
  res.status(201).json({ success: true, data: employee });
});

export const listEmployees = asyncHandler(async (req, res) => {
  const result = await employeeService.listEmployees(req.query);
  res.json({ success: true, ...result });
});

export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.getEmployeeById(req.params.id);
  res.json({ success: true, data: employee });
});

export const getMyProfile = asyncHandler(async (req, res) => {
  const employee = await employeeService.getEmployeeByUserId(req.user.id);
  res.json({ success: true, data: employee });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.updateEmployee(req.params.id, req.body);
  res.json({ success: true, data: employee });
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  await employeeService.deleteEmployee(req.params.id);
  res.json({ success: true, message: 'Employee deleted successfully' });
});

export const exportEmployeesCsv = asyncHandler(async (req, res) => {
  const { items } = await employeeService.listEmployees({ ...req.query, page: 1, limit: 10000 });
  const csv = toCsv(items, [
    { key: 'employee_code', header: 'Employee Code' },
    { key: 'first_name', header: 'First Name' },
    { key: 'last_name', header: 'Last Name' },
    { key: 'email', header: 'Email' },
    { key: 'department_name', header: 'Department' },
    { key: 'designation_title', header: 'Designation' },
    { key: 'employment_status', header: 'Status' },
    { key: 'date_of_joining', header: 'Date of Joining' },
  ]);
  res.header('Content-Type', 'text/csv');
  res.attachment('employees.csv');
  res.send(csv);
});
