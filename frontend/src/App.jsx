import React, { useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PublicRegistry from './pages/PublicRegistry';
import NewReport from './pages/NewReport';
import MyReports from './pages/MyReports';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import CivicBot from './components/CivicBot';

function PrivateRoute({ children }) {
  const { user, isOnboarded, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isOnboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

function OnboardingRoute({ children }) {
  const { user, isOnboarded, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isOnboarded) return <Navigate to="/" replace />;
  return children;
}

function SeedManager() {
  useEffect(() => {
    async function checkAndSeed() {
      if (!db) return;
      try {
        const snap = await getDocs(collection(db, 'reports'));
        // If we have less than 10 reports, we should inject a massive demo dataset
        if (snap.size < 10) {
          console.log("Map looks empty. Seeding 50+ dense demo reports...");
          
          const categories = ['pothole', 'streetlight', 'garbage', 'graffiti', 'water_leak', 'infrastructure'];
          const severities = ['low', 'medium', 'high'];
          const statuses = ['open', 'acknowledged', 'resolved'];
          const cities = [
            { id: 'ward_del', name: 'Delhi', lat: 28.6139, lng: 77.2090 },
            { id: 'ward_mum', name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
            { id: 'ward_blr', name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
            { id: 'ward_chn', name: 'Chennai', lat: 13.0827, lng: 80.2707 }
          ];

          for (let i = 0; i < 60; i++) {
            const city = cities[Math.floor(Math.random() * cities.length)];
            // Create a tight cluster around the city center (roughly 10-15km radius)
            const latJitter = (Math.random() - 0.5) * 0.15;
            const lngJitter = (Math.random() - 0.5) * 0.15;
            
            const category = categories[Math.floor(Math.random() * categories.length)];
            const severity = severities[Math.floor(Math.random() * severities.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            
            await setDoc(doc(db, 'reports', `demo-mass-${i}`), {
              category,
              description: `A severe ${category} issue reported by a local resident. Immediate attention required.`,
              summary: `Reported ${category} in ${city.name}`,
              status,
              severity,
              wardId: city.id,
              lat: city.lat + latJitter,
              lng: city.lng + lngJitter,
              createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
            });
          }

          // Ensure we specifically have a broken commitment for the UI demo
          await setDoc(doc(db, 'reports', 'demo-broken-com'), {
            category: 'garbage',
            description: 'Illegal dumping ground festering for weeks.',
            status: 'acknowledged',
            severity: 'medium',
            wardId: 'ward_del',
            lat: 28.6150, lng: 77.2100,
            summary: 'Illegal waste dumping',
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            crowdfundGoal: 500,
            crowdfundRaised: 120
          });
          await setDoc(doc(db, 'commitments', 'demo-broken-com-1'), {
            reportId: 'demo-broken-com',
            authorityName: 'Delhi Sanitation Dept',
            promisedAction: 'Will deploy a cleanup crew and install bins.',
            status: 'broken',
            etaDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
          });

          console.log("Mass seeding complete! Hard refresh to see map populated.");
        }
      } catch (err) {
        console.error("Seed error", err);
      }
    }
    checkAndSeed();
  }, []);
  return null;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen mesh-bg relative overflow-x-hidden">
      <ErrorBoundary>
        <SeedManager />
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/registry" element={<PublicRegistry />} />
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
          <Route path="/report/new" element={<PrivateRoute><NewReport /></PrivateRoute>} />
          <Route path="/my-reports" element={<PrivateRoute><MyReports /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {location.pathname !== '/login' && <CivicBot />}
      </ErrorBoundary>
    </div>
  );
}
