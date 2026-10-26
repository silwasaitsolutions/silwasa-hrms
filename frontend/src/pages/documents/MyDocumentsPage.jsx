import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import * as documentsApi from '../../api/documents.js';
import * as hrApi from '../../api/hrDocuments.js';
import { docCategoryLabel } from '../../utils/hrDocuments.js';
import { saveBlob } from '../../utils/download.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import DocumentTable from '../../components/documents/DocumentTable.jsx';

function IssuedLetters() {
  const { data = [], isLoading } = useQuery({ queryKey: ['my-issued-documents'], queryFn: hrApi.listMyIssued });

  const download = async (doc) => {
    try {
      saveBlob(await hrApi.downloadIssuedBlob(doc.id), `${doc.reference_no}.pdf`);
    } catch {
      alert('Download failed. Please try again.');
    }
  };

  // Hidden entirely until HR has issued something, so existing users see the page as before
  if (isLoading || data.length === 0) return isLoading ? <Spinner className="mx-auto my-6" /> : null;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Letters issued by HR</h2>
      <p className="text-sm text-slate-500 mb-3">Official documents with a reference number.</p>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-medium">Document</th>
              <th className="px-4 py-3 font-medium">Reference no.</th>
              <th className="px-4 py-3 font-medium">Issue date</th>
              <th className="px-4 py-3 font-medium text-right">Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-900"><FileText size={16} className="text-slate-400 shrink-0" />{d.template_name}</div>
                  <div className="text-xs text-slate-400 ml-6">{docCategoryLabel(d.category)}</div>
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.reference_no}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.issue_date}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button className="text-slate-400 hover:text-primary-600" title="Download PDF" onClick={() => download(d)}><Download size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MyDocumentsPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['my-documents'], queryFn: documentsApi.listMyDocuments });

  return (
    <div>
      <PageHeader title="My Documents" subtitle="Letters, salary slips and other documents shared by HR" />
      <IssuedLetters />
      <h2 className="text-lg font-semibold text-slate-900 mb-3">Other documents</h2>
      <div className="card overflow-hidden">
        {isLoading ? <Spinner className="mx-auto my-12" /> : <DocumentTable documents={data} />}
      </div>
    </div>
  );
}
