import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewReport from './pages/NewReport';
import MyReports from './pages/MyReports';
import AuthorityView from './pages/AuthorityView';
import Onboarding from './pages/Onboarding';

function PrivateRoute({ children }) {
  const { user, isOnboarded, isAuthority, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-civic-500 border-t-transparent rounded-full animate-spin" /></div>;
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
  const { user, isOnboarded, isAuthority, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isAuthority || isOnboarded) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
        <Route path="/report/new" element={<PrivateRoute><NewReport /></PrivateRoute>} />
        <Route path="/my-reports" element={<PrivateRoute><MyReports /></PrivateRoute>} />
        <Route path="/authority" element={<AuthorityRoute><AuthorityView /></AuthorityRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
