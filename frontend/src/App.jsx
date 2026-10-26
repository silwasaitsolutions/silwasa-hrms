import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AppLayout from './components/layout/AppLayout.jsx';

import LoginPage from './pages/auth/LoginPage.jsx';
import DashboardPage from './pages/dashboard/DashboardPage.jsx';
import EmployeesPage from './pages/employees/EmployeesPage.jsx';
import DepartmentsPage from './pages/departments/DepartmentsPage.jsx';
import DesignationsPage from './pages/designations/DesignationsPage.jsx';
import AttendancePage from './pages/attendance/AttendancePage.jsx';
import LeavePage from './pages/leave/LeavePage.jsx';
import HolidaysPage from './pages/holidays/HolidaysPage.jsx';
import PayrollPage from './pages/payroll/PayrollPage.jsx';
import ReportsPage from './pages/reports/ReportsPage.jsx';
import MyDocumentsPage from './pages/documents/MyDocumentsPage.jsx';
import OfficesPage from './pages/offices/OfficesPage.jsx';
import Spinner from './components/ui/Spinner.jsx';

// The rich-text editor is large; load it only when an admin opens HR Documents
const HrDocumentsPage = lazy(() => import('./pages/hrdocuments/HrDocumentsPage.jsx'));
const TemplateEditorPage = lazy(() => import('./pages/hrdocuments/TemplateEditorPage.jsx'));

export default function App() {
  return (
    <Suspense fallback={<Spinner className="mx-auto mt-24" />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/leave" element={<LeavePage />} />
          <Route path="/holidays" element={<HolidaysPage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/documents" element={<MyDocumentsPage />} />

          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/designations" element={<DesignationsPage />} />
            <Route path="/offices" element={<OfficesPage />} />
            <Route path="/hr-documents" element={<HrDocumentsPage />} />
            <Route path="/hr-documents/templates/:id" element={<TemplateEditorPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </Suspense>
  );
}
