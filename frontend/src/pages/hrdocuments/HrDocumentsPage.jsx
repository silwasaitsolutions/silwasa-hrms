import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as hrApi from '../../api/hrDocuments.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import PreviewModal from '../../components/hr/PreviewModal.jsx';
import TemplatesTab from './TemplatesTab.jsx';
import GenerateTab from './GenerateTab.jsx';
import IssuedTab from './IssuedTab.jsx';
import BrandingTab from './BrandingTab.jsx';

const TABS = [
  ['templates', 'Templates'],
  ['generate', 'Generate Document'],
  ['issued', 'Issued Documents'],
  ['branding', 'Company Branding'],
];

export default function HrDocumentsPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'templates';
  const [generating, setGenerating] = useState(null); // template with manual_fields

  const startGenerate = async (templateId) => setGenerating(await hrApi.getTemplate(templateId));

  return (
    <div>
      <PageHeader title="HR Documents" subtitle="Create letter templates, issue them to employees and keep a record" />

      <div className="card p-2 mb-4 inline-flex flex-wrap gap-1">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setParams({ tab: key })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'templates' && <TemplatesTab onGenerate={startGenerate} />}
      {tab === 'generate' && <GenerateTab onGenerate={startGenerate} />}
      {tab === 'issued' && <IssuedTab />}
      {tab === 'branding' && <BrandingTab />}

      <PreviewModal
        open={!!generating}
        onClose={() => setGenerating(null)}
        title={generating ? `Generate: ${generating.name}` : ''}
        source={{ templateId: generating?.id }}
        manualFields={generating?.manual_fields || []}
        issueTemplate={generating ? { id: generating.id, name: generating.name } : null}
      />
    </div>
  );
}
