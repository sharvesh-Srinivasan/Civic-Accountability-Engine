import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { mockWards, mockReports } from '../lib/demoData';

export default function PublicRegistry() {
  const { user, userDoc, loading: authLoading, isOnboarded } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wards, setWards] = useState({});
  const [cities, setCities] = useState([]);
  
  const [selectedCity, setSelectedCity] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  
  const [dataError, setDataError] = useState('');

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
      docs.forEach(d => {
        const data = isMock ? d : (d.data ? d.data() : d);
        const id = isMock ? d.id : d.id;
        if (data.city) {
          wardsMap[id] = data.city;
          citySet.add(data.city);
        }
      });
      setWards(wardsMap);
      setCities(Array.from(citySet).sort());
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
        const wardsSnap = await getDocs(collection(db, 'wards'));
        processWards(wardsSnap.docs);
      } catch (err) {
        processWards(mockWards, true);
      }

      try {
        unsubReports = onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(500)), snap => {
          setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setDataError('');
        }, err => {
          console.error('Reports snapshot error:', err);
          setReports(mockReports);
          setDataError('Offline demo mode active.');
        });
      } catch (err) {
        setReports(mockReports);
        setDataError('Offline demo mode active.');
      }
    } catch (err) {
      console.error('Failed to load registry data:', err);
      processWards(mockWards, true);
      setReports(mockReports);
      setDataError('Offline demo mode active.');
    } finally {
      setLoading(false);
    }
    return unsubReports;
  }, []);

  useEffect(() => {
    let cleanup = () => {};
    load().then(unsub => { cleanup = unsub; });
    return () => cleanup();
  }, [load]);

  const filteredReports = reports.filter(r => {
    let match = true;
    if (selectedCity && wards[r.wardId] !== selectedCity) match = false;
    if (statusFilter && r.status !== statusFilter) match = false;
    if (severityFilter && r.severity !== severityFilter) match = false;
    return match;
  });

  if (authLoading || !user) {
    return (
      <div className="flex-1 flex flex-col p-margin-desktop gap-4 w-full max-w-container-max mx-auto bg-paper min-h-screen pt-24">
        <div className="h-10 w-64 bg-surface rounded animate-shimmer bg-gradient-to-r from-surface via-border to-surface bg-[length:200%_100%] shadow-sm" />
        <div className="h-[600px] w-full bg-surface rounded-xl animate-shimmer bg-gradient-to-r from-surface via-border to-surface bg-[length:200%_100%] border border-border shadow-sm" />
      </div>
    );
  }

  return (
    <main className="flex-1 md:ml-72 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto overflow-x-hidden pt-24 md:pt-margin-desktop bg-transparent text-ink min-h-screen font-body-md relative z-10">
      
      {dataError && (
        <div className="mb-stack-lg bg-terracotta/10 text-terracotta p-4 rounded-xl flex items-center gap-3 border border-terracotta">
          <span className="material-symbols-outlined">error</span>
          <p className="font-body-md font-bold">{dataError}</p>
        </div>
      )}

      <header className="mb-stack-lg animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center gap-3 mb-2">
          <span className="material-symbols-outlined text-navy text-4xl">table_chart</span>
          <h1 className="font-serif text-4xl text-navy font-bold tracking-tight">Public Ledger</h1>
        </div>
        <p className="font-body-md text-muted max-w-2xl">Official, permanent registry of civic commitments and citizen evidence across all wards.</p>
      </header>

      {/* Filters */}
      <div className="mb-stack-lg flex flex-col md:flex-row gap-3 md:items-center shrink-0 w-full animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="relative w-full md:w-48 shrink-0">
          <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="appearance-none w-full rounded-xl bg-white/40 backdrop-blur-md p-3 pr-10 border border-white/50 font-label-md focus:border-navy focus:ring-1 focus:ring-navy focus:outline-none text-ink shadow-sm cursor-pointer transition-colors hover:bg-white/60">
            <option value="">All Regions</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-sm">expand_more</span>
        </div>
        
        <div className="relative w-full md:w-40 shrink-0">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="appearance-none w-full rounded-xl bg-white/40 backdrop-blur-md p-3 pr-10 border border-white/50 font-label-md focus:border-navy focus:ring-1 focus:ring-navy focus:outline-none text-ink shadow-sm cursor-pointer transition-colors hover:bg-white/60">
            <option value="">All Statuses</option>
            <option value="open">Pending</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Honored</option>
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-sm">expand_more</span>
        </div>

        <div className="relative w-full md:w-40 shrink-0">
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="appearance-none w-full rounded-xl bg-white/40 backdrop-blur-md p-3 pr-10 border border-white/50 font-label-md focus:border-navy focus:ring-1 focus:ring-navy focus:outline-none text-ink shadow-sm cursor-pointer transition-colors hover:bg-white/60">
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-sm">expand_more</span>
        </div>
      </div>

      {/* Ledger Table */}
      <section className="glass-panel border border-white/40 rounded-3xl mb-stack-lg shadow-glass animate-fade-in-up overflow-hidden" style={{ animationDelay: '200ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md text-body-md">
            <thead className="bg-white/40 font-label-md text-label-md text-muted border-b border-white/20 uppercase tracking-widest font-bold">
              <tr>
                <th className="py-4 px-gutter text-[10px]">Registry ID</th>
                <th className="py-4 px-gutter text-[10px]">Evidence / Category</th>
                <th className="py-4 px-gutter text-[10px]">Location</th>
                <th className="py-4 px-gutter text-[10px]">Date Recorded</th>
                <th className="py-4 px-gutter text-[10px]">Commitment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20 font-serif text-sm">
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
                  <td colSpan="5" className="py-8 text-center text-muted">No public records found matching filters.</td>
                </tr>
              ) : (
                <>
                  {filteredReports.map(r => (
                    <tr key={r.id} className="hover:bg-white/20 transition-colors">
                      <td className="py-4 px-gutter text-muted font-mono tracking-wider">{r.id.slice(0,8).toUpperCase()}</td>
                      <td className="py-4 px-gutter text-ink font-bold capitalize">
                        {r.category?.replace('_', ' ')}
                        {r.severity === 'high' && <span className="ml-2 inline-flex items-center text-[10px] uppercase font-sans font-bold tracking-widest text-terracotta">High Priority</span>}
                      </td>
                      <td className="py-4 px-gutter text-muted">
                        <Link to={`/registry/${r.wardId}`} className="hover:text-navy hover:underline font-bold transition-colors">
                          {r.wardId?.replace(/ward(\d+)/i, 'Ward $1') || 'Unknown Area'}
                        </Link>
                      </td>
                      <td className="py-4 px-gutter text-muted">{r.createdAt?.toDate ? format(r.createdAt.toDate(), 'MMM dd, yyyy') : r.createdAt ? format(new Date(r.createdAt), 'MMM dd, yyyy') : 'Unknown'}</td>
                      <td className="py-4 px-gutter">
                        {r.status === 'resolved' ? (
                          <span className="inline-flex items-center gap-1 font-sans text-[11px] font-bold uppercase tracking-wider text-sage"><span className="material-symbols-outlined text-[16px]">verified</span> Honored</span>
                        ) : r.status === 'open' ? (
                          <span className="inline-flex items-center gap-1 font-sans text-[11px] font-bold uppercase tracking-wider text-muted"><span className="material-symbols-outlined text-[16px]">history</span> Pending</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-sans text-[11px] font-bold uppercase tracking-wider text-navy"><span className="material-symbols-outlined text-[16px]">sync</span> Acknowledged</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
