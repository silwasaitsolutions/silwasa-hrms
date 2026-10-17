import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import * as holidaysApi from '../../api/holidays.js';
import useAuth from '../../hooks/useAuth.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Modal from '../../components/ui/Modal.jsx';

export default function HolidaysPage() {
  const { isAdmin } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({ queryKey: ['holidays', year], queryFn: () => holidaysApi.listHolidays(year) });
  const { register, handleSubmit, reset } = useForm();

  const createMutation = useMutation({
    mutationFn: holidaysApi.createHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setModalOpen(false);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: holidaysApi.deleteHoliday,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays'] }),
  });

  return (
    <div>
      <PageHeader
        title="Holidays"
        subtitle="Company holiday calendar"
        actions={
          <>
            <select className="input w-28" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {isAdmin && (
              <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Add Holiday</button>
            )}
          </>
        }
      />

      <div className="card overflow-hidden">
        {isLoading ? (
          <Spinner className="mx-auto my-12" />
        ) : data.length === 0 ? (
          <EmptyState title="No holidays added for this year" />
        ) : (
          <table className="table-base">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                {isAdmin && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{h.holiday_date}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{h.name}</td>
                  <td className="px-4 py-3 text-slate-600">{h.description || '—'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          className="text-slate-400 hover:text-red-600"
                          onClick={() => confirm(`Delete "${h.name}"?`) && deleteMutation.mutate(h.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Holiday">
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" {...register('name', { required: true })} />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" {...register('holidayDate', { required: true })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} {...register('description')} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
