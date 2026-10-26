// Placeholder catalogue + value building for HR document templates.
//
// A template contains tokens like {{employee_name}}. Tokens listed in BUILTIN_GROUPS are filled
// automatically from the employee / company records. Any OTHER token (e.g. {{last_working_date}})
// becomes a "manual field" the admin fills in when issuing the document. A manual token whose
// name ends in "_date" is shown as a date picker and printed as a long date (15 October 2026).

export const BUILTIN_GROUPS = [
  {
    group: 'Employee',
    items: [
      { key: 'employee_name', label: 'Full name' },
      { key: 'first_name', label: 'First name' },
      { key: 'last_name', label: 'Last name' },
      { key: 'salutation', label: 'Mr. / Ms. (from gender)' },
      { key: 'employee_id', label: 'Employee ID (code)' },
      { key: 'designation', label: 'Designation' },
      { key: 'department', label: 'Department' },
      { key: 'date_of_joining', label: 'Date of joining' },
      { key: 'service_period', label: 'Service period (e.g. 2 years and 3 months)' },
      { key: 'monthly_salary', label: 'Monthly salary' },
      { key: 'annual_salary', label: 'Annual salary (monthly x 12)' },
      { key: 'monthly_salary_in_words', label: 'Monthly salary in words' },
      { key: 'annual_salary_in_words', label: 'Annual salary in words' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'address', label: 'Address' },
      { key: 'date_of_birth', label: 'Date of birth' },
      { key: 'reporting_manager', label: 'Reporting manager' },
      { key: 'he_she', label: 'he / she / they' },
      { key: 'He_She', label: 'He / She / They' },
      { key: 'his_her', label: 'his / her / their' },
      { key: 'His_Her', label: 'His / Her / Their' },
      { key: 'him_her', label: 'him / her / them' },
    ],
  },
  {
    group: 'Company',
    items: [
      { key: 'company_name', label: 'Company name' },
      { key: 'company_address', label: 'Company address' },
      { key: 'company_phone', label: 'Company phone' },
      { key: 'company_email', label: 'Company email' },
      { key: 'company_website', label: 'Company website' },
      { key: 'company_registration_no', label: 'Registration / CIN / GST no.' },
      { key: 'signatory_name', label: 'Authorized signatory name' },
      { key: 'signatory_designation', label: 'Authorized signatory designation' },
    ],
  },
  {
    group: 'Document',
    items: [
      { key: 'reference_no', label: 'Reference number' },
      { key: 'issue_date', label: 'Issue date' },
    ],
  },
];

// Ready-made manual fields offered in the editor. Admins can invent their own too.
export const MANUAL_SUGGESTIONS = [
  { key: 'last_working_date', label: 'Last working date' },
  { key: 'resignation_date', label: 'Resignation date' },
  { key: 'termination_date', label: 'Termination date' },
  { key: 'effective_date', label: 'Effective date' },
  { key: 'notice_period', label: 'Notice period' },
  { key: 'reason', label: 'Reason' },
];

const BUILTIN_KEYS = new Set(BUILTIN_GROUPS.flatMap((g) => g.items.map((i) => i.key)));
export const isBuiltin = (key) => BUILTIN_KEYS.has(key);

export const TOKEN_KEY = /^[A-Za-z0-9_]{1,60}$/;

const stripTags = (s) => s.replace(/<[^>]*>/g, '');

// {{ token }}, tolerant of editor markup splitting the token (e.g. {{<strong>name</strong>}}).
const TOKEN_PATTERN = /\{\{([^{}]*?)\}\}/g;

export function extractTokens(html) {
  const found = new Set();
  for (const m of html.matchAll(TOKEN_PATTERN)) {
    const key = stripTags(m[1]).trim();
    if (TOKEN_KEY.test(key)) found.add(key);
  }
  return [...found];
}

export function describeManualField(key) {
  const label = key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  let type = 'text';
  if (key.toLowerCase().endsWith('_date')) type = 'date';
  else if (/reason|remarks|details|notes/i.test(key)) type = 'textarea';
  return { key, label, type };
}

export function manualFieldsFor(html) {
  return extractTokens(html).filter((k) => !isBuiltin(k)).map(describeManualField);
}

// ---------- formatting helpers ----------
export const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isIsoDate = (s) => typeof s === 'string' && ISO_DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

export function formatLongDate(iso) {
  if (!isIsoDate(iso)) return '';
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

export function formatMoney(amount, symbol) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `${symbol}${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function below1000(n) {
  const parts = [];
  if (n >= 100) { parts.push(`${ONES[Math.floor(n / 100)]} Hundred`); n %= 100; }
  if (n >= 20) { parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : '')); }
  else if (n > 0) parts.push(ONES[n]);
  return parts.join(' ');
}

// Indian numbering (thousand, lakh, crore). Rounds to whole currency units.
export function amountInWords(amount, currencyWord = 'Rupees') {
  let n = Math.round(Number(amount));
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1e12) return ''; // beyond what a salary letter needs
  const parts = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1e3); n %= 1e3;
  if (crore) parts.push(`${below1000(crore)} Crore`);
  if (lakh) parts.push(`${below1000(lakh)} Lakh`);
  if (thousand) parts.push(`${below1000(thousand)} Thousand`);
  if (n) parts.push(below1000(n));
  return `${currencyWord} ${parts.join(' ')} Only`;
}

// "2 years and 3 months", "5 months", "less than a month"
export function servicePeriod(fromIso, toIso) {
  if (!isIsoDate(fromIso) || !isIsoDate(toIso)) return '';
  const a = new Date(`${fromIso}T00:00:00Z`);
  const b = new Date(`${toIso}T00:00:00Z`);
  if (b < a) return '';
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  if (months < 1) return 'less than a month';
  const y = Math.floor(months / 12);
  const m = months % 12;
  const yText = y ? `${y} year${y > 1 ? 's' : ''}` : '';
  const mText = m ? `${m} month${m > 1 ? 's' : ''}` : '';
  return [yText, mText].filter(Boolean).join(' and ');
}

const PRONOUNS = {
  male: { he: 'he', his: 'his', him: 'him', sal: 'Mr.' },
  female: { he: 'she', his: 'her', him: 'her', sal: 'Ms.' },
  other: { he: 'they', his: 'their', him: 'them', sal: '' },
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Returns { key: string } for every built-in token. Empty string = "no data available".
export function buildBuiltinValues({ employee, company, issueDate, referenceNo, manual = {} }) {
  const p = PRONOUNS[employee.gender] || PRONOUNS.other;
  const symbol = company.currency_symbol || '';
  const monthly = Number(employee.base_salary) || 0;
  const endForService = isIsoDate(manual.last_working_date) ? manual.last_working_date : issueDate;

  return {
    employee_name: `${employee.first_name} ${employee.last_name}`.trim(),
    first_name: employee.first_name || '',
    last_name: employee.last_name || '',
    salutation: p.sal,
    employee_id: employee.employee_code || '',
    designation: employee.designation_title || '',
    department: employee.department_name || '',
    date_of_joining: formatLongDate(employee.date_of_joining),
    service_period: servicePeriod(employee.date_of_joining, endForService),
    monthly_salary: formatMoney(monthly, symbol),
    annual_salary: formatMoney(monthly * 12, symbol),
    monthly_salary_in_words: amountInWords(monthly, company.currency_word),
    annual_salary_in_words: amountInWords(monthly * 12, company.currency_word),
    email: employee.email || '',
    phone: employee.phone || '',
    address: employee.address || '',
    date_of_birth: formatLongDate(employee.date_of_birth),
    reporting_manager: employee.manager_name || '',
    he_she: p.he, He_She: cap(p.he), his_her: p.his, His_Her: cap(p.his), him_her: p.him,
    company_name: company.company_name || '',
    company_address: (company.address || '').replace(/\s*\n\s*/g, ', '),
    company_phone: company.phone || '',
    company_email: company.email || '',
    company_website: company.website || '',
    company_registration_no: company.registration_no || '',
    signatory_name: company.signatory_name || '',
    signatory_designation: company.signatory_designation || '',
    reference_no: referenceNo,
    issue_date: formatLongDate(issueDate),
  };
}

// Replaces every {{token}} in the HTML. Values are HTML-escaped, so employee data such as a
// name containing "<script>" can never inject markup. Returns the new html plus a report of
// anything that could not be filled.
export function fillTemplate(html, builtinValues, manualValues) {
  const missingManual = new Set();
  const emptyBuiltin = new Set();
  const invalid = new Set();

  const out = html.replace(TOKEN_PATTERN, (whole, inner) => {
    const key = stripTags(inner).trim();
    if (!TOKEN_KEY.test(key)) {
      invalid.add(`{{${key}}}`);
      return whole;
    }
    let value;
    if (isBuiltin(key)) {
      value = builtinValues[key];
      if (!value) emptyBuiltin.add(key);
    } else {
      const field = describeManualField(key);
      const raw = String(manualValues[key] ?? '').trim();
      value = field.type === 'date' && isIsoDate(raw) ? formatLongDate(raw) : raw;
      if (!value) missingManual.add(key);
    }
    if (!value) return escapeHtml(`[${key}]`); // visible marker in previews
    return escapeHtml(value).replace(/\r?\n/g, '<br>');
  });

  return {
    html: out,
    missingManual: [...missingManual],
    emptyBuiltin: [...emptyBuiltin],
    invalid: [...invalid],
  };
}
