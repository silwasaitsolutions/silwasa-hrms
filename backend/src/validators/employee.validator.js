import { z } from 'zod';

export const createEmployeeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'employee']).default('employee'),
  employeeCode: z.string().min(1, 'Employee code is required'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(), // ISO date
  address: z.string().optional().nullable(),
  departmentId: z.number().int().optional().nullable(),
  designationId: z.number().int().optional().nullable(),
  dateOfJoining: z.string().optional().nullable(),
  reportingManagerId: z.number().int().optional().nullable(),
  baseSalary: z.number().nonnegative().optional().default(0),
});

export const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  departmentId: z.number().int().optional().nullable(),
  designationId: z.number().int().optional().nullable(),
  dateOfJoining: z.string().optional().nullable(),
  employmentStatus: z.enum(['active', 'on_leave', 'terminated', 'resigned']).optional(),
  reportingManagerId: z.number().int().optional().nullable(),
  profilePhotoUrl: z.string().optional().nullable(),
  baseSalary: z.number().nonnegative().optional(),
});

export const listEmployeesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  departmentId: z.coerce.number().int().optional(),
  designationId: z.coerce.number().int().optional(),
  status: z.enum(['active', 'on_leave', 'terminated', 'resigned']).optional(),
});
