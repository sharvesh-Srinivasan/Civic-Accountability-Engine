import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function NewReport() {
  const { user, userDoc } = useAuth();
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
  const [wardId, setWardId] = useState('');
  const [wards, setWards] = useState([]);

  // Loading/Processing State
  const [locLoading, setLocLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [classification, setClassification] = useState(null);
  const [severity, setSeverity] = useState('medium');
  const [nearbyReports, setNearbyReports] = useState([]);

  useEffect(() => {
    api.get('/api/wards').then(r => setWards(r.data)).catch(() => {
      setWards([
        { id: 'ward1', name: 'Ward 1 - Downtown' },
        { id: 'ward2', name: 'Ward 2 - Westside' },
        { id: 'ward3', name: 'Ward 3 - Eastside' },
      ]);
      toast('Using offline ward list (API unreachable)', { icon: '⚠️' });
    });
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
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
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
      
      // Submit & Classify
      setUploading(true);
      let url = '';
      if (imageFile) {
        try { url = await compressImage(imageFile); }
        catch { toast.error('Image processing failed'); setUploading(false); return; }
      }
      
      try {
        const res = await api.post('/api/reports/classify', { imageUrl: url, description });
        setClassification(res.data);
        if (res.data.severity) setSeverity(res.data.severity);
        
        try {
          const nearbyRes = await api.get(`/api/reports/nearby/search?wardId=${wardId}&category=${category}`);
          setNearbyReports(nearbyRes.data || []);
        } catch (err) { console.error('Nearby check failed:', err); }
      } catch {
        setClassification({ humanReadable: 'Uncategorized infrastructure issue.' });
        toast('AI classification unavailable, proceeding with defaults.', { icon: 'ℹ️' });
      }
      setUploading(false);
    }
    
    if (step === 4) {
      setSubmitting(true);
      let url = '';
      if (imageFile) {
        try { url = await compressImage(imageFile); } catch {}
      }
      
      try {
        await api.post('/api/reports', {
          category, severity, description, imageUrl: url,
          lat: lat || 0, lng: lng || 0, wardId,
          summary: classification?.summary || description,
          humanReadable: classification?.humanReadable || '',
          reasoning: classification?.reasoning || '',
          confidence: classification?.confidence || 0,
        });
        toast.success('Report submitted successfully!');
        navigate('/my-reports');
      } catch (err) {
        toast.error('Submission failed. Please try again.');
        setSubmitting(false);
      }
      return;
    }
    setStep(s => s + 1);
  };

  const handleMerge = async (existingId) => {
    try {
      setSubmitting(true);
      await api.post(`/api/reports/${existingId}/confirm`, { lat: parseFloat(lat), lng: parseFloat(lng) });
      toast.success('Merged! Your voice was added to the existing report.');
      navigate('/');
    } catch {
      toast.error("Couldn't merge report.");
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

  return (
    <main className="flex-1 md:ml-64 flex flex-col items-center p-margin-mobile md:p-margin-desktop py-stack-lg bg-background text-on-background min-h-screen pt-24 font-body-md">
      <div className="w-full max-w-3xl bg-surface-container-lowest rounded-xl border border-outline-variant p-gutter shadow-sm">
        
        <header className="mb-stack-lg border-b border-outline-variant pb-stack-md flex justify-between items-center">
          <div>
            <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg">Report Issue</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Please provide details to help us resolve the problem.</p>
          </div>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-primary hover:text-primary-fixed-dim transition-colors font-label-md text-label-md">
            <span className="material-symbols-outlined">close</span>
            <span>Cancel</span>
          </button>
        </header>

        {/* Progress Bar */}
        <div className="mb-stack-lg">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-surface-container-high rounded-full -z-10"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full -z-10 transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
            
            {['Category', 'Details', 'Location', 'Confirm'].map((label, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1 bg-surface-container-lowest px-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md ${step > idx ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-high text-on-surface-variant border border-outline-variant'}`}>
                  {idx + 1}
                </div>
                <span className={`font-caption text-caption ${step > idx ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{label}</span>
              </div>
            ))}
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
                  <label key={c.id} className={`relative flex flex-col items-center p-stack-md rounded-lg border cursor-pointer transition-colors ${category === c.id ? 'border-primary bg-primary-fixed ring-2 ring-primary text-on-primary-fixed' : 'border-outline-variant hover:bg-surface-container-low text-on-surface'}`}>
                    <input type="radio" name="category" value={c.id} checked={category === c.id} onChange={(e) => setCategory(e.target.value)} className="sr-only" />
                    <span className={`material-symbols-outlined text-4xl mb-1 ${category === c.id ? 'text-primary' : 'text-on-surface-variant'}`}>{c.icon}</span>
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
                  <label className="block font-label-md text-label-md text-on-surface mb-1">Description *</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 font-body-md focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none" rows="4" placeholder="Describe the issue in detail..." />
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-1">Photo Upload (Optional)</label>
                  {imagePreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-outline-variant">
                      <img src={imagePreview} className="w-full h-48 object-cover" alt="Preview" />
                      <button onClick={() => {setImagePreview(''); setImageFile(null);}} className="absolute top-2 right-2 bg-surface text-on-surface p-1 rounded hover:bg-error-container hover:text-on-error-container"><span className="material-symbols-outlined">delete</span></button>
                    </div>
                  ) : (
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-outline-variant rounded-lg p-stack-md flex flex-col items-center justify-center bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">cloud_upload</span>
                      <span className="font-label-md text-label-md text-primary">Click to upload photo</span>
                      <span className="font-caption text-caption text-on-surface-variant mt-1">JPG, PNG (max. 20MB)</span>
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
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1">Ward / Area *</label>
                <select value={wardId} onChange={e => setWardId(e.target.value)} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 font-body-md focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Select your ward</option>
                  {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1">Coordinates (Optional)</label>
                <div className="flex gap-2">
                  <input type="number" value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude" className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 focus:border-primary focus:outline-none" />
                  <input type="number" value={lng} onChange={e => setLng(e.target.value)} placeholder="Longitude" className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 focus:border-primary focus:outline-none" />
                  <button onClick={getLocation} disabled={locLoading} className="bg-surface-variant text-on-surface-variant px-4 rounded-lg hover:bg-surface-container-high flex items-center justify-center">
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
                  <span className="material-symbols-outlined animate-spin text-primary text-4xl mb-4">sync</span>
                  <p className="font-label-md text-primary">AI is classifying your report...</p>
                </div>
              )}
              
              {!uploading && (
                <>
                  {nearbyReports.length > 0 && (
                    <div className="bg-error-container text-on-error-container p-4 rounded-lg border border-error mb-4">
                      <div className="flex gap-2 font-bold mb-2">
                        <span className="material-symbols-outlined">warning</span>
                        {nearbyReports.length} people nearby reported similar issues
                      </div>
                      <div className="space-y-2">
                        {nearbyReports.map(nr => (
                          <div key={nr.id} className="bg-surface-container-lowest p-3 rounded flex justify-between items-center text-sm">
                            <span className="truncate flex-1 pr-4">{nr.summary || nr.description}</span>
                            <button onClick={() => handleMerge(nr.id)} className="bg-error text-on-error px-3 py-1 rounded text-xs font-bold whitespace-nowrap">Add my voice</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-surface-container-low p-6 rounded-lg border border-outline-variant">
                    <h3 className="font-label-md text-primary mb-4 uppercase tracking-wider">AI Assessment</h3>
                    <p className="font-body-lg text-on-surface mb-2 font-bold">{classification?.humanReadable || 'Issue Ready for Submission'}</p>
                    <p className="font-body-md text-on-surface-variant mb-4">{classification?.reasoning}</p>
                    <div className="flex gap-2 mb-2">
                      <span className="bg-primary-fixed text-on-primary-fixed px-2 py-1 rounded font-bold text-xs uppercase">{category}</span>
                      <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded font-bold text-xs uppercase">{severity} Severity</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        {/* Footer Nav */}
        <div className="mt-stack-lg pt-stack-md border-t border-outline-variant flex justify-between items-center">
          <button onClick={() => setStep(s => s - 1)} className={`px-6 h-12 border border-outline-variant text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container-low transition-colors ${step === 1 ? 'invisible' : ''}`}>Back</button>
          <button onClick={handleNext} disabled={uploading || submitting} className="px-6 h-12 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-surface-tint transition-colors ml-auto flex items-center gap-2">
            {submitting ? <span className="material-symbols-outlined animate-spin">sync</span> : (step === 4 ? 'Submit' : 'Continue')}
          </button>
        </div>

      </div>
    </main>
  );
}
