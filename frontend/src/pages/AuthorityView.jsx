import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import api from '../lib/api';
import { CommitmentBadge, StatusBadge, SeverityBadge, CategoryIcon } from '../components/ReportCard';
import { Shield, Plus, CheckCircle, RefreshCw, Clock, XCircle, Calendar, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

function Skeleton({ h = 'h-14', className = '' }) {
  return <div className={`skeleton ${h} w-full rounded ${className}`} />;
}

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
  const [tab, setTab] = useState('open'); // 'open' | 'all' | 'commitments'

  const [insight, setInsight] = useState(null);

  // Feature 1: Resolution Photo Upload
  const [resolving, setResolving] = useState(null); // holds commitment to resolve
  const [resPhotoFile, setResPhotoFile] = useState(null);
  const [resPhotoPreview, setResPhotoPreview] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const resFileInputRef = useRef(null);

  const load = async () => {
    if (!db) { setLoading(false); return; }
    setLoading(true);
    try {
      const [rSnap, cSnap] = await Promise.all([
        getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'commitments'), orderBy('createdAt', 'desc'))),
      ]);
      const fetchedReports = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const fetchedCommitments = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReports(fetchedReports);
      setCommitments(fetchedCommitments);

      // Feature 5: AI Prioritization Insight for Top Issue
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
          const res = await api.post('/api/reports/prioritize-insight', {
            severity: ranked[0].severity, daysOpen: ranked[0].daysOpen, count: 1, category: ranked[0].category
          });
          setInsight({ reportId: ranked[0].id, text: res.data.insight });
        } catch { console.error("Failed to fetch insight"); }
      }

    } catch { toast.error('Failed to load data'); }
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
      toast.error(err.response?.data?.error || 'Failed');
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
    let resolutionImageUrl = '';
    
    // If they provided a photo, upload it (mock for now or actually upload if storage is there)
    if (resPhotoFile) {
      try {
        const { storage } = await import('../firebase');
        const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
        if (storage) {
          const storageRef = ref(storage, `resolutions/${Date.now()}_${resPhotoFile.name}`);
          resolutionImageUrl = await new Promise((resolve, reject) => {
            const task = uploadBytesResumable(storageRef, resPhotoFile);
            task.on('state_changed', null, reject, async () => resolve(await getDownloadURL(task.snapshot.ref)));
          });
        }
      } catch (err) {
        toast.error('Failed to upload photo');
        setIsResolving(false);
        return;
      }
    }

    try {
      await api.post(`/api/commitments/${resolving.id}/resolve`, { resolutionImageUrl });
      toast.success('Commitment marked as honored');
      setResolving(null);
      setResPhotoFile(null);
      setResPhotoPreview('');
      await load();
    } catch (err) {
      toast.error('Failed to resolve');
    } finally {
      setIsResolving(false);
    }
  };

  // Calculate ranked reports for priority queue
  const openReports = reports.filter(r => r.status === 'open' || r.status === 'acknowledged').map(r => {
    let daysOpen = 0;
    try {
      const d = r.createdAt?.toDate?.() ? r.createdAt.toDate() : new Date(r.createdAt);
      daysOpen = Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 3600 * 24)));
    } catch {}
    const sevScore = r.severity === 'high' ? 30 : r.severity === 'medium' ? 15 : 0;
    return { ...r, urgencyScore: sevScore + (daysOpen * 2) };
  }).sort((a, b) => b.urgencyScore - a.urgencyScore);

  // Feature 6: Predictive Overdue Risk calculation
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={15} className="text-navy-500" />
            <p className="section-label">Authority Dashboard</p>
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink-900">Commitment Manager</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Make promises to citizens and let the system hold you accountable.
          </p>
        </div>
        <button onClick={handleCheck} disabled={checking} className="btn-secondary flex-shrink-0">
          {checking
            ? <><span className="w-4 h-4 border-2 border-navy-200 border-t-navy-600 rounded-full animate-spin" /> Checking…</>
            : <><RefreshCw size={15} /> Run Commitment Check</>
          }
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total reports',  val: reports.length,                              color: '' },
          { label: 'Need action',    val: openReports.length,                          color: 'text-amber-600' },
          { label: 'Honored',        val: commitments.filter(c=>c.status==='honored').length, color: 'text-teal-600' },
          { label: 'Broken',         val: commitments.filter(c=>c.status==='broken').length,  color: 'text-amber-700' },
        ].map(k => (
          <div key={k.label} className="card p-4 text-center">
            <div className={`stat-number ${k.color}`}>{loading ? '—' : k.val}</div>
            <div className="stat-unit">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Broken commitments callout */}
      {!loading && commitments.filter(c => c.status === 'broken').length > 0 && (
        <div className="warn-bar mb-4">
          <XCircle size={16} className="text-amber-500 flex-shrink-0" />
          <span>
            <strong>{commitments.filter(c => c.status === 'broken').length}</strong> commitment
            {commitments.filter(c=>c.status==='broken').length > 1 ? 's have' : ' has'} passed
            their deadline without resolution — these are now publicly marked as broken.
          </span>
        </div>
      )}

      {/* Feature 6: Predictive Insights / Overdue Risk */}
      {!loading && riskyAuthorities.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <div className="text-red-500 mt-0.5"><AlertTriangle size={18} /></div>
          <div>
            <h3 className="text-red-800 font-semibold text-sm">High Overdue Risk Detected</h3>
            <p className="text-red-700 text-xs mt-1 leading-relaxed">
              Based on historical completion rates, commitments made by 
              {riskyAuthorities.map((a, i) => (
                <span key={a.name} className="font-semibold"> {a.name} ({a.rate}% failure rate){i < riskyAuthorities.length - 1 ? ',' : ''}</span>
              ))} 
              are at high risk of being broken. Consider re-evaluating SLA targets or allocating more resources.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center border-b border-border mb-6 gap-1">
        {[
          { val: 'open',        label: `Priority Queue (${openReports.length})` },
          { val: 'all',         label: `All reports (${reports.length})` },
          { val: 'commitments', label: `Commitments (${commitments.length})` },
        ].map(t => (
          <button
            key={t.val}
            onClick={() => setTab(t.val)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
              ${tab === t.val
                ? 'border-navy-600 text-navy-700'
                : 'border-transparent text-ink-400 hover:text-ink-700'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Feature 5: Top Priority AI Justification */}
      {!loading && tab === 'open' && insight && openReports.length > 0 && (
        <div className="bg-navy-900 text-white rounded-lg p-5 mb-6 shadow-sm border border-navy-800 flex items-start gap-4">
          <div className="w-10 h-10 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
            <Shield size={18} />
          </div>
          <div>
            <p className="text-navy-300 text-xs font-semibold uppercase tracking-wider mb-1">Top Priority Issue Recommendation</p>
            <p className="font-serif text-lg leading-relaxed">{insight.text}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} h="h-16" />)}
        </div>

      ) : tab !== 'commitments' ? (
        /* Reports table */
        tabData.length === 0 ? (
          <div className="card p-10 text-center">
            <CheckCircle size={28} className="text-teal-500 mx-auto mb-2" />
            <p className="text-ink-500 text-sm">No reports to show here.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-canvas text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">Issue</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider hidden sm:table-cell">Ward</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tabData.map(r => {
                  const hasCommitment = commitments.some(c => c.reportId === r.id);
                  return (
                    <tr key={r.id} className="hover:bg-canvas transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CategoryIcon category={r.category} size={15} />
                          <div>
                            <p className="font-medium text-ink-800 capitalize">
                              {r.category?.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-ink-400 line-clamp-1 max-w-[200px]">
                              {r.summary || r.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-500 hidden sm:table-cell capitalize">
                        {r.wardId?.replace(/ward(\d+)/i, 'Ward $1')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={r.status} />
                          <SeverityBadge severity={r.severity} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-400 text-xs hidden md:table-cell">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasCommitment ? (
                          <span className="text-xs text-teal-600 flex items-center gap-1 justify-end">
                            <CheckCircle size={11} /> Committed
                          </span>
                        ) : (tab === 'open' || r.status === 'open' || r.status === 'acknowledged') ? (
                          <button
                            onClick={() => setSelected(r)}
                            className="btn-primary btn-sm"
                          >
                            <Plus size={13} /> Add
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Commitments list */
        commitments.length === 0 ? (
          <div className="card p-10 text-center">
            <Clock size={28} className="text-ink-300 mx-auto mb-2" />
            <p className="text-sm text-ink-400">No commitments created yet.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-canvas text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">Authority</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">Promise</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider hidden sm:table-cell">ETA</th>
                  <th className="px-4 py-3 text-xs font-semibold text-ink-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {commitments.map(c => (
                  <tr key={c.id} className={`hover:bg-canvas transition-colors ${c.status === 'broken' ? 'bg-amber-50/40' : ''}`}>
                    <td className="px-4 py-3 font-medium text-ink-700">{c.authorityName}</td>
                    <td className="px-4 py-3 text-ink-500 max-w-[260px]">
                      <p className="line-clamp-2">{c.promisedAction}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-400 text-xs hidden sm:table-cell">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} /> {formatDate(c.etaDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <CommitmentBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.status === 'pending' && (
                        <button onClick={() => setResolving(c)} className="btn-secondary btn-sm bg-white">
                          <CheckCircle size={13} className="text-teal-600" /> Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Commitment modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                        p-4 bg-ink-900/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl border border-border shadow-card-hover
                          w-full max-w-md animate-slide-up">
            <div className="px-6 pt-5 pb-4 border-b border-border">
              <h3 className="font-serif text-lg font-semibold text-ink-900">Add a Commitment</h3>
              <p className="text-sm text-ink-500 mt-0.5">
                For: <span className="text-ink-700 capitalize">{selected.category?.replace('_', ' ')}</span>
                {selected.summary ? ` — ${selected.summary.slice(0, 60)}…` : ''}
              </p>
            </div>

            {selected.aiResolutionPlan && (
              <div className="px-6 py-4 bg-navy-50/50 border-b border-border">
                <div className="flex items-center gap-2 mb-2 text-navy-700 font-semibold text-sm">
                  <Shield size={14} /> AI Resolution Plan Recommended
                </div>
                <div className="text-xs text-ink-600 space-y-2">
                  <p><span className="font-medium text-ink-800">Est. Cost:</span> {selected.aiResolutionPlan.estimatedCost}</p>
                  <p><span className="font-medium text-ink-800">Depts:</span> {selected.aiResolutionPlan.departments?.join(', ')}</p>
                  <div className="pl-4 border-l-2 border-navy-200">
                    <span className="font-medium text-ink-800 block mb-1">Suggested Steps:</span>
                    <ul className="list-disc pl-2 space-y-1">
                      {selected.aiResolutionPlan.steps?.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleCommit} className="px-6 py-5 space-y-4">
              <div className="input-group">
                <label className="input-label">Authority / Department name</label>
                <input
                  className="input"
                  placeholder="e.g. BBMP Roads Division"
                  value={form.authorityName}
                  onChange={e => setForm(p => ({ ...p, authorityName: e.target.value }))}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Promised action</label>
                <textarea
                  className="input h-20 resize-none"
                  placeholder="e.g. Patch all potholes with bitumen mix within 7 days"
                  value={form.promisedAction}
                  onChange={e => setForm(p => ({ ...p, promisedAction: e.target.value }))}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Deadline (ETA)</label>
                <input
                  type="date"
                  className="input"
                  value={form.etaDate}
                  onChange={e => setForm(p => ({ ...p, etaDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="info-bar text-xs">
                <Clock size={13} className="flex-shrink-0" />
                If the issue isn't resolved by this date, the commitment will be automatically marked as broken — publicly.
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setSelected(null)} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                  {submitting
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : 'Create Commitment'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature 1: Resolve Commitment Modal */}
      {resolving && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink-900/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl border border-border shadow-card-hover w-full max-w-md animate-slide-up">
            <div className="px-6 pt-5 pb-4 border-b border-border">
              <h3 className="font-serif text-lg font-semibold text-teal-900">Mark as Resolved</h3>
              <p className="text-sm text-ink-500 mt-0.5">Upload a photo to provide visual proof of impact.</p>
            </div>

            <form onSubmit={handleResolveCommitment} className="px-6 py-5 space-y-4">
              <div>
                <p className="input-label">Resolution Photo <span className="text-ink-400 font-normal">(recommended)</span></p>
                {resPhotoPreview ? (
                   <div className="relative rounded-lg overflow-hidden border border-border group h-40">
                     <img src={resPhotoPreview} alt="Resolution" className="w-full h-full object-cover" />
                     <button type="button" onClick={() => { setResPhotoFile(null); setResPhotoPreview(''); }} className="absolute top-2 right-2 bg-white/90 border border-border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>
                   </div>
                ) : (
                  <button type="button" onClick={() => resFileInputRef.current?.click()} className="w-full h-40 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-teal-300 hover:bg-teal-50 transition-colors">
                    <Camera size={24} className="text-ink-300" />
                    <span className="text-sm text-ink-500">Tap to upload before/after proof</span>
                  </button>
                )}
                <input ref={resFileInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
                  if (e.target.files[0]) { setResPhotoFile(e.target.files[0]); setResPhotoPreview(URL.createObjectURL(e.target.files[0])); }
                }} />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setResolving(null); setResPhotoFile(null); setResPhotoPreview(''); }} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={isResolving} className="btn-primary bg-teal-600 hover:bg-teal-700 flex-1 justify-center">
                  {isResolving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
