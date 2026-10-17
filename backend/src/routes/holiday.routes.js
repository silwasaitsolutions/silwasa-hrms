import { Router } from 'express';
import * as controller from '../controllers/holiday.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createHolidaySchema, updateHolidaySchema } from '../validators/holiday.validator.js';

const router = Router();
router.use(authenticate);

router.get('/', controller.listHolidays);
router.post('/', authorize('admin'), validate(createHolidaySchema), controller.createHoliday);
router.patch('/:id', authorize('admin'), validate(updateHolidaySchema), controller.updateHoliday);
router.delete('/:id', authorize('admin'), controller.deleteHoliday);

export default router;
