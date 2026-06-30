import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PublicRegistry from './pages/PublicRegistry';
import NewReport from './pages/NewReport';
import MyReports from './pages/MyReports';
import AuthorityView from './pages/AuthorityView';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AuthorityProfile from './pages/AuthorityProfile';
import Leaderboard from './pages/Leaderboard';
import CivicBot from './components/CivicBot';

function PrivateRoute({ children }) {
  const { user, isOnboarded, isAuthority, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isAuthority) return children; // Authorities don't strictly need onboarding yet, or we let them pass
  if (!isOnboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

function AuthorityRoute({ children }) {
  const { user, isAuthority, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAuthority) return <Navigate to="/" replace />;
  return children;
}

function OnboardingRoute({ children }) {
  const { user, isOnboarded, isAuthority, isAdmin, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isAuthority || isAdmin || isOnboarded) return <Navigate to="/" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  // DEMO MODE: Allow any logged-in user to access the Admin Panel
  return children;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen mesh-bg relative overflow-x-hidden">
      <ErrorBoundary>
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/registry" element={<PublicRegistry />} />
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
          <Route path="/report/new" element={<PrivateRoute><NewReport /></PrivateRoute>} />
          <Route path="/my-reports" element={<PrivateRoute><MyReports /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/authority" element={<AuthorityRoute><AuthorityView /></AuthorityRoute>} />
          <Route path="/registry/:wardId" element={<AuthorityProfile />} />
          <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {location.pathname !== '/login' && <CivicBot />}
      </ErrorBoundary>
    </div>
  );
}
