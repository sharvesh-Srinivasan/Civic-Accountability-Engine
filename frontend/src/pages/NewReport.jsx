import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Camera, MapPin, CheckCircle, AlertTriangle, Lightbulb,
  Trash2, Droplets, HelpCircle, Edit2, LocateFixed, ChevronRight
} from 'lucide-react';
import { getCategoryConfig } from '../components/ReportCard';

/* ─── Category options ──────────────────────────────────── */
const CATEGORIES = [
  { value: 'pothole',     label: 'Pothole',     Icon: AlertTriangle },
  { value: 'streetlight', label: 'Streetlight', Icon: Lightbulb },
  { value: 'garbage',     label: 'Garbage',     Icon: Trash2 },
  { value: 'water_leak',  label: 'Water Leak',  Icon: Droplets },
  { value: 'other',       label: 'Other',       Icon: HelpCircle },
];

const SEVERITIES = [
  { value: 'low',    label: 'Low — minor or cosmetic',          color: 'border-yellow-300 text-yellow-700 bg-yellow-50' },
  { value: 'medium', label: 'Medium — ongoing inconvenience',   color: 'border-amber-300 text-amber-700 bg-amber-50' },
  { value: 'high',   label: 'High — safety risk or blockage',   color: 'border-red-300 text-red-700 bg-red-50' },
];

/* ─── Step indicator ────────────────────────────────────── */
function StepDots({ step, total = 3 }) {
  return (
    <div className="flex items-center gap-1.5 justify-center mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={
            i + 1 < step  ? 'step-dot-done'
            : i + 1 === step ? 'step-dot-active'
            : 'step-dot'
          }
        />
      ))}
    </div>
  );
}

/* ─── Main component ────────────────────────────────────── */
export default function NewReport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Step: 1 = photo+description, 2 = location+ward, 3 = AI confirm
  const [step, setStep] = useState(1);

  // Step 1 data
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isVideo, setIsVideo] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Step 2 data
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [wardId, setWardId] = useState('');
  const [wards, setWards] = useState([]);
  const [locLoading, setLocLoading] = useState(false);

  // Step 3 data (AI)
  const [classification, setClassification] = useState(null);
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [classifying, setClassifying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nearbyReports, setNearbyReports] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get('/api/wards').then(r => setWards(r.data)).catch(() => {
      setWards([
        { id: 'ward1', name: 'Ward 1 — Central' },
        { id: 'ward2', name: 'Ward 2 — East' },
        { id: 'ward3', name: 'Ward 3 — North' },
      ]);
    });
  }, []);

  useEffect(() => {
    if (userDoc) {
      if (userDoc.lat && !lat) setLat(userDoc.lat);
      if (userDoc.lng && !lng) setLng(userDoc.lng);
      if (userDoc.wardId && !wardId) setWardId(userDoc.wardId);
    }
  }, [userDoc]);

  /* ── Handlers ── */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error('File must be under 20 MB'); return; }

    const objectUrl = URL.createObjectURL(file);

    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = objectUrl;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      
      video.addEventListener('loadedmetadata', () => {
        video.currentTime = Math.min(0.5, video.duration / 2 || 0);
      });

      video.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const frameFile = new File([blob], "video_frame.jpg", { type: "image/jpeg" });
            setImageFile(frameFile);
          }
        }, 'image/jpeg', 0.8);
      });
      
      setImagePreview(objectUrl);
      setIsVideo(true);
    } else {
      setImageFile(file);
      setImagePreview(objectUrl);
      setIsVideo(false);
    }
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

  const uploadImage = async () => {
    if (!imageFile) return '';
    if (!storage) return '';
    const storageRef = ref(storage, `reports/${user.uid}/${Date.now()}_${imageFile.name}`);
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, imageFile);
      task.on('state_changed',
        snap => setUploadProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
        reject,
        async () => resolve(await getDownloadURL(task.snapshot.ref))
      );
    });
  };

  /* Step 1 → 2 */
  const goToStep2 = (e) => {
    e.preventDefault();
    if (!imageFile && !description.trim()) {
      toast.error('Add a photo or description to continue');
      return;
    }
    setStep(2);
    window.scrollTo(0, 0);
  };

  /* Step 2 → 3: upload + classify + nearby check */
  const goToStep3 = async (e) => {
    e.preventDefault();
    if (!wardId) { toast.error('Please select a ward'); return; }

    setUploading(true);
    let url = '';
    try { url = await uploadImage(); setImageUrl(url); }
    catch { toast.error('Image upload failed'); setUploading(false); return; }
    setUploading(false);

    setClassifying(true);
    try {
      const res = await api.post('/api/reports/classify', { imageUrl: url, description });
      setClassification(res.data);
      setCategory(res.data.category);
      setSeverity(res.data.severity);
      
      // Feature 4: Nearby/Duplicate Merge check
      try {
        const nearbyRes = await api.get(`/api/reports/nearby/search?wardId=${wardId}&category=${res.data.category}`);
        setNearbyReports(nearbyRes.data || []);
      } catch (err) {
        console.error('Nearby check failed:', err);
      }

    } catch {
      setClassification({ 
        category: 'other', 
        severity: 'medium', 
        summary: description, 
        humanReadable: 'Uncategorized infrastructure issue.', 
        reasoning: 'Fallback classification used due to system error.', 
        confidence: 0 
      });
      setCategory('other');
      setSeverity('medium');
      toast('AI classification unavailable — please confirm details below.', { icon: 'ℹ️' });
    }
    setClassifying(false);
    setStep(3);
    window.scrollTo(0, 0);
  };

  /* Final submit */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/api/reports', {
        category, severity, description, imageUrl,
        lat: lat || 0, lng: lng || 0, wardId,
        summary: classification?.summary || description,
        humanReadable: classification?.humanReadable || '',
        reasoning: classification?.reasoning || '',
        confidence: classification?.confidence || 0,
      });
      toast.success('Report submitted — thank you!');
      setDone(true);
      setTimeout(() => navigate('/my-reports'), 2200);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed — try again');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMerge = async (existingReportId) => {
    try {
      setSubmitting(true);
      await api.post(`/api/reports/${existingReportId}/confirm`, { lat: parseFloat(lat), lng: parseFloat(lng) });
      toast.success('Merged! Your voice was added to the existing report.');
      setDone(true);
      setTimeout(() => navigate('/'), 2200); // Redirect to dashboard
    } catch {
      toast.error("Couldn't merge report. Try again.");
      setSubmitting(false);
    }
  };

  /* ── Done screen ── */
  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center animate-slide-up">
        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-teal-600" />
        </div>
        <h2 className="font-serif text-2xl font-semibold text-ink-900 mb-2">Report logged</h2>
        <p className="text-sm text-ink-500">Redirecting…</p>
      </div>
    );
  }

  /* ── Classifying screen ── */
  if (classifying || uploading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-12 h-12 border-2 border-navy-200 border-t-navy-600 rounded-full
                        animate-spin mx-auto mb-4" />
        <p className="font-medium text-ink-700">
          {uploading ? `Uploading photo… ${uploadProgress}%` : 'AI is classifying your report…'}
        </p>
        <p className="text-sm text-ink-400 mt-1">This takes a few seconds</p>
        {uploading && (
          <div className="max-w-xs mx-auto mt-4 h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-navy-500 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  /* ── Page wrapper ── */
  const stepLabels = ['Add details', 'Confirm location', 'Review & submit'];

  return (
    <div className="max-w-xl mx-auto px-4 py-10 animate-fade-in">

      {/* Header */}
      <div className="mb-6">
        <p className="section-label mb-1">Report an Issue</p>
        <h1 className="font-serif text-2xl font-semibold text-ink-900">
          {stepLabels[step - 1]}
        </h1>
        <p className="text-sm text-ink-500 mt-0.5">Step {step} of 3</p>
      </div>

      <StepDots step={step} />

      {/* ── Step 1: Photo + Description ── */}
      {step === 1 && (
        <form onSubmit={goToStep2} className="space-y-5 animate-fade-in">
          {/* Photo/Video upload */}
          <div>
            <p className="input-label">Photo or short video <span className="normal-case text-ink-400 font-normal">(recommended)</span></p>
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden border border-border group">
                {isVideo ? (
                  <video src={imagePreview} autoPlay loop muted playsInline className="w-full h-56 object-cover bg-black" />
                ) : (
                  <img src={imagePreview} alt="Preview" className="w-full h-56 object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(''); setIsVideo(false); }}
                  className="absolute top-2 right-2 bg-white/90 border border-border rounded
                             px-2 py-1 text-xs text-ink-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-10
                           flex flex-col items-center gap-2 hover:border-navy-300
                           hover:bg-navy-50 transition-all duration-200"
              >
                <Camera size={28} className="text-ink-300" />
                <span className="text-sm text-ink-400">Tap to upload a photo or video</span>
                <span className="text-xs text-ink-300">JPG, PNG, MP4 · max 20 MB</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Description */}
          <div className="input-group">
            <label className="input-label" htmlFor="description">
              Description <span className="normal-case text-ink-400 font-normal">(what's wrong?)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input h-28 resize-none"
              placeholder="e.g. Large pothole near the school gate, vehicles swerving to avoid it"
            />
          </div>

          <button
            type="submit"
            disabled={!imageFile && !description.trim()}
            className="btn-primary w-full justify-center py-3"
          >
            Continue <ChevronRight size={16} />
          </button>
        </form>
      )}

      {/* ── Step 2: Location + Ward ── */}
      {step === 2 && (
        <form onSubmit={goToStep3} className="space-y-5 animate-fade-in">

          {/* Ward selector */}
          <div className="input-group">
            <label className="input-label" htmlFor="ward-select">Ward / Area</label>
            <select
              id="ward-select"
              value={wardId}
              onChange={e => setWardId(e.target.value)}
              className="input"
              required
            >
              <option value="">Select your ward</option>
              {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          {/* Location */}
          <div>
            <p className="input-label mb-1.5">
              GPS coordinates <span className="normal-case text-ink-400 font-normal">(optional but helpful)</span>
            </p>
            <div className="flex gap-2">
              <input
                value={lat}
                onChange={e => setLat(e.target.value)}
                className="input"
                placeholder="Latitude"
                type="number"
                step="any"
              />
              <input
                value={lng}
                onChange={e => setLng(e.target.value)}
                className="input"
                placeholder="Longitude"
                type="number"
                step="any"
              />
              <button
                type="button"
                onClick={getLocation}
                disabled={locLoading}
                className="btn-secondary flex-shrink-0 px-3"
                title="Use my current location"
              >
                {locLoading
                  ? <span className="w-4 h-4 border-2 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
                  : <LocateFixed size={16} />
                }
              </button>
            </div>
            {lat && lng && (
              <p className="text-xs text-teal-600 mt-1.5 flex items-center gap-1">
                <MapPin size={11} /> {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}
              </p>
            )}
          </div>

          {/* Summary of step 1 */}
          {(imagePreview || description) && (
            <div className="card p-3 flex items-start gap-3">
              {imagePreview && (
                <img src={imagePreview} alt="Report" className="w-12 h-12 object-cover rounded flex-shrink-0 border border-border" />
              )}
              <div className="flex-1 min-w-0">
                {description && <p className="text-sm text-ink-600 line-clamp-2">{description}</p>}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-navy-600 hover:text-navy-700 mt-0.5 flex items-center gap-1"
                >
                  <Edit2 size={10} /> Edit
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center">
              Back
            </button>
            <button type="submit" disabled={!wardId} className="btn-primary flex-1 justify-center">
              Analyse & Continue <ChevronRight size={16} />
            </button>
          </div>
        </form>
      )}

      {/* ── Step 3: AI Confirm ── */}
      {step === 3 && classification && (
        <div className="space-y-5 animate-fade-in">
        
          {/* Feature 4: Nearby / Duplicate Merge Warning */}
          {!editing && nearbyReports.length > 0 && (
            <div className="card p-4 border-l-4 border-l-amber-400 bg-amber-50/50 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">{nearbyReports.length} people nearby reported similar issues</p>
                  <p className="text-sm text-amber-800/80 mb-3 leading-relaxed">Increase the priority of an existing report by adding your voice to it, or submit as a new distinct issue.</p>
                  
                  <div className="space-y-2 mb-4">
                    {nearbyReports.map(nr => (
                      <div key={nr.id} className="text-sm bg-white p-2.5 border border-amber-200/60 rounded-md text-ink-700 flex flex-col gap-1 shadow-sm">
                        <span className="line-clamp-2 font-medium">{nr.summary || nr.description}</span>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-ink-400 uppercase tracking-wider">{nr.status} · {nr.severity} severity</span>
                          <button type="button" onClick={() => handleMerge(nr.id)} disabled={submitting}
                                  className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold px-2 py-1 rounded transition-colors uppercase tracking-wider">
                            Merge & Boost
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI classification card */}
          {!editing ? (
            <div className="card p-5 border-l-4 border-l-navy-400">
              <div className="flex items-start gap-3 mb-4">
                {imagePreview && (
                  <img src={imagePreview} alt="Report" className="w-14 h-14 object-cover rounded border border-border flex-shrink-0" />
                )}
                <div>
                  <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-1">
                    AI Classification
                  </p>
                  <p className="font-serif text-base font-semibold text-ink-900 leading-snug mb-1">
                    {classification.humanReadable || `Looks like a ${classification.category?.replace('_', ' ')} — does that look right?`}
                  </p>
                  <p className="text-sm text-ink-600 bg-canvas/50 p-2 rounded border border-border/50 text-left">
                    <span className="font-semibold text-navy-700 block mb-1 text-xs uppercase tracking-wider">AI Reasoning</span>
                    {classification.reasoning || "Classification generated based on image analysis."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-sm">
                <span className="badge-open capitalize">{category?.replace('_', ' ')}</span>
                <span className={
                  severity === 'high' ? 'badge-high' :
                  severity === 'medium' ? 'badge-medium' : 'badge-low'
                }>
                  {severity?.charAt(0).toUpperCase() + severity?.slice(1)} severity
                </span>
                {classification.confidence > 0 && (
                  <span className="text-xs text-ink-400 ml-auto">
                    {Math.round(classification.confidence * 100)}% confidence
                  </span>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary flex-1 justify-center py-2.5"
                >
                  {submitting
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting…</>
                    : <><CheckCircle size={16} /> Yes, submit as new report</>
                  }
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="btn-secondary px-3"
                  title="Edit classification"
                >
                  <Edit2 size={15} />
                </button>
              </div>
            </div>
          ) : (
            /* Override form */
            <div className="card p-5 animate-fade-in">
              <p className="font-semibold text-ink-800 mb-4">Adjust the classification</p>
              <div className="space-y-4">
                {/* Category grid */}
                <div>
                  <p className="input-label mb-2">Category</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded border text-sm font-medium transition-colors
                          ${category === c.value
                            ? 'border-navy-500 bg-navy-50 text-navy-700'
                            : 'border-border text-ink-600 hover:border-navy-200 hover:bg-canvas'
                          }`}
                      >
                        <c.Icon size={14} /> {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Severity list */}
                <div>
                  <p className="input-label mb-2">Severity</p>
                  <div className="space-y-2">
                    {SEVERITIES.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setSeverity(s.value)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded border text-sm transition-colors text-left
                          ${severity === s.value
                            ? `border-2 ${s.color}`
                            : 'border-border text-ink-600 hover:bg-canvas'
                          }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          s.value === 'high' ? 'bg-red-400' : s.value === 'medium' ? 'bg-amber-400' : 'bg-yellow-400'
                        }`} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary flex-1 justify-center"
                >
                  {submitting
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : 'Submit Report'
                  }
                </button>
              </div>
            </div>
          )}

          <button type="button" onClick={() => setStep(2)} className="btn-ghost w-full justify-center text-sm text-ink-400">
            ← Back to location
          </button>
        </div>
      )}
    </div>
  );
}
