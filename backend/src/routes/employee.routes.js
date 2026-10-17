import { Router } from 'express';
import * as employeeController from '../controllers/employee.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  listEmployeesQuerySchema,
} from '../validators/employee.validator.js';

const router = Router();

router.use(authenticate);

router.get('/me', employeeController.getMyProfile);

router.get('/', authorize('admin'), validate(listEmployeesQuerySchema, 'query'), employeeController.listEmployees);
router.get('/export/csv', authorize('admin'), employeeController.exportEmployeesCsv);
router.get('/:id', authorize('admin'), employeeController.getEmployee);
router.post('/', authorize('admin'), validate(createEmployeeSchema), employeeController.createEmployee);
router.patch('/:id', authorize('admin'), validate(updateEmployeeSchema), employeeController.updateEmployee);
router.delete('/:id', authorize('admin'), employeeController.deleteEmployee);

export default router;
