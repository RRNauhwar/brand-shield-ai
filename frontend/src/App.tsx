import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OrganisationProvider } from './contexts/OrganisationContext';
import { ToastProvider } from './components/ui/Toast';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { PageSkeleton } from './components/ui/PageSkeleton';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { AppLayout } from './layouts/AppLayout';

// Code-split lazy routes for sub-second bundle hydration
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const Overview = lazy(() => import('./pages/Overview').then(m => ({ default: m.Overview })));
const CampaignWarRoom = lazy(() => import('./pages/CampaignWarRoom').then(m => ({ default: m.CampaignWarRoom })));
const AiRepairStudio = lazy(() => import('./pages/AiRepairStudio').then(m => ({ default: m.AiRepairStudio })));
const BrandKnowledge = lazy(() => import('./pages/BrandKnowledge').then(m => ({ default: m.BrandKnowledge })));
const ContentAudit = lazy(() => import('./pages/ContentAudit').then(m => ({ default: m.ContentAudit })));
const AuditReport = lazy(() => import('./pages/AuditReport').then(m => ({ default: m.AuditReport })));
const AuditHistory = lazy(() => import('./pages/AuditHistory').then(m => ({ default: m.AuditHistory })));
const ReviewApprovals = lazy(() => import('./pages/ReviewApprovals').then(m => ({ default: m.ReviewApprovals })));
const GovernanceAnalytics = lazy(() => import('./pages/GovernanceAnalytics').then(m => ({ default: m.GovernanceAnalytics })));
const TeamMembers = lazy(() => import('./pages/TeamMembers').then(m => ({ default: m.TeamMembers })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

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
          <Suspense fallback={<PageSkeleton />}>
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
          </Suspense>
        </OrganisationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
