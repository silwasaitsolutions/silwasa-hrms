import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Copy, Trash2, Power, FilePlus2 } from 'lucide-react';
import * as hrApi from '../../api/hrDocuments.js';
import { DOC_CATEGORIES, docCategoryLabel } from '../../utils/hrDocuments.js';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Badge from '../../components/ui/Badge.jsx';

export default function TemplatesTab({ onGenerate }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');

  const params = { search: search || undefined, status: status || undefined, category: category || undefined };
  const { data = [], isLoading } = useQuery({ queryKey: ['hr-templates', params], queryFn: () => hrApi.listTemplates(params) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['hr-templates'] });

  const toggleMutation = useMutation({ mutationFn: (t) => hrApi.updateTemplate(t.id, { isActive: !t.is_active }), onSuccess: refresh });
  const duplicateMutation = useMutation({ mutationFn: hrApi.duplicateTemplate, onSuccess: refresh });
  const deleteMutation = useMutation({ mutationFn: hrApi.deleteTemplate, onSuccess: refresh });

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3 items-center">
        <input className="input max-w-xs" placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input w-52" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All types</option>
          {DOC_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select className="input w-36" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="btn-primary ml-auto" onClick={() => navigate('/hr-documents/templates/new')}><Plus size={16} /> New Template</button>
      </div>

      {isLoading ? <Spinner className="mx-auto my-12" /> : data.length === 0 ? (
        <EmptyState title="No templates found" subtitle="Create a template to start issuing letters." />
      ) : (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Template</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Ref. prefix</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
                  <td className="px-4 py-3 text-slate-600">{docCategoryLabel(t.category)}</td>
                  <td className="px-4 py-3 text-slate-600"><code>{t.reference_prefix}</code></td>
                  <td className="px-4 py-3 text-slate-600">{t.issued_count}</td>
                  <td className="px-4 py-3"><Badge status={t.is_active ? 'active' : 'inactive'} /></td>
                  <td className="px-4 py-3 text-slate-600">{String(t.updated_at).slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      <button className="text-slate-400 hover:text-green-600 disabled:opacity-30" title={t.is_active ? 'Generate a document' : 'Activate the template to generate'}
                        disabled={!t.is_active} onClick={() => onGenerate(t.id)}><FilePlus2 size={16} /></button>
                      <button className="text-slate-400 hover:text-primary-600" title="Edit" onClick={() => navigate(`/hr-documents/templates/${t.id}`)}><Pencil size={16} /></button>
                      <button className="text-slate-400 hover:text-primary-600" title="Duplicate (reuse as a starting point)" onClick={() => duplicateMutation.mutate(t.id)}><Copy size={16} /></button>
                      <button className={`text-slate-400 ${t.is_active ? 'hover:text-amber-600' : 'hover:text-green-600'}`} title={t.is_active ? 'Deactivate' : 'Activate'} onClick={() => toggleMutation.mutate(t)}><Power size={16} /></button>
                      <button className="text-slate-400 hover:text-red-600" title="Delete"
                        onClick={() => confirm(`Delete "${t.name}"?${t.issued_count ? `\n\nThe ${t.issued_count} document(s) already issued from it are kept.` : ''}`) && deleteMutation.mutate(t.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
