import { createRequire } from 'module';
import { JSDOM } from 'jsdom';
import sanitizeHtml from 'sanitize-html';
import { readAssetDataUri } from './companySettings.service.js';
import { formatLongDate } from '../utils/hrPlaceholders.js';

// pdfmake / html-to-pdfmake are CommonJS packages
const require = createRequire(import.meta.url);
const PdfPrinter = require('pdfmake');
const htmlToPdfmake = require('html-to-pdfmake');
const vfs = require('pdfmake/build/vfs_fonts.js');

const font = (name) => Buffer.from(vfs[name], 'base64');
const printer = new PdfPrinter({
  Roboto: {
    normal: font('Roboto-Regular.ttf'),
    bold: font('Roboto-Medium.ttf'),
    italics: font('Roboto-Italic.ttf'),
    bolditalics: font('Roboto-MediumItalic.ttf'),
  },
});

// A DOM is needed to parse HTML. Scripts are never executed (jsdom default).
const { window } = new JSDOM('');

// What the rich-text editor can produce. Everything else (scripts, iframes, images, event
// handlers, links, arbitrary CSS) is stripped before the HTML goes anywhere near the PDF.
const SANITIZE = {
  allowedTags: ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'span', 'div', 'blockquote'],
  allowedAttributes: { '*': ['style'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'] },
  allowedStyles: { '*': { 'text-align': [/^(left|right|center|justify)$/] } },
  disallowedTagsMode: 'discard',
};

export const sanitizeTemplateHtml = (html) => sanitizeHtml(html || '', SANITIZE);

export const htmlIsEmpty = (html) =>
  sanitizeHtml(html || '', { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/g, ' ').trim() === '';

const DEFAULT_STYLES = {
  p: { margin: [0, 0, 0, 8] },
  h1: { fontSize: 20, bold: true, margin: [0, 6, 0, 10] },
  h2: { fontSize: 16, bold: true, margin: [0, 6, 0, 8] },
  h3: { fontSize: 13, bold: true, margin: [0, 4, 0, 6] },
  h4: { fontSize: 11, bold: true, margin: [0, 4, 0, 4] },
  ul: { margin: [0, 0, 0, 8] },
  ol: { margin: [0, 0, 0, 8] },
  table: { margin: [0, 2, 0, 10] },
};

// Full-width tables with even columns (the default is "shrink to content").
function widenTables(node) {
  if (Array.isArray(node)) return node.forEach(widenTables);
  if (!node || typeof node !== 'object') return;
  if (node.table) {
    const cols = node.table.body?.[0]?.length || 1;
    node.table.widths = Array(cols).fill('*');
    node.table.body.forEach((row) => row.forEach(widenTables));
  }
  ['stack', 'ul', 'ol', 'text', 'columns'].forEach((k) => {
    if (Array.isArray(node[k])) widenTables(node[k]);
  });
}

function bodyToContent(html) {
  const clean = sanitizeTemplateHtml(html).replace(/<p([^>]*)>\s*<\/p>/g, '<p$1>&nbsp;</p>'); // keep blank lines
  const content = [].concat(htmlToPdfmake(clean, { window, defaultStyles: DEFAULT_STYLES }));
  widenTables(content);
  return content;
}

/**
 * Renders the final PDF.
 * @param {object} p
 * @param {string} p.bodyHtml      HTML with placeholders already filled
 * @param {object} p.company       company_settings row
 * @param {boolean} p.showSignature
 * @param {string} p.referenceNo
 * @param {string} p.issueDate     ISO date
 * @param {boolean} p.preview      adds a PREVIEW watermark
 */
export async function renderPdf({ bodyHtml, company, showSignature, referenceNo, issueDate, preview, title }) {
  const [logo, signature] = await Promise.all([
    readAssetDataUri(company, 'logo'),
    readAssetDataUri(company, 'signature'),
  ]);

  const contact = [company.phone, company.email, company.website].filter(Boolean).join('  |  ');
  const addressLines = (company.address || '').split(/\r?\n/).filter(Boolean);

  const fullHeader = {
    margin: [60, 28, 60, 0],
    stack: [
      {
        columns: [
          logo ? { image: logo, fit: [130, 55], width: 140 } : { text: '', width: 10 },
          {
            width: '*', alignment: 'right',
            stack: [
              { text: company.company_name || '', bold: true, fontSize: 15 },
              ...addressLines.map((l) => ({ text: l, fontSize: 9, color: '#555555' })),
              ...(contact ? [{ text: contact, fontSize: 9, color: '#555555', margin: [0, 2, 0, 0] }] : []),
            ],
          },
        ],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 8, x2: 475, y2: 8, lineWidth: 1, lineColor: '#1c3ef5' }] },
    ],
  };
  const slimHeader = {
    margin: [60, 30, 60, 0],
    text: `${company.company_name || ''}   |   Ref: ${referenceNo}`,
    fontSize: 9, color: '#777777',
  };

  const signatureBlock = showSignature
    ? {
        unbreakable: true,
        margin: [0, 18, 0, 0],
        stack: [
          signature ? { image: signature, fit: [150, 60], margin: [0, 4, 0, 2] } : { text: '', margin: [0, 28, 0, 0] },
          ...(company.signatory_name ? [{ text: company.signatory_name, bold: true }] : []),
          ...(company.signatory_designation ? [{ text: company.signatory_designation }] : []),
          { text: `For ${company.company_name || ''}`, color: '#555555' },
        ],
      }
    : null;

  const definition = {
    pageSize: 'A4',
    pageMargins: [60, 125, 60, 70],
    info: { title: title || referenceNo, author: company.company_name || 'HRMS', creator: 'HRMS' },
    defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.25 },
    ...(preview ? { watermark: { text: 'PREVIEW', color: '#888888', opacity: 0.12, bold: true } } : {}),
    header: (page) => (page === 1 ? fullHeader : slimHeader),
    footer: (page, pages) => ({
      margin: [60, 18, 60, 0],
      columns: [
        { text: company.footer_text || company.registration_no || '', fontSize: 8, color: '#777777', width: '*' },
        { text: `${referenceNo}  |  Page ${page} of ${pages}`, fontSize: 8, color: '#777777', alignment: 'right', width: 'auto' },
      ],
    }),
    content: [
      {
        text: [
          { text: 'Ref No: ', bold: true }, referenceNo,
          { text: '          Date: ', bold: true }, formatLongDate(issueDate),
        ],
        margin: [0, 0, 0, 14],
      },
      ...bodyToContent(bodyHtml),
      ...(signatureBlock ? [signatureBlock] : []),
    ],
  };

  const doc = printer.createPdfKitDocument(definition);
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  await new Promise((resolve, reject) => {
    doc.on('end', resolve);
    doc.on('error', reject);
    doc.end();
  });
  return Buffer.concat(chunks);
}
