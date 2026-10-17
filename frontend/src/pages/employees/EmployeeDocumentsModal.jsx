import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import Modal from '../../components/ui/Modal.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import DocumentTable from '../../components/documents/DocumentTable.jsx';
import * as documentsApi from '../../api/documents.js';
import { DOCUMENT_CATEGORIES, ACCEPT_ATTR, MAX_UPLOAD_MB, validateFiles } from '../../utils/documents.js';

export default function EmployeeDocumentsModal({ employee, onClose }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('experience_letter');
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [inputKey, setInputKey] = useState(0); // resets the file input after upload

  const open = !!employee;
  const queryKey = ['employee-documents', employee?.id];

  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => documentsApi.listEmployeeDocuments(employee.id),
    enabled: open,
  });

  const uploadMutation = useMutation({
    mutationFn: () => documentsApi.uploadEmployeeDocuments(employee.id, files, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setFiles([]);
      setInputKey((k) => k + 1);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: documentsApi.deleteDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const onFilesChange = (e) => {
    const list = Array.from(e.target.files);
    const error = validateFiles(list);
    setFileError(error);
    setFiles(error ? [] : list);
    if (error) setInputKey((k) => k + 1);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={employee ? `Documents — ${employee.first_name} ${employee.last_name}` : 'Documents'}
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-900">Upload documents</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {DOCUMENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Files</label>
              <input
                key={inputKey}
                type="file"
                multiple
                accept={ACCEPT_ATTR}
                className="input text-xs"
                onChange={onFilesChange}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG — up to {MAX_UPLOAD_MB} MB each.</p>
          {fileError && <p className="text-sm text-red-600">{fileError}</p>}
          {uploadMutation.isError && (
            <p className="text-sm text-red-600">{uploadMutation.error?.response?.data?.message || 'Upload failed'}</p>
          )}
          <button
            className="btn-primary"
            disabled={!files.length || uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
          >
            <Upload size={16} /> {uploadMutation.isPending ? 'Uploading...' : `Upload${files.length ? ` (${files.length})` : ''}`}
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 overflow-hidden">
          {isLoading ? (
            <Spinner className="mx-auto my-8" />
          ) : (
            <DocumentTable documents={data} onDelete={(id) => deleteMutation.mutate(id)} />
          )}
        </div>
      </div>
    </Modal>
  );
}
