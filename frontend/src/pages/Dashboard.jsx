import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import useSupercluster from 'use-supercluster';
import 'leaflet/dist/leaflet.css';

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

function ClusterMarkers({ reports }) {
  const map = useMap();
  const [bounds, setBounds] = useState(null);
  const [zoom, setZoom] = useState(map.getZoom());

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
      const size = 36 + (pointCount * 0.8);
      const icon = new L.DivIcon({
        html: `<div style="width:${size}px; height:${size}px; background:#d6e3ff; color:#002046; border-radius:9999px; display:flex; align-items:center; justify-content:center; font-weight:700; font-family:'Public Sans'; font-size:14px; border:2px solid #002046; box-shadow:0 2px 4px rgba(0,0,0,0.1);">${pointCount}</div>`,
        className: '', iconSize: [size, size], iconAnchor: [size/2, size/2]
      });

      return (
        <Marker key={`cluster-${cluster.id}`} position={[lat, lng]} icon={icon}
          eventHandlers={{
            click: () => {
              if (map) map.setView([lat, lng], Math.min(supercluster.getClusterExpansionZoom(cluster.id), 20), { animate: false });
            }
          }}
        />
      );
    }

    const fill = SEV_FILL[report.severity] || '#ffffff';
    const ring = STATUS_RING[report.status] || '#002046';
    const icon = new L.DivIcon({
      html: `<div style="background-color:${fill}; border: 2px solid ${ring}; width: 16px; height: 16px; border-radius: 9999px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
      className: '', iconSize: [16, 16], iconAnchor: [8, 8]
    });

    return (
      <Marker key={report.id} position={[lat, lng]} icon={icon}>
        <Popup>
          <div className="text-sm pb-1 font-body-md text-on-surface">
            <p className="font-label-md text-primary mb-1 capitalize">{report.category?.replace('_', ' ')}</p>
            <p className="text-xs mb-2 line-clamp-2 text-on-surface-variant">{report.summary || report.description}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-surface-variant text-on-surface-variant">
                {report.status}
              </span>
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
    if (!map) return;
    try {
      if (userDoc?.lat && userDoc?.lng) {
        map.setView([userDoc.lat, userDoc.lng], 13);
      } else {
        const validReports = reports?.filter(r => r.lat && r.lng) || [];
        if (validReports.length > 0) {
          const bounds = L.latLngBounds(validReports.map(r => [r.lat, r.lng]));
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(pos => map.setView([pos.coords.latitude, pos.coords.longitude], 13));
        } else {
          map.setView([11.0168, 76.9558], 12);
        }
      }
    } catch (e) {
      console.warn("Map view set failed: ", e);
    }
  }, [reports, map, userDoc]);
  return null;
}

export default function Dashboard() {
  const { user, userDoc } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!db) {
      setLoading(false); return;
    }
    setLoading(true);
    let unsubReports;
    try {
      unsubReports = onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(100)), snap => {
        setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      setLoading(false);
    } catch {
      setLoading(false);
    }
    return () => {
      if (unsubReports) unsubReports();
    };
  }, []);

  useEffect(() => { const cleanup = load(); return cleanup; }, [load]);

  const openCount = reports.filter(r => r.status === 'open' || r.status === 'acknowledged').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;

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

      <header className="mb-stack-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Overview</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">A summary of your recent civic engagement and submitted reports.</p>
        </div>
        <Link to="/report/new" className="md:hidden w-full bg-primary text-on-primary h-12 rounded flex items-center justify-center gap-2 font-label-md text-label-md hover:bg-primary-container transition-colors">
          <span className="material-symbols-outlined">add</span>
          Report Issue
        </Link>
      </header>

      {/* Stats Overview Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md mb-stack-lg">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="font-label-md text-label-md text-on-surface-variant">Total Reports</span>
            <div className="w-10 h-10 rounded bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">assignment</span>
            </div>
          </div>
          <div className="font-display-lg text-display-lg text-on-surface">{reports.length}</div>
          <div className="font-caption text-caption text-on-surface-variant mt-2">Lifetime submissions in network</div>
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
              ) : reports.slice(0, 5).map(r => {
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

      {/* Contextual Card with Leaflet Map */}
      <section className="bg-surface-container-low border border-primary-fixed-dim rounded-xl p-gutter flex flex-col md:flex-row items-center gap-gutter relative overflow-hidden mb-8">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, var(--tw-colors-primary) 0%, transparent 50%)' }}></div>
        <div className="w-full md:w-1/3 aspect-video md:aspect-square bg-surface-variant rounded-lg relative overflow-hidden">
          {/* Replaced static image with live map */}
          <MapContainer center={[12.9716, 77.5946]} zoom={13} scrollWheelZoom={true} className="w-full h-full z-10">
            <DynamicMapController reports={reports} userDoc={userDoc} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <ClusterMarkers reports={reports} />
          </MapContainer>
        </div>
        <div className="w-full md:w-2/3 z-10">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Explore the Community Map</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4 max-w-lg">
            See what issues are being reported in your neighborhood. Transparency is key to a better community. You can view, track, and upvote existing reports via the interactive map.
          </p>
          <button className="bg-surface-container-lowest border border-outline text-on-surface h-12 px-6 rounded font-label-md text-label-md hover:bg-surface-variant transition-colors inline-flex items-center gap-2">
            <span className="material-symbols-outlined">map</span>
            View Full Map
          </button>
        </div>
      </section>
    </main>
  );
}
