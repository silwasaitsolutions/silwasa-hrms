import { useQuery } from '@tanstack/react-query';
import { FilePlus2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as hrApi from '../../api/hrDocuments.js';
import { docCategoryLabel } from '../../utils/hrDocuments.js';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

export default function GenerateTab({ onGenerate }) {
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({ queryKey: ['hr-templates', 'active'], queryFn: () => hrApi.listTemplates({ status: 'active' }) });

  if (isLoading) return <Spinner className="mx-auto my-12" />;
  if (data.length === 0) {
    return (
      <div className="card"><EmptyState title="No active templates" subtitle="Create or activate a template first." />
        <div className="text-center pb-6"><button className="btn-primary" onClick={() => navigate('/hr-documents/templates/new')}>New template</button></div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">Choose a document type, then pick the employee, check the PDF preview and issue it.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((t) => (
          <button key={t.id} onClick={() => onGenerate(t.id)}
            className="card p-5 text-left hover:border-primary-300 hover:shadow transition">
            <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center mb-3"><FilePlus2 size={20} /></div>
            <p className="font-semibold text-slate-900">{t.name}</p>
            <p className="text-sm text-slate-500">{docCategoryLabel(t.category)}</p>
            <p className="text-xs text-slate-400 mt-2">{t.issued_count} issued so far</p>
          </button>
        ))}
      </div>
    </div>
  );
}
