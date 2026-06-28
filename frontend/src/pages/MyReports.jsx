import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import ReportCard, { getCategoryConfig } from '../components/ReportCard';

/* Skeleton row */
function SkeletonCard() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-container-high" />
        <div className="flex-1 space-y-3 mt-1">
          <div className="h-4 w-1/4 rounded bg-surface-container-high" />
          <div className="h-3 w-2/3 rounded bg-surface-container-highest" />
          <div className="h-3 w-1/3 rounded bg-surface-container-highest" />
        </div>
      </div>
    </div>
  );
}

/* ── Citizen Impact Receipt Card ───────────── */
function ImpactReceipt({ report }) {
  const cfg = getCategoryConfig(report.category);
  let resolvedDate = 'Recently';
  try {
    const d = report.updatedAt?.toDate?.() ? report.updatedAt.toDate() : new Date(report.updatedAt || report.createdAt);
    resolvedDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {}

  const impactPoints = report.severity === 'high' ? 15 : report.severity === 'medium' ? 10 : 5;

  return (
    <div className="bg-surface-container-lowest border border-secondary-fixed-dim rounded-xl p-5 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-1 group">
      {/* Decorative background glows */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary-fixed opacity-20 blur-[40px] rounded-full pointer-events-none group-hover:opacity-40 transition-opacity duration-500" />
      
      <div className="flex justify-between items-start relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
          </div>
          <span className="font-label-md text-secondary tracking-widest text-[10px] sm:text-xs uppercase font-bold">Citizen Impact Receipt</span>
        </div>
        <button className="text-on-surface-variant hover:text-primary bg-surface border border-outline-variant rounded-full p-2 transition-colors hover:bg-surface-variant flex items-center justify-center" title="Share Impact">
          <span className="material-symbols-outlined text-[18px]">share</span>
        </button>
      </div>

      <div className="mt-2 relative z-10">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-1.5 leading-tight">
          You helped fix {report.wardId?.replace(/ward(\d+)/i, 'Ward $1')}
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant mb-5 line-clamp-2">
          Your report about a <span className="lowercase font-bold text-on-surface">{cfg.label}</span> led to real-world action and resolution.
        </p>
        
        <div className="bg-surface-container p-4 flex justify-between items-center rounded-xl border border-outline-variant">
          <div>
            <p className="text-on-surface-variant font-label-md uppercase tracking-widest mb-1" style={{fontSize: '10px'}}>Resolved On</p>
            <p className="font-body-md font-medium text-on-surface">{resolvedDate}</p>
          </div>
          <div className="h-8 w-px bg-outline-variant/50" />
          <div>
            <p className="text-on-surface-variant font-label-md uppercase tracking-widest mb-1" style={{fontSize: '10px'}}>Issue Level</p>
            <p className="font-body-md font-medium text-on-surface capitalize">{report.severity}</p>
          </div>
          <div className="h-8 w-px bg-outline-variant/50" />
          <div className="text-right">
            <p className="text-on-secondary-container font-label-md font-bold bg-secondary-container px-3 py-1.5 uppercase tracking-widest flex items-center gap-1.5 rounded-lg" style={{ fontSize: '11px' }}>
              <span className="material-symbols-outlined text-[14px]">bolt</span> +{impactPoints} <span className="hidden sm:inline">Impact</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyReports() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

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
  const openCount     = reports.filter(r => r.status === 'open' || r.status === 'acknowledged').length;
  const badgeLevel    = resolvedCount >= 5 ? 'Elite Agent'
                      : resolvedCount >= 3 ? 'Active Operative'
                      : resolvedCount >= 1 ? 'Verified Citizen'
                      : null;

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
          <li aria-current="page" className="text-on-surface-variant">My Reports</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-stack-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Impact History</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Track the real-world difference you've made in your city.</p>
        </div>
        <Link to="/report/new" className="w-full md:w-auto bg-primary text-on-primary h-12 px-6 rounded flex items-center justify-center gap-2 font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm hover:shadow">
          <span className="material-symbols-outlined">add</span>
          Report Issue
        </Link>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md mb-stack-lg animate-slide-up">
        {[
          { label: 'Total Submitted', value: reports.length, icon: 'assignment', bg: 'bg-surface-container-low', text: 'text-primary' },
          { label: 'Resolved',        value: resolvedCount,  icon: 'check_circle', bg: 'bg-secondary-container', text: 'text-on-secondary-container' },
          { label: 'Pending Action',  value: openCount,      icon: 'schedule', bg: 'bg-surface-variant', text: 'text-on-surface-variant' },
        ].map(s => (
          <div key={s.label} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1 hover:shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="font-label-md text-label-md text-on-surface-variant">{s.label}</span>
              <div className={`w-10 h-10 rounded flex items-center justify-center ${s.bg} ${s.text}`}>
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
            </div>
            <div className="font-display-lg text-display-lg text-on-surface">{loading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Badge (if earned) */}
      {!loading && badgeLevel && (
        <div className="bg-primary-fixed border border-primary-fixed-dim p-6 rounded-xl mb-stack-lg flex items-center gap-5 shadow-sm relative overflow-hidden group animate-slide-up" style={{animationDelay: '100ms'}}>
          <div className="w-14 h-14 bg-surface-container-lowest rounded-xl flex items-center justify-center flex-shrink-0 border border-outline-variant shadow-sm relative z-10">
            <span className="material-symbols-outlined text-[32px] text-primary">military_tech</span>
          </div>
          <div className="relative z-10">
            <p className="font-label-md text-label-md font-bold tracking-widest uppercase text-primary mb-1">{badgeLevel}</p>
            <p className="font-body-md text-body-md text-on-primary-fixed leading-relaxed">
              You've successfully resolved {resolvedCount} issues in your community. You are in the top 15% of active citizens!
            </p>
          </div>
        </div>
      )}

      {/* Report list */}
      <div className="mb-stack-lg">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-stack-md">Your Submissions</h2>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : reports.length === 0 ? (
          /* Empty state */
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 text-center flex flex-col items-center shadow-sm animate-slide-up" style={{animationDelay: '200ms'}}>
            <div className="w-16 h-16 bg-surface-container flex items-center justify-center rounded-2xl mb-5 text-on-surface-variant">
              <span className="material-symbols-outlined text-[32px]">folder_open</span>
            </div>
            <p className="font-headline-md text-headline-md text-on-surface mb-2">No reports yet</p>
            <p className="font-body-md text-body-md text-on-surface-variant mb-8 max-w-sm mx-auto">
              See something that needs fixing? It takes less than a minute to report and make your community better.
            </p>
            <Link to="/report/new" className="bg-primary text-on-primary h-12 px-6 rounded flex items-center justify-center gap-2 font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[20px]">add</span>
              Report an Issue
            </Link>
          </div>
        ) : (
          <div className="space-y-stack-md">
            {reports.map((r, i) => 
              <div key={r.id} className="animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                {r.status === 'resolved' 
                  ? <ImpactReceipt report={r} />
                  : <ReportCard report={r} />
                }
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
