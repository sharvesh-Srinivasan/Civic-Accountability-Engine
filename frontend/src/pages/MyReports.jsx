import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import ReportCard, { getCategoryConfig } from '../components/ReportCard';

/* Skeleton row */
function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-border" />
        <div className="flex-1 space-y-3 mt-1">
          <div className="h-4 w-1/4 rounded bg-border" />
          <div className="h-3 w-2/3 rounded bg-paper" />
          <div className="h-3 w-1/3 rounded bg-paper" />
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
    <div className="bg-surface border border-sage-fixed-dim rounded-xl p-5 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-1 group">
      {/* Decorative background glows */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-sage-fixed opacity-20 blur-[40px] rounded-full pointer-events-none group-hover:opacity-40 transition-opacity duration-500" />
      
      <div className="flex justify-between items-start relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-sage/10 flex items-center justify-center text-sage">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
          </div>
          <span className="font-label-md text-sage tracking-widest text-[10px] sm:text-xs uppercase font-bold">Citizen Impact Receipt</span>
        </div>
        <button className="text-muted hover:text-navy bg-surface border border-border rounded-full p-2 transition-colors hover:bg-paper flex items-center justify-center" title="Share Impact">
          <span className="material-symbols-outlined text-[18px]">share</span>
        </button>
      </div>

      <div className="mt-2 relative z-10">
        <h3 className="font-headline-md text-headline-md text-ink mb-1.5 leading-tight">
          You helped fix {report.wardId?.replace(/ward(\d+)/i, 'Ward $1')}
        </h3>
        <p className="font-body-md text-body-md text-muted mb-5 line-clamp-2">
          Your evidence regarding a <span className="lowercase font-bold text-ink">{cfg.label}</span> led to real-world action and resolution.
        </p>
        
        <div className="bg-surface p-4 flex justify-between items-center rounded-xl border border-border">
          <div>
            <p className="text-muted font-label-md uppercase tracking-widest mb-1" style={{fontSize: '10px'}}>Resolved On</p>
            <p className="font-body-md font-medium text-ink">{resolvedDate}</p>
          </div>
          <div className="h-8 w-px bg-outline-variant/50" />
          <div>
            <p className="text-muted font-label-md uppercase tracking-widest mb-1" style={{fontSize: '10px'}}>Issue Level</p>
            <p className="font-body-md font-medium text-ink capitalize">{report.severity}</p>
          </div>
          <div className="h-8 w-px bg-outline-variant/50" />
          <div className="text-right">
            <p className="text-sage font-label-md font-bold bg-sage/10 px-3 py-1.5 uppercase tracking-widest flex items-center gap-1.5 rounded-lg" style={{ fontSize: '11px' }}>
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
    return <div className="flex-1 flex justify-center items-center h-screen bg-paper"><span className="material-symbols-outlined animate-spin text-navy text-4xl">sync</span></div>;
  }

  return (
    <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto overflow-x-hidden pt-20 md:pt-margin-desktop bg-paper text-ink min-h-screen font-body-md">
      
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-stack-md">
        <ol className="flex items-center gap-2 font-label-md text-label-md">
          <li><Link to="/" className="text-navy hover:underline">Home</Link></li>
          <li><span className="text-muted">/</span></li>
          <li aria-current="page" className="text-muted">My Evidence Log</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-stack-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
        <h1 className="font-serif text-4xl text-navy font-bold tracking-tight">My Evidence Log</h1>
          <p className="font-body-md text-body-md text-muted mt-1">Track the real-world difference you've made in your city.</p>
        </div>
        <Link to="/report/new" className="w-full md:w-auto bg-navy text-white h-12 px-6 rounded-lg flex items-center justify-center gap-2 font-label-md text-label-md hover:scale-[1.02] hover:shadow-md transition-all duration-150 shrink-0">
          <span className="material-symbols-outlined">add_a_photo</span>
          Log Evidence
        </Link>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md mb-stack-lg animate-slide-up">
        {[
          { label: 'Evidence Logged', value: reports.length, icon: 'assignment', bg: 'bg-surface', text: 'text-navy' },
          { label: 'Resolved',        value: resolvedCount,  icon: 'check_circle', bg: 'bg-sage/10', text: 'text-sage' },
          { label: 'Pending Action',  value: openCount,      icon: 'schedule', bg: 'bg-paper', text: 'text-muted' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-gutter flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1 hover:shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="font-label-md text-label-md text-muted">{s.label}</span>
              <div className={`w-10 h-10 rounded flex items-center justify-center ${s.bg} ${s.text}`}>
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
            </div>
            <div className="font-display-lg text-display-lg text-ink">{loading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Badge (if earned) */}
      {!loading && badgeLevel && (
        <div className="bg-navy text-white p-6 rounded-xl mb-stack-lg flex items-center gap-5 shadow-sm relative overflow-hidden group animate-fade-in-up" style={{animationDelay: '100ms'}}>
          <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 80% -10%, rgba(255,255,255,0.3) 0%, transparent 60%)'}} />
          <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/20 shadow-sm relative z-10">
            <span className="material-symbols-outlined text-[32px] text-white">military_tech</span>
          </div>
          <div className="relative z-10">
            <p className="font-label-md text-label-md font-bold tracking-widest uppercase text-white/70 mb-1">{badgeLevel}</p>
            <p className="font-body-md text-body-md text-white leading-relaxed">
              You've successfully resolved {resolvedCount} issues in your community. You are in the top 15% of active citizens!
            </p>
          </div>
        </div>
      )}

      {/* Report list */}
      <div className="mb-stack-lg">
        <h2 className="font-headline-md text-headline-md text-ink mb-stack-md">Your Evidence Log</h2>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : reports.length === 0 ? (
          /* Empty state */
          <div className="bg-surface border border-border rounded-xl p-12 text-center flex flex-col items-center shadow-sm animate-slide-up" style={{animationDelay: '200ms'}}>
            <div className="w-16 h-16 bg-surface flex items-center justify-center rounded-2xl mb-5 text-muted">
              <span className="material-symbols-outlined text-[32px]">folder_open</span>
            </div>
            <p className="font-headline-md text-headline-md text-ink mb-2">No evidence logged yet</p>
            <p className="font-body-md text-body-md text-muted mb-8 max-w-sm mx-auto">
              See an unfulfilled promise or issue? It takes less than a minute to add evidence to the public record.
            </p>
            <Link to="/report/new" className="bg-navy text-white h-12 px-6 rounded flex items-center justify-center gap-2 font-label-md text-label-md hover:bg-navy/10 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
              Log Evidence
            </Link>
          </div>
        ) : (
          <div className="space-y-stack-md">
            {reports.map((r, i) => 
              <div key={r.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
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
