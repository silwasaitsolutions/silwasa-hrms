import { Router } from 'express';
import * as controller from '../controllers/hrDocument.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadBrandingImage } from '../utils/upload.js';
import {
  createTemplateSchema, updateTemplateSchema, listTemplatesQuerySchema, previewSchema,
  issueSchema, listIssuedQuerySchema, revokeSchema, settingsSchema,
} from '../validators/hrDocument.validator.js';

const router = Router();
router.use(authenticate);

router.param('id', (req, res, next, value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, 'Invalid id');
  req.params.id = id;
  next();
});
router.param('kind', (req, res, next, value) => {
  if (!['logo', 'signature'].includes(value)) throw new ApiError(400, 'Unknown image type');
  next();
});

const admin = authorize('admin');

// Employees: their own issued documents only (ownership is re-checked in the service)
router.get('/issued/my', controller.listMyIssued);
router.get('/issued/:id/download', controller.downloadIssued);

// Everything below is admin-only
router.get('/placeholders', admin, controller.getPlaceholders);

router.get('/templates', admin, validate(listTemplatesQuerySchema, 'query'), controller.listTemplates);
router.post('/templates', admin, validate(createTemplateSchema), controller.createTemplate);
router.get('/templates/:id', admin, controller.getTemplate);
router.patch('/templates/:id', admin, validate(updateTemplateSchema), controller.updateTemplate);
router.post('/templates/:id/duplicate', admin, controller.duplicateTemplate);
router.delete('/templates/:id', admin, controller.deleteTemplate);

router.post('/preview', admin, validate(previewSchema), controller.preview);
router.post('/issue', admin, validate(issueSchema), controller.issue);

router.get('/issued', admin, validate(listIssuedQuerySchema, 'query'), controller.listIssued);
router.post('/issued/:id/revoke', admin, validate(revokeSchema), controller.revoke);

router.get('/settings', admin, controller.getSettings);
router.put('/settings', admin, validate(settingsSchema), controller.updateSettings);
router.post('/settings/:kind', admin, uploadBrandingImage, controller.uploadAsset);
router.delete('/settings/:kind', admin, controller.removeAsset);
router.get('/settings/:kind/image', admin, controller.getAssetImage);

export default router;
