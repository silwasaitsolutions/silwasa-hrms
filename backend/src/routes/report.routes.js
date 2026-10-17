import { Router } from 'express';
import * as controller from '../controllers/report.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(authorize('admin')); // all reports are admin-only in V1

router.get('/dashboard', controller.getDashboardSummary);
router.get('/attendance', controller.getAttendanceReport);
router.get('/attendance/export', controller.exportAttendanceCsv);
router.get('/leave', controller.getLeaveReport);
router.get('/leave/export', controller.exportLeaveCsv);
router.get('/payroll', controller.getPayrollReport);
router.get('/payroll/export', controller.exportPayrollCsv);

export default router;
