import { z } from 'zod';

export const MIN_RADIUS_M = 150;
export const MAX_RADIUS_M = 400;

const officeFields = {
  name: z.string().trim().min(1, 'Name is required').max(100),
  address: z.string().trim().max(255).optional().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusM: z.number().int()
    .min(MIN_RADIUS_M, `Radius must be at least ${MIN_RADIUS_M} m`)
    .max(MAX_RADIUS_M, `Radius cannot be more than ${MAX_RADIUS_M} m`),
  isActive: z.boolean(),
};

export const createOfficeSchema = z.object({ ...officeFields, isActive: officeFields.isActive.optional().default(true) });
export const updateOfficeSchema = z.object(officeFields).partial();
export const assignEmployeesSchema = z.object({
  employeeIds: z.array(z.number().int().positive()).max(5000),
});
