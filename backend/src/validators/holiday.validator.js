import { z } from 'zod';

export const createHolidaySchema = z.object({
  name: z.string().min(1),
  holidayDate: z.string().min(1),
  description: z.string().optional().nullable(),
});

export const updateHolidaySchema = createHolidaySchema.partial();
