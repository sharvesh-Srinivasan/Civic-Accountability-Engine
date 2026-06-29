import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';

export default function AuthorityProfile() {
  const { wardId } = useParams();
  const [ward, setWard] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    pending: 0,
    streak: 0,
    fulfillmentRate: 0
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load Ward Info
        const wardDoc = await getDoc(doc(db, 'wards', wardId));
        if (wardDoc.exists()) {
          setWard(wardDoc.data());
        } else {
          setWard({ name: wardId.replace(/ward(\d+)/i, 'Ward $1'), city: 'Unknown' });
        }

        // Load Reports for Ward
        const q = query(collection(db, 'reports'), where('wardId', '==', wardId));
        const snap = await getDocs(q);
        const fetchedReports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Sort by date descending
        fetchedReports.sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });

        setReports(fetchedReports);

        // Calculate Stats
        const total = fetchedReports.length;
        const resolved = fetchedReports.filter(r => r.status === 'resolved').length;
        const pending = fetchedReports.filter(r => r.status === 'open' || r.status === 'acknowledged').length;
        
        // Streak: consecutive resolved starting from most recently resolved
        let currentStreak = 0;
        for (const r of fetchedReports) {
          if (r.status === 'resolved') {
            currentStreak++;
          } else if (r.status === 'reopened' || r.status === 'disputed') {
            break; // Streak broken
          }
          // If just open/pending, it might not break a streak of "promises kept" unless it's overdue, 
          // but for simplicity, we'll break streak on explicitly negative outcomes like reopened.
        }

        const fulfillmentRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

        setStats({ total, resolved, pending, streak: currentStreak, fulfillmentRate });
      } catch (err) {
        console.error('Error loading authority profile', err);
      } finally {
        setLoading(false);
      }
    }
    if (wardId) loadData();
  }, [wardId]);

  if (loading) {
    return <div className="flex-1 flex justify-center items-center h-screen bg-paper"><span className="material-symbols-outlined animate-spin text-navy text-4xl">sync</span></div>;
  }

  return (
    <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto pt-20 md:pt-margin-desktop bg-paper text-ink min-h-screen font-body-md">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-stack-md">
        <ol className="flex items-center gap-2 font-label-md text-label-md">
          <li><Link to="/" className="text-navy hover:underline">Public Ledger</Link></li>
          <li><span className="text-muted">/</span></li>
          <li aria-current="page" className="text-muted">Authority Profile</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-stack-lg border-b-4 border-navy pb-stack-md flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[28px] text-navy">account_balance</span>
            <span className="font-label-md text-navy font-bold uppercase tracking-widest text-sm">Official Record</span>
          </div>
          <h1 className="font-serif text-4xl text-ink font-bold">{ward?.name || wardId}</h1>
          <p className="font-body-md text-muted mt-1">{ward?.city} Authority Registry</p>
        </div>
      </header>

      {/* Stats Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-stack-md mb-stack-lg">
        <div className="bg-surface border border-border p-6 rounded-xl shadow-sm text-center">
          <div className="text-muted font-label-md uppercase tracking-wider text-xs mb-2">Fulfillment Rate</div>
          <div className="font-serif text-5xl text-navy">{stats.fulfillmentRate}%</div>
        </div>
        <div className="bg-surface border border-border p-6 rounded-xl shadow-sm text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-sage/10 rounded-bl-full"></div>
          <div className="text-muted font-label-md uppercase tracking-wider text-xs mb-2 flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-sage">local_fire_department</span> Promise Streak
          </div>
          <div className="font-serif text-5xl text-sage">{stats.streak}</div>
        </div>
        <div className="bg-surface border border-border p-6 rounded-xl shadow-sm text-center">
          <div className="text-muted font-label-md uppercase tracking-wider text-xs mb-2">Total Commitments</div>
          <div className="font-serif text-5xl text-ink">{stats.total}</div>
        </div>
        <div className="bg-surface border border-border p-6 rounded-xl shadow-sm text-center">
          <div className="text-muted font-label-md uppercase tracking-wider text-xs mb-2">Pending Action</div>
          <div className="font-serif text-5xl text-muted">{stats.pending}</div>
        </div>
      </div>

      {/* Commitments Table */}
      <section className="bg-surface border border-border rounded mb-stack-lg shadow-sm">
        <div className="px-gutter py-4 border-b-2 border-border flex justify-between items-center bg-surface-bright">
          <h2 className="font-serif text-xl text-ink font-bold">Public Accountability Log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md text-body-md">
            <thead className="bg-[#eef2f3] font-label-md text-label-md text-muted border-b border-border">
              <tr>
                <th className="py-3 px-gutter font-bold uppercase tracking-widest text-[10px]">Record ID</th>
                <th className="py-3 px-gutter font-bold uppercase tracking-widest text-[10px]">Evidence</th>
                <th className="py-3 px-gutter font-bold uppercase tracking-widest text-[10px]">Date Logged</th>
                <th className="py-3 px-gutter font-bold uppercase tracking-widest text-[10px]">Commitment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-serif">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-muted">No records available for this authority.</td>
                </tr>
              ) : reports.map(r => {
                const dateStr = r.createdAt?.toDate ? format(r.createdAt.toDate(), 'MMM dd, yyyy') : 'Unknown';
                const isResolved = r.status === 'resolved';
                
                return (
                  <tr key={r.id} className="hover:bg-surface transition-colors bg-[#fdfdfd]">
                    <td className="py-4 px-gutter text-muted text-sm font-mono tracking-wider">
                      {r.id.slice(0,8).toUpperCase()}
                    </td>
                    <td className="py-4 px-gutter text-ink font-bold capitalize">
                      {r.category?.replace('_', ' ')}
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
