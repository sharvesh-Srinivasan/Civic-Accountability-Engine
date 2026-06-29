import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { updatePassword, deleteUser } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { StatusBadge, CategoryIcon } from '../components/ReportCard';
import api from '../lib/api'; // For geolocation/ward logic if needed
import { Flag, CheckCircle, Eye, Shield } from 'lucide-react';

function BadgeIcon({ name, description, Icon, unlocked, progress, total }) {
  const isLocked = !unlocked;
  return (
    <div className={`w-32 p-3 rounded-xl border flex flex-col items-center text-center transition-all ${isLocked ? 'bg-paper border-border opacity-70 grayscale' : 'bg-sage/10 border-sage'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${isLocked ? 'bg-surface text-muted' : 'bg-sage text-white'}`}>
        <Icon size={20} />
      </div>
      <h4 className="font-label-md text-xs font-bold text-ink mb-1">{name}</h4>
      <p className="text-[9px] text-muted uppercase tracking-wider mb-2 leading-tight h-6">{description}</p>
      
      {isLocked && total > 1 && (
        <div className="w-full mt-auto">
          <div className="flex justify-between text-[9px] font-bold text-muted mb-1">
            <span>{Math.min(progress, total)}</span>
            <span>{total}</span>
          </div>
          <div className="w-full h-1 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-navy transition-all" style={{ width: `${Math.min((progress / total) * 100, 100)}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const { user, userDoc, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  
  // Data
  const [myReports, setMyReports] = useState([]);
  const [wardInsight, setWardInsight] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);

  const [details, setDetails] = useState({
    displayName: '',
    phone: '',
    address: '',
    bio: '',
    occupation: '',
    preferredCategories: []
  });
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (userDoc) {
      setDetails({
        displayName: userDoc.displayName || '',
        phone: userDoc.phone || '',
        address: userDoc.address || '',
        bio: userDoc.bio || '',
        occupation: userDoc.occupation || '',
        preferredCategories: userDoc.preferredCategories || []
      });
    }
  }, [userDoc]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || !db) return;
      setLoadingReports(true);
      try {
        // Fetch My Reports
        const q = query(collection(db, 'reports'), where('reporterId', '==', user.uid));
        const snap = await getDocs(q);
        const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort manually since we might not have a composite index for reporterId + createdAt yet (wait, we do have one)
        reports.sort((a,b) => (b.createdAt?.toDate?.() || new Date(b.createdAt)) - (a.createdAt?.toDate?.() || new Date(a.createdAt)));
        setMyReports(reports);

        // Fetch Ward Insight
        if (userDoc?.wardId) {
          try {
            // Find city from wardId if possible, or just use a mock
            const wardSnap = await getDocs(query(collection(db, 'wards'), where('__name__', '==', userDoc.wardId)));
            if (!wardSnap.empty) {
               const city = wardSnap.docs[0].data().city?.toLowerCase() || 'demo_insight';
               const insightDoc = await getDocs(query(collection(db, 'dashboard_insights'), where('__name__', '==', city)));
               if (!insightDoc.empty) {
                 setWardInsight(insightDoc.docs[0].data());
               } else {
                 const fallback = await getDocs(query(collection(db, 'dashboard_insights'), where('__name__', '==', 'demo_insight')));
                 if (!fallback.empty) setWardInsight(fallback.docs[0].data());
               }
            }
          } catch(e) { console.error('Error fetching ward insight', e); }
        }
      } catch (err) {
        console.error('Failed to fetch user data', err);
      } finally {
        setLoadingReports(false);
      }
    };
    fetchUserData();
  }, [user, userDoc]);

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setIsSavingDetails(true);
    try {
      let wardId = userDoc.wardId;
      let lat = userDoc.lat || null;
      let lng = userDoc.lng || null;
      
      // If address changed, geocode it
      if (details.address && details.address !== userDoc.address) {
         try {
           const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(details.address)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
           const response = await fetch(geocodeUrl);
           const geoData = await response.json();
           if (geoData.results && geoData.results.length > 0) {
             lat = geoData.results[0].geometry.location.lat;
             lng = geoData.results[0].geometry.location.lng;
           }
           
           // Mock ward assignment
           const res = await api.get('/api/wards');
           if (res.data?.length > 0) wardId = res.data[0].id;
         } catch(err) {
           console.error("Geocoding or ward assignment failed", err);
         }
      }
      
      await setDoc(doc(db, 'users', user.uid), {
        ...details,
        wardId,
        ...(lat && lng ? { lat, lng } : {})
      }, { merge: true });
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.newPassword) return;
    try {
      await updatePassword(user, passwordForm.newPassword);
      toast.success('Password updated successfully');
      setPasswordForm({ newPassword: '' });
    } catch (err) {
      toast.error('Failed to update password. You may need to sign in again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { isDeleted: true });
      await deleteUser(user);
      navigate('/login');
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        toast.error('For security, you must log out and log back in to delete your account.');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 3000);
      } else {
        toast.error(err.message || 'Failed to delete account.');
      }
      setIsDeleting(false);
    }
  };

  const toggleCategory = (cat) => {
    setDetails(prev => {
      const cats = prev.preferredCategories.includes(cat)
        ? prev.preferredCategories.filter(c => c !== cat)
        : [...prev.preferredCategories, cat];
      return { ...prev, preferredCategories: cats };
    });
  };

  const resolvedReports = myReports.filter(r => r.status === 'resolved');

  return (
    <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto overflow-x-hidden pt-20 md:pt-margin-desktop bg-paper text-ink min-h-screen font-body-md">
      
      <header className="mb-stack-lg animate-fade-in-up">
        <h1 className="font-serif text-4xl text-navy font-bold tracking-tight">My Profile</h1>
        <p className="font-body-md text-body-md text-muted mt-1">Manage your civic identity and view your impact.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Tabs */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 border-b md:border-b-0 border-border">
            {[
              { id: 'details', label: 'Personal Details', icon: 'person' },
              { id: 'impact', label: 'My Civic Impact', icon: 'social_leaderboard' },
              { id: 'ward', label: 'My Ward', icon: 'map' },
              { id: 'notifications', label: 'Notifications', icon: 'notifications' },
              { id: 'account', label: 'Account & Privacy', icon: 'shield_person' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-label-md text-label-md whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-navy/10 text-navy font-bold' : 'text-muted hover:bg-surface hover:text-ink'}`}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Tab Content */}
        <section className="flex-1 max-w-3xl">
          
          {/* PERSONAL DETAILS */}
          {activeTab === 'details' && (
            <div className="bg-surface border border-border rounded-xl p-gutter shadow-sm animate-fade-in">
              <h2 className="font-headline-sm text-headline-sm mb-6 text-ink">Personal Details</h2>
              <form onSubmit={handleSaveDetails} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-ink mb-1">Display Name</label>
                    <input type="text" value={details.displayName} onChange={e=>setDetails({...details, displayName:e.target.value})} className="w-full rounded-lg border border-border p-3 focus:border-navy focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-ink mb-1">Phone Number</label>
                    <input type="tel" value={details.phone} onChange={e=>setDetails({...details, phone:e.target.value})} className="w-full rounded-lg border border-border p-3 focus:border-navy focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-ink mb-1">Occupation / Expertise</label>
                    <input type="text" value={details.occupation} onChange={e=>setDetails({...details, occupation:e.target.value})} className="w-full rounded-lg border border-border p-3 focus:border-navy focus:outline-none" placeholder="e.g. Civil Engineer, Student, Lawyer" />
                  </div>
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-ink mb-1">Civic Bio</label>
                  <textarea value={details.bio} onChange={e=>setDetails({...details, bio:e.target.value})} className="w-full rounded-lg border border-border p-3 focus:border-navy focus:outline-none" rows="2" placeholder="A short description of your civic goals or interests" />
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-ink mb-1">Residential Address</label>
                  <textarea value={details.address} onChange={e=>setDetails({...details, address:e.target.value})} className="w-full rounded-lg border border-border p-3 focus:border-navy focus:outline-none" rows="3" placeholder="Enter your full address" />
                  <p className="text-xs text-muted mt-1">Changing this will automatically update your assigned Ward.</p>
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-ink mb-3">Interests (For personalized alerts)</label>
                  <div className="flex flex-wrap gap-2">
                    {['pothole', 'streetlight', 'garbage', 'water_leak'].map(cat => (
                      <button type="button" key={cat} onClick={() => toggleCategory(cat)} className={`px-4 py-2 rounded-full font-label-md text-xs uppercase tracking-wider font-bold border transition-colors ${details.preferredCategories.includes(cat) ? 'bg-navy text-white border-navy' : 'bg-surface text-muted border-border'}`}>
                        {cat.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-border flex justify-end">
                  <button type="submit" disabled={isSavingDetails} className="bg-navy text-white h-12 px-6 rounded-lg font-bold hover:bg-navy/10 transition-colors disabled:opacity-50">
                    {isSavingDetails ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MY CIVIC IMPACT */}
          {activeTab === 'impact' && (
            <div className="animate-fade-in space-y-6">
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface border border-border p-4 rounded-xl text-center">
                  <div className="font-display-md text-navy">{myReports.length}</div>
                  <div className="font-label-md text-[10px] text-muted uppercase tracking-wider">Reports Filed</div>
                </div>
                <div className="bg-surface border border-border p-4 rounded-xl text-center">
                  <div className="font-display-md text-sage">{resolvedReports.length}</div>
                  <div className="font-label-md text-[10px] text-muted uppercase tracking-wider">Resolved</div>
                </div>
                <div className="bg-surface border border-border p-4 rounded-xl text-center">
                  <div className="font-display-md text-ink">{userDoc?.verifiedReports || 0}</div>
                  <div className="font-label-md text-[10px] text-muted uppercase tracking-wider">Verified</div>
                </div>
                <div className="bg-surface border border-border p-4 rounded-xl text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-navy/5 pointer-events-none"></div>
                  <div className="font-display-md text-navy">{userDoc?.civicScore || 0}</div>
                  <div className="font-label-md text-[10px] text-muted uppercase tracking-wider">Civic Score</div>
                </div>
              </div>

              {/* Badges Section */}
              <div className="bg-surface border border-border rounded-xl p-gutter">
                <h3 className="font-headline-sm text-headline-sm text-ink mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber">military_tech</span>
                  Badges & Achievements
                </h3>
                
                <div className="flex flex-wrap gap-4">
                  <BadgeIcon name="First Report" description="Filed your first report" Icon={Flag} unlocked={userDoc?.badges?.includes('First Report')} progress={myReports.length > 0 ? 1 : 0} total={1} />
                  <BadgeIcon name="Verified Reporter" description="3 reports resolved" Icon={CheckCircle} unlocked={userDoc?.badges?.includes('Verified Reporter')} progress={userDoc?.resolvedReportsCount || 0} total={3} />
                  <BadgeIcon name="Community Watch" description="10 verifications given" Icon={Eye} unlocked={userDoc?.badges?.includes('Community Watch')} progress={userDoc?.verificationsGiven || 0} total={10} />
                  <BadgeIcon name="Ward Guardian" description="Top 3 in your ward" Icon={Shield} unlocked={userDoc?.badges?.includes('Ward Guardian')} progress={userDoc?.badges?.includes('Ward Guardian') ? 1 : 0} total={1} />
                </div>
              </div>

              {resolvedReports.length > 0 && (
                <div className="bg-surface border border-border rounded-xl p-gutter">
                  <h3 className="font-headline-sm text-headline-sm text-ink mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sage">workspace_premium</span>
                    Citizen Impact Receipts
                  </h3>
                  <p className="font-body-md text-muted mb-6">Real-world improvements initiated by your reports.</p>
                  
                  <div className="space-y-4">
                    {resolvedReports.map(r => (
                      <div key={r.id} className="border border-border rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start bg-surface">
                        <CategoryIcon category={r.category} size={24} />
                        <div className="flex-1">
                          <p className="font-label-md font-bold text-ink capitalize mb-1">{r.category?.replace('_',' ')} fixed in {r.wardId?.replace(/ward(\d+)/i, 'Ward $1') || 'your area'}</p>
                          <p className="font-body-sm text-muted line-clamp-2">{r.summary || r.description}</p>
                          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-sage/10 text-sage rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
                            <span className="material-symbols-outlined text-[14px]">task_alt</span> Verified Impact
                          </div>
                        </div>
                        {r.imageUrl && (
                           <img src={r.imageUrl} alt="Issue" className="w-24 h-24 object-cover rounded-lg border border-border shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-surface border border-border rounded-xl p-gutter">
                 <h3 className="font-headline-sm text-headline-sm text-ink mb-4">Reporting History</h3>
                 {loadingReports ? (
                   <p className="text-muted py-4">Loading history...</p>
                 ) : myReports.length === 0 ? (
                   <p className="text-muted py-4">You haven't filed any reports yet. <Link to="/report/new" className="text-navy hover:underline">File your first report.</Link></p>
                 ) : (
                   <div className="divide-y divide-outline-variant">
                     {myReports.map(r => (
                       <div key={r.id} className="py-4 flex justify-between items-center">
                         <div>
                           <p className="font-label-md text-ink capitalize mb-1">{r.category?.replace('_',' ')}</p>
                           <p className="font-caption text-xs text-muted">{r.createdAt?.toDate?.() ? format(r.createdAt.toDate(), 'MMM dd, yyyy') : 'Recently'}</p>
                         </div>
                         <StatusBadge status={r.status} />
                       </div>
                     ))}
                   </div>
                 )}
              </div>
            </div>
          )}

          {/* MY WARD */}
          {activeTab === 'ward' && (
            <div className="bg-surface border border-border rounded-xl p-gutter shadow-sm animate-fade-in">
              <h2 className="font-headline-sm text-headline-sm mb-2 text-ink">Ward Snapshot</h2>
              <p className="font-body-md text-muted mb-6">Stats for {userDoc?.wardId?.replace(/ward(\d+)/i, 'Ward $1') || 'your area'}</p>
              
              {wardInsight ? (
                <div className="space-y-6">
                   <div className="bg-surface border border-navy-fixed-dim p-4 rounded-xl flex items-center justify-between">
                     <div>
                       <h3 className="font-label-md font-bold text-ink uppercase tracking-wider text-[11px] mb-1">Ward Trust Score</h3>
                       <p className="font-body-md text-muted text-sm">Based on official commitment honoring rates.</p>
                     </div>
                     <div className="font-display-lg text-navy">{wardInsight.trustScore?.currentScore || 'A-'}</div>
                   </div>
                   
                   <div className="bg-sage/10/50 border border-sage p-4 rounded-xl">
                     <h3 className="font-label-md font-bold text-ink uppercase tracking-wider text-[11px] mb-2">Community Note</h3>
                     <p className="font-body-sm text-sm text-ink leading-relaxed">{wardInsight.equityWatch?.text || 'No active community alerts for your ward right now.'}</p>
                   </div>
                </div>
              ) : (
                <div className="bg-surface border border-border p-6 rounded-xl text-center">
                  <span className="material-symbols-outlined text-muted text-4xl mb-2">map</span>
                  <p className="text-muted font-body-md">Ward analytics are not available right now. We are still collecting data for your area.</p>
                </div>
              )}
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="bg-surface border border-border rounded-xl p-gutter shadow-sm animate-fade-in">
              <h2 className="font-headline-sm text-headline-sm mb-6 text-ink">Notifications</h2>
              <div className="space-y-4">
                <div className="bg-surface border border-border p-4 rounded-lg flex gap-4 items-start opacity-70">
                   <div className="w-8 h-8 rounded-full bg-navy/10 text-navy flex items-center justify-center shrink-0">
                     <span className="material-symbols-outlined text-[16px]">campaign</span>
                   </div>
                   <div>
                     <p className="font-label-md text-ink">Welcome to CivicConnect!</p>
                     <p className="text-sm text-muted mt-0.5">Start by filing your first report or verifying an issue in your ward.</p>
                     <p className="text-xs text-muted mt-2">Just now</p>
                   </div>
                </div>
                {resolvedReports.length > 0 && (
                   <div className="bg-surface border border-border p-4 rounded-lg flex gap-4 items-start">
                     <div className="w-8 h-8 rounded-full bg-sage/10 text-sage flex items-center justify-center shrink-0">
                       <span className="material-symbols-outlined text-[16px]">check_circle</span>
                     </div>
                     <div>
                       <p className="font-label-md text-ink">Your report was resolved!</p>
                       <p className="text-sm text-muted mt-0.5">The {resolvedReports[0].category.replace('_',' ')} issue you reported has been officially fixed. Thank you for making an impact!</p>
                       <p className="text-xs text-muted mt-2">Recently</p>
                     </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACCOUNT & PRIVACY */}
          {activeTab === 'account' && (
            <div className="bg-surface border border-border rounded-xl p-gutter shadow-sm animate-fade-in space-y-8">
              
              <section>
                <h2 className="font-headline-sm text-headline-sm mb-2 text-ink">Account Settings</h2>
                <p className="font-body-md text-muted mb-6 text-sm">Manage your security and privacy.</p>
                
                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-sm">
                  <div>
                    <label className="block font-label-md text-label-md text-ink mb-1">New Password</label>
                    <input type="password" value={passwordForm.newPassword} onChange={e=>setPasswordForm({newPassword:e.target.value})} className="w-full rounded-lg border border-border p-3 focus:border-navy focus:outline-none" required />
                  </div>
                  <button type="submit" className="bg-paper text-muted h-10 px-4 rounded-lg font-bold hover:bg-surface transition-colors text-sm">
                    Update Password
                  </button>
                </form>
              </section>

              <hr className="border-border" />

              <section>
                <h3 className="font-label-md font-bold text-ink mb-2">Data Transparency</h3>
                <p className="font-body-sm text-muted text-sm leading-relaxed max-w-xl">
                  We store your name, email, phone number, and address strictly for verification and assigning you to the correct ward. Your identity is <strong>never</strong> shared publicly on reports. Only aggregate analytics and anonymous issues are shown to the community.
                </p>
              </section>

              <hr className="border-border" />

              <section>
                <h3 className="font-label-md font-bold text-terracotta mb-2">Danger Zone</h3>
                <p className="font-body-sm text-muted text-sm mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                <button onClick={handleDeleteAccount} disabled={isDeleting} className="bg-terracotta/10 text-terracotta h-10 px-4 rounded-lg font-bold hover:bg-terracotta/20 transition-colors text-sm border border-terracotta disabled:opacity-50">
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </section>

            </div>
          )}

        </section>
      </div>
    </main>
  );
}
