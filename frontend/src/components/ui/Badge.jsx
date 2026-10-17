const STYLES = {
  active: 'bg-green-100 text-green-700',
  present: 'bg-green-100 text-green-700',
  approved: 'bg-green-100 text-green-700',
  paid: 'bg-green-100 text-green-700',
  generated: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  half_day: 'bg-amber-100 text-amber-700',
  draft: 'bg-slate-100 text-slate-700',
  on_leave: 'bg-blue-100 text-blue-700',
  holiday: 'bg-purple-100 text-purple-700',
  absent: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
  terminated: 'bg-red-100 text-red-700',
  resigned: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export default function Badge({ status }) {
  const style = STYLES[status] || 'bg-slate-100 text-slate-700';
  const label = String(status || '').replace(/_/g, ' ');
  return <span className={`badge ${style} capitalize`}>{label}</span>;
}
