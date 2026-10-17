import { useQuery } from '@tanstack/react-query';
import * as documentsApi from '../../api/documents.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import DocumentTable from '../../components/documents/DocumentTable.jsx';

export default function MyDocumentsPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['my-documents'], queryFn: documentsApi.listMyDocuments });

  return (
    <div>
      <PageHeader
        title="My Documents"
        subtitle="Letters, salary slips and other documents shared by HR"
      />
      <div className="card overflow-hidden">
        {isLoading ? <Spinner className="mx-auto my-12" /> : <DocumentTable documents={data} />}
      </div>
    </div>
  );
}
