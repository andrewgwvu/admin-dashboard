import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/auth.service';
import { DarkModeProvider } from './contexts/DarkModeContext';
import LoginPage from './pages/LoginPage';
import SSOCallbackPage from './pages/SSOCallbackPage';
import DashboardPage from './pages/DashboardPage';
import AccountsPage from './pages/AccountsPage';
import AccountDetailPage from './pages/AccountDetailPage';
import NetworkPage from './pages/NetworkPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminConfigPage from './pages/AdminConfigPage';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';
import Layout from './components/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  useEffect(() => {
    // Start checking for token expiration
    authService.startTokenExpirationCheck();
  }, []);

  return (
    <DarkModeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<SSOCallbackPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="accounts/:identifier" element={<AccountDetailPage />} />
            <Route path="network" element={<NetworkPage />} />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />
            <Route
              path="admin/users"
              element={
                <AdminRoute>
                  <AdminUsersPage />
                </AdminRoute>
              }
            />
            <Route
              path="admin/config"
              element={
                <AdminRoute>
                  <AdminConfigPage />
                </AdminRoute>
              }
            />
            <Route
              path="admin/audit-logs"
              element={
                <AdminRoute>
                  <AdminAuditLogsPage />
                </AdminRoute>
              }
            />
          </Route>
        </Routes>
      </Router>
    </DarkModeProvider>
  );
}

export default App;
