// Starter templates created once on first migration. They are plain, editable examples:
// review the wording with your HR / legal advisor before using them.
export const STARTER_TEMPLATES = [
  {
    name: 'Offer Letter',
    category: 'offer_letter',
    prefix: 'OFR',
    showSignature: true,
    body: `<h2 style="text-align: center">OFFER OF EMPLOYMENT</h2>
<p>Dear {{salutation}} {{employee_name}},</p>
<p>We are pleased to offer you the position of <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department at <strong>{{company_name}}</strong>, with effect from <strong>{{date_of_joining}}</strong>.</p>
<p>Your gross monthly salary will be <strong>{{monthly_salary}}</strong> ({{monthly_salary_in_words}}), which is {{annual_salary}} per annum. Your employee ID will be <strong>{{employee_id}}</strong>.</p>
<p>This offer is subject to satisfactory verification of your documents and references. Please sign and return a copy of this letter as a token of your acceptance.</p>
<p>We look forward to welcoming you to {{company_name}}.</p>
<p>Yours sincerely,</p>`,
  },
  {
    name: 'Experience Certificate',
    category: 'experience_certificate',
    prefix: 'EXP',
    showSignature: true,
    body: `<h2 style="text-align: center">EXPERIENCE CERTIFICATE</h2>
<p style="text-align: center"><strong>TO WHOMSOEVER IT MAY CONCERN</strong></p>
<p style="text-align: justify">This is to certify that <strong>{{salutation}} {{employee_name}}</strong> (Employee ID: {{employee_id}}) was employed with <strong>{{company_name}}</strong> as <strong>{{designation}}</strong> in the {{department}} department from <strong>{{date_of_joining}}</strong> to <strong>{{last_working_date}}</strong>, a period of {{service_period}}.</p>
<p style="text-align: justify">During {{his_her}} tenure with us, {{his_her}} conduct and performance were found to be satisfactory. We thank {{him_her}} for the contribution made to the organisation and wish {{him_her}} every success in future endeavours.</p>
<p>Yours sincerely,</p>`,
  },
  {
    name: 'Relieving Letter',
    category: 'relieving_letter',
    prefix: 'REL',
    showSignature: true,
    body: `<h2 style="text-align: center">RELIEVING LETTER</h2>
<p>Dear {{salutation}} {{employee_name}},</p>
<p style="text-align: justify">This is with reference to your resignation dated <strong>{{resignation_date}}</strong>. We hereby confirm that you have been relieved from your duties as <strong>{{designation}}</strong> ({{department}}) with effect from the close of business hours on <strong>{{last_working_date}}</strong>.</p>
<p style="text-align: justify">You served {{company_name}} for a period of {{service_period}} (Employee ID: {{employee_id}}). We confirm that all your formalities with the company have been completed.</p>
<p>We wish you all the best in your future career.</p>
<p>Yours sincerely,</p>`,
  },
  {
    name: 'Resignation Acceptance Letter',
    category: 'resignation_letter',
    prefix: 'RSG',
    showSignature: true,
    body: `<h2 style="text-align: center">ACCEPTANCE OF RESIGNATION</h2>
<p>Dear {{salutation}} {{employee_name}},</p>
<p style="text-align: justify">We acknowledge receipt of your resignation letter dated <strong>{{resignation_date}}</strong> from the position of <strong>{{designation}}</strong> ({{department}}). Your resignation is accepted, and your last working day will be <strong>{{last_working_date}}</strong>.</p>
<p style="text-align: justify">Please complete the handover of your responsibilities and return all company property before your last working day. Your full and final settlement will be processed as per company policy.</p>
<p>We thank you for your services and wish you well.</p>
<p>Yours sincerely,</p>`,
  },
  {
    name: 'Termination Letter',
    category: 'termination_letter',
    prefix: 'TRM',
    showSignature: true,
    body: `<h2 style="text-align: center">TERMINATION OF EMPLOYMENT</h2>
<p>Dear {{salutation}} {{employee_name}},</p>
<p style="text-align: justify">This letter is to inform you that your employment with <strong>{{company_name}}</strong> as <strong>{{designation}}</strong> (Employee ID: {{employee_id}}) stands terminated with effect from <strong>{{termination_date}}</strong>.</p>
<p style="text-align: justify"><strong>Reason:</strong> {{reason}}</p>
<p style="text-align: justify">You are requested to return all company property in your possession and complete the exit formalities. Your full and final settlement will be processed as per company policy and applicable law.</p>
<p>Yours sincerely,</p>`,
  },
];
