import { useState } from 'react';
import { Download, Trash2, FileText } from 'lucide-react';
import * as documentsApi from '../../api/documents.js';
import { categoryLabel, formatFileSize } from '../../utils/documents.js';
import EmptyState from '../ui/EmptyState.jsx';

export default function DocumentTable({ documents, onDelete }) {
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = async (doc) => {
    setDownloadingId(doc.id);
    try {
      await documentsApi.downloadDocument(doc);
    } catch {
      alert('Download failed. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (!documents.length) return <EmptyState title="No documents yet" />;

  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 font-medium">Document</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 font-medium">Uploaded</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <FileText size={16} className="text-slate-400 shrink-0" />
                  <span className="break-all">{doc.original_name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">{categoryLabel(doc.category)}</td>
              <td className="px-4 py-3 text-slate-600">{formatFileSize(doc.file_size)}</td>
              <td className="px-4 py-3 text-slate-600">{String(doc.created_at).slice(0, 10)}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-3">
                  <button
                    className="text-slate-400 hover:text-primary-600 disabled:opacity-50"
                    disabled={downloadingId === doc.id}
                    onClick={() => handleDownload(doc)}
                    title="Download"
                  >
                    <Download size={16} />
                  </button>
                  {onDelete && (
                    <button
                      className="text-slate-400 hover:text-red-600"
                      onClick={() => confirm(`Delete "${doc.original_name}"?`) && onDelete(doc.id)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
