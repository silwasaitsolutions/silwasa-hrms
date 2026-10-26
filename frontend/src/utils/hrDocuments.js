export const DOC_CATEGORIES = [
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'appointment_letter', label: 'Appointment Letter' },
  { value: 'experience_certificate', label: 'Experience Certificate' },
  { value: 'relieving_letter', label: 'Relieving Letter' },
  { value: 'resignation_letter', label: 'Resignation Letter' },
  { value: 'termination_letter', label: 'Termination Letter' },
  { value: 'salary_certificate', label: 'Salary Certificate' },
  { value: 'warning_letter', label: 'Warning Letter' },
  { value: 'other', label: 'Other' },
];

export const docCategoryLabel = (value) => DOC_CATEGORIES.find((c) => c.value === value)?.label || value;

// Local calendar date as YYYY-MM-DD
export const todayIso = () => new Date().toLocaleDateString('en-CA');

const TOKEN = /\{\{([^{}]*?)\}\}/g;
const KEY = /^[A-Za-z0-9_]{1,60}$/;

// Mirrors the server: any {{token}} that is not built-in becomes a field to fill when issuing.
export function manualFieldsFromHtml(html, builtinKeys) {
  const found = new Set();
  for (const m of (html || '').matchAll(TOKEN)) {
    const key = m[1].replace(/<[^>]*>/g, '').trim();
    if (KEY.test(key) && !builtinKeys.has(key)) found.add(key);
  }
  return [...found].map((key) => ({
    key,
    label: key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
    type: key.toLowerCase().endsWith('_date') ? 'date' : /reason|remarks|details|notes/i.test(key) ? 'textarea' : 'text',
  }));
}
