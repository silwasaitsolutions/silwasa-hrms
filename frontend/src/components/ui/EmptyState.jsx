export default function EmptyState({ title = 'No data found', subtitle }) {
  return (
    <div className="text-center py-12">
      <p className="text-slate-500 font-medium">{title}</p>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}
