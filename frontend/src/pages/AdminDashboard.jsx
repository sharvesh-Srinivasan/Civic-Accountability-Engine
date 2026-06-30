import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { StatusBadge, SeverityBadge } from '../components/ReportCard';
import api from '../lib/api';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data State
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [userSearch, setUserSearch] = useState('');
  const [reportFilter, setReportFilter] = useState('all');

  // Logs
  const [aiLogs, setAiLogs] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uSnap, rSnap, wSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'reports')),
        getDocs(collection(db, 'wards')),
      ]);
      setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setReports(rSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt?.toDate?.()||0) - (a.createdAt?.toDate?.()||0)));
      setWards(wSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      // Mock Logs
      setAiLogs([
        { id: 1, time: new Date(), action: 'Classification Request', status: 'Success', detail: 'pothole (high)' },
        { id: 2, time: new Date(Date.now() - 50000), action: 'Pattern Detection', status: 'Success', detail: 'Identified cluster in Ward 1' },
        { id: 3, time: new Date(Date.now() - 3600000), action: 'Deadline Check', status: 'Failed', detail: 'Timeout contacting DB' }
      ]);
    } catch (err) {
      toast.error('Failed to load admin data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- User Management ---
  const toggleSuspend = async (user) => {
    const newVal = !user.isSuspended;
    try {
      await updateDoc(doc(db, 'users', user.id), { isSuspended: newVal });
      toast.success(newVal ? 'User suspended' : 'User reinstated');
      setUsers(users.map(u => u.id === user.id ? { ...u, isSuspended: newVal } : u));
    } catch (err) { toast.error('Failed to update user'); }
  };

  const toggleAuthority = async (user) => {
    const newVal = !user.isAuthority;
    try {
      await updateDoc(doc(db, 'users', user.id), { 
        isAuthority: newVal,
        role: newVal ? 'authority' : 'citizen'
      });
      toast.success(newVal ? 'Made authority' : 'Removed authority');
      setUsers(users.map(u => u.id === user.id ? { ...u, isAuthority: newVal, role: newVal?'authority':'citizen' } : u));
    } catch (err) { toast.error('Failed to update user'); }
  };

  // --- Report Moderation ---
  const markReportStatus = async (reportId, status) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status });
      toast.success(`Report marked as ${status}`);
      setReports(reports.map(r => r.id === reportId ? { ...r, status } : r));
    } catch (err) { toast.error('Failed to update report'); }
  };

  const overrideClassification = async (reportId, newCat, newSev) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { category: newCat, severity: newSev });
      toast.success('Classification overridden');
      setReports(reports.map(r => r.id === reportId ? { ...r, category: newCat, severity: newSev } : r));
    } catch (err) { toast.error('Failed to override'); }
  };

  // --- Triggers & Export ---
  const triggerCommitmentCheck = async () => {
    try {
      await api.post('/api/commitments/check');
      toast.success('Commitment check triggered successfully');
    } catch {
      toast.error('Trigger failed');
    }
  };

  const exportCSV = () => {
    const headers = 'ID,Category,Severity,Status,Ward\n';
    const rows = reports.map(r => `"${r.id}","${r.category}","${r.severity}","${r.status}","${r.wardId}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `civic_reports_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Computed Stats ---
  const totalUsers = users.length;
  const activeAuthorities = users.filter(u => u.isAuthority).length;
  const openReports = reports.filter(r => r.status === 'open' || r.status === 'acknowledged').length;
  const resolvedReports = reports.filter(r => r.status === 'resolved').length;
  const needsAttention = reports.filter(r => r.status === 'open' && (Date.now() - (r.createdAt?.toDate?.()||0)) > 7*24*60*60*1000); // Open > 7 days

  return (
    <div className="flex min-h-screen bg-transparent text-ink pt-16 md:pt-0">
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r border-white/20 fixed h-full pt-20 hidden md:block z-10 shadow-glass">
        <div className="px-6 pb-6 border-b border-white/10">
          <h2 className="font-serif text-2xl text-navy font-bold">Admin Console</h2>
          <p className="text-xs text-muted mt-1 uppercase tracking-wider">Platform Oversight</p>
        </div>
        <nav className="p-4 space-y-2">
          {[
            { id: 'overview', icon: 'dashboard', label: 'Overview' },
            { id: 'users', icon: 'group', label: 'Users' },
            { id: 'reports', icon: 'flag', label: 'Reports' },
            { id: 'authorities', icon: 'admin_panel_settings', label: 'Authorities' },
            { id: 'wards', icon: 'map', label: 'Wards' },
            { id: 'system', icon: 'terminal', label: 'System & Export' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-label-md transition-all duration-300 ${activeTab === t.id ? 'bg-gradient-to-r from-navy to-ink text-white font-bold shadow-glow-navy translate-x-1' : 'text-muted hover:bg-white/40 hover:text-ink hover:translate-x-1'}`}
            >
              <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 md:p-10 md:pt-24 min-h-screen">
        {loading ? (
          <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto">
            <div className="h-10 w-56 bg-surface rounded-lg border border-border" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-28 bg-surface border border-border rounded-xl relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            
            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <header>
                  <h1 className="font-serif text-4xl text-navy font-bold tracking-tight mb-2">System Overview</h1>
                  <p className="text-muted text-sm">Platform-level metrics and alerts.</p>
                </header>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Users', value: totalUsers, color: 'text-ink', icon: 'group', bg: 'bg-white/40' },
                    { label: 'Active Reports', value: openReports, color: 'text-terracotta', icon: 'flag', bg: 'bg-terracotta/5' },
                    { label: 'Authorities', value: activeAuthorities, color: 'text-sage', icon: 'admin_panel_settings', bg: 'bg-sage/5' },
                    { label: 'Resolved Issues', value: resolvedReports, color: 'text-navy', icon: 'check_circle', bg: 'bg-navy/5' },
                  ].map((s, i) => (
                    <div key={s.label} className={`glass-panel border-white/40 p-6 rounded-3xl shadow-glass animate-fade-in-up relative overflow-hidden group hover:-translate-y-1 transition-transform`} style={{ animationDelay: `${i * 60}ms` }}>
                      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${s.bg} blur-xl group-hover:scale-150 transition-transform`}></div>
                      <div className="relative z-10 flex justify-between items-start mb-4">
                        <p className="font-label-md text-muted uppercase text-[10px] font-bold tracking-widest">{s.label}</p>
                        <span className={`material-symbols-outlined ${s.color} opacity-50 text-[20px]`}>{s.icon}</span>
                      </div>
                      <p className={`font-serif text-5xl relative z-10 ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {needsAttention.length > 0 && (
                  <div className="bg-terracotta/10 border border-terracotta p-6 rounded-xl animate-fade-in-up" style={{ animationDelay: '250ms' }}>
                    <h3 className="font-serif text-xl text-terracotta mb-4 flex items-center gap-2"><span className="material-symbols-outlined">warning</span> Needs Attention</h3>
                    <p className="font-body-md text-terracotta mb-4">{needsAttention.length} reports have been open for over 7 days without resolution.</p>
                    <ul className="space-y-2">
                      {needsAttention.slice(0, 3).map(r => (
                        <li key={r.id} className="text-sm bg-surface p-2 rounded border border-terracotta/20 flex justify-between">
                          <span>{r.category} in {r.wardId}</span>
                          <span className="font-bold text-muted">#{r.id.slice(0,6)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* USERS */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <header className="flex justify-between items-end mb-6">
                  <div>
                    <h1 className="font-serif text-4xl text-navy font-bold tracking-tight mb-2">User Management</h1>
                    <p className="text-muted text-sm">Monitor and manage citizen accounts.</p>
                  </div>
                  <input type="text" placeholder="Search by name/email" value={userSearch} onChange={e=>setUserSearch(e.target.value)} className="border border-white/40 bg-white/40 backdrop-blur-md p-3 rounded-xl text-sm w-72 focus:outline-none focus:border-navy transition-colors shadow-sm" />
                </header>
                <div className="glass-panel border-white/40 rounded-3xl overflow-hidden shadow-glass">
                  <table className="w-full text-left font-body-md">
                    <thead className="bg-white/40 border-b border-white/20 text-xs text-muted uppercase tracking-wider font-bold">
                      <tr>
                        <th className="p-5 font-normal">User</th>
                        <th className="p-5 font-normal">Email</th>
                        <th className="p-5 font-normal">Score</th>
                        <th className="p-5 font-normal">Status</th>
                        <th className="p-5 font-normal text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20 text-sm">
                      {users.filter(u => u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                        <tr key={u.id} className="hover:bg-white/20 transition-colors">
                          <td className="p-5 font-bold text-ink">{u.displayName || 'Unknown'}</td>
                          <td className="p-5 text-muted">{u.email}</td>
                          <td className="p-5 font-mono">{u.civicPoints || 0}</td>
                          <td className="p-5">
                            {u.isSuspended ? <span className="bg-terracotta/20 text-terracotta px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase">Suspended</span> : <span className="bg-sage/20 text-sage px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase">Active</span>}
                          </td>
                          <td className="p-5 text-right space-x-2">
                            <button onClick={() => toggleSuspend(u)} className={`px-4 py-2 border rounded-xl text-xs font-bold transition-colors ${u.isSuspended ? 'border-navy text-navy hover:bg-navy hover:text-white' : 'border-terracotta text-terracotta hover:bg-terracotta hover:text-white'}`}>{u.isSuspended ? 'Reinstate' : 'Suspend'}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* REPORTS */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <header className="flex justify-between items-end mb-6">
                  <div>
                    <h1 className="font-serif text-4xl text-navy font-bold tracking-tight mb-2">Report Moderation</h1>
                    <p className="text-muted text-sm">Override AI classifications or flag invalid reports.</p>
                  </div>
                  <select value={reportFilter} onChange={e=>setReportFilter(e.target.value)} className="border border-white/40 bg-white/40 backdrop-blur-md p-3 rounded-xl text-sm w-56 focus:outline-none shadow-sm text-ink">
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="disputed">Disputed/Invalid</option>
                  </select>
                </header>
                <div className="glass-panel border-white/40 rounded-3xl overflow-hidden shadow-glass">
                  <table className="w-full text-left font-body-md">
                    <thead className="bg-white/40 border-b border-white/20 text-xs text-muted uppercase tracking-wider font-bold">
                      <tr>
                        <th className="p-5 font-normal">ID / Date</th>
                        <th className="p-5 font-normal">Issue</th>
                        <th className="p-5 font-normal">Status</th>
                        <th className="p-5 font-normal text-right">Overrides</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20 text-sm">
                      {reports.filter(r => reportFilter === 'all' || r.status === reportFilter).map(r => (
                        <tr key={r.id} className="hover:bg-white/20 transition-colors">
                          <td className="p-5">
                            <p className="font-mono font-bold text-ink">{r.id.slice(0,8).toUpperCase()}</p>
                            <p className="text-[11px] text-muted uppercase tracking-wider mt-1">{r.createdAt?.toDate?.() ? format(r.createdAt.toDate(), 'MMM d, yyyy') : ''}</p>
                          </td>
                          <td className="p-5">
                            <p className="capitalize font-bold text-ink flex items-center gap-2 mb-1">{r.category?.replace('_', ' ')} <SeverityBadge severity={r.severity} /></p>
                            <p className="text-xs text-muted max-w-sm line-clamp-1">{r.summary || r.description}</p>
                          </td>
                          <td className="p-5"><StatusBadge status={r.status} /></td>
                          <td className="p-5 text-right space-x-2 flex justify-end">
                            {r.status !== 'disputed' && (
                              <button onClick={() => markReportStatus(r.id, 'disputed')} className="px-3 py-1.5 bg-terracotta/10 text-terracotta rounded-lg text-xs font-bold border border-terracotta/20 hover:bg-terracotta hover:text-white transition-colors">Flag Invalid</button>
                            )}
                            <button onClick={() => {
                              const newCat = prompt('Enter new category (pothole, streetlight, garbage, water_leak, other):', r.category);
                              const newSev = prompt('Enter new severity (low, medium, high):', r.severity);
                              if(newCat && newSev) overrideClassification(r.id, newCat, newSev);
                            }} className="px-3 py-1.5 bg-white/50 text-ink rounded-lg text-xs font-bold border border-white/40 hover:bg-navy hover:text-white hover:border-navy transition-colors">Edit AI</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* AUTHORITIES */}
            {activeTab === 'authorities' && (
              <div className="space-y-6">
                <header>
                  <h1 className="font-headline-md text-ink">Authority Departments</h1>
                  <p className="text-sm text-muted mt-1">Manage officials who handle commitments.</p>
                </header>
                <div className="bg-surface border border-border rounded-xl overflow-hidden p-6">
                  <h3 className="font-label-md mb-4 text-ink">Grant Authority Access</h3>
                  <div className="flex gap-4">
                     <select id="authSelect" className="border border-border bg-surface p-2 rounded-lg flex-1">
                       <option value="">Select a user...</option>
                       {users.filter(u => !u.isAuthority).map(u => <option key={u.id} value={u.id}>{u.displayName} ({u.email})</option>)}
                     </select>
                     <button onClick={() => {
                       const sel = document.getElementById('authSelect');
                       if (sel.value) {
                         const user = users.find(u => u.id === sel.value);
                         if (user) toggleAuthority(user);
                       }
                     }} className="bg-navy text-white px-6 rounded-lg font-bold">Grant Access</button>
                  </div>
                </div>
                
                <div className="bg-surface border border-border rounded-xl overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface border-b border-border text-sm text-muted">
                      <tr>
                        <th className="p-4 font-normal">Official</th>
                        <th className="p-4 font-normal">Role</th>
                        <th className="p-4 font-normal text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant text-sm">
                      {users.filter(u => u.isAuthority).map(u => (
                        <tr key={u.id} className="hover:bg-surface">
                          <td className="p-4 font-bold">{u.displayName || 'Unknown'} <br/><span className="text-xs font-normal text-muted">{u.email}</span></td>
                          <td className="p-4"><span className="bg-sage/10 text-sage px-2 py-1 rounded text-xs">Authority</span></td>
                          <td className="p-4 text-right">
                            <button onClick={() => toggleAuthority(u)} className="px-3 py-1 border border-terracotta text-terracotta rounded text-xs hover:bg-terracotta/10">Revoke</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* WARDS */}
            {activeTab === 'wards' && (
              <div className="space-y-6">
                <header>
                  <h1 className="font-headline-md text-ink">Ward Configuration</h1>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wards.map(w => (
                    <div key={w.id} className="bg-surface border border-border p-4 rounded-xl flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-ink">{w.name}</h4>
                        <p className="text-xs text-muted">{w.city}</p>
                      </div>
                      <span className="bg-paper text-muted px-2 py-1 rounded text-xs font-mono">{w.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SYSTEM */}
            {activeTab === 'system' && (
              <div className="space-y-8">
                <header className="mb-8">
                  <h1 className="font-serif text-4xl text-navy font-bold tracking-tight mb-2">System Health & Terminal</h1>
                  <p className="text-muted text-sm">Live logs and data exports.</p>
                </header>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="glass-panel border-white/40 p-8 rounded-3xl space-y-4 shadow-glass hover:shadow-glow-navy transition-shadow group">
                    <h3 className="font-label-md font-bold flex items-center gap-2 text-ink text-lg"><span className="material-symbols-outlined text-navy group-hover:scale-110 transition-transform">download</span> Data Export</h3>
                    <p className="text-sm text-muted">Export all reports to CSV for external analysis.</p>
                    <button onClick={exportCSV} className="bg-white/60 text-ink px-6 py-3 rounded-xl font-bold hover:bg-white transition-colors w-full border border-white/80 shadow-sm">Download Reports (CSV)</button>
                  </div>

                  <div className="glass-panel border-white/40 p-8 rounded-3xl space-y-4 shadow-glass hover:shadow-glow-sage transition-shadow group">
                    <h3 className="font-label-md font-bold flex items-center gap-2 text-ink text-lg"><span className="material-symbols-outlined text-sage group-hover:scale-110 transition-transform">bolt</span> Manual Triggers</h3>
                    <p className="text-sm text-muted">Force backend jobs to run instantly.</p>
                    <button onClick={triggerCommitmentCheck} className="bg-gradient-to-r from-sage to-[#5b8a6a] text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 w-full shadow-sm">Run Deadline Checker</button>
                  </div>
                </div>

                <div className="bg-[#1e1e24] border border-[#2d2d35] rounded-3xl overflow-hidden font-mono text-sm shadow-2xl">
                  <div className="bg-[#151519] p-4 border-b border-[#2d2d35] text-muted flex items-center gap-3">
                    <div className="flex gap-2">
                      <span className="w-3 h-3 rounded-full bg-terracotta"></span>
                      <span className="w-3 h-3 rounded-full bg-amber"></span>
                      <span className="w-3 h-3 rounded-full bg-sage"></span>
                    </div>
                    <span className="ml-2 font-bold uppercase tracking-widest text-[10px] text-white/50 flex items-center gap-2"><span className="material-symbols-outlined text-[14px]">terminal</span> AI Pipeline Logs</span>
                  </div>
                  <div className="p-6 space-y-3 text-white/80 h-80 overflow-y-auto custom-scrollbar">
                    {aiLogs.map(log => (
                      <div key={log.id} className="flex items-start gap-4 border-b border-white/5 pb-3">
                        <span className="text-white/30 text-xs shrink-0 font-bold">{format(log.time, 'HH:mm:ss')}</span>
                        <span className={`shrink-0 w-24 font-bold ${log.status === 'Success' ? 'text-sage' : 'text-terracotta'}`}>[{log.status}]</span>
                        <span className="font-bold text-[#4c6ef5] shrink-0">{log.action}:</span>
                        <span className="text-white/70 break-all">{log.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
