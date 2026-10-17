import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import * as departmentsApi from '../../api/departments.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Modal from '../../components/ui/Modal.jsx';

export default function DepartmentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.listDepartments });
  const { register, handleSubmit, reset } = useForm();

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing ? departmentsApi.updateDepartment(editing.id, payload) : departmentsApi.createDepartment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: departmentsApi.deleteDepartment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  });

  const openCreate = () => { setEditing(null); reset({ name: '', description: '' }); setModalOpen(true); };
  const openEdit = (dept) => { setEditing(dept); reset({ name: dept.name, description: dept.description || '' }); setModalOpen(true); };

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Organize your company into departments"
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Department</button>}
      />

      <div className="card overflow-hidden">
        {isLoading ? (
          <Spinner className="mx-auto my-12" />
        ) : data.length === 0 ? (
          <EmptyState title="No departments yet" />
        ) : (
          <table className="table-base">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Employees</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{dept.name}</td>
                  <td className="px-4 py-3 text-slate-600">{dept.description || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{dept.employee_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="text-slate-400 hover:text-primary-600" onClick={() => openEdit(dept)}><Pencil size={16} /></button>
                      <button
                        className="text-slate-400 hover:text-red-600"
                        onClick={() => confirm(`Delete "${dept.name}"?`) && deleteMutation.mutate(dept.id)}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Department' : 'Add Department'}>
        <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" {...register('name', { required: true })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} {...register('description')} />
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
