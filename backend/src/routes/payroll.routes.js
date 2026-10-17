import { Router } from 'express';
import * as controller from '../controllers/payroll.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  generatePayrollSchema,
  generateBulkPayrollSchema,
  updatePayrollStatusSchema,
  listPayrollQuerySchema,
} from '../validators/payroll.validator.js';

const router = Router();
router.use(authenticate);

router.get('/', validate(listPayrollQuerySchema, 'query'), controller.listPayroll);
router.get('/:id/payslip', controller.getPayslip);
router.post('/generate', authorize('admin'), validate(generatePayrollSchema), controller.generatePayroll);
router.post('/generate-bulk', authorize('admin'), validate(generateBulkPayrollSchema), controller.generateBulkPayroll);
router.patch('/:id/status', authorize('admin'), validate(updatePayrollStatusSchema), controller.updatePayrollStatus);

export default router;
