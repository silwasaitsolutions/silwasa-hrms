import { z } from 'zod';

export const createDesignationSchema = z.object({
  title: z.string().min(1),
  departmentId: z.number().int().optional().nullable(),
});

export const updateDesignationSchema = z.object({
  title: z.string().min(1).optional(),
  departmentId: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
});
