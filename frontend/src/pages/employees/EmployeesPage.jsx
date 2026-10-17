import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Download, Pencil, Trash2, FolderOpen } from 'lucide-react';
import * as employeesApi from '../../api/employees.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import EmployeeFormModal from './EmployeeFormModal.jsx';
import EmployeeDocumentsModal from './EmployeeDocumentsModal.jsx';

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [documentsEmployee, setDocumentsEmployee] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['employees', { search, page }],
    queryFn: () => employeesApi.listEmployees({ search, page, limit: 20 }),
  });

  const deleteMutation = useMutation({
    mutationFn: employeesApi.deleteEmployee,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });

  const openCreate = () => { setEditingEmployee(null); setModalOpen(true); };
  const openEdit = (emp) => { setEditingEmployee(emp); setModalOpen(true); };

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Manage your organization's employees"
        actions={
          <>
            <a
              href={employeesApi.exportEmployeesCsvUrl({ search })}
              className="btn-secondary"
              target="_blank" rel="noreferrer"
            >
              <Download size={16} /> Export CSV
            </a>
            <button className="btn-primary" onClick={openCreate}>
              <Plus size={16} /> Add Employee
            </button>
          </>
        }
      />

      <div className="card p-4 mb-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, code, or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <Spinner className="mx-auto my-12" />
        ) : data.items.length === 0 ? (
          <EmptyState title="No employees found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Designation</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{emp.first_name} {emp.last_name}</div>
                      <div className="text-xs text-slate-500">{emp.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{emp.employee_code}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.department_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.designation_title || '—'}</td>
                    <td className="px-4 py-3"><Badge status={emp.employment_status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="text-slate-400 hover:text-primary-600" onClick={() => setDocumentsEmployee(emp)} title="Documents">
                          <FolderOpen size={16} />
                        </button>
                        <button className="text-slate-400 hover:text-primary-600" onClick={() => openEdit(emp)} title="Edit">
                          <Pencil size={16} />
                        </button>
                        <button
                          className="text-slate-400 hover:text-red-600"
                          onClick={() => {
                            if (confirm(`Delete ${emp.first_name} ${emp.last_name}? This cannot be undone.`)) {
                              deleteMutation.mutate(emp.id);
                            }
                          }}
                        >
                          <Trash2 size={16} />
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

      {data && (
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={setPage} />
      )}

      <EmployeeDocumentsModal employee={documentsEmployee} onClose={() => setDocumentsEmployee(null)} />
      <EmployeeFormModal open={modalOpen} onClose={() => setModalOpen(false)} employee={editingEmployee} />
    </div>
  );
}
