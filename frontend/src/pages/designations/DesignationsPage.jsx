import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import * as designationsApi from '../../api/designations.js';
import * as departmentsApi from '../../api/departments.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Modal from '../../components/ui/Modal.jsx';

export default function DesignationsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({ queryKey: ['designations'], queryFn: () => designationsApi.listDesignations() });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.listDepartments });
  const { register, handleSubmit, reset } = useForm();

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      const cleaned = { ...payload, departmentId: payload.departmentId ? Number(payload.departmentId) : null };
      return editing ? designationsApi.updateDesignation(editing.id, cleaned) : designationsApi.createDesignation(cleaned);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: designationsApi.deleteDesignation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['designations'] }),
  });

  const openCreate = () => { setEditing(null); reset({ title: '', departmentId: '' }); setModalOpen(true); };
  const openEdit = (item) => { setEditing(item); reset({ title: item.title, departmentId: item.department_id || '' }); setModalOpen(true); };

  return (
    <div>
      <PageHeader
        title="Designations"
        subtitle="Manage job titles across departments"
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Designation</button>}
      />

      <div className="card overflow-hidden">
        {isLoading ? (
          <Spinner className="mx-auto my-12" />
        ) : data.length === 0 ? (
          <EmptyState title="No designations yet" />
        ) : (
          <table className="table-base">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.title}</td>
                  <td className="px-4 py-3 text-slate-600">{item.department_name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="text-slate-400 hover:text-primary-600" onClick={() => openEdit(item)}><Pencil size={16} /></button>
                      <button
                        className="text-slate-400 hover:text-red-600"
                        onClick={() => confirm(`Delete "${item.title}"?`) && deleteMutation.mutate(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Designation' : 'Add Designation'}>
        <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" {...register('title', { required: true })} />
          </div>
          <div>
            <label className="label">Department</label>
            <select className="input" {...register('departmentId')}>
              <option value="">None</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
