import { Router } from 'express';
import * as controller from '../controllers/designation.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createDesignationSchema, updateDesignationSchema } from '../validators/designation.validator.js';

const router = Router();
router.use(authenticate);

router.get('/', controller.listDesignations);
router.get('/:id', controller.getDesignation);
router.post('/', authorize('admin'), validate(createDesignationSchema), controller.createDesignation);
router.patch('/:id', authorize('admin'), validate(updateDesignationSchema), controller.updateDesignation);
router.delete('/:id', authorize('admin'), controller.deleteDesignation);

export default router;
