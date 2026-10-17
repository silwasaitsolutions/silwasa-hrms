import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../../components/ui/Modal.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import * as officesApi from '../../api/offices.js';
import * as employeesApi from '../../api/employees.js';

export default function AssignEmployeesModal({ office, onClose }) {
  const open = !!office;
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['all-employees'], queryFn: employeesApi.listAllEmployees, enabled: open,
  });
  const { data: assignedIds, isLoading: loadingAssigned } = useQuery({
    queryKey: ['office-employees', office?.id],
    queryFn: () => officesApi.getOfficeEmployees(office.id),
    enabled: open,
    staleTime: 0,
  });

  useEffect(() => {
    if (assignedIds) setSelected(new Set(assignedIds));
    setSearch('');
  }, [assignedIds, office?.id]);

  const saveMutation = useMutation({
    mutationFn: () => officesApi.setOfficeEmployees(office.id, [...selected]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices'] });
      queryClient.invalidateQueries({ queryKey: ['office-employees'] });
      onClose();
    },
  });

  const current = useMemo(
    () => employees.filter((e) => !['terminated', 'resigned'].includes(e.employment_status)),
    [employees]
  );
  const visible = current.filter((e) =>
    `${e.first_name} ${e.last_name} ${e.employee_code}`.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <Modal open={open} onClose={onClose} title={office ? `Assign employees — ${office.name}` : ''}>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Assigned employees can check in only at their assigned offices. Employees assigned to no office can use any active office.
        </p>
        <input className="input" placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-3 text-sm">
          <button type="button" className="text-primary-600 hover:underline"
            onClick={() => setSelected((p) => new Set([...p, ...visible.map((e) => e.id)]))}>Select shown</button>
          <button type="button" className="text-slate-500 hover:underline" onClick={() => setSelected(new Set())}>Clear all</button>
          <span className="ml-auto text-slate-500">{selected.size} selected</span>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
          {loadingEmployees || loadingAssigned ? (
            <Spinner className="mx-auto my-8" />
          ) : visible.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No employees found</p>
          ) : (
            visible.map((e) => (
              <label key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
                <span className="text-slate-900">{e.first_name} {e.last_name}</span>
                <span className="text-slate-400 text-xs">{e.employee_code}</span>
              </label>
            ))
          )}
        </div>

        {saveMutation.isError && (
          <p className="text-sm text-red-600">{saveMutation.error?.response?.data?.message || 'Could not save'}</p>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Saving...' : 'Save assignments'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
