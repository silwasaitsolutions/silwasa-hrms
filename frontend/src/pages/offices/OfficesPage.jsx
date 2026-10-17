import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Users, ExternalLink } from 'lucide-react';
import * as officesApi from '../../api/offices.js';
import { mapLink } from '../../utils/geolocation.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Badge from '../../components/ui/Badge.jsx';
import OfficeFormModal from './OfficeFormModal.jsx';
import AssignEmployeesModal from './AssignEmployeesModal.jsx';

export default function OfficesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assigning, setAssigning] = useState(null);

  const { data = [], isLoading } = useQuery({ queryKey: ['offices'], queryFn: officesApi.listOffices });

  const deleteMutation = useMutation({
    mutationFn: officesApi.deleteOffice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offices'] }),
  });

  return (
    <div>
      <PageHeader
        title="Office Locations"
        subtitle="Employees can check in and out only inside these zones"
        actions={
          <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={16} /> Add Office
          </button>
        }
      />

      <div className="card overflow-hidden">
        {isLoading ? (
          <Spinner className="mx-auto my-12" />
        ) : data.length === 0 ? (
          <EmptyState
            title="No office locations yet"
            subtitle="Add at least one active office, otherwise nobody can check in."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Office</th>
                  <th className="px-4 py-3 font-medium">Coordinates</th>
                  <th className="px-4 py-3 font-medium">Radius</th>
                  <th className="px-4 py-3 font-medium">Employees</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{o.name}</div>
                      <div className="text-xs text-slate-500">{o.address || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <a href={mapLink(o.latitude, o.longitude)} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:text-primary-600">
                        {o.latitude.toFixed(6)}, {o.longitude.toFixed(6)} <ExternalLink size={12} />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{o.radius_m} m</td>
                    <td className="px-4 py-3 text-slate-600">
                      {o.employee_count > 0 ? `${o.employee_count} assigned` : 'Everyone (no assignments)'}
                    </td>
                    <td className="px-4 py-3"><Badge status={o.is_active ? 'active' : 'inactive'} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <button className="text-slate-400 hover:text-primary-600" title="Assign employees" onClick={() => setAssigning(o)}><Users size={16} /></button>
                        <button className="text-slate-400 hover:text-primary-600" title="Edit" onClick={() => { setEditing(o); setFormOpen(true); }}><Pencil size={16} /></button>
                        <button
                          className="text-slate-400 hover:text-red-600" title="Delete"
                          onClick={() => confirm(`Delete "${o.name}"? Past attendance records keep its name.`) && deleteMutation.mutate(o.id)}
                        ><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <OfficeFormModal open={formOpen} onClose={() => setFormOpen(false)} office={editing} />
      <AssignEmployeesModal office={assigning} onClose={() => setAssigning(null)} />
    </div>
  );
}
