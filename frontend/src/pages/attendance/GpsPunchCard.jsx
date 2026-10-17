import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MapPin, LogIn, LogOut, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import * as attendanceApi from '../../api/attendance.js';
import { getCurrentPosition } from '../../utils/geolocation.js';

const hhmm = (t) => String(t).slice(0, 5);

export default function GpsPunchCard({ today }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null); // 'in' | 'out' | null
  const [feedback, setFeedback] = useState(null);

  const row = today.attendance;
  const blocked = row && !row.check_in && ['on_leave', 'holiday', 'absent'].includes(row.status);
  const checkedIn = !!row?.check_in;
  const checkedOut = !!row?.check_out;
  const noOffice = today.offices.length === 0;

  const punch = async (kind) => {
    setBusy(kind);
    setFeedback(null);
    try {
      const position = await getCurrentPosition();
      const res = await (kind === 'in' ? attendanceApi.checkIn : attendanceApi.checkOut)(position);
      setFeedback({
        ok: true,
        text: `${res.message} at ${hhmm(res.time)} — ${Math.round(res.distanceM)} m from the office (limit ${res.radiusM} m).`,
      });
    } catch (err) {
      setFeedback({ ok: false, text: err?.response?.data?.message || err.message || 'Something went wrong' });
    } finally {
      setBusy(null);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['gps-logs'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
    }
  };

  let statusText = 'Not checked in yet';
  if (blocked) statusText = `Today is marked as "${row.status.replace('_', ' ')}"`;
  else if (checkedOut) statusText = `Done for today — in ${hhmm(row.check_in)}, out ${hhmm(row.check_out)}`;
  else if (checkedIn) statusText = `Checked in at ${hhmm(row.check_in)}`;

  return (
    <div className="card p-5 mb-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-11 h-11 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
            <MapPin size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Today · {today.workDate}</p>
            <p className="text-lg font-semibold text-slate-900">{statusText}</p>
            {noOffice ? (
              <p className="text-sm text-amber-700 mt-1">No active office is assigned to you. Please contact your admin.</p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">
                Allowed at: {today.offices.map((o) => `${o.name} (within ${o.radius_m} m)`).join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            className="btn-primary"
            disabled={!!busy || noOffice || blocked || checkedIn}
            onClick={() => punch('in')}
          >
            {busy === 'in' ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {busy === 'in' ? 'Locating...' : 'Check in'}
          </button>
          <button
            className="btn-secondary"
            disabled={!!busy || noOffice || blocked || !checkedIn || checkedOut}
            onClick={() => punch('out')}
          >
            {busy === 'out' ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
            {busy === 'out' ? 'Locating...' : 'Check out'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`mt-4 flex gap-2 rounded-lg px-3 py-2 text-sm ${feedback.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {feedback.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}
      <p className="text-xs text-slate-400 mt-3">
        Your browser will ask for location access. Your position is checked on the server when you tap the button.
      </p>
    </div>
  );
}
