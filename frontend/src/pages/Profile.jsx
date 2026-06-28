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

export default function Profile() {
  const { user, userDoc, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  
  // Data
  const [myReports, setMyReports] = useState([]);
  const [wardInsight, setWardInsight] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);

  // Forms
  const [details, setDetails] = useState({
    displayName: '',
    phone: '',
    address: '',
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
      // Basic auto-assignment logic stub if address changes (in reality calls backend)
      let wardId = userDoc.wardId;
      if (details.address !== userDoc.address) {
         try {
           const res = await api.get('/api/wards');
           if (res.data?.length > 0) wardId = res.data[0].id;
         } catch {}
      }
      
      await setDoc(doc(db, 'users', user.uid), {
        ...details,
        wardId
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
      toast.error('Failed to delete account. Please sign in again and try.');
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
    <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto overflow-x-hidden pt-20 md:pt-margin-desktop bg-background text-on-background min-h-screen font-body-md">
      
      <header className="mb-stack-lg">
        <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">My Profile</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">Manage your civic identity and view your impact.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Tabs */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 border-b md:border-b-0 border-outline-variant">
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
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-label-md text-label-md whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
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
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter shadow-sm animate-fade-in">
              <h2 className="font-headline-sm text-headline-sm mb-6 text-on-surface">Personal Details</h2>
              <form onSubmit={handleSaveDetails} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1">Display Name</label>
                    <input type="text" value={details.displayName} onChange={e=>setDetails({...details, displayName:e.target.value})} className="w-full rounded-lg border border-outline-variant p-3 focus:border-primary focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1">Phone Number</label>
                    <input type="tel" value={details.phone} onChange={e=>setDetails({...details, phone:e.target.value})} className="w-full rounded-lg border border-outline-variant p-3 focus:border-primary focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-1">Residential Address</label>
                  <textarea value={details.address} onChange={e=>setDetails({...details, address:e.target.value})} className="w-full rounded-lg border border-outline-variant p-3 focus:border-primary focus:outline-none" rows="3" placeholder="Enter your full address" />
                  <p className="text-xs text-on-surface-variant mt-1">Changing this will automatically update your assigned Ward.</p>
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-3">Interests (For personalized alerts)</label>
                  <div className="flex flex-wrap gap-2">
                    {['pothole', 'streetlight', 'garbage', 'water_leak'].map(cat => (
                      <button type="button" key={cat} onClick={() => toggleCategory(cat)} className={`px-4 py-2 rounded-full font-label-md text-xs uppercase tracking-wider font-bold border transition-colors ${details.preferredCategories.includes(cat) ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container text-on-surface-variant border-outline-variant'}`}>
                        {cat.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-outline-variant flex justify-end">
                  <button type="submit" disabled={isSavingDetails} className="bg-primary text-on-primary h-12 px-6 rounded-lg font-bold hover:bg-primary-container transition-colors disabled:opacity-50">
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
                <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl text-center">
                  <div className="font-display-md text-primary">{myReports.length}</div>
                  <div className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider">Reports Filed</div>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl text-center">
                  <div className="font-display-md text-secondary">{resolvedReports.length}</div>
                  <div className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider">Resolved</div>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl text-center">
                  <div className="font-display-md text-on-surface">{userDoc?.verifiedReports || 0}</div>
                  <div className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider">Verified</div>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
                  <div className="font-display-md text-primary">{userDoc?.civicPoints || 0}</div>
                  <div className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider">Civic Score</div>
                </div>
              </div>

              {resolvedReports.length > 0 && (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">workspace_premium</span>
                    Citizen Impact Receipts
                  </h3>
                  <p className="font-body-md text-on-surface-variant mb-6">Real-world improvements initiated by your reports.</p>
                  
                  <div className="space-y-4">
                    {resolvedReports.map(r => (
                      <div key={r.id} className="border border-outline-variant rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start bg-surface-container-low">
                        <CategoryIcon category={r.category} size={24} />
                        <div className="flex-1">
                          <p className="font-label-md font-bold text-on-surface capitalize mb-1">{r.category?.replace('_',' ')} fixed in {r.wardId?.replace(/ward(\d+)/i, 'Ward $1') || 'your area'}</p>
                          <p className="font-body-sm text-on-surface-variant line-clamp-2">{r.summary || r.description}</p>
                          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
                            <span className="material-symbols-outlined text-[14px]">task_alt</span> Verified Impact
                          </div>
                        </div>
                        {r.imageUrl && (
                           <img src={r.imageUrl} alt="Issue" className="w-24 h-24 object-cover rounded-lg border border-outline-variant shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter">
                 <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">Reporting History</h3>
                 {loadingReports ? (
                   <p className="text-on-surface-variant py-4">Loading history...</p>
                 ) : myReports.length === 0 ? (
                   <p className="text-on-surface-variant py-4">You haven't filed any reports yet. <Link to="/report/new" className="text-primary hover:underline">File your first report.</Link></p>
                 ) : (
                   <div className="divide-y divide-outline-variant">
                     {myReports.map(r => (
                       <div key={r.id} className="py-4 flex justify-between items-center">
                         <div>
                           <p className="font-label-md text-on-surface capitalize mb-1">{r.category?.replace('_',' ')}</p>
                           <p className="font-caption text-xs text-on-surface-variant">{r.createdAt?.toDate?.() ? format(r.createdAt.toDate(), 'MMM dd, yyyy') : 'Recently'}</p>
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
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter shadow-sm animate-fade-in">
              <h2 className="font-headline-sm text-headline-sm mb-2 text-on-surface">Ward Snapshot</h2>
              <p className="font-body-md text-on-surface-variant mb-6">Stats for {userDoc?.wardId?.replace(/ward(\d+)/i, 'Ward $1') || 'your area'}</p>
              
              {wardInsight ? (
                <div className="space-y-6">
                   <div className="bg-surface-container-low border border-primary-fixed-dim p-4 rounded-xl flex items-center justify-between">
                     <div>
                       <h3 className="font-label-md font-bold text-on-surface uppercase tracking-wider text-[11px] mb-1">Ward Trust Score</h3>
                       <p className="font-body-md text-on-surface-variant text-sm">Based on official commitment honoring rates.</p>
                     </div>
                     <div className="font-display-lg text-primary">{wardInsight.trustScore?.currentScore || 'A-'}</div>
                   </div>
                   
                   <div className="bg-secondary-container/50 border border-secondary p-4 rounded-xl">
                     <h3 className="font-label-md font-bold text-on-surface uppercase tracking-wider text-[11px] mb-2">Community Note</h3>
                     <p className="font-body-sm text-sm text-on-surface leading-relaxed">{wardInsight.equityWatch?.text || 'No active community alerts for your ward right now.'}</p>
                   </div>
                </div>
              ) : (
                <div className="bg-surface-container-low border border-outline-variant p-6 rounded-xl text-center">
                  <span className="material-symbols-outlined text-outline text-4xl mb-2">map</span>
                  <p className="text-on-surface-variant font-body-md">Ward analytics are not available right now. We are still collecting data for your area.</p>
                </div>
              )}
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter shadow-sm animate-fade-in">
              <h2 className="font-headline-sm text-headline-sm mb-6 text-on-surface">Notifications</h2>
              <div className="space-y-4">
                <div className="bg-surface-container-low border border-outline-variant p-4 rounded-lg flex gap-4 items-start opacity-70">
                   <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                     <span className="material-symbols-outlined text-[16px]">campaign</span>
                   </div>
                   <div>
                     <p className="font-label-md text-on-surface">Welcome to CivicConnect!</p>
                     <p className="text-sm text-on-surface-variant mt-0.5">Start by filing your first report or verifying an issue in your ward.</p>
                     <p className="text-xs text-outline mt-2">Just now</p>
                   </div>
                </div>
                {resolvedReports.length > 0 && (
                   <div className="bg-surface-container-low border border-outline-variant p-4 rounded-lg flex gap-4 items-start">
                     <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                       <span className="material-symbols-outlined text-[16px]">check_circle</span>
                     </div>
                     <div>
                       <p className="font-label-md text-on-surface">Your report was resolved!</p>
                       <p className="text-sm text-on-surface-variant mt-0.5">The {resolvedReports[0].category.replace('_',' ')} issue you reported has been officially fixed. Thank you for making an impact!</p>
                       <p className="text-xs text-outline mt-2">Recently</p>
                     </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACCOUNT & PRIVACY */}
          {activeTab === 'account' && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter shadow-sm animate-fade-in space-y-8">
              
              <section>
                <h2 className="font-headline-sm text-headline-sm mb-2 text-on-surface">Account Settings</h2>
                <p className="font-body-md text-on-surface-variant mb-6 text-sm">Manage your security and privacy.</p>
                
                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-sm">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1">New Password</label>
                    <input type="password" value={passwordForm.newPassword} onChange={e=>setPasswordForm({newPassword:e.target.value})} className="w-full rounded-lg border border-outline-variant p-3 focus:border-primary focus:outline-none" required />
                  </div>
                  <button type="submit" className="bg-surface-variant text-on-surface-variant h-10 px-4 rounded-lg font-bold hover:bg-surface-container-high transition-colors text-sm">
                    Update Password
                  </button>
                </form>
              </section>

              <hr className="border-outline-variant" />

              <section>
                <h3 className="font-label-md font-bold text-on-surface mb-2">Data Transparency</h3>
                <p className="font-body-sm text-on-surface-variant text-sm leading-relaxed max-w-xl">
                  We store your name, email, phone number, and address strictly for verification and assigning you to the correct ward. Your identity is <strong>never</strong> shared publicly on reports. Only aggregate analytics and anonymous issues are shown to the community.
                </p>
              </section>

              <hr className="border-outline-variant" />

              <section>
                <h3 className="font-label-md font-bold text-error mb-2">Danger Zone</h3>
                <p className="font-body-sm text-on-surface-variant text-sm mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                <button onClick={handleDeleteAccount} disabled={isDeleting} className="bg-error-container text-on-error-container h-10 px-4 rounded-lg font-bold hover:bg-error/20 transition-colors text-sm border border-error disabled:opacity-50">
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
