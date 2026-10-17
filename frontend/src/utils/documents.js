export const DOCUMENT_CATEGORIES = [
  { value: 'onboarding', label: 'Joining / Onboarding' },
  { value: 'experience_letter', label: 'Experience Letter' },
  { value: 'relieving_letter', label: 'Relieving Letter' },
  { value: 'health_insurance_portability', label: 'Health Insurance Portability' },
  { value: 'pf_uan', label: 'PF & UAN Details' },
  { value: 'salary_slip', label: 'Salary Slip' },
  { value: 'other', label: 'Other' },
];

export const categoryLabel = (value) =>
  DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label || value;

export const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
export const ACCEPT_ATTR = ALLOWED_EXTENSIONS.join(',');
export const MAX_UPLOAD_MB = 10;

// Returns an error message, or null if all files are acceptable.
export function validateFiles(files) {
  if (files.length > 10) return 'You can upload at most 10 files at a time';
  for (const f of files) {
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `"${f.name}" is not an allowed type. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG`;
    }
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
      return `"${f.name}" is larger than ${MAX_UPLOAD_MB} MB`;
    }
  }
  return null;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
