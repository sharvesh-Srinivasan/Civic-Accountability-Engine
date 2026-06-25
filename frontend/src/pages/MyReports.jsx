import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import ReportCard, { getCategoryConfig } from '../components/ReportCard';
import { Plus, Award, FileText, CheckCircle, Share2 } from 'lucide-react';

/* Skeleton row */
function SkeletonCard() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="skeleton w-9 h-9 rounded" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-1/4 rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
          <div className="skeleton h-2 w-1/3 rounded" />
        </div>
      </div>
    </div>
  );
}

/* ── Citizen Impact Receipt Card (Feature 6) ───────────── */
function ImpactReceipt({ report }) {
  const cfg = getCategoryConfig(report.category);
  let resolvedDate = 'Recently';
  try {
    const d = report.updatedAt?.toDate?.() ? report.updatedAt.toDate() : new Date(report.updatedAt || report.createdAt);
    resolvedDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {}

  return (
    <div className="bg-gradient-to-br from-teal-50 to-white border border-teal-200 rounded-xl p-5 shadow-sm relative overflow-hidden transition-transform hover:-translate-y-0.5">
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full -mr-10 -mt-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/5 rounded-full -ml-8 -mb-8 pointer-events-none" />
      
      <div className="flex justify-between items-start relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
            <CheckCircle size={16} />
          </div>
          <span className="font-semibold text-teal-800 tracking-wide text-[10px] sm:text-xs uppercase">Citizen Impact Receipt</span>
        </div>
        <button className="text-teal-600 hover:text-teal-800 bg-white border border-teal-100 rounded-full p-1.5 shadow-sm transition-colors" title="Share Impact">
          <Share2 size={14} />
        </button>
      </div>

      <div className="mt-2 relative z-10">
        <h3 className="font-serif text-xl sm:text-2xl font-semibold text-ink-900 mb-1.5 leading-tight">
          You helped fix {report.wardId?.replace(/ward(\d+)/i, 'Ward $1')}
        </h3>
        <p className="text-sm text-ink-600 mb-5 line-clamp-2">
          Your report about a <span className="lowercase font-medium">{cfg.label}</span> led to real-world action and resolution.
        </p>
        
        <div className="bg-white/80 backdrop-blur border border-teal-100 rounded-lg p-3 text-xs flex justify-between items-center shadow-sm">
          <div>
            <p className="text-ink-400 uppercase tracking-wider mb-0.5" style={{fontSize: '10px'}}>Resolved On</p>
            <p className="font-medium text-ink-800">{resolvedDate}</p>
          </div>
          <div className="h-6 w-px bg-teal-100" />
          <div>
            <p className="text-ink-400 uppercase tracking-wider mb-0.5" style={{fontSize: '10px'}}>Issue Level</p>
            <p className="font-medium text-ink-800 capitalize">{report.severity} Severity</p>
          </div>
          <div className="h-6 w-px bg-teal-100" />
          <div className="text-right">
            <p className="text-teal-600 font-bold bg-teal-50 px-2 py-1 rounded shadow-sm text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Award size={12} /> +10 Impact Points
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) { setLoading(false); return; }
    const q = query(
      collection(db, 'reports'),
      where('reporterId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    getDocs(q)
      .then(snap => setReports(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const openCount     = reports.filter(r => r.status === 'open').length;
  const badgeLevel    = resolvedCount >= 5 ? 'Champion Reporter'
                      : resolvedCount >= 3 ? 'Active Citizen'
                      : resolvedCount >= 1 ? 'Verified Reporter'
                      : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="section-label mb-1">Your Citizen Profile</p>
          <h1 className="font-serif text-2xl font-semibold text-ink-900">Impact History</h1>
          <p className="text-sm text-ink-500 mt-0.5">Track the real-world difference you've made in your city.</p>
        </div>
        <Link to="/report/new" className="btn-primary">
          <Plus size={15} /> New Report
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total submitted', value: reports.length, color: 'text-ink-800' },
          { label: 'Resolved',        value: resolvedCount,  color: 'text-teal-600' },
          { label: 'Still open',      value: openCount,      color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`stat-number ${s.color}`}>{loading ? '—' : s.value}</div>
            <div className="stat-unit">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Badge (if earned) */}
      {!loading && badgeLevel && (
        <div className="bg-gradient-to-r from-teal-500 to-teal-700 text-white p-5 rounded-xl shadow-md mb-8 animate-slide-up flex items-center gap-4 border border-teal-400">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-white/30">
            <Award size={24} className="text-white drop-shadow-sm" />
          </div>
          <div>
            <p className="font-serif text-lg font-bold tracking-wide drop-shadow-sm">{badgeLevel}</p>
            <p className="text-sm text-teal-50 mt-0.5">
              You've successfully resolved {resolvedCount} issues in your community. You are in the top 15% of active citizens!
            </p>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="divider" />

      {/* Report list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : reports.length === 0 ? (
        /* Empty state */
        <div className="card p-10 text-center">
          <div className="w-12 h-12 bg-canvas rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText size={22} className="text-ink-300" />
          </div>
          <p className="font-semibold text-ink-700 mb-1">No reports yet</p>
          <p className="text-sm text-ink-400 mb-4">
            See something that needs fixing? It takes less than a minute to report.
          </p>
          <Link to="/report/new" className="btn-primary btn-sm">
            <Plus size={14} /> Report an Issue
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(r => 
            r.status === 'resolved' 
              ? <ImpactReceipt key={r.id} report={r} />
              : <ReportCard key={r.id} report={r} />
          )}
        </div>
      )}
    </div>
  );
}
