import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PencilLine } from 'lucide-react';
import * as attendanceApi from '../../api/attendance.js';
import useAuth from '../../hooks/useAuth.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import GpsPunchCard from './GpsPunchCard.jsx';
import OverrideModal from './OverrideModal.jsx';
import GpsLogTable from './GpsLogTable.jsx';
import CorrectionsTable from './CorrectionsTable.jsx';

const hhmm = (t) => (t ? String(t).slice(0, 5) : '—');

function PunchCell({ time, distance, office, manual }) {
  if (!time) return <span className="text-slate-400">—</span>;
  return (
    <div>
      <div className="text-slate-900">{hhmm(time)}</div>
      <div className="text-xs text-slate-500">
        {distance != null ? `${Math.round(distance)} m · ${office}` : manual ? 'Admin entry' : ''}
      </div>
    </div>
  );
}

function HistoryTable({ isAdmin }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['attendance', page],
    queryFn: () => attendanceApi.listAttendance({ page, limit: 20 }),
  });

  return (
    <>
      <div className="card overflow-hidden">
        {isLoading ? <Spinner className="mx-auto my-12" /> : data.items.length === 0 ? (
          <EmptyState title="No attendance records yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  {isAdmin && <th className="px-4 py-3 font-medium">Employee</th>}
                  <th className="px-4 py-3 font-medium">Check in</th>
                  <th className="px-4 py-3 font-medium">Check out</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.work_date}</td>
                    {isAdmin && <td className="px-4 py-3 text-slate-900">{row.first_name} {row.last_name}</td>}
                    <td className="px-4 py-3">
                      <PunchCell time={row.check_in} distance={row.check_in_distance_m} office={row.check_in_office} manual={row.check_in && row.check_in_distance_m == null} />
                    </td>
                    <td className="px-4 py-3">
                      <PunchCell time={row.check_out} distance={row.check_out_distance_m} office={row.check_out_office} manual={row.check_out && row.check_out_distance_m == null} />
                    </td>
                    <td className="px-4 py-3"><Badge status={row.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs">
                      {row.correction_count > 0 ? (
                        <>
                          <span className="badge bg-amber-100 text-amber-700">Corrected by admin</span>
                          <p className="mt-1">{row.remarks}</p>
                        </>
                      ) : '—'}
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

export default function AttendancePage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('history');
  const [overrideOpen, setOverrideOpen] = useState(false);

  const { data: today } = useQuery({ queryKey: ['attendance-today'], queryFn: attendanceApi.getToday });

  const tabs = [
    ['history', 'Attendance History'],
    ['gps', 'GPS Log'],
    ...(isAdmin ? [['corrections', 'Corrections']] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle={isAdmin ? 'Review GPS attendance and correct records' : 'Check in and out when you are at the office'}
        actions={isAdmin && (
          <button className="btn-primary" onClick={() => setOverrideOpen(true)}>
            <PencilLine size={16} /> Correct Attendance
          </button>
        )}
      />

      {today?.hasProfile && <GpsPunchCard today={today} />}

      <div className="card p-2 mb-4 inline-flex gap-1">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'history' && <HistoryTable isAdmin={isAdmin} />}
      {tab === 'gps' && <GpsLogTable isAdmin={isAdmin} />}
      {tab === 'corrections' && isAdmin && <CorrectionsTable />}

      <OverrideModal open={overrideOpen} onClose={() => setOverrideOpen(false)} />
    </div>
  );
}
