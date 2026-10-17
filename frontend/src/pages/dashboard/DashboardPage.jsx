import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Building2, CalendarDays, CheckCircle2, Wallet, FolderOpen } from 'lucide-react';
import * as reportsApi from '../../api/reports.js';
import * as attendanceApi from '../../api/attendance.js';
import * as leaveApi from '../../api/leave.js';
import useAuth from '../../hooks/useAuth.js';
import Spinner from '../../components/ui/Spinner.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: reportsApi.getDashboardSummary,
  });

  if (isLoading) return <Spinner className="mx-auto mt-12" />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={Users} label="Total Employees" value={data.totalEmployees} color="bg-primary-600" />
      <StatCard icon={CheckCircle2} label="Active Employees" value={data.activeEmployees} color="bg-green-600" />
      <StatCard icon={Building2} label="Departments" value={data.totalDepartments} color="bg-purple-600" />
      <StatCard icon={CalendarDays} label="Pending Leave Requests" value={data.pendingLeaveRequests} color="bg-amber-600" />

      <div className="card p-5 sm:col-span-2 lg:col-span-4">
        <h3 className="font-medium text-slate-900 mb-3">Today's Attendance</h3>
        <div className="flex gap-6 text-sm">
          <div><span className="text-2xl font-semibold text-green-600">{data.todayAttendance.present}</span> <span className="text-slate-500">Present</span></div>
          <div><span className="text-2xl font-semibold text-red-600">{data.todayAttendance.absent}</span> <span className="text-slate-500">Absent</span></div>
          <div><span className="text-2xl font-semibold text-blue-600">{data.todayAttendance.onLeave}</span> <span className="text-slate-500">On Leave</span></div>
        </div>
      </div>
    </div>
  );
}

function EmployeeDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['attendance-summary'],
    queryFn: () => attendanceApi.getAttendanceSummary({}),
  });
  const { data: balance } = useQuery({ queryKey: ['leave-balance'], queryFn: leaveApi.getMyBalance });

  if (isLoading) return <Spinner className="mx-auto mt-12" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/leave" className="card p-5 flex items-center gap-4 hover:border-primary-300 transition-colors">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-primary-600">
            <Wallet size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Leave Balance</p>
            <p className="text-2xl font-semibold text-slate-900">
              {balance?.hasProfile ? Number(balance.balance) : '—'}
              <span className="text-base font-normal text-slate-500"> day(s)</span>
            </p>
          </div>
        </Link>
        <Link to="/documents" className="card p-5 flex items-center gap-4 hover:border-primary-300 transition-colors">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-purple-600">
            <FolderOpen size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-500">My Documents</p>
            <p className="text-sm font-medium text-slate-900 mt-1">Letters, salary slips &amp; more</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(data).map(([status, count]) => (
          <div key={status} className="card p-5 text-center">
            <p className="text-2xl font-semibold text-slate-900">{count}</p>
            <p className="text-sm text-slate-500 capitalize mt-1">{status.replace('_', ' ')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isAdmin, user } = useAuth();

  return (
    <div>
      <PageHeader title={`Welcome back${user?.email ? ',' : ''}`} subtitle={user?.email} />
      {isAdmin ? <AdminDashboard /> : <EmployeeDashboard />}
    </div>
  );
}
