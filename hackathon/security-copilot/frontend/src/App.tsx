import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Snackbar, Alert } from '@mui/material';

import type { RootState, AppDispatch } from './store';
import { hideNotification } from './store/notificationSlice';

import AppLayout from './components/Layout/AppLayout';
import PrivateRoute from './components/Auth/PrivateRoute';

import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import IntelligenceList from './pages/Intelligence/IntelligenceList';
import IntelligenceDetail from './pages/Intelligence/IntelligenceDetail';
import ReviewQueue from './pages/Review/ReviewQueue';
import ReviewDetail from './pages/Review/ReviewDetail';
import ContentManagement from './pages/Content/ContentManagement';
import SourceManagement from './pages/Sources/SourceManagement';
import AnalyticsDashboard from './pages/Analytics/AnalyticsDashboard';
import AdminPanel from './pages/Admin/AdminPanel';
import AuditLogs from './pages/Admin/AuditLogs';
import ThreatFeed from './pages/Threats/ThreatFeed';
import ThreatDetail from './pages/Threats/ThreatDetail';
import ThreatDashboard from './pages/Threats/ThreatDashboard';
import PublishingChannelsPage from './pages/Publishing/PublishingChannelsPage';
import ClientMailsPage from './pages/Publishing/ClientMailsPage';

// Layout wrapper that enforces auth then renders AppLayout with nested routes
const ProtectedLayout: React.FC = () => (
  <PrivateRoute>
    <AppLayout />
  </PrivateRoute>
);

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const notifications = useSelector(
    (state: RootState) => state.notification.notifications
  );

  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* All protected routes live inside the AppLayout shell */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/intelligence" element={<IntelligenceList />} />
          <Route path="/intelligence/:id" element={<IntelligenceDetail />} />

          <Route
            path="/review"
            element={
              <PrivateRoute roles={['analyst', 'admin']}>
                <ReviewQueue />
              </PrivateRoute>
            }
          />
          <Route
            path="/review/:id"
            element={
              <PrivateRoute roles={['analyst', 'admin']}>
                <ReviewDetail />
              </PrivateRoute>
            }
          />

          <Route
            path="/content"
            element={
              <PrivateRoute roles={['analyst', 'admin']}>
                <ContentManagement />
              </PrivateRoute>
            }
          />

          <Route
            path="/sources"
            element={
              <PrivateRoute roles={['admin']}>
                <SourceManagement />
              </PrivateRoute>
            }
          />

          <Route path="/analytics" element={<AnalyticsDashboard />} />

          <Route path="/threats" element={<ThreatFeed />} />
          <Route path="/threats/:id" element={<ThreatDetail />} />
          <Route path="/threat-dashboard" element={<ThreatDashboard />} />

          <Route
            path="/publishing-channels"
            element={
              <PrivateRoute roles={['admin']}>
                <PublishingChannelsPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/client-mails"
            element={
              <PrivateRoute roles={['analyst', 'admin']}>
                <ClientMailsPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminPanel />
              </PrivateRoute>
            }
          />

          <Route
            path="/audit"
            element={
              <PrivateRoute roles={['admin']}>
                <AuditLogs />
              </PrivateRoute>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Global notification snackbars */}
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={notification.open}
          autoHideDuration={5000}
          onClose={() => dispatch(hideNotification(notification.id))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => dispatch(hideNotification(notification.id))}
            severity={notification.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

export default App;
