import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, getDocs, doc, updateDoc, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Shield, TrendingUp } from 'lucide-react';
import { mockWards, mockUsers } from '../lib/demoData';

export default function Leaderboard() {
  const { user, userDoc } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [wards, setWards] = useState({});
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  
  const [viewMode, setViewMode] = useState('citizens'); // 'citizens', 'wards', 'politicians'
  const [prevScores, setPrevScores] = useState({}); // To track who gained points for animations
  const [politicians, setPoliticians] = useState([]);

  // 1. Fetch Wards once
  useEffect(() => {
    const fetchWards = async () => {
      let docs = [];
      try {
        if (!db) throw new Error("No DB");
        const snap = await getDocs(collection(db, 'wards'));
        docs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
      } catch (err) {
        console.warn("Failed to fetch wards:", err);
        docs = mockWards.map(w => ({ id: w.id, data: w }));
      }
      const wardsMap = {};
      const citySet = new Set();
      docs.forEach(d => {
        const data = d.data;
        if (data.city) {
          wardsMap[d.id] = data; // store full ward data
          citySet.add(data.city);
        }
      });
      setWards(wardsMap);
      setCities(Array.from(citySet).sort());
      if (userDoc?.city) setSelectedCity(userDoc.city);
    };
    fetchWards();
  }, [userDoc?.city]);

  // 2. Real-time Firebase Listener (The LIVE aspect)
  useEffect(() => {
    if (Object.keys(wards).length === 0) return;
    
    setLoading(true);
    let unsubscribe = () => {};

    const handleUsersUpdate = (users) => {
      setPrevScores(prev => {
        const newPrev = { ...prev };
        users.forEach(u => {
          if (prev[u.id] !== undefined && prev[u.id] < (u.civicScore || 0)) {
             u.justScored = true;
          }
          newPrev[u.id] = u.civicScore || 0;
        });
        return newPrev;
      });

      setTimeout(() => {
        setLeaders(curr => curr.map(l => ({ ...l, justScored: false })));
      }, 2000);
      
      setLeaders(users);
      setLoading(false);
    };
    
    try {
      if (!db) throw new Error("No DB");
      const q = query(collection(db, 'users'), orderBy('civicScore', 'desc'), limit(100));
      unsubscribe = onSnapshot(q, (snap) => {
        handleUsersUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, err => {
        console.warn('Leaderboard snapshot error:', err);
        handleUsersUpdate(mockUsers.filter(u => !u.role || u.role !== 'authority'));
      });
    } catch (err) {
      console.warn('Leaderboard offline mode:', err);
      handleUsersUpdate(mockUsers.filter(u => !u.role || u.role !== 'authority'));
    }

    return () => unsubscribe();
  }, [wards]);

  // Fetch Politicians (Authorities) for Trust Index
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      if (!db) throw new Error("No DB");
      const q = query(collection(db, 'users'), where('role', '==', 'authority'));
      unsubscribe = onSnapshot(q, (snap) => {
         let auths = snap.docs.map(d => ({ id: d.id, ...d.data() }));
         auths.sort((a,b) => (b.trustScore !== undefined ? b.trustScore : 100) - (a.trustScore !== undefined ? a.trustScore : 100));
         setPoliticians(auths);
      }, err => {
         let auths = mockUsers.filter(u => u.role === 'authority');
         auths.sort((a,b) => (b.trustScore !== undefined ? b.trustScore : 100) - (a.trustScore !== undefined ? a.trustScore : 100));
         setPoliticians(auths);
      });
    } catch (err) {
       let auths = mockUsers.filter(u => u.role === 'authority');
       auths.sort((a,b) => (b.trustScore !== undefined ? b.trustScore : 100) - (a.trustScore !== undefined ? a.trustScore : 100));
       setPoliticians(auths);
    }
    return () => unsubscribe();
  }, []);

  // 3. The Live Demo Simulator (Hackathon Magic)
  useEffect(() => {
    // This randomly bumps up a top user's score every 4 seconds to prove the leaderboard is live
    const interval = setInterval(async () => {
      if (leaders.length === 0) return;
      // Pick a random user from the top 10
      const randIdx = Math.floor(Math.random() * Math.min(10, leaders.length));
      const targetUser = leaders[randIdx];
      
      if (targetUser && targetUser.id) {
         try {
           const currentScore = targetUser.civicScore || 0;
           if (!db) throw new Error("No DB");
           await updateDoc(doc(db, 'users', targetUser.id), {
             civicScore: currentScore + Math.floor(Math.random() * 5) + 1
           });
         } catch (err) {
           // Simulate locally if offline
           const add = Math.floor(Math.random() * 5) + 1;
           setLeaders(curr => {
             const newLeaders = [...curr];
             const idx = newLeaders.findIndex(l => l.id === targetUser.id);
             if (idx !== -1) {
                newLeaders[idx] = { ...newLeaders[idx], civicScore: (currentScore + add), justScored: true };
             }
             return newLeaders.sort((a,b) => (b.civicScore || 0) - (a.civicScore || 0));
           });
           
           setTimeout(() => {
             setLeaders(curr => curr.map(l => ({ ...l, justScored: false })));
           }, 2000);
         }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [leaders]);

  // Derived Data: Filtered Citizens
  const displayLeaders = React.useMemo(() => {
    let filtered = leaders;
    if (selectedCity && Object.keys(wards).length > 0) {
      filtered = filtered.filter(u => wards[u.wardId]?.city === selectedCity);
    }
    return filtered.slice(0, 20);
  }, [leaders, selectedCity, wards]);

  // Derived Data: Ward Turf Wars
  const displayWards = React.useMemo(() => {
    const wardScores = {};
    leaders.forEach(u => {
       if (u.wardId && wards[u.wardId]) {
         const city = wards[u.wardId].city;
         if (!selectedCity || city === selectedCity) {
           if (!wardScores[u.wardId]) wardScores[u.wardId] = { id: u.wardId, name: wards[u.wardId].name, score: 0, topCitizen: u };
           wardScores[u.wardId].score += (u.civicScore || 0);
         }
       }
    });
    return Object.values(wardScores).sort((a,b) => b.score - a.score);
  }, [leaders, selectedCity, wards]);

  const displayPoliticians = React.useMemo(() => {
    let filtered = politicians;
    if (selectedCity && Object.keys(wards).length > 0) {
       filtered = filtered.filter(u => wards[u.wardId]?.city === selectedCity);
    }
    return filtered;
  }, [politicians, selectedCity, wards]);

  return (
    <main className="flex-1 md:ml-72 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto overflow-x-hidden pt-24 md:pt-margin-desktop bg-transparent text-ink min-h-screen font-body-md relative z-10">
      
      <header className="mb-stack-lg flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-amber">emoji_events</span>
            <h1 className="font-serif text-4xl text-navy font-bold tracking-tight">Leaderboard</h1>
            <span className="bg-terracotta/20 text-terracotta text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1 animate-pulse border border-terracotta/30">
              <span className="w-2 h-2 rounded-full bg-terracotta"></span> LIVE
            </span>
          </div>
          <p className="font-body-md text-muted mt-2 max-w-2xl">Real-time rankings. Watch the scores climb as issues get resolved.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Turf War Toggle */}
          <div className="flex bg-white/20 p-1 rounded-2xl border border-white/40 shadow-inner">
            <button 
              onClick={() => setViewMode('citizens')}
              className={`px-4 py-2 rounded-xl font-label-md text-xs font-bold transition-all ${viewMode === 'citizens' ? 'bg-white shadow-sm text-navy' : 'text-muted hover:text-ink'}`}
            >
              Citizens
            </button>
            <button 
              onClick={() => setViewMode('wards')}
              className={`px-4 py-2 rounded-xl font-label-md text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'wards' ? 'bg-white shadow-sm text-navy' : 'text-muted hover:text-ink'}`}
            >
              <Shield size={14} /> Turf Wars
            </button>
            <button 
              onClick={() => setViewMode('politicians')}
              className={`px-4 py-2 rounded-xl font-label-md text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'politicians' ? 'bg-white shadow-sm text-navy' : 'text-muted hover:text-ink'}`}
            >
              <span className="material-symbols-outlined text-[14px]">account_balance</span> Trust Index
            </button>
          </div>

          <div className="relative w-full md:w-48 shrink-0">
            <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="appearance-none w-full rounded-2xl glass-panel p-3 pr-8 border border-white/40 font-label-md text-sm focus:border-navy focus:ring-1 focus:ring-navy focus:outline-none text-ink shadow-sm cursor-pointer transition-colors hover:bg-white/80">
              <option value="">All Regions</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-sm">expand_more</span>
          </div>
        </div>
      </header>

      <div className="glass-panel border-white/40 rounded-3xl shadow-glass overflow-hidden animate-fade-in-up hover:shadow-[0_8px_40px_rgba(31,38,135,0.12)] transition-shadow duration-500 relative" style={{ animationDelay: '100ms' }}>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md text-body-md">
            <thead className="bg-white/40 font-label-md text-label-md text-navy border-b border-white/20">
              <tr>
                <th className="py-5 px-6 font-bold uppercase tracking-widest text-[10px] w-16 text-center">Rank</th>
                <th className="py-5 px-6 font-bold uppercase tracking-widest text-[10px]">{viewMode === 'citizens' ? 'Citizen' : viewMode === 'wards' ? 'Ward' : 'Politician'}</th>
                {viewMode !== 'wards' && <th className="py-5 px-6 font-bold uppercase tracking-widest text-[10px]">Ward</th>}
                <th className="py-5 px-6 font-bold uppercase tracking-widest text-[10px] text-right">{viewMode === 'politicians' ? 'Trust Score' : 'Civic Score'}</th>
                <th className="py-5 px-6 font-bold uppercase tracking-widest text-[10px] text-center">{viewMode === 'citizens' ? 'Badges' : viewMode === 'wards' ? 'Top Citizen' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-muted">
                    <div className="flex items-center justify-center gap-2">
                       <span className="material-symbols-outlined animate-spin">sync</span> Loading live rankings...
                    </div>
                  </td>
                </tr>
              ) : (viewMode === 'citizens' ? displayLeaders : viewMode === 'wards' ? displayWards : displayPoliticians).length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-muted">No data available.</td>
                </tr>
              ) : (
                (viewMode === 'citizens' ? displayLeaders : viewMode === 'wards' ? displayWards : displayPoliticians).map((item, index) => {
                  const isTop3 = index < 3;
                  // Handle row flash animation if a citizen just scored
                  const rowClass = viewMode === 'citizens' 
                    ? `transition-all duration-700 ease-out ${item.justScored ? 'bg-sage/20 shadow-[inset_0_0_20px_rgba(102,123,104,0.3)]' : item.id === user?.uid ? 'bg-navy/10 border-l-4 border-l-navy hover:bg-white/50' : 'bg-transparent hover:bg-white/50'}`
                    : `hover:bg-white/50 transition-colors ${index === 0 ? 'bg-amber/5' : 'bg-transparent'}`;

                  return (
                    <tr key={item.id} className={rowClass}>
                      <td className="py-4 px-6 text-center">
                        {index === 0 ? <span className="material-symbols-outlined text-amber text-2xl">workspace_premium</span> :
                         index === 1 ? <span className="material-symbols-outlined text-gray-400 text-2xl">workspace_premium</span> :
                         index === 2 ? <span className="material-symbols-outlined text-orange-400 text-2xl">workspace_premium</span> :
                         <span className="font-bold text-muted">{index + 1}</span>}
                      </td>
                      
                      <td className="py-4 px-6">
                        {viewMode === 'citizens' ? (
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${isTop3 ? 'bg-navy shadow-glow-navy' : 'bg-muted'}`}>
                              {(item.displayName || item.email || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-ink flex items-center gap-2">
                                {item.displayName || 'Citizen'}
                                {item.justScored && <TrendingUp size={14} className="text-sage animate-bounce" />}
                              </p>
                              {item.id === user?.uid && <p className="text-[10px] font-bold text-navy uppercase tracking-wider">You</p>}
                            </div>
                          </div>
                        ) : viewMode === 'wards' ? (
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-gradient-to-br from-amber to-orange-400 shadow-glow-terracotta' : 'bg-surface border border-border text-navy'}`}>
                              <Shield size={20} className={index === 0 ? 'text-white' : 'text-navy'} />
                            </div>
                            <div>
                              <p className="font-bold text-ink text-lg capitalize">{item.name}</p>
                              {index === 0 && <p className="text-[10px] font-bold text-amber uppercase tracking-wider">Reigning Champions</p>}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${item.trustScore < 50 ? 'bg-terracotta' : 'bg-navy'}`}>
                              {(item.displayName || item.email || 'P')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-ink flex items-center gap-2">
                                {item.displayName || item.email || 'Politician'}
                              </p>
                              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{item.city || 'City Official'}</p>
                            </div>
                          </div>
                        )}
                      </td>
                      
                      
                      {viewMode !== 'wards' && (
                        <td className="py-4 px-6 text-muted text-sm capitalize">
                          {item.wardId?.replace(/ward(\d+)/i, 'Ward $1') || 'Unknown'}
                        </td>
                      )}

                      <td className="py-4 px-6 text-right">
                        <span className={`font-display-md text-xl transition-all duration-300 ${item.justScored ? 'text-sage scale-125 inline-block' : viewMode === 'politicians' ? (item.trustScore < 50 ? 'text-terracotta' : 'text-sage') : 'text-navy'}`}>
                          {viewMode === 'politicians' ? `${item.trustScore !== undefined ? item.trustScore : 100}%` : item.score !== undefined ? item.score : (item.civicScore || 0)}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-center">
                        {viewMode === 'citizens' ? (
                          <div className="flex items-center justify-center gap-1">
                            {item.badges?.includes('Ward Guardian') && <Shield size={16} className="text-sage" title="Ward Guardian" />}
                            <span className="font-bold text-sm text-ink ml-1">{item.badges?.length || 0}</span>
                          </div>
                        ) : viewMode === 'wards' ? (
                          <div className="flex items-center justify-center">
                             <div className="text-xs font-bold text-muted bg-white/40 px-3 py-1 rounded-full shadow-inner truncate max-w-[120px]">
                               👑 {item.topCitizen?.displayName || 'Citizen'}
                             </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                             <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${item.trustScore < 50 ? 'bg-terracotta/10 text-terracotta' : 'bg-sage/10 text-sage'}`}>
                               {item.trustScore < 50 ? 'Warning' : 'Trusted'}
                             </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
