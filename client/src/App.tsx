import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useViewMode } from './viewMode';

const Login = lazy(() => import('./components/Login'));
const ForgotPassword = lazy(() => import('./components/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));
const Home = lazy(() => import('./components/Home'));
const HelpSupport = lazy(() => import('./components/HelpSupport'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const Layout = lazy(() => import('./components/Layout'));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
      Loading...
    </div>
  );
}

function PrivateRoute({ children, requireRole }: { children: React.ReactNode, requireRole?: string[] }) {
  const { viewUser, actualUser } = useViewMode();
  const roleToCheck = viewUser?.role;

  if (!actualUser) {
    return <Navigate to="/login" />;
  }

  // Check role if required
  if (requireRole && (!roleToCheck || !requireRole.includes(roleToCheck))) {
    return <Navigate to="/" />;
  }

  // If we have no effective role, treat it as invalid and push to login
  if (!roleToCheck) {
    return <Navigate to="/login" />;
  }

  return <Layout>{children}</Layout>;
}

// Route that restricts access to admin/internal only (no external users).
// Wrap create/edit pages with this as you add domain features.
export function WriteAccessRoute({ children }: { children: React.ReactNode }) {
  const { viewUser, actualUser } = useViewMode();
  const roleToCheck = viewUser?.role;

  if (!actualUser || !roleToCheck) {
    return <Navigate to="/login" />;
  }

  if (roleToCheck === 'external') {
    return <Navigate to="/" />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected routes - all authenticated users */}
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/help" element={<PrivateRoute><HelpSupport /></PrivateRoute>} />

          {/* Admin only routes */}
          <Route path="/users" element={<PrivateRoute requireRole={['admin']}><UserManagement /></PrivateRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
