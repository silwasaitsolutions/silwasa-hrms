import { z } from 'zod';

export const DOCUMENT_CATEGORIES = [
  'offer_letter', 'appointment_letter', 'experience_certificate', 'relieving_letter',
  'resignation_letter', 'termination_letter', 'salary_certificate', 'warning_letter', 'other',
];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const prefix = z.string().trim().regex(/^[A-Za-z0-9]{2,10}$/, '2-10 letters or digits').transform((s) => s.toUpperCase());
const manualValues = z.record(z.string().regex(/^[A-Za-z0-9_]{1,60}$/), z.string().max(2000)).default({});

const templateFields = {
  name: z.string().trim().min(1, 'Name is required').max(150),
  category: z.enum(DOCUMENT_CATEGORIES),
  referencePrefix: prefix,
  bodyHtml: z.string().min(1, 'Template body is required').max(300000),
  showSignature: z.boolean(),
  isActive: z.boolean(),
};

export const createTemplateSchema = z.object({
  ...templateFields,
  category: templateFields.category.default('other'),
  referencePrefix: prefix.default('DOC'),
  showSignature: z.boolean().default(true),
  isActive: z.boolean().default(true),
});
export const updateTemplateSchema = z.object(templateFields).partial();

export const listTemplatesQuerySchema = z.object({
  search: z.string().optional(),
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const previewSchema = z
  .object({
    employeeId: z.number().int().positive(),
    templateId: z.number().int().positive().optional(),
    bodyHtml: z.string().max(300000).optional(), // unsaved editor content
    showSignature: z.boolean().optional(),
    issueDate: isoDate.optional(),
    manualValues,
  })
  .refine((d) => d.templateId || d.bodyHtml, { message: 'Provide a templateId or bodyHtml' });

export const issueSchema = z.object({
  templateId: z.number().int().positive(),
  employeeId: z.number().int().positive(),
  issueDate: isoDate.optional(),
  manualValues,
});

export const listIssuedQuerySchema = z.object({
  search: z.string().optional(),
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  status: z.enum(['issued', 'revoked']).optional(),
  employeeId: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const revokeSchema = z.object({
  reason: z.string().trim().min(5, 'Please give a reason (at least 5 characters)').max(500),
});

const optionalText = (max) => z.string().trim().max(max);
export const settingsSchema = z.object({
  companyName: optionalText(150).min(1, 'Company name is required'),
  address: optionalText(500),
  phone: optionalText(50),
  email: z.string().trim().email('Invalid email').or(z.literal('')),
  website: optionalText(150),
  registrationNo: optionalText(100),
  footerText: optionalText(255),
  signatoryName: optionalText(100),
  signatoryDesignation: optionalText(100),
  currencySymbol: optionalText(10).min(1),
  currencyWord: optionalText(30).min(1),
}).partial();
