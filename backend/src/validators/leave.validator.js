import { z } from 'zod';

export const createLeaveRequestSchema = z.object({
  leaveTypeId: z.number().int(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  totalDays: z.number().positive(),
  reason: z.string().optional().nullable(),
});

export const reviewLeaveRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewComment: z.string().optional().nullable(),
});

export const listLeaveQuerySchema = z.object({
  employeeId: z.coerce.number().int().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
