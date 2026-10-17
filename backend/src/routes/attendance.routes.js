import { Router } from 'express';
import * as controller from '../controllers/attendance.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { punchLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import {
  punchSchema, overrideAttendanceSchema, listAttendanceQuerySchema,
  listGpsLogsQuerySchema, listOverridesQuerySchema,
} from '../validators/attendance.validator.js';

const router = Router();
router.use(authenticate);

router.get('/', validate(listAttendanceQuerySchema, 'query'), controller.listAttendance);
router.get('/today', controller.getToday);
router.get('/summary', controller.getSummary);
router.get('/logs', validate(listGpsLogsQuerySchema, 'query'), controller.listGpsLogs);
router.get('/overrides', authorize('admin'), validate(listOverridesQuerySchema, 'query'), controller.listOverrides);

// Employees can ONLY create attendance through these GPS-validated endpoints.
router.post('/check-in', punchLimiter, validate(punchSchema), controller.checkIn);
router.post('/check-out', punchLimiter, validate(punchSchema), controller.checkOut);

// Admin correction: reason is mandatory and the change is audited.
router.post('/override', authorize('admin'), validate(overrideAttendanceSchema), controller.overrideAttendance);

export default router;
