import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Briefcase, CalendarCheck,
  CalendarDays, PartyPopper, Wallet, FileBarChart, FolderOpen, MapPin, FileSignature, X,
} from 'lucide-react';
import useAuth from '../../hooks/useAuth.js';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { to: '/employees', label: 'Employees', icon: Users, adminOnly: true },
  { to: '/departments', label: 'Departments', icon: Building2, adminOnly: true },
  { to: '/designations', label: 'Designations', icon: Briefcase, adminOnly: true },
  { to: '/offices', label: 'Offices', icon: MapPin, adminOnly: true },
  { to: '/hr-documents', label: 'HR Documents', icon: FileSignature, adminOnly: true },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, adminOnly: false },
  { to: '/leave', label: 'Leave', icon: CalendarDays, adminOnly: false },
  { to: '/holidays', label: 'Holidays', icon: PartyPopper, adminOnly: false },
  { to: '/payroll', label: 'Payroll', icon: Wallet, adminOnly: false },
  { to: '/documents', label: 'My Documents', icon: FolderOpen, adminOnly: false, employeeOnly: true },
  { to: '/reports', label: 'Reports', icon: FileBarChart, adminOnly: true },
];

export default function Sidebar({ open, onClose }) {
  const { isAdmin } = useAuth();
  const items = NAV_ITEMS.filter(
    (item) => (!item.adminOnly || isAdmin) && (!item.employeeOnly || !isAdmin)
  );

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-16 flex items-center px-5 border-b border-slate-200">
          {/* Updated Logo Image */}
          <img
            src="/images/mindkraftlogo-new.webp"
            alt="Mindkraft Logo"
            className="h-10 w-auto object-contain mb-3"
          />
          <span className="text-lg font-bold text-primary-700">Mindkraft</span>
          <button className="lg:hidden text-slate-400" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                 ${isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100'}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
