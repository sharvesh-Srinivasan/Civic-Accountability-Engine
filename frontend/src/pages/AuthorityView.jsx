import React, { useEffect, useState, useRef } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

function formatDate(val) {
  try {
    const d = val?.toDate?.() ? val.toDate() : new Date(val);
    return format(d, 'd MMM yyyy');
  } catch { return '—'; }
}

export default function AuthorityView() {
  const [reports, setReports] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ authorityName: '', promisedAction: '', etaDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [tab, setTab] = useState('open');
  const [dataError, setDataError] = useState('');

  const [insight, setInsight] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [resPhotoFile, setResPhotoFile] = useState(null);
  const [resPhotoPreview, setResPhotoPreview] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const resFileInputRef = useRef(null);

  const { user, userDoc, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
      } else if (userDoc && userDoc.role !== 'authority') {
        toast.error('Unauthorized access. This portal is for officials only.');
        navigate('/');
      }
    }
  }, [user, userDoc, authLoading, navigate]);

  const load = async () => {
    if (!db) { setLoading(false); return; }
    setLoading(true);
    setDataError('');
    try {
      const { limit } = await import('firebase/firestore');
      const [rSnap, cSnap] = await Promise.all([
        getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(50))),
        getDocs(query(collection(db, 'commitments'), orderBy('createdAt', 'desc'), limit(50))),
      ]);
      const fetchedReports = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const fetchedCommitments = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReports(fetchedReports);
      setCommitments(fetchedCommitments);

      const ranked = fetchedReports.filter(r => r.status === 'open' || r.status === 'acknowledged').map(r => {
        let daysOpen = 0;
        try {
          const d = r.createdAt?.toDate?.() ? r.createdAt.toDate() : new Date(r.createdAt);
          daysOpen = Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 3600 * 24)));
        } catch {}
        const sevScore = r.severity === 'high' ? 30 : r.severity === 'medium' ? 15 : 0;
        return { ...r, urgencyScore: sevScore + (daysOpen * 2), daysOpen };
      }).sort((a,b) => b.urgencyScore - a.urgencyScore);

      if (ranked.length > 0) {
        try {
          // Implement 8-second timeout for AI insight
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          
          const res = await api.post('/api/reports/prioritize-insight', {
            severity: ranked[0].severity, daysOpen: ranked[0].daysOpen, count: 1, category: ranked[0].category
          }, { signal: controller.signal });
          
          clearTimeout(timeoutId);
          if (res.data?.insight) {
            setInsight({ reportId: ranked[0].id, text: res.data.insight });
          } else {
            // Fallback if backend returns empty or mock success
            setInsight({ reportId: ranked[0].id, text: `Review this high-priority ${ranked[0].severity} ${ranked[0].category.replace('_',' ')} issue immediately.` });
          }
        } catch (err) {
          console.warn('AI insight fetch failed or timed out:', err);
          // Fallback insight
          setInsight({ reportId: ranked[0].id, text: `Review this high-priority ${ranked[0].severity} ${ranked[0].category.replace('_',' ')} issue immediately.` });
        }
      }
    } catch (err) { 
      console.error(err);
      setDataError('Failed to load data. Please refresh.');
      toast.error('Failed to load data'); 
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCommit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.post('/api/commitments', { reportId: selected.id, ...form });
      toast.success('Commitment created');
      setSelected(null);
      setForm({ authorityName: '', promisedAction: '', etaDate: '' });
      await load();
    } catch (err) {
      toast.error('Failed to create commitment');
    } finally { setSubmitting(false); }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const res = await api.post('/api/commitments/check');
      const { honored = 0, broken = 0, pending = 0 } = res.data.results;
      toast.success(`Check complete — ${honored} honored, ${broken} broken, ${pending} pending`);
      await load();
    } catch { toast.error('Check failed'); }
    finally { setChecking(false); }
  };

  const handleResolveCommitment = async (e) => {
    e.preventDefault();
    if (!resolving) return;
    setIsResolving(true);
    try {
      await api.post(`/api/commitments/${resolving.id}/resolve`, { resolutionImageUrl: '' });
      toast.success('Commitment marked as honored');
      setResolving(null);
      setResPhotoFile(null);
      setResPhotoPreview('');
      await load();
    } catch { toast.error('Failed to resolve'); }
    finally { setIsResolving(false); }
  };

  const openReports = reports.filter(r => r.status === 'open' || r.status === 'acknowledged');
  const authorityStats = commitments.reduce((acc, c) => {
    if (!acc[c.authorityName]) acc[c.authorityName] = { total: 0, broken: 0, honored: 0, pending: 0 };
    acc[c.authorityName].total += 1;
    acc[c.authorityName][c.status] += 1;
    return acc;
  }, {});
  
  const riskyAuthorities = Object.entries(authorityStats)
    .filter(([name, stats]) => stats.total >= 3 && (stats.broken / stats.total) > 0.4)
    .map(([name, stats]) => ({ name, rate: Math.round((stats.broken / stats.total) * 100) }));

  const tabData = tab === 'open' ? openReports : tab === 'all' ? reports : commitments;

  if (authLoading || !user || userDoc?.role !== 'authority') {
    return <div className="flex-1 flex justify-center items-center h-screen bg-background"><span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span></div>;
  }

  return (
    <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto overflow-x-hidden pt-20 md:pt-margin-desktop bg-background text-on-background min-h-screen font-body-md">
      
      <header className="mb-stack-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 text-primary">
            <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
            <p className="font-label-md text-label-md uppercase tracking-widest text-[10px]">Authority Dashboard</p>
          </div>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Commitment Manager</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Make promises to citizens and let the system hold you accountable.</p>
        </div>
        <button onClick={handleCheck} disabled={checking} className="bg-surface-container-low border border-outline text-on-surface h-12 px-6 rounded font-label-md text-label-md hover:bg-surface-variant transition-colors inline-flex items-center gap-2">
          {checking ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : <span className="material-symbols-outlined text-[20px]">refresh</span>}
          Run Check
        </button>
      </header>

      {dataError && (
        <div className="mb-stack-lg bg-error-container text-on-error-container p-4 rounded-xl flex items-center gap-3 border border-error">
          <span className="material-symbols-outlined">error</span>
          <p className="font-body-md font-bold">{dataError}</p>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-stack-md mb-stack-lg">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter flex flex-col justify-between">
          <span className="font-label-md text-label-md text-on-surface-variant mb-2">Total Reports</span>
          <div className="font-display-lg text-display-lg text-on-surface">{reports.length}</div>
        </div>
        <div className="bg-surface-container-lowest border border-primary-fixed-dim rounded-xl p-gutter flex flex-col justify-between">
          <span className="font-label-md text-label-md text-primary mb-2">Need Action</span>
          <div className="font-display-lg text-display-lg text-primary">{openReports.length}</div>
        </div>
        <div className="bg-secondary-container border border-secondary-fixed-dim rounded-xl p-gutter flex flex-col justify-between text-on-secondary-container">
          <span className="font-label-md text-label-md mb-2">Honored</span>
          <div className="font-display-lg text-display-lg">{commitments.filter(c=>c.status==='honored').length}</div>
        </div>
        <div className="bg-error-container border border-error rounded-xl p-gutter flex flex-col justify-between text-on-error-container">
          <span className="font-label-md text-label-md mb-2">Broken</span>
          <div className="font-display-lg text-display-lg">{commitments.filter(c=>c.status==='broken').length}</div>
        </div>
      </div>

      {commitments.filter(c => c.status === 'broken').length > 0 && (
        <div className="bg-error-container text-on-error-container p-4 rounded-xl mb-6 flex items-center gap-3 border border-error font-body-md text-body-md">
          <span className="material-symbols-outlined">cancel</span>
          <span><strong>{commitments.filter(c => c.status === 'broken').length}</strong> commitments have passed their deadline without resolution — these are publicly marked as broken.</span>
        </div>
      )}

      {riskyAuthorities.length > 0 && (
        <div className="bg-surface-variant text-on-surface-variant p-4 rounded-xl mb-8 flex items-start gap-4 border border-outline-variant font-body-md text-body-md">
          <span className="material-symbols-outlined text-primary mt-1">warning</span>
          <div>
            <h3 className="font-label-md text-label-md text-primary mb-1">High Overdue Risk Detected</h3>
            <p className="text-sm">Based on historical data, commitments by {riskyAuthorities.map(a=>a.name).join(', ')} are at high risk of being broken.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-outline-variant mb-6 overflow-x-auto">
        {[
          { id: 'open', label: `Priority Queue (${openReports.length})` },
          { id: 'all', label: `All Reports (${reports.length})` },
          { id: 'commitments', label: `Commitments (${commitments.length})` }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-3 font-label-md text-label-md border-b-2 whitespace-nowrap transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'open' && insight && openReports.length > 0 && (
        <div className="bg-primary-fixed text-on-primary-fixed p-6 rounded-xl mb-8 flex items-start gap-4 shadow-sm border border-primary-fixed-dim">
          <span className="material-symbols-outlined text-[32px] text-primary">auto_awesome</span>
          <div>
            <p className="font-label-md text-label-md mb-2 uppercase tracking-wider text-[10px] font-bold text-primary">AI Priority Recommendation</p>
            <p className="font-body-md text-body-md">{insight.text}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl mb-stack-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md text-body-md">
            <thead className="bg-surface-container-low font-label-md text-label-md text-on-surface-variant border-b border-outline-variant">
              <tr>
                {tab !== 'commitments' ? (
                  <>
                    <th className="py-3 px-gutter font-normal">Issue</th>
                    <th className="py-3 px-gutter font-normal hidden sm:table-cell">Ward</th>
                    <th className="py-3 px-gutter font-normal">Status</th>
                    <th className="py-3 px-gutter font-normal text-right">Action</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-gutter font-normal">Authority</th>
                    <th className="py-3 px-gutter font-normal">Promise</th>
                    <th className="py-3 px-gutter font-normal hidden sm:table-cell">ETA</th>
                    <th className="py-3 px-gutter font-normal">Status</th>
                    <th className="py-3 px-gutter font-normal text-right">Action</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr><td colSpan="5" className="py-8 text-center text-on-surface-variant">Loading...</td></tr>
              ) : tabData.length === 0 ? (
                <tr><td colSpan="5" className="py-8 text-center text-on-surface-variant">No items found.</td></tr>
              ) : tab !== 'commitments' ? (
                tabData.map(r => {
                  const hasCommitment = commitments.some(c => c.reportId === r.id);
                  return (
                    <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-4 px-gutter">
                        <p className="font-label-md text-on-surface capitalize">{r.category?.replace('_', ' ')}</p>
                        <p className="text-xs text-on-surface-variant line-clamp-1 max-w-xs">{r.summary || r.description}</p>
                      </td>
                      <td className="py-4 px-gutter hidden sm:table-cell capitalize">{r.wardId?.replace(/ward(\d+)/i, 'Ward $1')}</td>
                      <td className="py-4 px-gutter">
                        <div className="flex gap-2">
                          <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded text-xs font-bold uppercase">{r.status}</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${r.severity === 'high' ? 'bg-error-container text-on-error-container' : 'bg-surface-variant text-on-surface-variant'}`}>{r.severity}</span>
                        </div>
                      </td>
                      <td className="py-4 px-gutter text-right">
                        {hasCommitment ? (
                          <span className="text-secondary font-bold text-xs uppercase tracking-widest inline-flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span> Committed</span>
                        ) : (
                          <button onClick={() => setSelected(r)} className="bg-primary text-on-primary px-4 py-2 rounded text-xs font-bold uppercase hover:bg-primary-container inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">add</span> Make Promise
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                commitments.map(c => (
                  <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-4 px-gutter font-label-md text-on-surface">{c.authorityName}</td>
                    <td className="py-4 px-gutter text-on-surface-variant text-sm max-w-xs"><p className="line-clamp-2">{c.promisedAction}</p></td>
                    <td className="py-4 px-gutter text-on-surface-variant hidden sm:table-cell text-sm">{formatDate(c.etaDate)}</td>
                    <td className="py-4 px-gutter">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${c.status === 'honored' ? 'bg-secondary-container text-on-secondary-container' : c.status === 'broken' ? 'bg-error-container text-on-error-container' : 'bg-surface-variant text-on-surface-variant'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-gutter text-right">
                      {c.status === 'pending' && (
                        <button onClick={() => setResolving(c)} className="bg-secondary text-on-secondary px-4 py-2 rounded text-xs font-bold uppercase hover:bg-secondary-fixed inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span> Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modals */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-xl shadow-lg border border-outline-variant overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low">
              <h3 className="font-headline-md text-headline-md text-on-surface">Add a Commitment</h3>
              <p className="text-sm text-on-surface-variant mt-1">For: <span className="font-bold capitalize">{selected.category?.replace('_',' ')}</span></p>
            </div>
            <form onSubmit={handleCommit} className="p-6 space-y-4">
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1">Authority Name <span className="text-error">*</span></label>
                <input value={form.authorityName} onChange={e=>setForm(p=>({...p, authorityName:e.target.value}))} maxLength="50" className={`w-full rounded-lg border ${!form.authorityName && submitting ? 'border-error bg-error-container/10' : 'border-outline-variant'} p-3 focus:border-primary focus:outline-none`} required placeholder="e.g. Roads Division" />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1">Promised Action <span className="text-error">*</span></label>
                <textarea value={form.promisedAction} onChange={e=>setForm(p=>({...p, promisedAction:e.target.value}))} maxLength="250" className={`w-full rounded-lg border ${!form.promisedAction && submitting ? 'border-error bg-error-container/10' : 'border-outline-variant'} p-3 focus:border-primary focus:outline-none`} rows="3" required placeholder="e.g. Patch potholes within 7 days" />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1">Deadline (ETA) <span className="text-error">*</span></label>
                <input type="date" min={new Date().toISOString().split('T')[0]} value={form.etaDate} onChange={e=>setForm(p=>({...p, etaDate:e.target.value}))} className={`w-full rounded-lg border ${!form.etaDate && submitting ? 'border-error bg-error-container/10' : 'border-outline-variant'} p-3 focus:border-primary focus:outline-none`} required />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setSelected(null)} className="flex-1 bg-surface-variant text-on-surface-variant h-12 rounded-lg font-bold hover:bg-surface-container-high transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-primary text-on-primary h-12 rounded-lg font-bold hover:bg-primary-container transition-colors">{submitting ? 'Submitting...' : 'Commit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resolving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-xl shadow-lg border border-outline-variant overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low">
              <h3 className="font-headline-md text-headline-md text-secondary">Mark as Resolved</h3>
            </div>
            <form onSubmit={handleResolveCommitment} className="p-6 space-y-4">
              <p className="font-body-md text-body-md text-on-surface-variant mb-4">Confirm that you have completed the promised action for this issue.</p>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setResolving(null)} className="flex-1 bg-surface-variant text-on-surface-variant h-12 rounded-lg font-bold hover:bg-surface-container-high transition-colors">Cancel</button>
                <button type="submit" disabled={isResolving} className="flex-1 bg-secondary text-on-secondary h-12 rounded-lg font-bold hover:bg-secondary-fixed transition-colors">{isResolving ? 'Resolving...' : 'Confirm'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
