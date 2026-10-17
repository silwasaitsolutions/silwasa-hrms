import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import * as attendanceApi from '../../api/attendance.js';
import { mapLink } from '../../utils/geolocation.js';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Pagination from '../../components/ui/Pagination.jsx';

export default function GpsLogTable({ isAdmin }) {
  const [page, setPage] = useState(1);
  const [accepted, setAccepted] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['gps-logs', page, accepted],
    queryFn: () => attendanceApi.listGpsLogs({ page, limit: 20, accepted: accepted || undefined }),
  });

  return (
    <>
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <select className="input w-48" value={accepted} onChange={(e) => { setAccepted(e.target.value); setPage(1); }}>
            <option value="">All attempts</option>
            <option value="true">Accepted only</option>
            <option value="false">Rejected only</option>
          </select>
        </div>
        {isLoading ? <Spinner className="mx-auto my-12" /> : data.items.length === 0 ? (
          <EmptyState title="No check-in attempts yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  {isAdmin && <th className="px-4 py-3 font-medium">Employee</th>}
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Office</th>
                  <th className="px-4 py-3 font-medium">Distance</th>
                  <th className="px-4 py-3 font-medium">GPS accuracy</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{l.punched_at}</td>
                    {isAdmin && <td className="px-4 py-3 text-slate-900">{l.first_name} {l.last_name}</td>}
                    <td className="px-4 py-3 text-slate-600">{l.punch_type === 'check_in' ? 'Check in' : 'Check out'}</td>
                    <td className="px-4 py-3 text-slate-600">{l.office_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {l.distance_m == null ? '—' : `${Math.round(l.distance_m)} m / ${l.radius_m} m`}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.accuracy_m == null ? '—' : `±${Math.round(l.accuracy_m)} m`}</td>
                    <td className="px-4 py-3">
                      <a href={mapLink(l.latitude, l.longitude)} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary-600 hover:underline text-xs">
                        {l.latitude.toFixed(5)}, {l.longitude.toFixed(5)} <ExternalLink size={12} />
                      </a>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className={`badge ${l.accepted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {l.accepted ? 'Accepted' : 'Rejected'}
                      </span>
                      {!l.accepted && <p className="text-xs text-slate-500 mt-1">{l.message}</p>}
                    </td>
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
