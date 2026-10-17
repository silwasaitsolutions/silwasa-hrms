import { z } from 'zod';

export const generatePayrollSchema = z.object({
  employeeId: z.number().int(),
  payMonth: z.number().int().min(1).max(12),
  payYear: z.number().int().min(2000),
  allowances: z.number().nonnegative().optional().default(0),
  deductions: z.number().nonnegative().optional().default(0),
});

export const generateBulkPayrollSchema = z.object({
  payMonth: z.number().int().min(1).max(12),
  payYear: z.number().int().min(2000),
});

export const updatePayrollStatusSchema = z.object({
  status: z.enum(['draft', 'generated', 'paid']),
});

export const listPayrollQuerySchema = z.object({
  employeeId: z.coerce.number().int().optional(),
  payMonth: z.coerce.number().int().optional(),
  payYear: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
