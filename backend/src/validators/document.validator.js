import { z } from 'zod';

export const DOCUMENT_CATEGORIES = [
  'onboarding',
  'experience_letter',
  'relieving_letter',
  'health_insurance_portability',
  'pf_uan',
  'salary_slip',
  'other',
];

export const uploadDocumentBodySchema = z.object({
  category: z.enum(DOCUMENT_CATEGORIES).default('other'),
});
