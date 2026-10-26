import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, RefreshCw, FileCheck2, Download, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import * as hrApi from '../../api/hrDocuments.js';
import * as employeesApi from '../../api/employees.js';
import { saveBlob } from '../../utils/download.js';
import { todayIso } from '../../utils/hrDocuments.js';

const apiMessage = (err, fallback) => {
  const d = err?.response?.data;
  if (d?.details?.fieldErrors) return Object.values(d.details.fieldErrors).flat().join(', ');
  return d?.message || fallback;
};

/**
 * Pick an employee, fill the manual fields, preview the PDF and (optionally) issue it.
 * source: { templateId?, bodyHtml?, showSignature? }  - bodyHtml previews unsaved editor content
 * issueTemplate: { id, name } enables the "Issue" button (requires a saved template)
 */
export default function PreviewModal({ open, onClose, title, source, manualFields, issueTemplate }) {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState('');
  const [issueDate, setIssueDate] = useState(todayIso());
  const [values, setValues] = useState({});
  const [preview, setPreview] = useState(null); // { url, warnings }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [issued, setIssued] = useState(null);
  const urlRef = useRef(null);

  const { data: employees = [] } = useQuery({ queryKey: ['all-employees'], queryFn: employeesApi.listAllEmployees, enabled: open });

  const clearPreview = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setPreview(null);
  };

  useEffect(() => {
    if (open) {
      setEmployeeId(''); setIssueDate(todayIso()); setValues({}); setError(null); setIssued(null); clearPreview();
    }
    return () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const runPreview = async (empId = employeeId) => {
    if (!empId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await hrApi.previewPdf({
        employeeId: Number(empId),
        ...(source.templateId ? { templateId: source.templateId } : {}),
        ...(source.bodyHtml ? { bodyHtml: source.bodyHtml } : {}),
        ...(source.showSignature !== undefined ? { showSignature: source.showSignature } : {}),
        issueDate,
        manualValues: values,
      });
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = result.url;
      setPreview(result);
    } catch (err) {
      setError(apiMessage(err, 'Could not generate the preview'));
    } finally {
      setLoading(false);
    }
  };

  const issueMutation = useMutation({
    mutationFn: () => hrApi.issueDocument({
      templateId: issueTemplate.id, employeeId: Number(employeeId), issueDate, manualValues: values,
    }),
    onSuccess: (doc) => {
      setIssued(doc);
      queryClient.invalidateQueries({ queryKey: ['hr-issued'] });
      queryClient.invalidateQueries({ queryKey: ['hr-templates'] });
    },
  });

  if (!open) return null;

  const employee = employees.find((e) => String(e.id) === String(employeeId));
  const w = preview?.warnings;
  const blocked = !preview || !!w?.any;

  const doIssue = () => {
    const who = employee ? `${employee.first_name} ${employee.last_name}` : 'this employee';
    if (confirm(`Issue "${issueTemplate.name}" to ${who}?\n\nA reference number will be assigned and the employee will be able to download it from My Documents.`)) {
      issueMutation.mutate();
    }
  };

  const download = async () => saveBlob(await hrApi.downloadIssuedBlob(issued.id), `${issued.reference_no}.pdf`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative card w-full max-w-6xl h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          <div className="lg:w-80 shrink-0 overflow-y-auto p-5 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-200">
            {issued ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700"><CheckCircle2 size={20} /><span className="font-semibold">Document issued</span></div>
                <div className="rounded-lg bg-green-50 p-3 text-sm">
                  <p className="text-slate-500">Reference number</p>
                  <p className="text-lg font-semibold text-slate-900">{issued.reference_no}</p>
                  <p className="text-slate-500 mt-2">Issue date</p>
                  <p className="text-slate-900">{issued.issue_date}</p>
                </div>
                <p className="text-sm text-slate-500">
                  {issued.first_name} {issued.last_name} can now download it from their My Documents page.
                </p>
                <button className="btn-primary w-full" onClick={download}><Download size={16} /> Download PDF</button>
                <button className="btn-secondary w-full" onClick={onClose}>Done</button>
              </div>
            ) : (
              <>
                <div>
                  <label className="label">Employee</label>
                  <select className="input" value={employeeId}
                    onChange={(e) => { setEmployeeId(e.target.value); clearPreview(); runPreview(e.target.value); }}>
                    <option value="">Select employee</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.first_name} {e.last_name} ({e.employee_code}){['resigned', 'terminated'].includes(e.employment_status) ? ` - ${e.employment_status}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Issue date</label>
                  <input type="date" className="input" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>

                {manualFields.length > 0 && (
                  <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Fill in for this document</p>
                    {manualFields.map((f) => (
                      <div key={f.key}>
                        <label className="label">{f.label}</label>
                        {f.type === 'textarea' ? (
                          <textarea className="input" rows={3} value={values[f.key] || ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
                        ) : (
                          <input type={f.type === 'date' ? 'date' : 'text'} className="input" value={values[f.key] || ''}
                            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button className="btn-secondary w-full" disabled={!employeeId || loading} onClick={() => runPreview()}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Update preview
                </button>

                {w?.any && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 space-y-1">
                    <div className="flex items-center gap-2 font-medium"><AlertTriangle size={16} /> Needs attention</div>
                    {w.missingManual?.length > 0 && <p>Fill in: {w.missingManual.join(', ')}</p>}
                    {w.emptyBuiltin?.length > 0 && <p>Missing in the employee/company records: {w.emptyBuiltin.join(', ')}. Update them, then refresh the preview.</p>}
                    {w.invalid?.length > 0 && <p>Invalid placeholder: {w.invalid.join(', ')}</p>}
                  </div>
                )}
                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                {issueMutation.isError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{apiMessage(issueMutation.error, 'Could not issue the document')}</p>}

                {issueTemplate && (
                  <button className="btn-primary w-full" disabled={blocked || loading || issueMutation.isPending} onClick={doIssue}>
                    <FileCheck2 size={16} /> {issueMutation.isPending ? 'Issuing...' : 'Issue document'}
                  </button>
                )}
                {issueTemplate && <p className="text-xs text-slate-400">Issuing assigns a unique reference number and shares the PDF with the employee. Previews carry a PREVIEW watermark.</p>}
              </>
            )}
          </div>

          <div className="flex-1 min-h-[300px] bg-slate-100 relative">
            {preview ? (
              <>
                <iframe title="PDF preview" src={preview.url} className="w-full h-full" />
                <a href={preview.url} target="_blank" rel="noreferrer"
                  className="absolute bottom-3 right-5 text-xs bg-white/90 border border-slate-200 rounded px-2 py-1 text-primary-700 hover:underline">
                  Open in new tab
                </a>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm text-center px-6">
                {loading ? <Loader2 className="animate-spin" size={28} /> : 'Select an employee to see the PDF preview'}
              </div>
            )}
            {loading && preview && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="animate-spin text-primary-600" size={28} /></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
