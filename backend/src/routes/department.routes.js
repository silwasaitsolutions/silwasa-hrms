import { Router } from 'express';
import * as controller from '../controllers/department.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createDepartmentSchema, updateDepartmentSchema } from '../validators/department.validator.js';

const router = Router();
router.use(authenticate);

router.get('/', controller.listDepartments); // all authenticated users can view
router.get('/:id', controller.getDepartment);
router.post('/', authorize('admin'), validate(createDepartmentSchema), controller.createDepartment);
router.patch('/:id', authorize('admin'), validate(updateDepartmentSchema), controller.updateDepartment);
router.delete('/:id', authorize('admin'), controller.deleteDepartment);

export default router;
