import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '../../components/ui/Modal.jsx';
import * as employeesApi from '../../api/employees.js';
import * as departmentsApi from '../../api/departments.js';
import * as designationsApi from '../../api/designations.js';
import * as documentsApi from '../../api/documents.js';
import { ACCEPT_ATTR, MAX_UPLOAD_MB, validateFiles, formatFileSize } from '../../utils/documents.js';

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Min 8 characters'),
  role: z.enum(['admin', 'employee']),
  employeeCode: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  departmentId: z.coerce.number().optional(),
  designationId: z.coerce.number().optional(),
  dateOfJoining: z.string().optional(),
  baseSalary: z.coerce.number().min(0).optional(),
});

const updateSchema = createSchema.omit({ email: true, password: true, role: true, employeeCode: true }).extend({
  employmentStatus: z.enum(['active', 'on_leave', 'terminated', 'resigned']).optional(),
});

export default function EmployeeFormModal({ open, onClose, employee }) {
  const isEdit = !!employee;
  const queryClient = useQueryClient();
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.listDepartments, enabled: open });
  const { data: designations = [] } = useQuery({ queryKey: ['designations'], queryFn: () => designationsApi.listDesignations(), enabled: open });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(isEdit ? updateSchema : createSchema) });

  useEffect(() => {
    if (open) {
      setFiles([]);
      setFileError(null);
      setFileInputKey((k) => k + 1);
      reset(
        isEdit
          ? {
              firstName: employee.first_name,
              lastName: employee.last_name,
              phone: employee.phone || '',
              departmentId: employee.department_id || undefined,
              designationId: employee.designation_id || undefined,
              dateOfJoining: employee.date_of_joining || '',
              baseSalary: employee.base_salary,
              employmentStatus: employee.employment_status,
            }
          : { role: 'employee' }
      );
    }
  }, [open, isEdit, employee, reset]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) return employeesApi.updateEmployee(employee.id, payload);
      const created = await employeesApi.createEmployee(payload);
      if (files.length) {
        try {
          await documentsApi.uploadEmployeeDocuments(created.id, files, 'onboarding');
        } catch (err) {
          // The employee already exists, so report this instead of failing the whole save
          created.uploadError = err?.response?.data?.message || 'Upload failed';
        }
      }
      return created;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      if (result?.uploadError) {
        alert(`Employee created, but the documents could not be uploaded: ${result.uploadError}. You can upload them later from the Documents button.`);
      }
      onClose();
    },
  });

  const onSubmit = (data) => mutation.mutate(data);

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Employee' : 'Add Employee'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First Name</label>
            <input className="input" {...register('firstName')} />
            {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="label">Last Name</label>
            <input className="input" {...register('lastName')} />
            {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>}
          </div>
        </div>

        {!isEdit && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" {...register('email')} />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" {...register('password')} />
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="label">Employee Code</label>
              <input className="input" {...register('employeeCode')} />
              {errors.employeeCode && <p className="text-xs text-red-600 mt-1">{errors.employeeCode.message}</p>}
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" {...register('role')}>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Phone</label>
            <input className="input" {...register('phone')} />
          </div>
          <div>
            <label className="label">Date of Joining</label>
            <input type="date" className="input" {...register('dateOfJoining')} />
          </div>
          <div>
            <label className="label">Department</label>
            <select className="input" {...register('departmentId')}>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Designation</label>
            <select className="input" {...register('designationId')}>
              <option value="">Select designation</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Base Salary</label>
            <input type="number" step="0.01" className="input" {...register('baseSalary')} />
          </div>
          {isEdit && (
            <div>
              <label className="label">Employment Status</label>
              <select className="input" {...register('employmentStatus')}>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
                <option value="resigned">Resigned</option>
              </select>
            </div>
          )}
        </div>

        {!isEdit && (
          <div className="rounded-lg border border-dashed border-slate-300 p-4">
            <label className="label">Documents (optional)</label>
            <input
              key={fileInputKey}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              className="input text-xs"
              onChange={(e) => {
                const list = Array.from(e.target.files);
                const error = validateFiles(list);
                setFileError(error);
                setFiles(error ? [] : list);
                if (error) setFileInputKey((k) => k + 1);
              }}
            />
            <p className="text-xs text-slate-500 mt-1">
              PDF, DOC, DOCX, XLS, XLSX, JPG, PNG — up to {MAX_UPLOAD_MB} MB each (ID proof, offer letter, etc.)
            </p>
            {fileError && <p className="text-sm text-red-600 mt-1">{fileError}</p>}
            {files.length > 0 && (
              <ul className="mt-2 text-xs text-slate-600 space-y-0.5">
                {files.map((f) => <li key={f.name}>{f.name} ({formatFileSize(f.size)})</li>)}
              </ul>
            )}
          </div>
        )}

        {mutation.isError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {mutation.error?.response?.data?.message || 'Something went wrong'}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Employee'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
