import { Router } from 'express';
import * as controller from '../controllers/leave.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createLeaveRequestSchema,
  reviewLeaveRequestSchema,
  listLeaveQuerySchema,
} from '../validators/leave.validator.js';

const router = Router();
router.use(authenticate);

router.get('/types', controller.listLeaveTypes);
router.get('/balance', controller.getBalance);
router.get('/balances', authorize('admin'), controller.listBalances);
router.get('/', validate(listLeaveQuerySchema, 'query'), controller.listLeaveRequests);
router.post('/', validate(createLeaveRequestSchema), controller.createLeaveRequest);
router.patch('/:id/review', authorize('admin'), validate(reviewLeaveRequestSchema), controller.reviewLeaveRequest);
router.patch('/:id/cancel', controller.cancelLeaveRequest);

export default router;
