import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, limit, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/* ── Pin colors (Material Light) ────────────────────────────── */
const STATUS_RING = {
  open:         '#002046', // primary
  acknowledged: '#1b6d24', // secondary
  resolved:     '#1b6d24',
  disputed:     '#ba1a1a', // error
};

const SEV_FILL = {
  low: '#a3f69c',
  medium: '#cfe6f2',
  high: '#ffdad6'
};

function CommunityMap({ reports, userDoc }) {
  const [center, setCenter] = useState({ lat: 11.1271, lng: 78.6569 }); // Default TN
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (userDoc?.lat && userDoc?.lng) {
      setCenter({ lat: parseFloat(userDoc.lat), lng: parseFloat(userDoc.lng) });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, [userDoc]);
  
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map 
        center={center} 
        onCameraChanged={(ev) => setCenter(ev.detail.center)}
        defaultZoom={12} 
        mapId="DEMO_MAP_ID" 
        disableDefaultUI={false}
      >
        {/* User Location Marker */}
        {userDoc?.lat && userDoc?.lng && (
          <AdvancedMarker position={{ lat: parseFloat(userDoc.lat), lng: parseFloat(userDoc.lng) }} title="Your Location" zIndex={100}>
            <div className="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-md animate-pulse"></div>
          </AdvancedMarker>
        )}

        {reports.map(r => {
          if (!r.lat || !r.lng) return null;
          const fill = SEV_FILL[r.severity] || '#ffffff';
          const ring = STATUS_RING[r.status] || '#002046';
          return (
            <AdvancedMarker 
              key={r.id} 
              position={{ lat: parseFloat(r.lat), lng: parseFloat(r.lng) }}
              onClick={() => setSelectedReport(r)}
            >
              <Pin background={fill} borderColor={ring} glyphColor={ring} />
            </AdvancedMarker>
          );
        })}

        {/* Report Details Popup */}
        {selectedReport && (
          <InfoWindow 
            position={{ lat: parseFloat(selectedReport.lat), lng: parseFloat(selectedReport.lng) }}
            onCloseClick={() => setSelectedReport(null)}
          >
            <div className="p-2 text-black max-w-[200px]">
              <h4 className="font-label-md text-primary capitalize mb-1 font-bold">{selectedReport.category?.replace('_', ' ')}</h4>
              <p className="font-caption text-xs text-gray-700 mb-2 line-clamp-3">{selectedReport.summary || selectedReport.description}</p>
              <span className="text-[10px] uppercase font-bold bg-gray-200 px-2 py-0.5 rounded text-gray-800">{selectedReport.status}</span>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}

export default function Dashboard() {
  const { user, userDoc, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wards, setWards] = useState({}); // id -> city mapping
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
      } else if (userDoc && !userDoc.onboarded) {
        navigate('/onboarding');
      }
    }
  }, [user, userDoc, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!db) {
      setLoading(false); return () => {};
    }
    setLoading(true);
    let unsubReports = () => {};
    try {
      // Load wards to map wardId to city
      const wardsSnap = await getDocs(collection(db, 'wards'));
      const wardsMap = {};
      const citySet = new Set();
      wardsSnap.docs.forEach(d => {
        const data = d.data();
        if (data.city) {
          wardsMap[d.id] = data.city;
          citySet.add(data.city);
        }
      });
      setWards(wardsMap);
      setCities(Array.from(citySet).sort());

      // Fetch all reports (filtering done in render)
      unsubReports = onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(100)), snap => {
        setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      setLoading(false);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setLoading(false);
    }
    return unsubReports;
  }, []);

  useEffect(() => {
    let cleanup = () => {};
    load().then(unsub => { cleanup = unsub; });
    return () => cleanup();
  }, [load]);

  // Handle insight fetching when selectedCity changes
  useEffect(() => {
    if (!db) return;
    const fetchInsights = async () => {
      try {
        const docName = selectedCity ? selectedCity.toLowerCase() : 'demo_insight';
        const insightDoc = await getDoc(doc(db, 'dashboard_insights', docName));
        if (insightDoc.exists()) {
          setInsights(insightDoc.data());
        } else {
          // Fallback if not found
          const fallbackDoc = await getDoc(doc(db, 'dashboard_insights', 'demo_insight'));
          if (fallbackDoc.exists()) setInsights(fallbackDoc.data());
        }
      } catch (err) {
        console.error('Failed to load insights:', err);
      }
    };
    fetchInsights();
  }, [selectedCity]);

  // Filter reports by selected city
  const filteredReports = reports.filter(r => {
    if (!selectedCity) return true;
    return wards[r.wardId] === selectedCity;
  });

  const openCount = filteredReports.filter(r => r.status === 'open' || r.status === 'acknowledged').length;
  const resolvedCount = filteredReports.filter(r => r.status === 'resolved').length;

  if (authLoading || !user) {
    return <div className="flex-1 flex justify-center items-center h-screen bg-background"><span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span></div>;
  }

  return (
    <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto overflow-x-hidden pt-20 md:pt-margin-desktop bg-background text-on-background min-h-screen font-body-md">
      
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-stack-md">
        <ol className="flex items-center gap-2 font-label-md text-label-md">
          <li><Link to="/" className="text-primary hover:underline">Home</Link></li>
          <li><span className="text-outline">/</span></li>
          <li aria-current="page" className="text-on-surface-variant">Dashboard</li>
        </ol>
      </nav>

      {/* Hero Map Section */}
      <section className="bg-surface-container-low border border-primary-fixed-dim rounded-xl flex flex-col relative overflow-hidden mb-stack-lg shadow-sm">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, var(--tw-colors-primary) 0%, transparent 50%)' }}></div>
        <div className="p-gutter border-b border-outline-variant z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-1">Community Map</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">See reports and issues in your neighborhood.</p>
          </div>
          <button className="bg-surface-container-lowest border border-outline text-on-surface h-10 px-4 rounded font-label-md text-label-md hover:bg-surface-variant transition-colors inline-flex items-center gap-2">
            <span className="material-symbols-outlined">fullscreen</span>
            Expand Map
          </button>
        </div>
        <div className="w-full h-[400px] bg-surface-variant relative z-10">
          <CommunityMap reports={filteredReports} userDoc={userDoc} />
        </div>
      </section>

      <header className="mb-stack-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Overview</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">A summary of your recent civic engagement and submitted reports.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="w-full md:w-48 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 font-body-md focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none">
            <option value="">All of Tamil Nadu</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Link to="/report/new" className="w-full md:w-auto bg-primary text-on-primary h-12 px-4 rounded flex items-center justify-center gap-2 font-label-md text-label-md hover:bg-primary-container transition-colors shrink-0">
            <span className="material-symbols-outlined">add</span>
            Report Issue
          </Link>
        </div>
      </header>

      {/* Feature 5: Equity Watch - Silent Issue Detector */}
      {insights?.equityWatch && (
        <div className="mb-stack-md bg-secondary-container/50 border border-secondary p-4 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in">
          <span className="material-symbols-outlined text-secondary mt-0.5">policy</span>
          <div>
            <h3 className="font-label-md font-bold text-on-surface uppercase tracking-wider text-[11px] mb-1">Equity Watch: Silent Issue Detector</h3>
            <p className="font-body-sm text-sm text-on-surface leading-relaxed">
              <strong>{insights.equityWatch.wardName}</strong> {insights.equityWatch.text}
            </p>
          </div>
        </div>
      )}

      {/* Feature 3: Ward Trust Score Forecast */}
      {insights?.trustScore && (
        <div className="mb-stack-md bg-surface-container-lowest border border-primary-fixed-dim p-gutter rounded-xl relative overflow-hidden shadow-sm animate-fade-in">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Ward Trust Score Forecast</h2>
                <span className="px-2 py-0.5 bg-primary-container text-on-primary-container text-[10px] font-bold uppercase rounded tracking-wider shadow-sm">AI Insight</span>
              </div>
              <p className="font-body-md text-on-surface-variant max-w-2xl leading-relaxed mt-2">
                <strong>Gemini Forecast:</strong> {insights.trustScore.forecastText}
              </p>
            </div>
            <div className="flex items-end gap-4 shrink-0">
              {/* Dynamic Sparkline */}
              <div className="flex items-end gap-1.5 h-12 pb-1">
                {insights.trustScore.sparkline.map((val, i) => (
                  <div key={i} className="w-3 bg-primary rounded-t-sm transition-all duration-1000" style={{ height: `${val}%`, opacity: 0.3 + (i * 0.1) }}></div>
                ))}
              </div>
              <div className="text-right">
                <div className="font-display-md text-primary leading-none">{insights.trustScore.currentScore}</div>
                <div className="text-[10px] font-label-md text-on-surface-variant uppercase tracking-wider mt-1">Current Score</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md mb-stack-lg">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="font-label-md text-label-md text-on-surface-variant">Total Reports</span>
            <div className="w-10 h-10 rounded bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">assignment</span>
            </div>
          </div>
          <div className="font-display-lg text-display-lg text-on-surface">{filteredReports.length}</div>
          <div className="font-caption text-caption text-on-surface-variant mt-2">Lifetime submissions {selectedCity ? `in ${selectedCity}` : 'in network'}</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="font-label-md text-label-md text-on-surface-variant">Resolved</span>
            <div className="w-10 h-10 rounded bg-secondary-container flex items-center justify-center text-on-secondary-container">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
          </div>
          <div className="font-display-lg text-display-lg text-on-surface">{resolvedCount}</div>
          <div className="font-caption text-caption text-on-surface-variant mt-2">Issues successfully closed</div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="font-label-md text-label-md text-on-surface-variant">Pending</span>
            <div className="w-10 h-10 rounded bg-surface-variant flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined">schedule</span>
            </div>
          </div>
          <div className="font-display-lg text-display-lg text-on-surface">{openCount}</div>
          <div className="font-caption text-caption text-on-surface-variant mt-2">Awaiting action or acknowledged</div>
        </div>
      </div>

      {/* Feature 4: Cross-Ward Best Practice Matching */}
      {insights?.benchmarking && (
        <section className="mb-stack-lg bg-surface-container-low border border-outline-variant p-gutter rounded-xl shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">hub</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Cross-Ward Benchmarking</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant">
              <h3 className="text-[11px] font-label-md font-bold text-on-surface-variant uppercase tracking-wider mb-2">Opportunity Identified</h3>
              <p className="font-body-sm text-sm text-on-surface leading-relaxed">
                <strong>{insights.benchmarking.poorWard.name}</strong> currently averages <span className="text-error font-bold">{insights.benchmarking.poorWard.days} days</span> to resolve {insights.benchmarking.poorWard.metric}.
              </p>
            </div>
            <div className="bg-surface-container-lowest p-4 rounded-lg border border-primary-fixed-dim relative overflow-hidden shadow-sm">
               <div className="absolute top-0 right-0 bottom-0 w-1 bg-secondary"></div>
              <h3 className="text-[11px] font-label-md font-bold text-secondary uppercase tracking-wider mb-2">Best Practice Match</h3>
              <p className="font-body-sm text-sm text-on-surface leading-relaxed">
                <strong>{insights.benchmarking.bestWard.name}</strong> resolves the same category in an average of <span className="text-secondary font-bold">{insights.benchmarking.bestWard.days} days</span>. The system recommends connecting {insights.benchmarking.poorWard.name} officials with {insights.benchmarking.bestWard.name} leadership for knowledge transfer.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Recent Reports Table */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl mb-stack-lg overflow-hidden">
        <div className="px-gutter py-4 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
          <h2 className="font-headline-md text-headline-md text-on-surface">Recent Reports</h2>
          <Link to="/my-reports" className="font-label-md text-label-md text-primary hover:underline">View All</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md text-body-md">
            <thead className="bg-surface-container-low font-label-md text-label-md text-on-surface-variant border-b border-outline-variant">
              <tr>
                <th className="py-3 px-gutter font-normal">Report ID</th>
                <th className="py-3 px-gutter font-normal">Category</th>
                <th className="py-3 px-gutter font-normal">Date Submitted</th>
                <th className="py-3 px-gutter font-normal">Status</th>
                <th className="py-3 px-gutter font-normal text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-on-surface-variant">Loading reports...</td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-on-surface-variant">No reports found for this area.</td>
                </tr>
              ) : filteredReports.slice(0, 5).map(r => {
                const dateStr = r.createdAt?.toDate ? format(r.createdAt.toDate(), 'MMM dd, yyyy') : 'Unknown';
                const isResolved = r.status === 'resolved';
                
                return (
                  <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-4 px-gutter font-label-md text-label-md text-on-surface truncate max-w-[120px]">
                      #{r.id.slice(0,8).toUpperCase()}
                    </td>
                    <td className="py-4 px-gutter text-on-surface capitalize">{r.category?.replace('_', ' ')}</td>
                    <td className="py-4 px-gutter text-on-surface-variant">{dateStr}</td>
                    <td className="py-4 px-gutter">
                      {isResolved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary-container text-on-secondary-container font-caption text-caption font-bold">
                          <span className="material-symbols-outlined text-[14px]">check</span> Resolved
                        </span>
                      ) : r.status === 'open' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-variant text-on-surface-variant font-caption text-caption font-bold">
                          <span className="material-symbols-outlined text-[14px]">schedule</span> Submitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary-fixed text-on-primary-fixed font-caption text-caption font-bold">
                          <span className="material-symbols-outlined text-[14px]">sync</span> {r.status}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-gutter text-right">
                      <Link to="/my-reports" className="font-label-md text-label-md text-primary hover:underline">Details</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

    </main>
  );
}
