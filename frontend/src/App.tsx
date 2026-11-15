import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OrganisationProvider } from './contexts/OrganisationContext';
import { ToastProvider } from './components/ui/Toast';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { AppLayout } from './layouts/AppLayout';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Overview } from './pages/Overview';
import { CampaignWarRoom } from './pages/CampaignWarRoom';
import { AiRepairStudio } from './pages/AiRepairStudio';
import { BrandKnowledge } from './pages/BrandKnowledge';
import { ContentAudit } from './pages/ContentAudit';
import { AuditReport } from './pages/AuditReport';
import { AuditHistory } from './pages/AuditHistory';
import { ReviewApprovals } from './pages/ReviewApprovals';
import { GovernanceAnalytics } from './pages/GovernanceAnalytics';
import { TeamMembers } from './pages/TeamMembers';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullPage label="Authenticating session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrganisationProvider>
          <ToastProvider />
          <Routes>
            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <AuthLayout>
                    <Login />
                  </AuthLayout>
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <AuthLayout>
                    <Register />
                  </AuthLayout>
                </PublicRoute>
              }
            />

            {/* Protected SaaS Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="campaigns" element={<CampaignWarRoom />} />
              <Route path="campaigns/:id" element={<CampaignWarRoom />} />
              <Route path="repair-studio" element={<AiRepairStudio />} />
              <Route path="repair-studio/:id" element={<AiRepairStudio />} />
              <Route path="brand-knowledge" element={<BrandKnowledge />} />
              <Route path="content-audit" element={<ContentAudit />} />
              <Route path="content-audit/:id" element={<AuditReport />} />
              <Route path="audit/:id" element={<AuditReport />} />
              <Route path="audit-history" element={<AuditHistory />} />
              <Route path="reviews" element={<ReviewApprovals />} />
              <Route path="analytics" element={<GovernanceAnalytics />} />
              <Route path="team" element={<TeamMembers />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </OrganisationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
