import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Use HH:MM');

// Location sent by the browser. The server never trusts it blindly: it re-computes the
// distance itself (see gpsAttendance.service.js).
export const punchSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().max(1000000).optional().nullable(),
});

export const overrideAttendanceSchema = z.object({
  employeeId: z.number().int().positive(),
  workDate: dateStr,
  status: z.enum(['present', 'absent', 'half_day', 'on_leave', 'holiday']),
  checkIn: timeStr.optional().nullable().or(z.literal('')),
  checkOut: timeStr.optional().nullable().or(z.literal('')),
  reason: z.string().trim().min(5, 'Please give a reason (at least 5 characters)').max(500),
});

export const listAttendanceQuerySchema = z.object({
  employeeId: z.coerce.number().int().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(31),
});

export const listGpsLogsQuerySchema = z.object({
  employeeId: z.coerce.number().int().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accepted: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),
});

export const listOverridesQuerySchema = z.object({
  employeeId: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),
});
