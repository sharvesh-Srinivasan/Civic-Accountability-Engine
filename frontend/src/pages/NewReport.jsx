import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function NewReport() {
  const { user, userDoc, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Form State
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [city, setCity] = useState('');
  const [wardId, setWardId] = useState('');
  const [wards, setWards] = useState([]);
  const [cities, setCities] = useState([]);

  // Loading/Processing State
  const [locLoading, setLocLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [classification, setClassification] = useState(null);
  const [severity, setSeverity] = useState('medium');
  const [nearbyReports, setNearbyReports] = useState([]);

  // Voice to text
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        setIsRecording(false);
        const toastId = toast.loading('Analyzing voice with AI...');
        try {
          const res = await api.post('/api/reports/parse-voice', { transcript });
          toast.success('Voice analyzed! Form auto-filled.', { id: toastId });
          if (res.data.category && res.data.category !== 'other') setCategory(res.data.category);
          if (res.data.description) setDescription(res.data.description);
          else setDescription(transcript);
        } catch (err) {
          toast.error('Failed to analyze voice', { id: toastId });
          setDescription(transcript);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        setIsRecording(false);
        toast.error('Microphone error: ' + event.error);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
       toast.error('Speech recognition not supported in this browser.');
       return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast('Listening...', { icon: '🎙️' });
      } catch (err) {
        toast.error('Microphone is already listening');
      }
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    let unsub = () => {};
    const loadWards = async () => {
      try {
        if (!db) return;
        const { onSnapshot, query, collection } = await import('firebase/firestore');
        unsub = onSnapshot(query(collection(db, 'wards')), (snap) => {
          const fetchedWards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setWards(fetchedWards);
          const uniqueCities = Array.from(new Set(fetchedWards.map(w => w.city).filter(Boolean))).sort();
          setCities(uniqueCities);
        });
      } catch (err) {
        console.error('Failed to load wards from Firestore:', err);
      }
    };
    loadWards();
    return () => unsub();
  }, []);

  useEffect(() => {
    if (userDoc) {
      if (userDoc.lat && !lat) setLat(userDoc.lat);
      if (userDoc.lng && !lng) setLng(userDoc.lng);
      if (userDoc.wardId && !wardId) setWardId(userDoc.wardId);
    }
  }, [userDoc]);

  // Image compression
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          } catch (e) {
            reject(new Error('Failed to compress image properly.'));
          }
        };
        img.onerror = () => reject(new Error('Browser could not process this image format. Try a JPG or PNG.'));
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error('File must be under 20 MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const getLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not available'); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocLoading(false);
        toast.success('Location captured');
      },
      () => { toast.error('Could not get location'); setLocLoading(false); }
    );
  };

  // Nav Handlers
  const handleNext = async () => {
    if (step === 1 && !category) { toast.error('Please select a category'); return; }
    if (step === 2 && !description) { toast.error('Please provide a description'); return; }
    
    if (step === 3) {
      if (!wardId) { toast.error('Please select a ward'); return; }
      
      setUploading(true);
      let url = '';
      if (imageFile) {
        try { url = await compressImage(imageFile); }
        catch (err) { 
          toast.error(err.message || 'Image processing failed'); 
          setUploading(false); 
          return; 
        }
      }
      
      // Try AI classification with a 30-second window (backend may cold-start)
      let wakeupToastId;
      const classifyTimer = setTimeout(() => {
        wakeupToastId = toast.loading('Waking up AI service… this may take up to 30s on first use.', { duration: 30000 });
      }, 3000);

      try {
        const res = await api.post('/api/reports/classify', { imageUrl: url, description }, { timeout: 30000 });
        clearTimeout(classifyTimer);
        if (wakeupToastId) toast.dismiss(wakeupToastId);
        
        setClassification(res.data);
        if (res.data.severity) setSeverity(res.data.severity);
        
        try {
          const nearbyRes = await api.get(`/api/reports/nearby/search?wardId=${wardId}&category=${category}`, { timeout: 10000 });
          setNearbyReports(nearbyRes.data || []);
        } catch (err) { /* Nearby check is non-critical */ }
      } catch (err) {
        clearTimeout(classifyTimer);
        if (wakeupToastId) toast.dismiss(wakeupToastId);
        // Fallback to manual mode if AI fails
        setClassification({
          humanReadable: 'AI classification unavailable. Please verify manually.',
          summary: description,
          reasoning: 'Fallback mode triggered due to AI timeout or error.',
          confidence: 0
        });
        toast('AI unavailable — you can still submit manually.', { icon: 'ℹ️' });
      }
      setUploading(false);
    }
    
    if (step === 4) {
      setSubmitting(true);
      let url = '';
      if (imageFile) {
        try { url = await compressImage(imageFile); } catch (err) { console.error(err); }
      }

      // If user didn't provide location, fallback to profile location, then to 0.
      // Add a tiny random jitter so multiple reports at the exact same location don't perfectly overlap
      const jitter = () => (Math.random() - 0.5) * 0.002;
      const finalLat = parseFloat(lat || userDoc?.lat || 0) + jitter();
      const finalLng = parseFloat(lng || userDoc?.lng || 0) + jitter();

      const reportPayload = {
        category, severity, description, imageUrl: url,
        lat: finalLat, lng: finalLng, wardId,
        summary: classification?.summary || description,
        humanReadable: classification?.humanReadable || '',
        reasoning: classification?.reasoning || '',
        confidence: classification?.confidence || 0,
      };

      let submitted = false;

      // Try the backend first (30s timeout)
      let wakeupToastId;
      const submitTimer = setTimeout(() => {
        wakeupToastId = toast.loading('Connecting to backend… please wait.', { duration: 30000 });
      }, 2000);

      try {
        await api.post('/api/reports', reportPayload, { timeout: 30000 });
        clearTimeout(submitTimer);
        if (wakeupToastId) toast.dismiss(wakeupToastId);
        submitted = true;
      } catch (err) {
        clearTimeout(submitTimer);
        if (wakeupToastId) toast.dismiss(wakeupToastId);
        console.warn('Backend submission failed, falling back to Firestore direct write:', err.message);
      }

      // Firestore fallback — always works even if backend is down
      if (!submitted) {
        try {
          await addDoc(collection(db, 'reports'), {
            ...reportPayload,
            reporterId: user.uid,
            reporterName: user.displayName || 'Citizen',
            status: 'open',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          submitted = true;
          toast.success('Evidence added to the Public Ledger! (Direct mode)');
        } catch (firestoreErr) {
          console.error('Firestore fallback also failed:', firestoreErr);
          toast.error('Submission failed. Check your internet connection and try again.');
          setSubmitting(false);
          return;
        }
      } else {
        toast.success('Evidence added to the Public Ledger!');
      }

      // Reset form
      setStep(1);
      setCategory('');
      setDescription('');
      setImageFile(null);
      setImagePreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setClassification(null);
      setNearbyReports([]);
      setSubmitting(false);

      navigate('/my-reports');
      return;
    }
    setStep(s => s + 1);
  };

  const handleMerge = async (existingId) => {
    try {
      setSubmitting(true);
      await api.post(`/api/reports/${existingId}/confirm`, { lat: parseFloat(lat), lng: parseFloat(lng) });
      toast.success('Merged! Your evidence was added to the existing public record.');
      navigate('/');
    } catch {
      toast.error("Couldn't merge evidence.");
      setSubmitting(false);
    }
  };

  const categories = [
    { id: 'pothole', icon: 'warning', label: 'Pothole' },
    { id: 'streetlight', icon: 'lightbulb', label: 'Street Light' },
    { id: 'garbage', icon: 'delete', label: 'Trash/Debris' },
    { id: 'graffiti', icon: 'brush', label: 'Graffiti' },
    { id: 'water_leak', icon: 'water_drop', label: 'Water Leak' },
    { id: 'other', icon: 'more_horiz', label: 'Other' },
  ];

  if (authLoading || !user) {
    return <div className="flex-1 flex justify-center items-center h-screen bg-paper"><span className="material-symbols-outlined animate-spin text-navy text-4xl">sync</span></div>;
  }

  return (
    <main className="flex-1 md:ml-72 flex flex-col items-center p-margin-mobile md:p-margin-desktop py-stack-lg bg-transparent text-ink min-h-screen pt-28 font-body-md relative z-10">
      <div className="w-full max-w-3xl glass-panel rounded-[3rem] p-8 md:p-12 shadow-[0_8px_40px_rgba(31,38,135,0.12)]">
        
        <header className="mb-stack-lg border-b border-white/20 pb-stack-md flex justify-between items-center">
          <div>
            <h1 className="font-serif text-4xl text-navy font-bold tracking-tight">Add Evidence</h1>
            <p className="font-body-md text-muted mt-1">Submit factual proof of a civic issue for the public record.</p>
          </div>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted hover:text-navy transition-colors font-label-md text-label-md p-2 rounded-lg hover:bg-paper">
            <span className="material-symbols-outlined">close</span>
            <span className="hidden md:inline">Cancel</span>
          </button>
        </header>

        {/* Animated Timeline */}
        <div className="mb-12 px-2 md:px-8 pt-4">
          <div className="flex items-center justify-between w-full relative">
            
            {/* Background Track spanning from center of first node to center of last node */}
            <div className="absolute left-[20px] right-[20px] top-5 -translate-y-1/2 h-1 bg-border -z-10">
              {/* Animated Fill Track */}
              <div 
                className="h-full bg-navy transition-all duration-700 ease-in-out"
                style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
              />
            </div>

            {['Category', 'Details', 'Location', 'Confirm'].map((label, idx) => {
              const isActive = step === idx + 1;
              const isCompleted = step > idx + 1;

              return (
                <div key={idx} className="flex flex-col items-center relative z-10 shrink-0">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-label-md transition-all duration-500 ease-out border-2 
                      ${isCompleted ? 'bg-navy border-navy text-white shadow-md' : 
                        isActive ? 'bg-surface border-navy text-navy shadow-[0_0_0_4px_rgba(22,40,74,0.15)] scale-110' : 
                        'bg-surface border-border text-muted scale-95'}`}
                  >
                    {isCompleted ? <span className="material-symbols-outlined text-[20px] animate-fade-in-up">check</span> : idx + 1}
                  </div>
                  {/* Step Label */}
                  <span 
                    className={`absolute top-12 whitespace-nowrap font-label-md text-[10px] md:text-xs uppercase tracking-wider transition-all duration-300 
                      ${isActive ? 'text-navy font-bold translate-y-0 opacity-100' : 
                        isCompleted ? 'text-ink translate-y-0 opacity-100' : 'text-muted opacity-60 translate-y-1'}`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Forms */}
        <div className="relative min-h-[400px]">
          
          {/* Step 1: Category */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="font-headline-md text-headline-md mb-stack-md">Select a Category</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-stack-md">
                {categories.map(c => (
                  <label key={c.id} className={`relative flex flex-col items-center p-stack-md rounded-3xl border cursor-pointer transition-all duration-300 hover:-translate-y-1 ${category === c.id ? 'border-navy bg-navy/10 shadow-glow-navy text-navy' : 'border-white/40 glass-panel text-ink hover:shadow-glass'}`}>
                    <input type="radio" name="category" value={c.id} checked={category === c.id} onChange={(e) => setCategory(e.target.value)} className="sr-only" />
                    <span className={`material-symbols-outlined text-4xl mb-1 ${category === c.id ? 'text-navy' : 'text-muted'}`}>{c.icon}</span>
                    <span className="font-label-md text-label-md text-center font-bold">{c.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="font-headline-md text-headline-md mb-stack-md">Provide Details</h2>
              <div className="space-y-stack-md">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-label-md text-label-md text-ink">Description <span className="text-terracotta">*</span></label>
                    <button type="button" onClick={toggleRecording} className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border transition-colors ${isRecording ? 'bg-terracotta text-white border-terracotta animate-pulse shadow-[0_0_10px_rgba(217,119,87,0.5)]' : 'bg-surface text-navy border-navy hover:bg-navy/10'}`}>
                      <span className="material-symbols-outlined text-[14px]">{isRecording ? 'mic_none' : 'mic'}</span>
                      {isRecording ? 'Listening...' : 'Voice AI'}
                    </button>
                  </div>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} required className={`w-full rounded-2xl border ${!description && step === 2 ? 'border-terracotta bg-terracotta/10/10' : 'border-white/40 bg-white/40'} p-4 font-body-md focus:border-navy focus:ring-1 focus:ring-navy focus:outline-none shadow-inner`} rows="4" placeholder="Describe the issue in detail..." />
                  {!description && step === 2 && <p className="text-terracotta text-xs mt-1">Description is required.</p>}
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-ink mb-1">Photo Upload (Optional)</label>
                  {imagePreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-white/40 shadow-glass">
                      <img src={imagePreview} className="w-full h-48 object-cover" alt="Preview" />
                      <button onClick={() => {setImagePreview(''); setImageFile(null);}} className="absolute top-2 right-2 bg-white/80 text-terracotta p-1 rounded-lg hover:bg-white shadow-sm backdrop-blur-sm"><span className="material-symbols-outlined">delete</span></button>
                    </div>
                  ) : (
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-navy/30 rounded-3xl p-stack-md flex flex-col items-center justify-center bg-white/20 hover:bg-white/40 transition-colors cursor-pointer shadow-inner hover:shadow-glass">
                      <span className="material-symbols-outlined text-4xl text-navy/60 mb-2">cloud_upload</span>
                      <span className="font-label-md text-label-md text-navy font-bold">Click to upload photo</span>
                      <span className="font-caption text-caption text-muted mt-1">JPG, PNG (max. 20MB)</span>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div className="animate-fade-in space-y-6">
              <h2 className="font-headline-md text-headline-md mb-stack-md">Pinpoint Location</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                <div>
                  <label className="block font-label-md text-label-md text-ink mb-1">City <span className="text-terracotta">*</span></label>
                  <select value={city} onChange={e => { setCity(e.target.value); setWardId(''); }} required className="w-full rounded-2xl border border-white/40 bg-white/40 p-4 font-body-md focus:border-navy focus:ring-1 focus:ring-navy focus:outline-none shadow-inner">
                    <option value="">Select your city</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-ink mb-1">Ward / Area <span className="text-terracotta">*</span></label>
                  <select value={wardId} onChange={e => setWardId(e.target.value)} required disabled={!city} className="w-full rounded-2xl border border-white/40 bg-white/40 p-4 font-body-md focus:border-navy focus:ring-1 focus:ring-navy focus:outline-none disabled:opacity-50 shadow-inner">
                    <option value="">{city ? "Select your ward" : "Select a city first"}</option>
                    {wards.filter(w => w.city === city).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-label-md text-label-md text-ink mb-1">Coordinates (Optional)</label>
                <div className="flex gap-2">
                  <input type="number" value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude" className="w-full rounded-lg border border-border bg-surface p-3 focus:border-navy focus:outline-none" />
                  <input type="number" value={lng} onChange={e => setLng(e.target.value)} placeholder="Longitude" className="w-full rounded-lg border border-border bg-surface p-3 focus:border-navy focus:outline-none" />
                  <button onClick={getLocation} disabled={locLoading} className="bg-paper text-muted px-4 rounded-lg hover:bg-surface flex items-center justify-center">
                    {locLoading ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">my_location</span>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div className="animate-fade-in space-y-6">
              <h2 className="font-headline-md text-headline-md mb-stack-md">Review & Submit</h2>
              
              {uploading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="material-symbols-outlined animate-spin text-navy text-4xl mb-4">sync</span>
                  <p className="font-label-md text-navy">AI is classifying your evidence...</p>
                </div>
              )}
              
              {!uploading && (
                <>
                  {nearbyReports.length > 0 && (
                    <div className="bg-terracotta/10 text-terracotta p-4 rounded-lg border border-terracotta mb-4">
                      <div className="flex gap-2 font-bold mb-2">
                        <span className="material-symbols-outlined">warning</span>
                        {nearbyReports.length} people nearby provided similar evidence
                      </div>
                      <div className="space-y-2">
                        {nearbyReports.map(nr => (
                          <div key={nr.id} className="bg-surface p-3 rounded flex justify-between items-center text-sm">
                            <span className="truncate flex-1 pr-4">{nr.summary || nr.description}</span>
                            <button onClick={() => handleMerge(nr.id)} className="bg-terracotta text-white px-3 py-1 rounded text-xs font-bold whitespace-nowrap">Add my voice</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="glass-panel p-6 rounded-3xl border border-white/40 shadow-glass">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-label-md font-bold text-navy uppercase tracking-wider">AI Assessment</h3>
                      <div className="group relative cursor-help flex items-center justify-center">
                        <span className="material-symbols-outlined text-muted text-[18px]">info</span>
                        <div className="absolute right-0 top-full mt-2 w-64 bg-navy text-white text-xs p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                          Our Civic AI (Gemini) analyzes the visual evidence in your photo to automatically categorize the issue and determine its severity based on proximity to hazards or infrastructure.
                        </div>
                      </div>
                    </div>
                    <p className="font-body-lg text-ink mb-2 font-bold">{classification?.humanReadable || 'Evidence Ready for Ledger'}</p>
                    <p className="font-body-md text-muted mb-4">{classification?.reasoning}</p>
                    <div className="flex gap-2 mb-2">
                      <span className="bg-navy/10 text-navy px-3 py-1.5 rounded-full font-bold text-xs uppercase shadow-sm">{category}</span>
                      
                      {classification?.confidence === 0 ? (
                        <select 
                          value={severity} 
                          onChange={(e) => setSeverity(e.target.value)}
                          className="bg-sage/10 text-sage px-3 py-1.5 rounded-full font-bold text-xs uppercase cursor-pointer border-0 outline-none focus:ring-2 focus:ring-secondary shadow-sm"
                        >
                          <option value="low">Low Severity</option>
                          <option value="medium">Medium Severity</option>
                          <option value="high">High Severity</option>
                        </select>
                      ) : (
                        <span className="bg-sage/10 text-sage px-3 py-1.5 rounded-full font-bold text-xs uppercase shadow-sm">{severity} Severity</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        {/* Footer Nav */}
        <div className="mt-stack-lg pt-stack-md border-t border-border flex justify-between items-center">
          <button onClick={() => setStep(s => s - 1)} className={`px-6 h-12 border border-border text-ink font-label-md text-label-md rounded-lg hover:bg-surface transition-colors ${step === 1 ? 'invisible' : ''}`}>Back</button>
          <button onClick={handleNext} disabled={uploading || submitting} className="px-6 h-12 bg-navy text-white font-label-md text-label-md rounded-lg hover:bg-surface-tint transition-colors ml-auto flex items-center gap-2">
            {submitting ? <span className="material-symbols-outlined animate-spin">sync</span> : (step === 4 ? 'Submit' : 'Continue')}
          </button>
        </div>

      </div>
    </main>
  );
}
