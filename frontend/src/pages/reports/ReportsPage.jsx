import { useState } from 'react';
import { Download } from 'lucide-react';
import * as reportsApi from '../../api/reports.js';
import PageHeader from '../../components/ui/PageHeader.jsx';

const TABS = [
  { key: 'attendance', label: 'Attendance Report' },
  { key: 'leave', label: 'Leave Report' },
  { key: 'payroll', label: 'Payroll Report' },
];

export default function ReportsPage() {
  const [tab, setTab] = useState('attendance');
  const [filters, setFilters] = useState({ startDate: '', endDate: '', payMonth: '', payYear: '' });

  const exportUrl =
    tab === 'attendance'
      ? reportsApi.attendanceExportUrl({ startDate: filters.startDate, endDate: filters.endDate })
      : tab === 'leave'
      ? reportsApi.leaveExportUrl({ startDate: filters.startDate, endDate: filters.endDate })
      : reportsApi.payrollExportUrl({ payMonth: filters.payMonth, payYear: filters.payYear });

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate and export operational reports" />

      <div className="card p-2 mb-6 inline-flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-5">
        {tab !== 'payroll' ? (
          <div className="grid grid-cols-2 gap-4 max-w-md mb-4">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input"
                value={filters.startDate}
                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input"
                value={filters.endDate}
                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 max-w-md mb-4">
            <div>
              <label className="label">Month</label>
              <input
                type="number"
                min={1}
                max={12}
                className="input"
                value={filters.payMonth}
                onChange={(e) => setFilters((f) => ({ ...f, payMonth: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Year</label>
              <input
                type="number"
                className="input"
                value={filters.payYear}
                onChange={(e) => setFilters((f) => ({ ...f, payYear: e.target.value }))}
              />
            </div>
          </div>
        )}

        <a href={exportUrl} target="_blank" rel="noreferrer" className="btn-primary w-fit">
          <Download size={16} /> Export CSV
        </a>

        <p className="text-sm text-slate-500 mt-4">
          Apply optional filters above, then export. Leave filters blank to export all records.
        </p>
      </div>
    </div>
  );
}
