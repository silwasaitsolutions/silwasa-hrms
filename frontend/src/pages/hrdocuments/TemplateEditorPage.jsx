import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import * as hrApi from '../../api/hrDocuments.js';
import { DOC_CATEGORIES, manualFieldsFromHtml } from '../../utils/hrDocuments.js';
import RichTextEditor from '../../components/hr/RichTextEditor.jsx';
import PreviewModal from '../../components/hr/PreviewModal.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

const DEFAULT_PREFIX = {
  offer_letter: 'OFR', appointment_letter: 'APT', experience_certificate: 'EXP', relieving_letter: 'REL',
  resignation_letter: 'RSG', termination_letter: 'TRM', salary_certificate: 'SAL', warning_letter: 'WRN', other: 'DOC',
};
const NEW_BODY = '<p>Dear {{salutation}} {{employee_name}},</p><p></p><p>Yours sincerely,</p>';

function EditorForm({ template, placeholders }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !template;

  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState(template?.category || 'other');
  const [prefix, setPrefix] = useState(template?.reference_prefix || 'DOC');
  const [prefixTouched, setPrefixTouched] = useState(!isNew);
  const [showSignature, setShowSignature] = useState(template?.show_signature ?? true);
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [bodyHtml, setBodyHtml] = useState(template?.body_html || NEW_BODY);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const builtinKeys = useMemo(
    () => new Set(placeholders?.builtin.flatMap((g) => g.items.map((i) => i.key)) || []),
    [placeholders]
  );
  const manualFields = useMemo(() => manualFieldsFromHtml(bodyHtml, builtinKeys), [bodyHtml, builtinKeys]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { name, category, referencePrefix: prefix, bodyHtml, showSignature, isActive };
      return isNew ? hrApi.createTemplate(payload) : hrApi.updateTemplate(template.id, payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['hr-templates'] });
      queryClient.invalidateQueries({ queryKey: ['hr-template'] });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
      if (isNew) navigate(`/hr-documents/templates/${saved.id}`, { replace: true });
    },
  });

  const err = saveMutation.error?.response?.data;
  const errText = err?.details?.fieldErrors ? Object.values(err.details.fieldErrors).flat().join(', ') : err?.message;
  const canSave = name.trim() && bodyHtml && !saveMutation.isPending;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button className="btn-secondary px-3" onClick={() => navigate('/hr-documents')}><ArrowLeft size={16} /> Templates</button>
          <h1 className="text-2xl font-semibold text-slate-900">{isNew ? 'New template' : 'Edit template'}</h1>
        </div>
        <div className="flex items-center gap-2">
          {savedMsg && <span className="text-sm text-green-600">Saved</span>}
          <button className="btn-secondary" disabled={!bodyHtml} onClick={() => setPreviewOpen(true)}><Eye size={16} /> Preview PDF</button>
          <button className="btn-primary" disabled={!canSave} onClick={() => saveMutation.mutate()}>
            <Save size={16} /> {saveMutation.isPending ? 'Saving...' : 'Save template'}
          </button>
        </div>
      </div>

      <div className="card p-5 mb-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="label">Template name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Offer Letter" />
        </div>
        <div>
          <label className="label">Document type</label>
          <select className="input" value={category}
            onChange={(e) => { setCategory(e.target.value); if (!prefixTouched) setPrefix(DEFAULT_PREFIX[e.target.value]); }}>
            {DOC_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Reference prefix</label>
          <input className="input uppercase" value={prefix} maxLength={10}
            onChange={(e) => { setPrefix(e.target.value.replace(/[^A-Za-z0-9]/g, '')); setPrefixTouched(true); }} />
          <p className="text-xs text-slate-400 mt-1">e.g. {(prefix || 'DOC').toUpperCase()}-{new Date().getFullYear()}-0001</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
          <input type="checkbox" checked={showSignature} onChange={(e) => setShowSignature(e.target.checked)} />
          Add the authorized signatory block (signature, name, designation) at the end
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active (inactive templates cannot be used to issue documents)
        </label>
      </div>

      <RichTextEditor initialHtml={bodyHtml} onChange={setBodyHtml} placeholders={placeholders} />

      <div className="mt-3 text-sm text-slate-500 space-y-1">
        <p>
          Use <strong>Insert placeholder</strong> to add details such as <code>{'{{employee_name}}'}</code>. The letterhead, reference number, date and signature are added automatically.
        </p>
        {manualFields.length > 0 && (
          <p>This template asks for: <strong>{manualFields.map((f) => f.label).join(', ')}</strong> when a document is issued.</p>
        )}
      </div>
      {saveMutation.isError && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errText || 'Could not save the template'}</p>}

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`Preview: ${name || 'Untitled template'}`}
        source={{ bodyHtml, showSignature }}
        manualFields={manualFields}
        issueTemplate={null}
      />
    </div>
  );
}

export default function TemplateEditorPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const { data: template, isLoading, isError } = useQuery({
    queryKey: ['hr-template', id], queryFn: () => hrApi.getTemplate(id), enabled: !isNew, staleTime: 0,
  });
  const { data: placeholders } = useQuery({ queryKey: ['hr-placeholders'], queryFn: hrApi.getPlaceholders });

  if (!isNew && isLoading) return <Spinner className="mx-auto mt-12" />;
  if (!isNew && isError) return <p className="text-red-600">Template not found.</p>;
  // key remounts the form (and editor) when switching between templates
  return <EditorForm key={isNew ? 'new' : template.id} template={isNew ? null : template} placeholders={placeholders} />;
}
