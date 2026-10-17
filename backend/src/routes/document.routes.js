import { Router } from 'express';
import * as controller from '../controllers/document.controller.js';
import * as documentService from '../services/document.service.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadDocuments } from '../utils/upload.js';

const router = Router();
router.use(authenticate);

// Runs before multer so we never write files for an invalid/non-existent employee.
const requireEmployee = asyncHandler(async (req, res, next) => {
  const id = Number(req.params.employeeId);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, 'Invalid employee id');
  if (!(await documentService.employeeExists(id))) throw new ApiError(404, 'Employee not found');
  req.params.employeeId = id;
  next();
});

router.get('/my', controller.listMyDocuments);
router.get('/employee/:employeeId', authorize('admin'), requireEmployee, controller.listEmployeeDocuments);
router.post('/employee/:employeeId', authorize('admin'), requireEmployee, uploadDocuments, controller.uploadDocuments);
router.get('/:id/download', controller.downloadDocument);
router.delete('/:id', authorize('admin'), controller.deleteDocument);

export default router;
