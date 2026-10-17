import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { ApiError } from './ApiError.js';

// Env is read lazily because dotenv loads after ES imports are evaluated.
export const getUploadRoot = () => path.resolve(process.env.UPLOAD_DIR || 'uploads');
export const getEmployeeDocDir = (employeeId) =>
  path.join(getUploadRoot(), 'employee-documents', String(employeeId));

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = getEmployeeDocDir(req.params.employeeId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  // Random stored name: the user-supplied name never touches the filesystem path.
  filename: (req, file, cb) =>
    cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
});

// Built per request so env settings (size limit) are read after dotenv has loaded.
export const uploadDocuments = (req, res, next) =>
  multer({
    storage,
    limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB) || 10) * 1024 * 1024, files: 10 },
    fileFilter: (req2, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return cb(new ApiError(400, `File type "${ext || 'unknown'}" is not allowed. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG`));
      }
      cb(null, true);
    },
  }).array('files', 10)(req, res, next);
