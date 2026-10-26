import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Ban } from 'lucide-react';
import * as hrApi from '../../api/hrDocuments.js';
import { DOC_CATEGORIES, docCategoryLabel } from '../../utils/hrDocuments.js';
import { saveBlob } from '../../utils/download.js';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Modal from '../../components/ui/Modal.jsx';

export default function IssuedTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [revoking, setRevoking] = useState(null);
  const [reason, setReason] = useState('');

  const params = { page, limit: 20, search: search || undefined, category: category || undefined, status: status || undefined };
  const { data, isLoading } = useQuery({ queryKey: ['hr-issued', params], queryFn: () => hrApi.listIssued(params) });

  const revokeMutation = useMutation({
    mutationFn: () => hrApi.revokeDocument(revoking.id, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hr-issued'] }); setRevoking(null); setReason(''); },
  });

  const download = async (doc) => saveBlob(await hrApi.downloadIssuedBlob(doc.id), `${doc.reference_no}.pdf`);
  const reset = (setter) => (e) => { setter(e.target.value); setPage(1); };

  return (
    <>
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3">
          <input className="input max-w-xs" placeholder="Search reference no., employee, template..." value={search} onChange={reset(setSearch)} />
          <select className="input w-52" value={category} onChange={reset(setCategory)}>
            <option value="">All types</option>
            {DOC_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select className="input w-36" value={status} onChange={reset(setStatus)}>
            <option value="">All status</option>
            <option value="issued">Issued</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>

        {isLoading ? <Spinner className="mx-auto my-12" /> : data.items.length === 0 ? (
          <EmptyState title="No documents issued yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Document</th>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Issue date</th>
                  <th className="px-4 py-3 font-medium">Issued by</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{d.reference_no}</td>
                    <td className="px-4 py-3 text-slate-600">{d.template_name}<div className="text-xs text-slate-400">{docCategoryLabel(d.category)}</div></td>
                    <td className="px-4 py-3 text-slate-900">{d.first_name} {d.last_name}<div className="text-xs text-slate-400">{d.employee_code}</div></td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.issue_date}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{d.issued_by_email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${d.status === 'issued' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{d.status}</span>
                      {d.status === 'revoked' && <p className="text-xs text-slate-500 mt-1 max-w-[14rem]">{d.revoked_reason}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <button className="text-slate-400 hover:text-primary-600" title="Download PDF" onClick={() => download(d)}><Download size={16} /></button>
                        {d.status === 'issued' && (
                          <button className="text-slate-400 hover:text-red-600" title="Revoke (hides it from the employee)" onClick={() => { setRevoking(d); setReason(''); }}><Ban size={16} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={setPage} />}

      <Modal open={!!revoking} onClose={() => setRevoking(null)} title="Revoke document">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            <strong>{revoking?.reference_no}</strong> will be hidden from {revoking?.first_name} {revoking?.last_name}. The record and PDF stay in this history.
            To replace it, issue a corrected document afterwards.
          </p>
          <div>
            <label className="label">Reason (required)</label>
            <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong designation printed" />
          </div>
          {revokeMutation.isError && <p className="text-sm text-red-600">{revokeMutation.error?.response?.data?.details?.fieldErrors?.reason?.[0] || revokeMutation.error?.response?.data?.message || 'Could not revoke'}</p>}
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setRevoking(null)}>Cancel</button>
            <button className="btn-danger" disabled={reason.trim().length < 5 || revokeMutation.isPending} onClick={() => revokeMutation.mutate()}>
              {revokeMutation.isPending ? 'Revoking...' : 'Revoke document'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
