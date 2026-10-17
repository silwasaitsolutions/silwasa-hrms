import { Router } from 'express';
import * as controller from '../controllers/office.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createOfficeSchema, updateOfficeSchema, assignEmployeesSchema } from '../validators/office.validator.js';

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/', controller.listOffices);
router.post('/', validate(createOfficeSchema), controller.createOffice);
router.patch('/:id', validate(updateOfficeSchema), controller.updateOffice);
router.delete('/:id', controller.deleteOffice);
router.get('/:id/employees', controller.getAssignedEmployees);
router.put('/:id/employees', validate(assignEmployeesSchema), controller.setAssignedEmployees);

export default router;
