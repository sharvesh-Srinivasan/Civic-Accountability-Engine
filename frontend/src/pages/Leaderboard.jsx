import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Shield } from 'lucide-react';

export default function Leaderboard() {
  const { user, userDoc } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [wards, setWards] = useState({});
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');

  useEffect(() => {
    const fetchWards = async () => {
      if (!db) return;
      try {
        const snap = await getDocs(collection(db, 'wards'));
        const wardsMap = {};
        const citySet = new Set();
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.city) {
            wardsMap[d.id] = data.city;
            citySet.add(data.city);
          }
        });
        setWards(wardsMap);
        setCities(Array.from(citySet).sort());
        if (userDoc?.city) setSelectedCity(userDoc.city);
      } catch (err) {
        console.error("Failed to fetch wards:", err);
      }
    };
    fetchWards();
  }, [userDoc?.city]);

  useEffect(() => {
    const fetchLeaders = async () => {
      if (!db) return;
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, 'users'), orderBy('civicScore', 'desc'), limit(100)));
        let users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (selectedCity && Object.keys(wards).length > 0) {
          users = users.filter(u => wards[u.wardId] === selectedCity);
        }
        
        setLeaders(users.slice(0, 20));
      } catch (err) {
        console.error("Failed to load leaderboard", err);
      } finally {
        setLoading(false);
      }
    };
    
    // Only fetch once wards are loaded if a city is selected
    if (Object.keys(wards).length > 0 || cities.length === 0) {
       fetchLeaders();
    }
  }, [selectedCity, wards, cities.length]);

  return (
    <main className="flex-1 md:ml-72 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto overflow-x-hidden pt-24 md:pt-margin-desktop bg-transparent text-ink min-h-screen font-body-md relative z-10">
      
      <header className="mb-stack-lg flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-navy/20 pb-4 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-amber">emoji_events</span>
            <h1 className="font-serif text-4xl text-navy font-bold tracking-tight">Civic Leaderboard</h1>
          </div>
          <p className="font-body-md text-muted mt-2 max-w-2xl">Recognizing the most active citizens improving our community.</p>
        </div>
        
        <div className="relative w-full md:w-48 shrink-0">
          <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="appearance-none w-full rounded-2xl glass-panel p-3 pr-8 border border-white/40 font-label-md text-sm focus:border-navy focus:ring-1 focus:ring-navy focus:outline-none text-ink shadow-sm cursor-pointer transition-colors hover:bg-white/80">
            <option value="">All Regions</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-sm">expand_more</span>
        </div>
      </header>

      <div className="glass-panel border-white/40 rounded-3xl shadow-glass overflow-hidden animate-fade-in-up hover:shadow-[0_8px_40px_rgba(31,38,135,0.12)] transition-shadow duration-500" style={{ animationDelay: '100ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md text-body-md">
            <thead className="bg-white/40 font-label-md text-label-md text-navy border-b border-white/20">
              <tr>
                <th className="py-5 px-6 font-bold uppercase tracking-widest text-[10px] w-16 text-center">Rank</th>
                <th className="py-5 px-6 font-bold uppercase tracking-widest text-[10px]">Citizen</th>
                <th className="py-5 px-6 font-bold uppercase tracking-widest text-[10px]">Ward</th>
                <th className="py-5 px-6 font-bold uppercase tracking-widest text-[10px] text-right">Civic Score</th>
                <th className="py-5 px-6 font-bold uppercase tracking-widest text-[10px] text-center">Badges</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-muted">
                    <div className="flex items-center justify-center gap-2">
                       <span className="material-symbols-outlined animate-spin">sync</span> Loading rankings...
                    </div>
                  </td>
                </tr>
              ) : leaders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-muted">No citizens found.</td>
                </tr>
              ) : (
                leaders.map((leader, index) => {
                  const isTop3 = index < 3;
                  return (
                    <tr key={leader.id} className={`hover:bg-white/50 transition-colors ${leader.id === user?.uid ? 'bg-navy/10 border-l-4 border-l-navy' : 'bg-transparent'}`}>
                      <td className="py-4 px-6 text-center">
                        {index === 0 ? <span className="material-symbols-outlined text-amber text-2xl">workspace_premium</span> :
                         index === 1 ? <span className="material-symbols-outlined text-gray-400 text-2xl">workspace_premium</span> :
                         index === 2 ? <span className="material-symbols-outlined text-orange-400 text-2xl">workspace_premium</span> :
                         <span className="font-bold text-muted">{index + 1}</span>}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${isTop3 ? 'bg-navy' : 'bg-muted'}`}>
                            {(leader.displayName || leader.email || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-ink">{leader.displayName || 'Citizen'}</p>
                            {leader.id === user?.uid && <p className="text-[10px] font-bold text-navy uppercase tracking-wider">You</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-muted text-sm capitalize">
                        {leader.wardId?.replace(/ward(\d+)/i, 'Ward $1') || 'Unknown'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-display-md text-navy text-xl">{leader.civicScore || 0}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {leader.badges?.includes('Ward Guardian') && <Shield size={16} className="text-sage" title="Ward Guardian" />}
                          <span className="font-bold text-sm text-ink ml-1">{leader.badges?.length || 0}</span>
                        </div>
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
