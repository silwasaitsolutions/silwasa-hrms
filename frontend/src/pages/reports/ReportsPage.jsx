
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
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    payMonth: '',
    payYear: '',
  });
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setError('');

    try {
      let response;
      let filename;

      if (tab === 'attendance') {
        response = await reportsApi.downloadAttendanceReport({
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
        filename = 'attendance-report.csv';
      } else if (tab === 'leave') {
        response = await reportsApi.downloadLeaveReport({
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
        filename = 'leave-report.csv';
      } else {
        response = await reportsApi.downloadPayrollReport({
          payMonth: filters.payMonth,
          payYear: filters.payYear,
        });
        filename = `payroll-report-${filters.payYear || 'all'}-${filters.payMonth || 'all'}.csv`;
      }

      const blob = new Blob([response.data], {
        type: 'text/csv;charset=utf-8;',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error('Report export failed:', err);

      if (err.response?.status === 401) {
        setError('Your session may have expired. Please log in again.');
      } else {
        setError('Unable to export the report. Please try again.');
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Generate and export operational reports"
      />

      <div className="card p-2 mb-6 inline-flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-primary-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
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
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    startDate: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    endDate: e.target.value,
                  }))
                }
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
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    payMonth: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label className="label">Year</label>
              <input
                type="number"
                className="input"
                value={filters.payYear}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    payYear: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="btn-primary w-fit disabled:opacity-60"
        >
          <Download size={16} />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>

        {error && (
          <p role="alert" className="text-sm text-red-600 mt-3">
            {error}
          </p>
        )}

        <p className="text-sm text-slate-500 mt-4">
          Apply optional filters above, then export. Leave filters blank
          to export all records.
        </p>
      </div>
    </div>
  );
}
