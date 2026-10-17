import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '../../components/ui/Modal.jsx';
import * as attendanceApi from '../../api/attendance.js';
import * as employeesApi from '../../api/employees.js';

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function OverrideModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const { data: employees = [] } = useQuery({ queryKey: ['all-employees'], queryFn: employeesApi.listAllEmployees, enabled: open });
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const status = watch('status');
  const showTimes = status === 'present' || status === 'half_day';

  useEffect(() => {
    if (open) reset({ employeeId: '', workDate: todayIso(), status: 'present', checkIn: '', checkOut: '', reason: '' });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: attendanceApi.overrideAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      onClose();
    },
  });

  const onSubmit = (d) =>
    mutation.mutate({
      employeeId: Number(d.employeeId),
      workDate: d.workDate,
      status: d.status,
      checkIn: showTimes && d.checkIn ? d.checkIn : null,
      checkOut: showTimes && d.checkOut ? d.checkOut : null,
      reason: d.reason,
    });

  const apiError = mutation.error?.response?.data;
  const message = apiError?.details?.fieldErrors
    ? Object.values(apiError.details.fieldErrors).flat().join(', ')
    : apiError?.message;

  return (
    <Modal open={open} onClose={onClose} title="Correct Attendance">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-slate-500">
          Corrections bypass GPS checks, so a reason is required. The old values, new values, reason and your name are saved in an audit trail.
        </p>
        <div>
          <label className="label">Employee</label>
          <select className="input" {...register('employeeId', { required: 'Select an employee' })}>
            <option value="">Select employee</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</option>)}
          </select>
          {errors.employeeId && <p className="text-xs text-red-600 mt-1">{errors.employeeId.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date</label>
            <input type="date" max={todayIso()} className="input" {...register('workDate', { required: true })} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" {...register('status')}>
              <option value="present">Present</option>
              <option value="half_day">Half day</option>
              <option value="absent">Absent</option>
              <option value="on_leave">On leave</option>
              <option value="holiday">Holiday</option>
            </select>
          </div>
        </div>
        {showTimes && (
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Check in</label><input type="time" className="input" {...register('checkIn')} /></div>
            <div><label className="label">Check out</label><input type="time" className="input" {...register('checkOut')} /></div>
          </div>
        )}
        <div>
          <label className="label">Reason (required)</label>
          <textarea className="input" rows={3} placeholder="e.g. Phone battery died, confirmed by manager"
            {...register('reason', { required: 'A reason is required', minLength: { value: 5, message: 'At least 5 characters' } })} />
          {errors.reason && <p className="text-xs text-red-600 mt-1">{errors.reason.message}</p>}
        </div>
        {mutation.isError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{message || 'Could not save correction'}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save correction'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
