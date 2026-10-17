import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Play, Layers, Receipt } from 'lucide-react';
import * as payrollApi from '../../api/payroll.js';
import * as employeesApi from '../../api/employees.js';
import useAuth from '../../hooks/useAuth.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Pagination from '../../components/ui/Pagination.jsx';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function PayrollPage() {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [payslip, setPayslip] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', page],
    queryFn: () => payrollApi.listPayroll({ page, limit: 20 }),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees', 'for-payroll'],
    queryFn: () => employeesApi.listEmployees({ page: 1, limit: 100 }),
    enabled: isAdmin,
  });

  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: {
      mode: 'single',
      payMonth: new Date().getMonth() + 1,
      payYear: new Date().getFullYear(),
      allowances: 0,
      deductions: 0,
    },
  });
  const mode = watch('mode');

  const generateMutation = useMutation({
    mutationFn: (payload) =>
      payload.mode === 'bulk'
        ? payrollApi.generateBulkPayroll({ payMonth: payload.payMonth, payYear: payload.payYear })
        : payrollApi.generatePayroll({
            employeeId: Number(payload.employeeId),
            payMonth: Number(payload.payMonth),
            payYear: Number(payload.payYear),
            allowances: Number(payload.allowances) || 0,
            deductions: Number(payload.deductions) || 0,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      setGenModalOpen(false);
      reset();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => payrollApi.updatePayrollStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll'] }),
  });

  const viewPayslip = async (id) => {
    const data = await payrollApi.getPayslip(id);
    setPayslip(data);
  };

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle={isAdmin ? 'Generate and manage employee payroll' : 'View your payslips'}
        actions={
          isAdmin && (
            <button className="btn-primary" onClick={() => setGenModalOpen(true)}>
              <Play size={16} /> Generate Payroll
            </button>
          )
        }
      />

      <div className="card overflow-hidden">
        {isLoading ? (
          <Spinner className="mx-auto my-12" />
        ) : data.items.length === 0 ? (
          <EmptyState title="No payroll records yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  {isAdmin && <th className="px-4 py-3 font-medium">Employee</th>}
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Basic</th>
                  <th className="px-4 py-3 font-medium">Allowances</th>
                  <th className="px-4 py-3 font-medium">Deductions</th>
                  <th className="px-4 py-3 font-medium">Net Salary</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    {isAdmin && <td className="px-4 py-3 text-slate-900">{row.first_name} {row.last_name}</td>}
                    <td className="px-4 py-3 text-slate-600">{MONTHS[row.pay_month - 1]} {row.pay_year}</td>
                    <td className="px-4 py-3 text-slate-600">{Number(row.basic_salary).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-600">{Number(row.allowances).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-600">{Number(row.deductions).toFixed(2)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{Number(row.net_salary).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {isAdmin && row.status !== 'paid' ? (
                        <select
                          className="input py-1 text-xs"
                          value={row.status}
                          onChange={(e) => statusMutation.mutate({ id: row.id, status: e.target.value })}
                        >
                          <option value="draft">Draft</option>
                          <option value="generated">Generated</option>
                          <option value="paid">Paid</option>
                        </select>
                      ) : (
                        <Badge status={row.status} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button className="text-slate-400 hover:text-primary-600" onClick={() => viewPayslip(row.id)} title="View Payslip">
                          <Receipt size={16} />
                        </button>
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

      <Modal open={genModalOpen} onClose={() => setGenModalOpen(false)} title="Generate Payroll">
        <form onSubmit={handleSubmit((d) => generateMutation.mutate(d))} className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="single" {...register('mode')} /> Single employee
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="bulk" {...register('mode')} /> <Layers size={14} className="inline" /> All active employees
            </label>
          </div>

          {mode === 'single' && (
            <div>
              <label className="label">Employee</label>
              <select className="input" {...register('employeeId', { required: mode === 'single' })}>
                <option value="">Select employee</option>
                {employees?.items.map((e) => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Month</label>
              <select className="input" {...register('payMonth', { required: true })}>
                {MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <input type="number" className="input" {...register('payYear', { required: true })} />
            </div>
          </div>

          {mode === 'single' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Allowances</label>
                <input type="number" step="0.01" className="input" {...register('allowances')} />
              </div>
              <div>
                <label className="label">Deductions</label>
                <input type="number" step="0.01" className="input" {...register('deductions')} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setGenModalOpen(false)}>Cancel</button>
            <button type="submit" disabled={generateMutation.isPending} className="btn-primary">
              {generateMutation.isPending ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!payslip} onClose={() => setPayslip(null)} title="Payslip">
        {payslip && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Employee</span><span className="font-medium">{payslip.first_name} {payslip.last_name} ({payslip.employee_code})</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Pay Period</span><span className="font-medium">{MONTHS[payslip.pay_month - 1]} {payslip.pay_year}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Days Present</span><span>{payslip.days_present}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Days On Leave</span><span>{payslip.days_on_leave}</span></div>
            <hr className="border-slate-200" />
            <div className="flex justify-between"><span className="text-slate-500">Basic Salary</span><span>{Number(payslip.basic_salary).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Allowances</span><span>+{Number(payslip.allowances).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Deductions</span><span>-{Number(payslip.deductions).toFixed(2)}</span></div>
            <hr className="border-slate-200" />
            <div className="flex justify-between text-base font-semibold"><span>Net Salary</span><span>{Number(payslip.net_salary).toFixed(2)}</span></div>
            <div className="pt-2"><Badge status={payslip.status} /></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
