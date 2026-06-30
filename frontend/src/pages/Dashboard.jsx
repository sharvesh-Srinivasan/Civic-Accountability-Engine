import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, limit, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { mockWards, mockReports, mockInsights } from '../lib/demoData';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap, MapControl, ControlPosition } from '@vis.gl/react-google-maps';
import { withTimeout } from '../lib/utils';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const getMarkerConfig = (status) => {
  switch(status) {
    case 'resolved': return { color: 'bg-sage', glow: 'shadow-[0_0_15px_rgba(107,143,113,0.6)]' };
    case 'open': return { color: 'bg-terracotta', glow: 'shadow-[0_0_15px_rgba(217,119,87,0.6)]' };
    case 'acknowledged': return { color: 'bg-navy', glow: 'shadow-[0_0_15px_rgba(44,62,80,0.6)]' };
    default: return { color: 'bg-muted', glow: 'shadow-[0_0_15px_rgba(149,165,166,0.6)]' };
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
    
    // Create bounds based on reports
    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;
    
    reports.forEach(r => {
      if (r.lat && r.lng) {
        bounds.extend({ lat: parseFloat(r.lat), lng: parseFloat(r.lng) });
        hasPoints = true;
      }
    });

    if (userLocation) {
      bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
      hasPoints = true;
    }

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

function CommunityMap({ reports, userDoc, selectedCity, cityCoords }) {
  const [center, setCenter] = useState({ lat: 11.1271, lng: 78.6569 }); // Default TN
  const [userLocation, setUserLocation] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreen = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => document.removeEventListener('fullscreenchange', handleFullscreen);
  }, []);

  useEffect(() => {
    if (selectedCity && cityCoords && cityCoords[selectedCity]) {
      // If a city is explicitly selected via filter, fly to its known coordinates
      const loc = cityCoords[selectedCity];
      setCenter(loc);
    } else if (userDoc?.lat && userDoc?.lng) {
      // Fallback to precise user location
      const loc = { lat: parseFloat(userDoc.lat), lng: parseFloat(userDoc.lng) };
      setCenter(loc);
      setUserLocation(loc);
    } else if (navigator.geolocation) {
      // Last resort fallback
      navigator.geolocation.getCurrentPosition((pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(loc);
        setUserLocation(loc);
      });
    }
  }, [userDoc, selectedCity, cityCoords]);
  
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
          const config = getMarkerConfig(r.status);
          
          return (
            <AdvancedMarker 
              key={r.id} 
              position={{ lat: parseFloat(r.lat), lng: parseFloat(r.lng) }}
              onClick={() => setSelectedReport(r)}
              className="group z-10 hover:z-50"
            >
              <div className="relative flex items-center justify-center cursor-pointer">
                {/* Outer pulsing radar ring for open issues */}
                {r.status === 'open' && (
                  <div className={`absolute w-full h-full rounded-full animate-ping opacity-60 ${config.color}`}></div>
                )}
                
                {/* Inner glowing core */}
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-white border-[3px] border-white/90 backdrop-blur-md bg-opacity-95 transition-all duration-300 ease-out group-hover:scale-110 group-hover:-translate-y-1 group-hover:border-white ${config.color} ${config.glow}`}>
                  <span className="material-symbols-outlined text-[20px] drop-shadow-md">{getCategoryIcon(r.category)}</span>
                </div>

                {/* Floating Glassmorphism Tooltip on Hover */}
                <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 flex flex-col items-center transform group-hover:-translate-y-1">
                   <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-xl rounded-xl py-1.5 px-3 flex flex-col items-center">
                     <p className="text-[10px] font-bold text-navy uppercase tracking-widest whitespace-nowrap mb-0.5">{r.category?.replace('_', ' ')}</p>
                     {r.severity === 'high' && <span className="w-1.5 h-1.5 rounded-full bg-terracotta shadow-[0_0_5px_rgba(217,119,87,1)]"></span>}
                   </div>
                   {/* Tooltip triangle */}
                   <div className="w-2.5 h-2.5 bg-white/90 rotate-45 -mt-[5px] border-b border-r border-white/50 shadow-sm"></div>
                </div>
              </div>
            </AdvancedMarker>
          );
        })}

        {/* Fullscreen Ledger Panel */}
        {isFullscreen && (
          <MapControl position={ControlPosition.RIGHT_TOP}>
            <div className="bg-white/90 backdrop-blur-xl w-80 max-h-[90vh] mr-4 mt-4 rounded-3xl shadow-[0_8px_40px_rgba(31,38,135,0.2)] p-4 flex flex-col pointer-events-auto border border-white/50 z-50 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-navy/10">
                <span className="material-symbols-outlined text-navy text-[24px]">list_alt</span>
                <h3 className="font-serif text-xl text-navy font-bold">Evidence Ledger</h3>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {reports.slice(0, 50).map(r => (
                  <div key={r.id} onClick={() => setSelectedReport(r)} className="bg-white/60 p-3 rounded-2xl border border-white/60 shadow-sm flex gap-3 cursor-pointer hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-inner ${getMarkerConfig(r.status).color}`}>
                      <span className="material-symbols-outlined text-[18px]">{getCategoryIcon(r.category)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-label-md text-sm font-bold text-navy capitalize truncate">{r.category?.replace('_', ' ')}</h4>
                      <p className="text-xs text-muted line-clamp-2 mt-0.5 leading-relaxed">{r.summary || r.description}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[9px] uppercase font-bold text-muted tracking-widest">{r.status}</span>
                        <span className="text-[9px] uppercase font-bold text-navy/40 tracking-widest">{r.wardId?.replace(/ward(\d+)/i, 'W$1') || ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </MapControl>
        )}

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
  const [cityCoords, setCityCoords] = useState({}); // city -> {lat, lng} mapping
  
  const [selectedCity, setSelectedCity] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  
  const [dataError, setDataError] = useState('');

  // Cost of Inaction Ticker
  const [wastedMoney, setWastedMoney] = useState(0);

  useEffect(() => {
    let initialCost = 0;
    const costMultiplier = { pothole: 500, streetlight: 200, garbage: 300, water_leak: 400, other: 100 };
    
    reports.forEach(r => {
      if (r.status !== 'resolved') {
        let date;
        try { date = r.createdAt?.toDate?.() || new Date(r.createdAt || Date.now()); } 
        catch { date = new Date(); }
        const daysOpen = Math.max(1, Math.floor((new Date() - date) / (1000 * 60 * 60 * 24)));
        initialCost += daysOpen * (costMultiplier[r.category] || 100);
      }
    });
    
    setWastedMoney(initialCost + Math.floor(Math.random() * 1000));
    
    const interval = setInterval(() => {
      setWastedMoney(prev => prev + Math.floor(Math.random() * 15) + 5);
    }, 2500);
    
    return () => clearInterval(interval);
  }, [reports]);

  // Set default city once userDoc is loaded
  useEffect(() => {
    if (userDoc?.city && !selectedCity) {
      setSelectedCity(userDoc.city);
    }
  }, [userDoc?.city]);

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
    setLoading(true);
    let unsubReports = () => {};
    
    const processWards = (docs, isMock = false) => {
      const wardsMap = {};
      const citySet = new Set();
      const coordsMap = {};
      docs.forEach(d => {
        const data = isMock ? d : (d.data ? d.data() : d);
        const id = isMock ? d.id : d.id;
        if (data.city) {
          wardsMap[id] = data.city;
          citySet.add(data.city);
          if (data.lat && data.lng) {
            coordsMap[data.city] = { lat: parseFloat(data.lat), lng: parseFloat(data.lng) };
          }
        }
      });
      setWards(wardsMap);
      setCities(Array.from(citySet).sort());
      setCityCoords(coordsMap);
    };

    if (!db) {
      processWards(mockWards, true);
      setReports(mockReports);
      setDataError('Offline demo mode active.');
      setLoading(false);
      return unsubReports;
    }

    try {
      try {
        const wardsSnap = await withTimeout(getDocs(collection(db, 'wards')), 5000);
        processWards(wardsSnap.docs);
      } catch (err) {
        processWards(mockWards, true);
      }

      try {
        let isResolved = false;
        const timeoutId = setTimeout(() => {
          if (!isResolved) {
             console.warn("Reports snapshot timed out, forcing fallback");
             setReports(mockReports);
             setDataError('Offline demo mode active (timeout).');
             setLoading(false);
          }
        }, 5000);

        unsubReports = onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(100)), snap => {
          isResolved = true;
          clearTimeout(timeoutId);
          setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setDataError(''); // Clear error on successful snapshot
          setLoading(false);
        }, err => {
          isResolved = true;
          clearTimeout(timeoutId);
          console.error('Reports snapshot error:', err);
          setReports(mockReports);
          setDataError('Offline demo mode active.');
          setLoading(false);
        });
      } catch (err) {
        setReports(mockReports);
        setDataError('Offline demo mode active.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      processWards(mockWards, true);
      setReports(mockReports);
      setDataError('Offline demo mode active.');
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
    const fetchInsights = async () => {
      try {
        if (!db) throw new Error("No DB");
        const docName = selectedCity ? selectedCity.toLowerCase() : 'demo_insight';
        const insightDoc = await withTimeout(getDoc(doc(db, 'dashboard_insights', docName)), 5000);
        if (insightDoc.exists()) {
          setInsights(insightDoc.data());
        } else {
          const fallbackDoc = await withTimeout(getDoc(doc(db, 'dashboard_insights', 'demo_insight')), 5000);
          if (fallbackDoc.exists()) {
            setInsights(fallbackDoc.data());
          } else {
            setInsights(mockInsights.demo_insight);
          }
        }
      } catch (err) {
        console.error('Failed to load insights, using fallback:', err);
        setInsights(mockInsights.demo_insight);
      }
    };
    fetchInsights();
  }, [selectedCity]);

  // Filter reports by selected city, status, and severity
  const filteredReports = reports.filter(r => {
    let match = true;
    if (selectedCity && wards[r.wardId] !== selectedCity) match = false;
    if (statusFilter && r.status !== statusFilter) match = false;
    if (severityFilter && r.severity !== severityFilter) match = false;
    return match;
  });

  const openCount = filteredReports.filter(r => r.status === 'open' || r.status === 'acknowledged').length;
  const resolvedCount = filteredReports.filter(r => r.status === 'resolved').length;

  const myReports = filteredReports.filter(r => r.userId === user?.uid);
  const otherReports = filteredReports.filter(r => r.userId !== user?.uid);

  if (authLoading || !user || loading) {
    return (
      <div className="flex-1 flex flex-col p-margin-desktop gap-4 w-full max-w-container-max mx-auto bg-paper min-h-screen pt-24">
        <div className="h-8 w-64 bg-surface rounded animate-shimmer bg-[length:200%_100%] shadow-sm mb-8" />
        <div className="h-[400px] w-full bg-surface rounded-3xl animate-shimmer bg-[length:200%_100%] shadow-glass mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
          <div className="h-40 bg-surface rounded-3xl border border-border animate-shimmer bg-[length:200%_100%] shadow-sm" />
          <div className="h-40 bg-surface rounded-3xl border border-border animate-shimmer bg-[length:200%_100%] shadow-sm" />
          <div className="h-40 bg-surface rounded-3xl border border-border animate-shimmer bg-[length:200%_100%] shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 md:ml-72 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto overflow-x-hidden pt-24 md:pt-margin-desktop bg-transparent text-ink min-h-screen font-body-md relative z-10">
      
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-stack-md animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        <ol className="flex items-center gap-2 font-label-md text-label-md">
          <li><Link to="/" className="text-navy hover:underline">Home</Link></li>
          <li><span className="text-muted">/</span></li>
          <li aria-current="page" className="text-muted">Dashboard</li>
        </ol>
      </nav>

      {dataError && (
        <div className="mb-stack-lg bg-terracotta/10 text-terracotta p-4 rounded-xl flex items-center gap-3 border border-terracotta">
          <span className="material-symbols-outlined">error</span>
          <p className="font-body-md font-bold">{dataError}</p>
        </div>
      )}

      {/* Map Section */}
      <div className="mb-stack-lg glass-panel rounded-3xl shadow-glass overflow-hidden animate-fade-in-up hover:shadow-[0_8px_40px_rgba(31,38,135,0.12)] transition-shadow duration-500" style={{ animationDelay: '50ms' }}>
        <div className="p-gutter border-b border-white/20 flex items-center justify-between bg-white/40">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-navy">map</span>
            <h3 className="font-serif text-xl text-ink font-bold">Evidence Map</h3>
          </div>
        </div>
        <div className="w-full h-[400px] bg-transparent relative z-10">
          <CommunityMap reports={filteredReports} userDoc={userDoc} selectedCity={selectedCity} cityCoords={cityCoords} />
        </div>
      </div>

      <header className="mb-stack-lg flex flex-col md:flex-row md:items-baseline justify-between gap-4 pb-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-4xl text-navy font-bold tracking-tight">Civic Dashboard</h1>
            {userDoc?.streak > 0 && (
              <div className="flex items-center gap-1 bg-terracotta/10 text-terracotta px-2.5 py-0.5 rounded-full border border-terracotta/20 shadow-sm" title={`${userDoc.streak} day streak!`}>
                <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
                <span className="font-bold text-sm">{userDoc.streak}</span>
              </div>
            )}
          </div>
          <p className="font-body-md text-muted mt-2 max-w-2xl">Overview of network analytics, your active reports, and community insights.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 md:items-center shrink-0 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="flex gap-2 flex-1 md:flex-none shrink-0">
            <div className="relative w-full md:w-40 shrink-0">
              <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="appearance-none w-full rounded bg-surface p-2.5 pr-8 border border-border font-label-md text-sm focus:border-navy focus:ring-1 focus:ring-navy focus:outline-none text-ink shadow-sm cursor-pointer transition-colors hover:bg-paper">
                <option value="">All Regions</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-sm">expand_more</span>
            </div>
            
            <div className="relative w-full md:w-32 shrink-0">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="appearance-none w-full rounded bg-surface p-2.5 pr-8 border border-border font-label-md text-sm focus:border-navy focus:ring-1 focus:ring-navy focus:outline-none text-ink shadow-sm cursor-pointer transition-colors hover:bg-paper">
                <option value="">All Statuses</option>
                <option value="open">Pending</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Honored</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-sm">expand_more</span>
            </div>

            <div className="relative w-full md:w-32 shrink-0">
              <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="appearance-none w-full rounded bg-surface p-2.5 pr-8 border border-border font-label-md text-sm focus:border-navy focus:ring-1 focus:ring-navy focus:outline-none text-ink shadow-sm cursor-pointer transition-colors hover:bg-paper">
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-sm">expand_more</span>
            </div>
          </div>

          <Link to="/report/new" className="w-full md:w-auto bg-navy text-white h-10 px-6 rounded-full flex items-center justify-center gap-2 font-label-md text-label-md hover:scale-[1.02] hover:-translate-y-1 hover:shadow-glow-navy transition-all duration-300 shrink-0">
            <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
            Log Evidence
          </Link>
        </div>
      </header>

      {/* Feature 1: The "Cost of Inaction" Live Ticker */}
      <div className="mb-stack-lg bg-gradient-to-br from-terracotta/20 to-terracotta/5 border border-terracotta/30 rounded-4xl p-8 relative overflow-hidden shadow-glow-terracotta animate-fade-in-up hover:scale-[1.01] transition-transform duration-500" style={{ animationDelay: '150ms' }}>
        <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-[150px] text-terracotta">money_off</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-terracotta">warning</span>
              <h2 className="font-headline-sm text-headline-sm text-terracotta uppercase tracking-wider font-bold">The Cost of Inaction</h2>
            </div>
            <p className="font-body-md text-terracotta/80 max-w-xl">
              Estimated taxpayer funds wasted on unaddressed infrastructure and maintenance issues across the network.
            </p>
          </div>
          <div className="text-left md:text-right">
            <div className="font-mono text-4xl md:text-5xl text-terracotta font-bold tracking-tighter drop-shadow-sm flex items-center md:justify-end gap-1">
              <span>₹</span>
              <span>{wastedMoney.toLocaleString()}</span>
            </div>
            <div className="text-[10px] font-label-md text-terracotta/70 uppercase tracking-widest mt-1 flex items-center md:justify-end gap-1">
              <span className="material-symbols-outlined text-[14px] animate-pulse">timer</span>
              Increasing in real-time
            </div>
          </div>
        </div>
      </div>

      {/* Feature 5: Equity Watch - Silent Issue Detector */}
      {insights?.equityWatch && (
        <div className="mb-stack-md glass-panel border-sage/40 p-6 rounded-3xl flex items-start gap-3 shadow-glass animate-fade-in-up hover:-translate-y-1 hover:shadow-glow-sage transition-all duration-300" style={{ animationDelay: '150ms' }}>
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
        <div className="mb-stack-md glass-panel border-white/40 p-gutter rounded-3xl relative overflow-hidden shadow-glass animate-fade-in-up hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(31,38,135,0.12)] transition-all duration-300" style={{ animationDelay: '200ms' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-navy/5 rounded-bl-full pointer-events-none"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-headline-sm text-headline-sm text-ink">Ward Trust Score Forecast</h2>
                <span className="px-2 py-0.5 bg-navy/10 text-navy text-[10px] font-bold uppercase rounded tracking-wider shadow-sm">AI Insight</span>
              </div>
              <p className="font-body-md text-muted max-w-2xl leading-relaxed mt-2">
                {insights.trustScore.forecastText.replace(/^AI Forecast:\s*/i, '')}
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

      {/* Feature 6: Civic Quests (Bounties) */}
      <section className="mb-stack-lg animate-fade-in-up" style={{ animationDelay: '220ms' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber">local_activity</span>
            <h2 className="font-serif text-2xl text-navy font-bold">Active Community Quests</h2>
          </div>
          <span className="text-[10px] uppercase font-bold text-muted tracking-widest">Ends in 2d 14h</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quest 1 */}
          <div className="glass-panel border-white/40 p-5 rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10 flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber to-orange-400 text-white flex items-center justify-center shrink-0 shadow-glow-terracotta">
                <span className="material-symbols-outlined">construction</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-label-md font-bold text-ink">Pothole Patrol</h3>
                  <span className="bg-amber/20 text-amber text-xs font-bold px-2 py-0.5 rounded-full">+50 Score</span>
                </div>
                <p className="font-body-sm text-muted text-sm mt-1">Log 3 infrastructure hazards in your ward.</p>
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    <span>Progress</span>
                    <span>1 / 3</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber rounded-full w-[33%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Quest 2 */}
          <div className="glass-panel border-white/40 p-5 rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sage/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10 flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sage to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-glow-sage">
                <span className="material-symbols-outlined">verified</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-label-md font-bold text-ink">Truth Seeker</h3>
                  <span className="bg-sage/20 text-sage text-xs font-bold px-2 py-0.5 rounded-full">+30 Score</span>
                </div>
                <p className="font-body-sm text-muted text-sm mt-1">Verify 2 pending reports from your neighbors.</p>
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    <span>Progress</span>
                    <span>1 / 2</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                    <div className="h-full bg-sage rounded-full w-[50%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Overview Bento - Redesigned as Ledger Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md mb-stack-lg animate-fade-in-up" style={{ animationDelay: '250ms' }}>
        <div className="glass-panel border-t-[6px] border-t-navy border-x-white/40 border-b-white/40 rounded-3xl p-gutter flex flex-col justify-between shadow-glass hover:-translate-y-1 hover:shadow-glow-navy transition-all duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-navy/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-md text-label-md text-muted uppercase tracking-widest relative z-10">Total Evidence Logged</span>
          </div>
          <div className="font-serif text-5xl text-ink relative z-10">{filteredReports.length}</div>
          <div className="font-caption text-caption text-muted mt-2 border-t border-white/20 pt-2 relative z-10">Publicly recorded {selectedCity ? `in ${selectedCity}` : 'in network'}</div>
        </div>

        <div className="glass-panel border-t-[6px] border-t-sage border-x-white/40 border-b-white/40 rounded-3xl p-gutter flex flex-col justify-between shadow-glass hover:-translate-y-1 hover:shadow-glow-sage transition-all duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-sage/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-md text-label-md text-muted uppercase tracking-widest relative z-10">Commitments Honored</span>
          </div>
          <div className="font-serif text-5xl text-sage relative z-10">{resolvedCount}</div>
          <div className="font-caption text-caption text-muted mt-2 border-t border-white/20 pt-2 relative z-10">Promises kept by authorities</div>
        </div>

        <div className="glass-panel border-t-[6px] border-t-terracotta border-x-white/40 border-b-white/40 rounded-3xl p-gutter flex flex-col justify-between shadow-glass hover:-translate-y-1 hover:shadow-glow-terracotta transition-all duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-terracotta/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-md text-label-md text-muted uppercase tracking-widest relative z-10">Pending Action</span>
          </div>
          <div className="font-serif text-5xl text-ink relative z-10">{openCount}</div>
          <div className="font-caption text-caption text-muted mt-2 border-t border-white/20 pt-2 relative z-10">Awaiting verification or action</div>
        </div>
      </div>

      {/* Feature 4: Cross-Ward Best Practice Matching */}
      {insights?.benchmarking && (
        <section className="mb-stack-lg glass-panel border-white/40 p-gutter rounded-3xl shadow-glass animate-fade-in-up" style={{ animationDelay: '300ms' }}>
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

      {/* My Active Contributions */}
      {myReports.length > 0 && (
        <section className="mb-stack-lg animate-fade-in-up" style={{ animationDelay: '320ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-navy">person</span>
              <h2 className="font-serif text-2xl text-navy font-bold">My Active Evidence</h2>
            </div>
            <Link to="/my-reports" className="text-xs font-bold text-navy hover:underline flex items-center gap-1 uppercase tracking-widest">
              View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myReports.slice(0, 3).map(r => (
              <div key={r.id} className="glass-panel border-white/40 p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-navy/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
                <div className="relative z-10 flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-navy/10 text-navy flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">{getCategoryIcon(r.category)}</span>
                    </div>
                    <div>
                      <h4 className="font-label-md font-bold text-ink capitalize">{r.category?.replace('_', ' ')}</h4>
                      <p className="text-[10px] text-muted font-mono tracking-wider">{r.id.slice(0,8).toUpperCase()}</p>
                    </div>
                  </div>
                  {r.status === 'resolved' ? (
                    <span className="bg-sage/10 text-sage px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">verified</span> Honored</span>
                  ) : r.status === 'open' ? (
                    <span className="bg-paper text-muted px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">history</span> Pending</span>
                  ) : (
                    <span className="bg-navy/10 text-navy px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">sync</span> Ack</span>
                  )}
                </div>
                <p className="font-body-sm text-sm text-muted line-clamp-2 mb-4 relative z-10">{r.summary || r.description}</p>
                <div className="flex justify-between items-center pt-3 border-t border-border/50 relative z-10">
                  <span className="text-[11px] text-muted font-bold uppercase tracking-wider"><Link to={`/registry/${r.wardId}`} className="hover:text-navy hover:underline">{r.wardId?.replace(/ward(\d+)/i, 'Ward $1') || 'Unknown'}</Link></span>
                  <span className="text-[11px] text-muted font-bold uppercase tracking-wider">{r.createdAt?.toDate ? format(r.createdAt.toDate(), 'MMM dd') : 'Recently'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </main>
  );
}
