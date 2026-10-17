import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Check, X, Ban, Wallet, AlertTriangle } from 'lucide-react';
import * as leaveApi from '../../api/leave.js';
import useAuth from '../../hooks/useAuth.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Pagination from '../../components/ui/Pagination.jsx';

function daysBetween(start, end) {
  if (!start || !end) return 0;
  const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
  return diff >= 0 ? diff + 1 : 0;
}

const fmt = (n) => Number(n).toString();

function BalanceCard({ balance }) {
  return (
    <div className="card p-5 mb-6 flex items-center gap-4">
      <div className="w-11 h-11 rounded-lg bg-primary-600 flex items-center justify-center">
        <Wallet size={20} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500">Leave balance</p>
        <p className="text-2xl font-semibold text-slate-900">
          {fmt(balance.balance)} <span className="text-base font-normal text-slate-500">day(s)</span>
        </p>
      </div>
      <p className="hidden sm:block ml-auto text-xs text-slate-500 max-w-xs text-right">
        Shared by Casual, Earned and Sick Leave. Credited at the start of every month. Unpaid Leave is not deducted.
      </p>
    </div>
  );
}

function AdminBalancesTable() {
  const [search, setSearch] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['leave-balances', search],
    queryFn: () => leaveApi.listBalances({ search: search || undefined }),
  });

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <input
          className="input max-w-sm"
          placeholder="Search by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {isLoading ? (
        <Spinner className="mx-auto my-12" />
      ) : data.length === 0 ? (
        <EmptyState title="No employees found" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last credited</th>
                <th className="px-4 py-3 font-medium text-right">Balance (days)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row) => (
                <tr key={row.employee_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.first_name} {row.last_name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.employee_code}</td>
                  <td className="px-4 py-3 text-slate-600">{row.department_name || '—'}</td>
                  <td className="px-4 py-3"><Badge status={row.employment_status} /></td>
                  <td className="px-4 py-3 text-slate-600">{row.last_credited_month || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function LeavePage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('requests');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['leave-requests', page],
    queryFn: () => leaveApi.listLeaveRequests({ page, limit: 20 }),
  });
  const { data: leaveTypes = [] } = useQuery({ queryKey: ['leave-types'], queryFn: leaveApi.listLeaveTypes });
  const { data: myBalance } = useQuery({ queryKey: ['leave-balance'], queryFn: leaveApi.getMyBalance });

  const { register, handleSubmit, reset, watch } = useForm();
  const leaveTypeId = watch('leaveTypeId');
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const halfDayChecked = watch('halfDay');

  const hasProfile = !!myBalance?.hasProfile;
  const sameDay = !!startDate && startDate === endDate;
  const totalDays = sameDay && halfDayChecked ? 0.5 : daysBetween(startDate, endDate);
  const selectedType = leaveTypes.find((t) => String(t.id) === String(leaveTypeId));
  const available = myBalance?.balance ?? 0;
  const insufficient = !!selectedType?.uses_balance && totalDays > available;

  const refreshLeaveData = () => {
    queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
    queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
  };

  const createMutation = useMutation({
    mutationFn: leaveApi.createLeaveRequest,
    onSuccess: () => {
      refreshLeaveData();
      setModalOpen(false);
      reset();
    },
  });
  const reviewMutation = useMutation({
    mutationFn: ({ id, status }) => leaveApi.reviewLeaveRequest(id, { status }),
    onSuccess: refreshLeaveData,
  });
  const cancelMutation = useMutation({
    mutationFn: leaveApi.cancelLeaveRequest,
    onSuccess: refreshLeaveData,
  });

  const openModal = () => { createMutation.reset(); reset(); setModalOpen(true); };

  const onSubmit = (formData) => {
    createMutation.mutate({
      leaveTypeId: Number(formData.leaveTypeId),
      startDate: formData.startDate,
      endDate: formData.endDate,
      totalDays,
      reason: formData.reason,
    });
  };

  return (
    <div>
      <PageHeader
        title="Leave Management"
        subtitle={isAdmin ? 'Review requests and track employee leave balances' : 'Request and track your leave'}
        actions={hasProfile && <button className="btn-primary" onClick={openModal}><Plus size={16} /> Request Leave</button>}
      />

      {hasProfile && <BalanceCard balance={myBalance} />}

      {isAdmin && (
        <div className="card p-2 mb-4 inline-flex gap-1">
          {[['requests', 'Leave Requests'], ['balances', 'Employee Balances']].map(([key, label]) => (
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
      )}

      {isAdmin && tab === 'balances' ? (
        <AdminBalancesTable />
      ) : (
        <>
          <div className="card overflow-hidden">
            {isLoading ? (
              <Spinner className="mx-auto my-12" />
            ) : data.items.length === 0 ? (
              <EmptyState title="No leave requests" />
            ) : (
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      {isAdmin && <th className="px-4 py-3 font-medium">Employee</th>}
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Dates</th>
                      <th className="px-4 py-3 font-medium">Days</th>
                      <th className="px-4 py-3 font-medium">Reason</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50">
                        {isAdmin && <td className="px-4 py-3 text-slate-900">{req.first_name} {req.last_name}</td>}
                        <td className="px-4 py-3 text-slate-600">{req.leave_type_name}</td>
                        <td className="px-4 py-3 text-slate-600">{req.start_date} → {req.end_date}</td>
                        <td className="px-4 py-3 text-slate-600">{fmt(req.total_days)}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{req.reason || '—'}</td>
                        <td className="px-4 py-3"><Badge status={req.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {isAdmin && req.status === 'pending' && (
                              <>
                                <button
                                  className="text-slate-400 hover:text-green-600"
                                  disabled={reviewMutation.isPending}
                                  onClick={() => reviewMutation.mutate({ id: req.id, status: 'approved' })}
                                  title="Approve"
                                ><Check size={16} /></button>
                                <button
                                  className="text-slate-400 hover:text-red-600"
                                  disabled={reviewMutation.isPending}
                                  onClick={() => reviewMutation.mutate({ id: req.id, status: 'rejected' })}
                                  title="Reject (balance is credited back)"
                                ><X size={16} /></button>
                              </>
                            )}
                            {!isAdmin && req.status === 'pending' && (
                              <button
                                className="text-slate-400 hover:text-red-600"
                                disabled={cancelMutation.isPending}
                                onClick={() => cancelMutation.mutate(req.id)}
                                title="Cancel (balance is credited back)"
                              ><Ban size={16} /></button>
                            )}
                          </div>
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
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Request Leave">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-primary-50 px-3 py-2 text-sm">
            <span className="text-primary-800">Available balance</span>
            <span className="font-semibold text-primary-800">{fmt(available)} day(s)</span>
          </div>

          <div>
            <label className="label">Leave Type</label>
            <select className="input" {...register('leaveTypeId', { required: true })}>
              <option value="">Select type</option>
              {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {selectedType && (
              <p className="text-xs text-slate-500 mt-1">
                {selectedType.uses_balance
                  ? 'Deducted from your leave balance (credited back if rejected or cancelled).'
                  : 'Not deducted from your leave balance.'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" {...register('startDate', { required: true })} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" min={startDate || undefined} {...register('endDate', { required: true })} />
            </div>
          </div>

          {sameDay && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...register('halfDay')} /> Half day (0.5)
            </label>
          )}
          {startDate && endDate && (
            <p className="text-sm text-slate-500">
              {totalDays > 0 ? `Total: ${fmt(totalDays)} day(s)` : 'End date cannot be before start date'}
            </p>
          )}

          {insufficient && (
            <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                Not enough balance ({fmt(available)} available, {fmt(totalDays)} requested).
                Select <strong>Unpaid Leave</strong> as the leave type to continue.
              </span>
            </div>
          )}

          <div>
            <label className="label">Reason</label>
            <textarea className="input" rows={3} {...register('reason')} />
          </div>

          {createMutation.isError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {createMutation.error?.response?.data?.message || 'Could not submit request'}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button
              type="submit"
              disabled={createMutation.isPending || insufficient || totalDays <= 0}
              className="btn-primary"
            >
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
