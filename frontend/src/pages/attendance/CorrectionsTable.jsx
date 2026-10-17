import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as attendanceApi from '../../api/attendance.js';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Pagination from '../../components/ui/Pagination.jsx';

function describe(v) {
  if (!v) return '— (no record)';
  const times = v.check_in ? ` ${String(v.check_in).slice(0, 5)}–${v.check_out ? String(v.check_out).slice(0, 5) : '…'}` : '';
  return `${String(v.status).replace('_', ' ')}${times}`;
}

export default function CorrectionsTable() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['attendance-overrides', page],
    queryFn: () => attendanceApi.listOverrides({ page, limit: 20 }),
  });

  return (
    <>
      <div className="card overflow-hidden">
        {isLoading ? <Spinner className="mx-auto my-12" /> : data.items.length === 0 ? (
          <EmptyState title="No corrections made yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Before → After</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Corrected by</th>
                  <th className="px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{o.work_date}</td>
                    <td className="px-4 py-3 text-slate-900">{o.first_name} {o.last_name}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{describe(o.old_values)} → <strong>{describe(o.new_values)}</strong></td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">{o.reason}</td>
                    <td className="px-4 py-3 text-slate-600">{o.admin_email || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{String(o.created_at).slice(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={setPage} />}
    </>
  );
}
