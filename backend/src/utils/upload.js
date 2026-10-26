import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { ApiError } from './ApiError.js';

// Env is read lazily because dotenv loads after ES imports are evaluated.
export const getUploadRoot = () => path.resolve(process.env.UPLOAD_DIR || 'uploads');
export const getEmployeeDocDir = (employeeId) =>
  path.join(getUploadRoot(), 'employee-documents', String(employeeId));

// Issued HR letters live inside the employee's folder, so deleting an employee removes them too.
export const getIssuedDocDir = (employeeId) => path.join(getEmployeeDocDir(employeeId), 'issued');
export const getBrandingDir = () => path.join(getUploadRoot(), 'branding');

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

// ---- Branding images (logo / signature): PNG or JPEG only (what the PDF engine can embed) ----
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

// Identifies the real type from the file's first bytes; the file name/mime type is not trusted.
export function detectImageType(buffer) {
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  return null;
}

const brandingUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: IMAGE_MAX_BYTES, files: 1 } }).single('file');

export const uploadBrandingImage = (req, res, next) =>
  brandingUpload(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') return next(new ApiError(413, 'Image is too large (max 2 MB)'));
    next(err);
  });
