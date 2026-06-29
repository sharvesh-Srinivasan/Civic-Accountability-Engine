import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, limit, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const getMarkerStyles = (status) => {
  switch(status) {
    case 'resolved': return 'bg-sage border-white text-white shadow-md';
    case 'open': return 'bg-terracotta border-white text-white shadow-md animate-pulse';
    case 'acknowledged': return 'bg-navy border-white text-white shadow-md';
    default: return 'bg-muted border-white text-white shadow-sm';
  }
};

const getCategoryIcon = (cat) => {
  switch(cat) {
    case 'infrastructure': return 'construction';
    case 'sanitation': return 'cleaning_services';
    case 'utilities': return 'water_drop';
    case 'traffic': return 'traffic';
    default: return 'report';
  }
};

function MapBoundsFitter({ reports, userLocation }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    
    // If the user's location is known, do not fit bounds to all reports
    // as this could zoom out the map to the entire country. The Map component
    // is already centered on the user's location via the center prop.
    if (userLocation) return;
    
    // Create bounds based on reports only if no user location
    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;
    
    reports.forEach(r => {
      if (r.lat && r.lng) {
        bounds.extend({ lat: parseFloat(r.lat), lng: parseFloat(r.lng) });
        hasPoints = true;
      }
    });

    if (hasPoints) {
      map.fitBounds(bounds, { padding: 50 }); // Padding of 50px
      const listener = window.google.maps.event.addListenerOnce(map, 'idle', () => {
        if (map.getZoom() > 14) map.setZoom(14);
      });
      return () => window.google.maps.event.removeListener(listener);
    }
  }, [map, reports, userLocation]);
  return null;
}

function CommunityMap({ reports, userDoc }) {
  const [center, setCenter] = useState({ lat: 11.1271, lng: 78.6569 }); // Default TN
  const [userLocation, setUserLocation] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (userDoc?.lat && userDoc?.lng) {
      const loc = { lat: parseFloat(userDoc.lat), lng: parseFloat(userDoc.lng) };
      setCenter(loc);
      setUserLocation(loc);
    } else if (userDoc?.address || userDoc?.city) {
      const locationString = userDoc.address || userDoc.city;
      // Fallback: Geocode the address or city if lat/lng is missing
      fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationString)}&key=${GOOGLE_MAPS_API_KEY}`)
        .then(res => res.json())
        .then(data => {
          if (data.results?.[0]) {
            const loc = {
              lat: data.results[0].geometry.location.lat,
              lng: data.results[0].geometry.location.lng
            };
            setCenter(loc);
            setUserLocation(loc);
          }
        }).catch(console.error);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(loc);
        setUserLocation(loc);
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
      >
        <MapBoundsFitter reports={reports} userLocation={userLocation} />
        {/* User Location Marker */}
        {userLocation && (
          <AdvancedMarker position={userLocation} title="Your Location" zIndex={100}>
            <div className="w-4 h-4 bg-navy rounded-full border-2 border-white shadow-md animate-pulse"></div>
          </AdvancedMarker>
        )}

        {reports.map(r => {
          if (!r.lat || !r.lng) return null;
          return (
            <AdvancedMarker 
              key={r.id} 
              position={{ lat: parseFloat(r.lat), lng: parseFloat(r.lng) }}
              onClick={() => setSelectedReport(r)}
              className="group"
            >
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 group-hover:shadow-lg ${getMarkerStyles(r.status)}`}>
                <span className="material-symbols-outlined text-[16px]">{getCategoryIcon(r.category)}</span>
              </div>
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
              <h4 className="font-label-md text-navy capitalize mb-1 font-bold">{selectedReport.category?.replace('_', ' ')}</h4>
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
  const { user, userDoc, loading: authLoading, isOnboarded } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wards, setWards] = useState({}); // id -> city mapping
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
      } else if (userDoc && !isOnboarded) {
        navigate('/onboarding');
      }
    }
  }, [user, userDoc, authLoading, navigate, isOnboarded]);

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
        setDataError(''); // Clear error on successful snapshot
      }, err => {
        console.error('Reports snapshot error:', err);
        setDataError('Failed to load live reports. Please check your connection.');
      });
      setLoading(false);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setDataError('Failed to load dashboard data. Please try refreshing.');
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
    return (
      <div className="flex-1 flex flex-col p-margin-desktop gap-4 w-full max-w-container-max mx-auto bg-paper min-h-screen">
        <div className="h-8 w-64 bg-surface rounded animate-shimmer bg-gradient-to-r from-surface via-border to-surface bg-[length:200%_100%] shadow-sm" />
        <div className="h-[400px] w-full bg-surface rounded-xl animate-shimmer bg-gradient-to-r from-surface via-border to-surface bg-[length:200%_100%] border border-border shadow-sm" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
          <div className="h-32 bg-surface rounded-xl border border-border animate-shimmer bg-gradient-to-r from-surface via-border to-surface bg-[length:200%_100%] shadow-sm" />
          <div className="h-32 bg-surface rounded-xl border border-border animate-shimmer bg-gradient-to-r from-surface via-border to-surface bg-[length:200%_100%] shadow-sm" />
          <div className="h-32 bg-surface rounded-xl border border-border animate-shimmer bg-gradient-to-r from-surface via-border to-surface bg-[length:200%_100%] shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto overflow-x-hidden pt-20 md:pt-margin-desktop bg-paper text-ink min-h-screen font-body-md">
      
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-stack-md animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        <ol className="flex items-center gap-2 font-label-md text-label-md">
          <li><Link to="/" className="text-navy hover:underline">Home</Link></li>
          <li><span className="text-muted">/</span></li>
          <li aria-current="page" className="text-muted">Public Ledger</li>
        </ol>
      </nav>

      {dataError && (
        <div className="mb-stack-lg bg-terracotta/10 text-terracotta p-4 rounded-xl flex items-center gap-3 border border-terracotta">
          <span className="material-symbols-outlined">error</span>
          <p className="font-body-md font-bold">{dataError}</p>
        </div>
      )}

      {/* Map Section */}
      <div className="mb-stack-lg bg-surface border border-border rounded-xl shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <div className="p-gutter border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-navy">map</span>
            <h3 className="font-serif text-xl text-ink font-bold">Evidence Map</h3>
          </div>
        </div>
        <div className="w-full h-[400px] bg-paper relative z-10">
          <CommunityMap reports={filteredReports} userDoc={userDoc} />
        </div>
      </div>

      <header className="mb-stack-lg flex flex-col md:flex-row md:items-baseline justify-between gap-4 border-b-4 border-navy pb-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div>
          <h1 className="font-serif text-4xl text-navy font-bold tracking-tight">The Public Trust Ledger</h1>
          <p className="font-body-md text-muted mt-2 max-w-2xl">Official, permanent registry of civic commitments and citizen evidence. Track whether authorities are honoring their word.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 md:items-center shrink-0 relative">
          <div className="relative w-full md:w-48">
            <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="appearance-none w-full rounded bg-surface p-2.5 pr-8 border border-border font-label-md focus:border-navy focus:ring-1 focus:ring-navy focus:outline-none text-ink shadow-sm cursor-pointer transition-colors hover:bg-paper">
              <option value="">All Regions</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none">expand_more</span>
          </div>
          <Link to="/report/new" className="w-full md:w-auto bg-navy text-white h-10 px-4 rounded-lg flex items-center justify-center gap-2 font-label-md text-label-md hover:scale-[1.02] hover:shadow-md transition-all duration-150 shrink-0">
            <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
            Log Evidence
          </Link>
        </div>
      </header>

      {/* Feature 5: Equity Watch - Silent Issue Detector */}
      {insights?.equityWatch && (
        <div className="mb-stack-md bg-surface border border-sage p-4 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <span className="material-symbols-outlined text-sage mt-0.5">policy</span>
          <div>
            <h3 className="font-label-md font-bold text-ink uppercase tracking-wider text-[11px] mb-1">Equity Watch: Silent Issue Detector</h3>
            <p className="font-body-sm text-sm text-ink leading-relaxed">
              <strong>{insights.equityWatch.wardName}</strong> {insights.equityWatch.text}
            </p>
          </div>
        </div>
      )}

      {/* Feature 3: Ward Trust Score Forecast */}
      {insights?.trustScore && (
        <div className="mb-stack-md bg-surface border border-border p-gutter rounded-xl relative overflow-hidden shadow-sm animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-navy/5 rounded-bl-full pointer-events-none"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-headline-sm text-headline-sm text-ink">Ward Trust Score Forecast</h2>
                <span className="px-2 py-0.5 bg-navy/10 text-navy text-[10px] font-bold uppercase rounded tracking-wider shadow-sm">AI Insight</span>
              </div>
              <p className="font-body-md text-muted max-w-2xl leading-relaxed mt-2">
                <strong>Gemini Forecast:</strong> {insights.trustScore.forecastText}
              </p>
            </div>
            <div className="flex items-end gap-4 shrink-0">
              {/* Dynamic Sparkline */}
              <div className="flex items-end gap-1.5 h-12 pb-1">
                {insights.trustScore.sparkline.map((val, i) => (
                  <div key={i} className="w-3 bg-navy rounded-t-sm transition-all duration-1000" style={{ height: `${val}%`, opacity: 0.3 + (i * 0.1) }}></div>
                ))}
              </div>
              <div className="text-right">
                <div className="font-display-md text-navy leading-none">{insights.trustScore.currentScore}</div>
                <div className="text-[10px] font-label-md text-muted uppercase tracking-wider mt-1">Current Score</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview Bento - Redesigned as Ledger Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md mb-stack-lg animate-fade-in-up" style={{ animationDelay: '250ms' }}>
        <div className="bg-surface border-t-4 border-navy border-x border-b border-border rounded-b-xl rounded-t p-gutter flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-md text-label-md text-muted uppercase tracking-widest">Total Evidence Logged</span>
          </div>
          <div className="font-serif text-4xl text-ink">{filteredReports.length}</div>
          <div className="font-caption text-caption text-muted mt-2 border-t border-border pt-2">Publicly recorded {selectedCity ? `in ${selectedCity}` : 'in network'}</div>
        </div>

        <div className="bg-surface border-t-4 border-sage border-x border-b border-border rounded-b-xl rounded-t p-gutter flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-md text-label-md text-muted uppercase tracking-widest">Commitments Honored</span>
          </div>
          <div className="font-serif text-4xl text-sage">{resolvedCount}</div>
          <div className="font-caption text-caption text-muted mt-2 border-t border-border pt-2">Promises kept by authorities</div>
        </div>

        <div className="bg-surface border-t-4 border-terracotta border-x border-b border-border rounded-b-xl rounded-t p-gutter flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-md text-label-md text-muted uppercase tracking-widest">Pending Action</span>
          </div>
          <div className="font-serif text-4xl text-ink">{openCount}</div>
          <div className="font-caption text-caption text-muted mt-2 border-t border-border pt-2">Awaiting verification or action</div>
        </div>
      </div>

      {/* Feature 4: Cross-Ward Best Practice Matching */}
      {insights?.benchmarking && (
        <section className="mb-stack-lg bg-surface border border-border p-gutter rounded-xl shadow-sm animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-navy">hub</span>
            <h2 className="font-serif text-2xl text-ink">Cross-Ward Benchmarking</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-paper p-4 rounded-lg border border-border">
              <h3 className="text-[11px] font-label-md font-bold text-muted uppercase tracking-wider mb-2">Opportunity Identified</h3>
              <p className="font-body-sm text-sm text-ink leading-relaxed">
                <strong>{insights.benchmarking.poorWard.name}</strong> currently averages <span className="text-terracotta font-bold">{insights.benchmarking.poorWard.days} days</span> to resolve {insights.benchmarking.poorWard.metric}.
              </p>
            </div>
            <div className="bg-surface p-4 rounded-lg border border-border relative overflow-hidden shadow-sm">
               <div className="absolute top-0 right-0 bottom-0 w-1 bg-sage"></div>
              <h3 className="text-[11px] font-label-md font-bold text-sage uppercase tracking-wider mb-2">Best Practice Match</h3>
              <p className="font-body-sm text-sm text-ink leading-relaxed">
                <strong>{insights.benchmarking.bestWard.name}</strong> resolves the same category in an average of <span className="text-sage font-bold">{insights.benchmarking.bestWard.days} days</span>. The system recommends connecting {insights.benchmarking.poorWard.name} officials with {insights.benchmarking.bestWard.name} leadership for knowledge transfer.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Ledger Table */}
      <section className="bg-surface border border-border rounded-xl mb-stack-lg shadow-sm animate-fade-in-up overflow-hidden" style={{ animationDelay: '350ms' }}>
        <div className="px-gutter py-4 border-b border-border flex justify-between items-center bg-paper">
          <h2 className="font-serif text-2xl text-navy font-bold">Public Ledger Entries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md text-body-md">
            <thead className="bg-paper font-label-md text-label-md text-muted border-b border-border">
              <tr>
                <th className="py-3 px-gutter font-bold uppercase tracking-widest text-[10px]">Registry ID</th>
                <th className="py-3 px-gutter font-bold uppercase tracking-widest text-[10px]">Evidence / Category</th>
                <th className="py-3 px-gutter font-bold uppercase tracking-widest text-[10px]">Location</th>
                <th className="py-3 px-gutter font-bold uppercase tracking-widest text-[10px]">Date Recorded</th>
                <th className="py-3 px-gutter font-bold uppercase tracking-widest text-[10px]">Commitment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-serif">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-muted">
                    <div className="flex items-center justify-center gap-2">
                       <span className="material-symbols-outlined animate-spin">sync</span> Loading registry...
                    </div>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-muted">No records found for this area.</td>
                </tr>
              ) : filteredReports.map(r => {
                const dateStr = r.createdAt?.toDate ? format(r.createdAt.toDate(), 'MMM dd, yyyy') : 'Unknown';
                const isResolved = r.status === 'resolved';
                
                return (
                  <tr key={r.id} className="hover:bg-paper transition-colors bg-surface">
                    <td className="py-4 px-gutter text-muted text-sm font-mono tracking-wider">
                      {r.id.slice(0,8).toUpperCase()}
                    </td>
                    <td className="py-4 px-gutter text-ink font-bold capitalize">
                      {r.category?.replace('_', ' ')}
                      {r.severity === 'high' && <span className="ml-2 inline-flex items-center text-[10px] uppercase font-sans font-bold tracking-widest text-terracotta">High Priority</span>}
                    </td>
                    <td className="py-4 px-gutter text-muted text-sm">
                      <Link to={`/registry/${r.wardId}`} className="hover:text-navy hover:underline font-bold transition-colors">
                        {r.wardId?.replace(/ward(\d+)/i, 'Ward $1') || 'Unknown Area'}
                      </Link>
                    </td>
                    <td className="py-4 px-gutter text-muted text-sm">{dateStr}</td>
                    <td className="py-4 px-gutter">
                      {isResolved ? (
                        <span className="inline-flex items-center gap-1 font-sans text-xs font-bold uppercase tracking-wider text-sage">
                          <span className="material-symbols-outlined text-[16px]">verified</span> Honored
                        </span>
                      ) : r.status === 'open' ? (
                        <span className="inline-flex items-center gap-1 font-sans text-xs font-bold uppercase tracking-wider text-muted">
                          <span className="material-symbols-outlined text-[16px]">history</span> Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-sans text-xs font-bold uppercase tracking-wider text-navy">
                          <span className="material-symbols-outlined text-[16px]">sync</span> Acknowledged
                        </span>
                      )}
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
