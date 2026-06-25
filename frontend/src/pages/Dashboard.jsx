import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { getCategoryConfig, CommitmentBadge, StatusBadge } from '../components/ReportCard';
import {
  MapPin, CheckCircle, XCircle, AlertTriangle, BarChart3,
  TrendingUp, Plus, Clock, Shield, ChevronRight, Info, Activity, ThumbsUp
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import useSupercluster from 'use-supercluster';
import 'leaflet/dist/leaflet.css';
import AnalyticsOverview from '../components/AnalyticsOverview';
import { motion } from 'framer-motion';
/* ── Demo data ─────────────────────────────────────────── */
const mkDate = (daysAgo) => ({ toDate: () => new Date(Date.now() - daysAgo * 864e5) });

const DEMO_REPORTS = [
  { id:'r1', wardId:'ward1', category:'pothole',     severity:'high',   status:'open',         lat:12.9716, lng:77.5946, summary:'Dangerous pothole blocking main arterial road.', createdAt:mkDate(25), confidence:0.92 },
  { id:'r2', wardId:'ward1', category:'pothole',     severity:'high',   status:'acknowledged', lat:12.9720, lng:77.5950, summary:'Deep pothole near school gate.', createdAt:mkDate(20), confidence:0.88 },
  { id:'r3', wardId:'ward1', category:'pothole',     severity:'medium', status:'open',         lat:12.9710, lng:77.5940, summary:'Several potholes near busy junction.', createdAt:mkDate(15), confidence:0.85 },
  { id:'r4', wardId:'ward2', category:'streetlight', severity:'high',   status:'resolved',     lat:12.9750, lng:77.6010, summary:'Three consecutive streetlights out on main road.', createdAt:mkDate(30), confidence:0.95 },
  { id:'r5', wardId:'ward2', category:'garbage',     severity:'high',   status:'open',         lat:12.9740, lng:77.5990, summary:'Garbage bin overflowing for two weeks.', createdAt:mkDate(14), confidence:0.91 },
  { id:'r6', wardId:'ward3', category:'water_leak',  severity:'high',   status:'open',         lat:12.9800, lng:77.5800, summary:'Burst water pipe flooding road daily.', createdAt:mkDate(3), confidence:0.94 },
  { id:'r7', wardId:'ward3', category:'pothole',     severity:'high',   status:'disputed',     lat:12.9810, lng:77.5820, summary:'Pothole from poorly executed repair work.', createdAt:mkDate(12), confidence:0.89 },
  { id:'r8', wardId:'ward2', category:'streetlight', severity:'high',   status:'open',         lat:12.9760, lng:77.6020, summary:'500-metre stretch without working streetlights.', createdAt:mkDate(6), confidence:0.90 },
];

const DEMO_WARDS = [
  { id:'ward1', name:'Ward 1 — Central', city:'Bengaluru' },
  { id:'ward2', name:'Ward 2 — East',    city:'Bengaluru' },
  { id:'ward3', name:'Ward 3 — North',   city:'Bengaluru' },
];

const DEMO_WARD_STATS = [
  { wardId:'ward1', openCount:4, resolvedCount:1, brokenCommitments:1, avgResolutionDays:3.2, isSystemic:true,  insight:'Recurring potholes suggest deteriorating road sub-base needing full reconstruction.' },
  { wardId:'ward2', openCount:2, resolvedCount:2, brokenCommitments:1, avgResolutionDays:5.5, isSystemic:true,  insight:'Inadequate garbage collection frequency causing persistent overflow in residential zones.' },
  { wardId:'ward3', openCount:3, resolvedCount:0, brokenCommitments:0, avgResolutionDays:0,   isSystemic:false, insight:null },
];

const DEMO_COMMITMENTS = [
  { id:'c1', reportId:'r1', authorityName:'BBMP Roads Division',  promisedAction:'Fill potholes with bitumen mix', etaDate:mkDate(5),   status:'broken' },
  { id:'c2', reportId:'r4', authorityName:'BESCOM',               promisedAction:'Replace faulty streetlights',    etaDate:mkDate(15),  status:'honored' },
  { id:'c3', reportId:'r5', authorityName:'BBMP Sanitation',      promisedAction:'Deploy additional garbage truck', etaDate:mkDate(3),  status:'broken' },
  { id:'c4', reportId:'r6', authorityName:'BWSSB',                promisedAction:'Emergency pipe repair team',     etaDate:mkDate(-1),  status:'pending' },
];

/* ── Pin colors (Feature 3) ────────────────────────────── */
const STATUS_RING = {
  open:         '#1E3A8A', // navy (pending)
  acknowledged: '#1E3A8A', 
  resolved:     '#14B8A6', // teal (honored)
  disputed:     '#F97316', // amber/orange (broken/disputed)
};

const SEV_FILL = { 
  low: '#FBBF24', 
  medium: '#F59E0B', 
  high: '#EF4444' 
};

/* ── Haversine Distance ── */
function calcDist(lat1, lon1, lat2, lon2) {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + 
            c(lat1 * p) * c(lat2 * p) * 
            (1 - c((lon2 - lon1) * p))/2;
  return 12742 * Math.asin(Math.sqrt(a)) * 1000; // in meters
}

/* ── Cluster Markers Component ── */
function ClusterMarkers({ reports }) {
  const map = useMap();
  const [bounds, setBounds] = useState(null);
  const [zoom, setZoom] = useState(map.getZoom());
  const [userPos, setUserPos] = useState(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p => setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude }));
  }, []);

  useEffect(() => {
    const updateMapState = () => {
      const b = map.getBounds();
      setBounds([b.getSouthWest().lng, b.getSouthWest().lat, b.getNorthEast().lng, b.getNorthEast().lat]);
      setZoom(map.getZoom());
    };
    updateMapState();
    map.on('moveend', updateMapState);
    return () => { map.off('moveend', updateMapState); }
  }, [map]);

  const points = reports.filter(r => r.lat && r.lng).map(r => ({
    type: 'Feature',
    properties: { cluster: false, report: r, id: r.id },
    geometry: { type: 'Point', coordinates: [r.lng, r.lat] }
  }));

  const { clusters, supercluster } = useSupercluster({
    points, bounds, zoom, options: { radius: 75, maxZoom: 20 }
  });

  return clusters.map(cluster => {
    const [lng, lat] = cluster.geometry.coordinates;
    const { cluster: isCluster, point_count: pointCount, report } = cluster.properties;

    if (isCluster) {
      const size = 32 + (pointCount * 0.5);
      const icon = new L.DivIcon({
        html: `<div style="width:${size}px; height:${size}px;" class="bg-navy-700 text-white rounded-full flex items-center justify-center font-bold shadow-md border-2 border-white text-xs">${pointCount}</div>`,
        className: 'custom-cluster-icon',
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
      });

      return (
        <Marker key={`cluster-${cluster.id}`} position={[lat, lng]} icon={icon}
          eventHandlers={{
            click: () => {
              const expZoom = Math.min(supercluster.getClusterExpansionZoom(cluster.id), 20);
              map.setView([lat, lng], expZoom, { animate: true });
            }
          }}
        />
      );
    }

    // Individual Marker
    const fill = SEV_FILL[report.severity] || '#968E82';
    const ring = STATUS_RING[report.status] || '#1E3A8A';
    
    // Create the split-color marker HTML
    const iconHTML = `
      <div style="background-color:${fill}; border: 3px solid ${ring}; width: 22px; height: 22px;" 
           class="rounded-full shadow-sm"></div>
    `;
    
    const icon = new L.DivIcon({
      html: iconHTML, className: '', iconSize: [22, 22], iconAnchor: [11, 11]
    });

    const distStr = userPos ? `${Math.round(calcDist(userPos.lat, userPos.lng, lat, lng))}m away` : null;

    return (
      <Marker key={report.id} position={[lat, lng]} icon={icon}>
        <Popup>
          <div className="text-sm pb-1">
            <p className="font-semibold capitalize text-ink-900 mb-1">{report.category?.replace('_', ' ')}</p>
            <p className="text-ink-600 text-xs mb-2 line-clamp-2">{report.summary || report.description}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded border capitalize" 
                    style={{ borderColor: ring, color: ring }}>
                {report.status}
              </span>
              {distStr && <span className="text-xs font-medium text-navy-600">{distStr}</span>}
            </div>
          </div>
        </Popup>
      </Marker>
    );
  });
}

function DynamicMapController({ reports, userDoc }) {
  const map = useMap();
  useEffect(() => {
    if (userDoc?.lat && userDoc?.lng) {
      map.setView([userDoc.lat, userDoc.lng], 13);
    } else {
      const validReports = reports?.filter(r => r.lat && r.lng) || [];
      if (validReports.length > 0) {
        const bounds = L.latLngBounds(validReports.map(r => [r.lat, r.lng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 13);
        });
      }
    }
  }, [reports, map, userDoc]);
  return null;
}

/* ── Map component ──────────────────────────────────────── */
function MapView({ reports, userDoc }) {
  const defaultCenter = [12.9716, 77.5946];
  return (
    <div className="w-full h-80 sm:h-96 rounded-lg border border-border overflow-hidden relative z-0">
      <MapContainer center={defaultCenter} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <DynamicMapController reports={reports} userDoc={userDoc} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <ClusterMarkers reports={reports} />
      </MapContainer>
    </div>
  );
}

/* ── Skeleton card ───────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse space-y-3">
      <div className="skeleton h-3 w-1/3 rounded" />
      <div className="skeleton h-8 w-1/4 rounded" />
      <div className="skeleton h-2 w-full rounded" />
    </div>
  );
}

/* ── Ward card (Redesigned with Trust Score) ──────────────── */
function WardCard({ ward, stats }) {
  const open     = stats.reduce((s, st) => s + (st.openCount || 0), 0);
  const resolved = stats.reduce((s, st) => s + (st.resolvedCount || 0), 0);
  
  const score = ward.trustScore || 0;
  const prevScore = ward.previousTrustScore || 0;
  const scoreDiff = score - prevScore;

  return (
    <div className="border-b border-border py-5 last:border-0 relative hover:bg-white/50 transition-colors px-2 -mx-2 rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-ink-900 leading-tight">{ward.name?.replace(' - ', ' · ')}</h3>
          <p className="text-sm text-ink-500 mt-0.5">{open} open, {resolved} resolved</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-ink-500">
            <span className="flex items-center gap-1"><Clock size={11}/> {ward.avgResponseTime || 'N/A'} avg resp.</span>
            <span className="flex items-center gap-1 text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded-full"><Activity size={11} className="text-teal-500" /> Civic Pulse: {ward.civicPulse || Math.floor(Math.random() * 100 + 20)} Citizens</span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="font-serif text-3xl font-semibold text-navy-800 leading-none">
            {score}<span className="text-base text-ink-400 font-sans font-normal ml-0.5">/100</span>
          </div>
          <div className={`text-xs mt-1.5 font-medium flex items-center gap-0.5 ${scoreDiff > 0 ? 'text-teal-600' : scoreDiff < 0 ? 'text-amber-600' : 'text-ink-400'}`}>
            {scoreDiff > 0 ? <TrendingUp size={11} /> : scoreDiff < 0 ? <TrendingUp size={11} className="rotate-180" /> : null}
            {Math.abs(scoreDiff)} pts this month
          </div>
        </div>
      </div>
      
      {/* Trust Score Visual Bar */}
      <div className="h-1 bg-canvas rounded-full overflow-hidden mt-4">
        <div 
          className={`h-full transition-all duration-1000 ease-out ${score >= 80 ? 'bg-teal-500' : score < 50 ? 'bg-amber-500' : 'bg-navy-400'}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

/* ── Main Dashboard ──────────────────────────────────────── */
export default function Dashboard() {
  const { user, userDoc } = useAuth();
  const [reports, setReports]     = useState([]);
  const [wards, setWards]         = useState([]);
  const [wardStats, setWardStats] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [filter, setFilter]       = useState('all');
  const [upvoting, setUpvoting]   = useState(null);

  const handleUpvote = async (reportId) => {
    if (!user) return toast.error('Please sign in to verify issues');
    setUpvoting(reportId);
    try {
      // Send location if available for extra weight
      const payload = userDoc?.lat ? { lat: userDoc.lat, lng: userDoc.lng } : {};
      await api.post(`/api/reports/${reportId}/confirm`, payload);
      toast.success('Issue verified! +5 Civic Points');
    } catch (err) {
      toast.error('Failed to verify issue');
    } finally {
      setUpvoting(null);
    }
  };

  const load = useCallback(() => {
    if (!db) {
      setReports(DEMO_REPORTS); setWards(DEMO_WARDS);
      setWardStats(DEMO_WARD_STATS); setCommitments(DEMO_COMMITMENTS);
      setUsingDemo(true); setLoading(false); return;
    }
    
    setLoading(true);
    let unsubReports, unsubWards, unsubWardStats, unsubCommitments;

    try {
      unsubReports = onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc')), snap => {
        const r = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setReports(r);
        if (r.length === 0) setUsingDemo(true);
        else setUsingDemo(false);
      });

      unsubWards = onSnapshot(collection(db, 'wards'), snap => {
        setWards(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      unsubWardStats = onSnapshot(collection(db, 'wardStats'), snap => {
        setWardStats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      unsubCommitments = onSnapshot(query(collection(db, 'commitments'), orderBy('createdAt', 'desc')), snap => {
        setCommitments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      setLoading(false);
    } catch {
      setReports(DEMO_REPORTS); setWards(DEMO_WARDS);
      setWardStats(DEMO_WARD_STATS); setCommitments(DEMO_COMMITMENTS);
      setUsingDemo(true);
      setLoading(false);
    }

    return () => {
      if (unsubReports) unsubReports();
      if (unsubWards) unsubWards();
      if (unsubWardStats) unsubWardStats();
      if (unsubCommitments) unsubCommitments();
    };
  }, []);

  useEffect(() => { const cleanup = load(); return cleanup; }, [load]);

  const filteredReports = filter === 'all' ? reports : reports.filter(r => r.status === filter);
  const openCount       = reports.filter(r => r.status === 'open').length;
  const resolvedCount   = reports.filter(r => r.status === 'resolved').length;
  const brokenCount     = commitments.filter(c => c.status === 'broken').length;
  const honoredCount    = commitments.filter(c => c.status === 'honored').length;
  const systemicWards   = wardStats.filter(ws => ws.isSystemic);

  const mostImproved = [...wards].sort((a,b) => ((b.trustScore||0)-(b.previousTrustScore||0)) - ((a.trustScore||0)-(a.previousTrustScore||0)))[0];
  const mostStalled = [...wards].sort((a,b) => (b.stalledIssues||0) - (a.stalledIssues||0))[0];

  const fmtDate = (val) => {
    try { return format(val?.toDate?.() ? val.toDate() : new Date(val), 'd MMM'); }
    catch { return '—'; }
  };

  return (
    <div className="bg-paper min-h-[calc(100vh-64px)]">

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <div className="max-w-2xl">
            {usingDemo && (
              <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200
                              rounded-full px-3 py-1 text-xs text-amber-700 mb-5">
                <Info size={11} /> Showing demo data — connect Firebase to see live reports
              </div>
            )}
            <p className="section-label mb-3">Public Accountability Dashboard</p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-ink-900 text-balance leading-snug mb-4">
              {userDoc?.locality ? (
                <>See what's being fixed in {userDoc.locality} —<br className="hidden sm:block" /> and what's not.</>
              ) : (
                <>See what's being fixed in your city —<br className="hidden sm:block" /> and what's not.</>
              )}
            </h1>
            <p className="text-ink-500 text-base max-w-xl leading-relaxed">
              Every reported issue, every authority promise, publicly tracked.
              When a deadline passes without resolution, it's marked broken — automatically.
            </p>

            {!user && (
              <div className="flex items-center gap-3 mt-6">
                <Link to="/report/new" className="btn-primary btn-lg">
                  <Plus size={17} /> Report an Issue
                </Link>
                <Link to="/login" className="btn-secondary btn-lg">
                  Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-12">

        {/* ── Resolved this month banner ────────────── */}
        {!loading && resolvedCount > 0 && (
          <div className="success-bar animate-fade-in">
            <CheckCircle size={16} className="text-teal-500 flex-shrink-0" />
            <span>
              <strong>{resolvedCount}</strong> issue{resolvedCount !== 1 ? 's' : ''} resolved
              across <strong>{wards.length}</strong> ward{wards.length !== 1 ? 's' : ''} —
              authorities are responding.
            </span>
          </div>
        )}

        {/* ── KPI strip ─────────────────────────────── */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {loading ? (
              [1,2,3,4].map(i => <SkeletonCard key={i} />)
            ) : [
              { label: 'Reports filed',       val: reports.length,  icon: BarChart3,   color: '' },
              { label: 'Open issues',         val: openCount,       icon: AlertTriangle, color: 'text-amber-600' },
              { label: 'Promises honored',    val: honoredCount,    icon: CheckCircle, color: 'text-teal-600' },
              { label: 'Promises broken',     val: brokenCount,     icon: XCircle,     color: 'text-amber-700' },
            ].map(k => (
              <div key={k.label} className="card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <k.icon size={15} className={k.color || 'text-ink-400'} />
                  <span className="section-label text-ink-400">{k.label}</span>
                </div>
                <div className={`stat-number ${k.color}`}>{k.val}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Callout Ticker (Feature 4) ───────────────────────── */}
        {!loading && wards.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-navy-900 rounded-lg p-5 flex items-center gap-4 text-white shadow-lg overflow-hidden relative">
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-navy-800 to-transparent opacity-50" />
              <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 text-teal-400 border border-teal-500/30">
                <TrendingUp size={20} />
              </div>
              <div className="relative z-10">
                <div className="text-navy-300 text-xs font-semibold tracking-wider uppercase mb-1">Most Improved Ward</div>
                <div className="font-serif text-lg leading-tight">
                  <span className="font-bold text-white">{mostImproved?.name?.split('—')[0]}</span> increased trust score by <span className="text-teal-400 font-semibold">{mostImproved?.trustScore - mostImproved?.previousTrustScore} points</span>.
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0 text-amber-600 border border-amber-200">
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="text-amber-800/60 text-xs font-semibold tracking-wider uppercase mb-1">Attention Required</div>
                <div className="font-serif text-lg leading-tight text-amber-950">
                  <span className="font-bold">{mostStalled?.name?.split('—')[0]}</span> has <span className="text-amber-600 font-semibold">{mostStalled?.stalledIssues} stalled issues</span> awaiting resolution.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Asymmetric Layout: Map & Trust Scores ───────── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Map (8 cols) */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-ink-900">Live Infrastructure Map</h2>
                <p className="text-sm text-ink-500 mt-1">Real-time view of civic issues across all wards</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {['all','open','acknowledged','resolved','disputed'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize
                      ${filter === f
                        ? 'bg-navy-600 text-white border-navy-600 shadow-sm'
                        : 'bg-white text-ink-600 border-border hover:border-navy-200 hover:text-navy-600'
                      }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="shadow-sm rounded-lg overflow-hidden border border-border">
              <MapView reports={filteredReports} userDoc={userDoc} />
            </div>

            <div className="flex items-center gap-6 mt-3 flex-wrap bg-white border border-border rounded-full px-5 py-2 w-max shadow-sm">
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Map Legend</span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase text-ink-400 font-semibold tracking-wider">Severity (Fill)</span>
                {Object.entries(SEV_FILL).map(([s, c]) => (
                  <div key={s} className="flex items-center gap-1.5 text-xs text-ink-600 capitalize">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                    {s}
                  </div>
                ))}
              </div>
              <div className="w-px h-4 bg-border hidden sm:block" />
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase text-ink-400 font-semibold tracking-wider">Status (Ring)</span>
                {Object.entries(STATUS_RING).map(([s, c]) => (
                  <div key={s} className="flex items-center gap-1.5 text-xs text-ink-600 capitalize">
                    <div className="w-3 h-3 rounded-full border-[3px]" style={{ borderColor: c }} />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trust Scores (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-border shadow-sm p-6 lg:-mt-2">
            <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
              <Shield size={18} className="text-navy-600" />
              <div>
                <h2 className="font-serif text-xl font-semibold text-ink-900">Ward Trust Scores</h2>
                <p className="text-xs text-ink-400 mt-0.5">Based on accountability & speed</p>
              </div>
            </div>
            
            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <div className="space-y-1">
                {wards.sort((a,b) => b.trustScore - a.trustScore).map(ward => (
                  <WardCard
                    key={ward.id}
                    ward={ward}
                    stats={wardStats.filter(ws => ws.wardId === ward.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Recent commitments ────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-ink-400" />
            <h2 className="font-serif text-xl font-semibold text-ink-900">Recent Authority Commitments</h2>
          </div>
          <div className="card divide-y divide-border">
            {commitments.slice(0, 5).map(c => (
              <div key={c.id} className={`flex items-start gap-4 px-5 py-4 ${c.status === 'broken' ? 'bg-amber-50/50' : ''}`}>
                <CommitmentBadge status={c.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800">{c.authorityName}</p>
                  <p className="text-sm text-ink-500 line-clamp-1">{c.promisedAction}</p>
                </div>
                <div className="text-xs text-ink-400 flex-shrink-0 flex items-center gap-1 mt-0.5">
                  <Clock size={11} /> {fmtDate(c.etaDate)}
                </div>
              </div>
            ))}
            {commitments.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-ink-400">
                No commitments recorded yet.
              </div>
            )}
          </div>
        </section>

        {/* ── Recent issues & Live Activity Feed (Feature 5) ────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-semibold text-ink-900">Recent Reports</h2>
              <span className="text-sm text-ink-400">{filteredReports.length} shown</span>
            </div>
            <div className="space-y-2">
              {filteredReports.slice(0, 6).map((r, i) => {
                const cfg = getCategoryConfig(r.category);
                const date = r.createdAt?.toDate?.() ? r.createdAt.toDate() : new Date(r.createdAt);
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="card p-4 flex items-start gap-3 hover:shadow-md transition-shadow"
                  >
                    <div className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
                      <cfg.Icon size={16} className={cfg.iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium text-ink-800 capitalize">{cfg.label}</span>
                        <span className={r.status === 'resolved' ? 'badge-resolved' : r.status === 'open' ? 'badge-open' : 'badge-acknowledged'}>
                          {r.status}
                        </span>
                      </div>
                      <p className="text-sm text-ink-500 line-clamp-1">{r.summary || r.description}</p>
                      
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-ink-400">
                          {date.toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                        </span>
                        <button
                          onClick={() => handleUpvote(r.id)}
                          disabled={upvoting === r.id || r.status === 'resolved'}
                          className="flex items-center gap-1.5 text-xs font-medium text-navy-600 hover:text-navy-700 bg-navy-50 hover:bg-navy-100 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
                        >
                          <ThumbsUp size={12} />
                          Verify ({r.confirmations || 0})
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-1 bg-white border border-border shadow-sm rounded-xl p-5 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
              </span>
              <h2 className="font-serif text-lg font-semibold text-ink-900">Live Activity Feed</h2>
            </div>
            <div className="space-y-4">
              {[...reports].sort((a,b) => {
                const da = a.updatedAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
                const db = b.updatedAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
                return db - da;
              }).slice(0, 5).map((r, i) => (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={`feed-${r.id}`}
                  className="text-sm border-l-2 border-border pl-3 py-1"
                >
                  <p className="text-ink-800 line-clamp-2">
                    <span className="font-medium capitalize">{r.category?.replace('_', ' ')}</span> marked as 
                    <span className="font-medium lowercase"> {r.status}</span>
                  </p>
                  <p className="text-xs text-ink-400 mt-1">
                    in <span className="capitalize">{r.wardId?.replace(/ward(\d+)/i, 'Ward $1')}</span>
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA for guests ────────────────────────── */}
        {!user && (
          <section className="card p-8 text-center">
            <div className="w-12 h-12 bg-navy-50 rounded-full flex items-center
                            justify-center mx-auto mb-4">
              <MapPin size={22} className="text-navy-600" />
            </div>
            <h3 className="font-serif text-xl font-semibold text-ink-900 mb-2">
              See something that needs fixing?
            </h3>
            <p className="text-sm text-ink-500 mb-5 max-w-sm mx-auto">
              Anyone can report an issue. It takes less than two minutes, and
              your report is immediately visible to local authorities.
            </p>
            <Link id="cta-signup" to="/login" className="btn-primary btn-lg">
              <Plus size={17} /> Report an Issue
            </Link>
          </section>
        )}

        {/* bottom padding */}
        <div className="pb-8" />
      </div>
    </div>
  );
}
