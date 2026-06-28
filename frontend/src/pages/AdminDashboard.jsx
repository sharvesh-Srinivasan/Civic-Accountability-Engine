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
    <div className="flex min-h-screen bg-background text-on-background pt-16 md:pt-0">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-container-low border-r border-outline-variant fixed h-full pt-20 hidden md:block z-10">
        <div className="px-6 pb-6 border-b border-outline-variant">
          <h2 className="font-headline-sm text-primary">Admin Console</h2>
          <p className="text-xs text-on-surface-variant">System oversight</p>
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-label-md transition-colors ${activeTab === t.id ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'}`}
            >
              <span className="material-symbols-outlined">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 md:p-10 md:pt-24 min-h-screen">
        {loading ? (
          <div className="flex items-center justify-center h-64"><span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span></div>
        ) : (
          <div className="max-w-6xl mx-auto animate-fade-in">
            
            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <header>
                  <h1 className="font-headline-md mb-2 text-on-surface">System Overview</h1>
                </header>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl">
                    <p className="font-label-md text-on-surface-variant mb-1 uppercase text-xs">Total Users</p>
                    <p className="font-display-md text-on-surface">{totalUsers}</p>
                  </div>
                  <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl">
                    <p className="font-label-md text-on-surface-variant mb-1 uppercase text-xs">Active Reports</p>
                    <p className="font-display-md text-primary">{openReports}</p>
                  </div>
                  <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl">
                    <p className="font-label-md text-on-surface-variant mb-1 uppercase text-xs">Authorities</p>
                    <p className="font-display-md text-secondary">{activeAuthorities}</p>
                  </div>
                  <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl">
                    <p className="font-label-md text-on-surface-variant mb-1 uppercase text-xs">Resolved Issues</p>
                    <p className="font-display-md text-on-surface">{resolvedReports}</p>
                  </div>
                </div>

                {needsAttention.length > 0 && (
                  <div className="bg-error-container border border-error p-6 rounded-xl">
                    <h3 className="font-headline-sm text-error mb-4 flex items-center gap-2"><span className="material-symbols-outlined">warning</span> Needs Attention</h3>
                    <p className="font-body-md text-on-error-container mb-4">{needsAttention.length} reports have been open for over 7 days without resolution.</p>
                    <ul className="space-y-2">
                      {needsAttention.slice(0, 3).map(r => (
                        <li key={r.id} className="text-sm bg-surface-container-lowest/50 p-2 rounded border border-error/20 flex justify-between">
                          <span>{r.category} in {r.wardId}</span>
                          <span className="font-bold opacity-75">#{r.id.slice(0,6)}</span>
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
                <header className="flex justify-between items-end">
                  <h1 className="font-headline-md text-on-surface">User Management</h1>
                  <input type="text" placeholder="Search by name/email" value={userSearch} onChange={e=>setUserSearch(e.target.value)} className="border border-outline-variant bg-surface-container-lowest p-2 rounded-lg text-sm w-64" />
                </header>
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-low border-b border-outline-variant text-sm text-on-surface-variant">
                      <tr>
                        <th className="p-4 font-normal">User</th>
                        <th className="p-4 font-normal">Email</th>
                        <th className="p-4 font-normal">Score</th>
                        <th className="p-4 font-normal">Status</th>
                        <th className="p-4 font-normal text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant text-sm">
                      {users.filter(u => u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                        <tr key={u.id} className="hover:bg-surface-container-low">
                          <td className="p-4 font-bold">{u.displayName || 'Unknown'}</td>
                          <td className="p-4 text-on-surface-variant">{u.email}</td>
                          <td className="p-4">{u.civicPoints || 0}</td>
                          <td className="p-4">
                            {u.isSuspended ? <span className="bg-error text-on-error px-2 py-1 rounded text-xs">Suspended</span> : <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded text-xs">Active</span>}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button onClick={() => toggleSuspend(u)} className={`px-3 py-1 border rounded text-xs font-bold ${u.isSuspended ? 'border-primary text-primary' : 'border-error text-error'}`}>{u.isSuspended ? 'Reinstate' : 'Suspend'}</button>
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
                <header className="flex justify-between items-end">
                  <h1 className="font-headline-md text-on-surface">Report Moderation</h1>
                  <select value={reportFilter} onChange={e=>setReportFilter(e.target.value)} className="border border-outline-variant bg-surface-container-lowest p-2 rounded-lg text-sm w-48">
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="disputed">Disputed/Invalid</option>
                  </select>
                </header>
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-low border-b border-outline-variant text-sm text-on-surface-variant">
                      <tr>
                        <th className="p-4 font-normal">ID / Date</th>
                        <th className="p-4 font-normal">Issue</th>
                        <th className="p-4 font-normal">Status</th>
                        <th className="p-4 font-normal text-right">Overrides</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant text-sm">
                      {reports.filter(r => reportFilter === 'all' || r.status === reportFilter).map(r => (
                        <tr key={r.id} className="hover:bg-surface-container-low">
                          <td className="p-4">
                            <p className="font-bold">#{r.id.slice(0,6)}</p>
                            <p className="text-xs text-on-surface-variant">{r.createdAt?.toDate?.() ? format(r.createdAt.toDate(), 'MMM d, yyyy') : ''}</p>
                          </td>
                          <td className="p-4">
                            <p className="capitalize font-bold flex items-center gap-2">{r.category} <SeverityBadge severity={r.severity} /></p>
                            <p className="text-xs text-on-surface-variant max-w-xs truncate">{r.summary || r.description}</p>
                          </td>
                          <td className="p-4"><StatusBadge status={r.status} /></td>
                          <td className="p-4 text-right space-x-2 flex justify-end">
                            {r.status !== 'disputed' && (
                              <button onClick={() => markReportStatus(r.id, 'disputed')} className="px-2 py-1 bg-error/10 text-error rounded text-xs border border-error/20 hover:bg-error hover:text-white transition-colors">Flag Invalid</button>
                            )}
                            <button onClick={() => {
                              const newCat = prompt('Enter new category (pothole, streetlight, garbage, water_leak, other):', r.category);
                              const newSev = prompt('Enter new severity (low, medium, high):', r.severity);
                              if(newCat && newSev) overrideClassification(r.id, newCat, newSev);
                            }} className="px-2 py-1 bg-surface-variant text-on-surface-variant rounded text-xs border hover:bg-surface-container-high transition-colors">Edit AI</button>
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
                  <h1 className="font-headline-md text-on-surface">Authority Departments</h1>
                  <p className="text-sm text-on-surface-variant mt-1">Manage officials who handle commitments.</p>
                </header>
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden p-6">
                  <h3 className="font-label-md mb-4 text-on-surface">Grant Authority Access</h3>
                  <div className="flex gap-4">
                     <select id="authSelect" className="border border-outline-variant bg-surface-container-low p-2 rounded-lg flex-1">
                       <option value="">Select a user...</option>
                       {users.filter(u => !u.isAuthority).map(u => <option key={u.id} value={u.id}>{u.displayName} ({u.email})</option>)}
                     </select>
                     <button onClick={() => {
                       const sel = document.getElementById('authSelect');
                       if (sel.value) {
                         const user = users.find(u => u.id === sel.value);
                         if (user) toggleAuthority(user);
                       }
                     }} className="bg-primary text-on-primary px-6 rounded-lg font-bold">Grant Access</button>
                  </div>
                </div>
                
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-low border-b border-outline-variant text-sm text-on-surface-variant">
                      <tr>
                        <th className="p-4 font-normal">Official</th>
                        <th className="p-4 font-normal">Role</th>
                        <th className="p-4 font-normal text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant text-sm">
                      {users.filter(u => u.isAuthority).map(u => (
                        <tr key={u.id} className="hover:bg-surface-container-low">
                          <td className="p-4 font-bold">{u.displayName || 'Unknown'} <br/><span className="text-xs font-normal text-on-surface-variant">{u.email}</span></td>
                          <td className="p-4"><span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded text-xs">Authority</span></td>
                          <td className="p-4 text-right">
                            <button onClick={() => toggleAuthority(u)} className="px-3 py-1 border border-error text-error rounded text-xs hover:bg-error/10">Revoke</button>
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
                  <h1 className="font-headline-md text-on-surface">Ward Configuration</h1>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wards.map(w => (
                    <div key={w.id} className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-on-surface">{w.name}</h4>
                        <p className="text-xs text-on-surface-variant">{w.city}</p>
                      </div>
                      <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded text-xs font-mono">{w.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SYSTEM */}
            {activeTab === 'system' && (
              <div className="space-y-8">
                <header>
                  <h1 className="font-headline-md text-on-surface">System Health & Export</h1>
                </header>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl space-y-4">
                    <h3 className="font-label-md font-bold flex items-center gap-2 text-on-surface"><span className="material-symbols-outlined text-primary">download</span> Data Export</h3>
                    <p className="text-sm text-on-surface-variant">Export all reports to CSV for external analysis.</p>
                    <button onClick={exportCSV} className="bg-surface-variant text-on-surface-variant px-6 py-2 rounded-lg font-bold hover:bg-surface-container-high transition-colors w-full border border-outline-variant">Download Reports (CSV)</button>
                  </div>

                  <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl space-y-4">
                    <h3 className="font-label-md font-bold flex items-center gap-2 text-on-surface"><span className="material-symbols-outlined text-secondary">bolt</span> Manual Triggers</h3>
                    <p className="text-sm text-on-surface-variant">Force backend jobs to run instantly.</p>
                    <button onClick={triggerCommitmentCheck} className="bg-secondary text-on-secondary px-6 py-2 rounded-lg font-bold hover:bg-secondary-fixed w-full">Run Deadline Checker</button>
                  </div>
                </div>

                <div className="bg-surface-container-highest border border-outline rounded-xl overflow-hidden font-mono text-sm">
                  <div className="bg-surface-container p-3 border-b border-outline text-on-surface-variant flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-error"></span>
                    <span className="w-3 h-3 rounded-full bg-primary"></span>
                    <span className="w-3 h-3 rounded-full bg-secondary"></span>
                    <span className="ml-2 font-bold uppercase tracking-wider text-[10px]">AI Pipeline Logs</span>
                  </div>
                  <div className="p-4 space-y-2 text-on-surface h-64 overflow-y-auto">
                    {aiLogs.map(log => (
                      <div key={log.id} className="flex items-start gap-4 border-b border-outline-variant/30 pb-2">
                        <span className="opacity-50 text-xs shrink-0">{format(log.time, 'HH:mm:ss')}</span>
                        <span className={`shrink-0 w-24 ${log.status === 'Success' ? 'text-secondary' : 'text-error'}`}>[{log.status}]</span>
                        <span className="font-bold text-primary shrink-0">{log.action}:</span>
                        <span className="text-on-surface-variant break-all">{log.detail}</span>
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
