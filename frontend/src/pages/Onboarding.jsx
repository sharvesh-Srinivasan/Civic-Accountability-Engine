import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function StepSegments({ step, total = 4 }) {
  const labels = ['Identity', 'Location', 'Interests', 'Complete'];
  return (
    <div className="mb-12 px-2 pt-4 w-full">
      <div className="flex items-center justify-between w-full relative">
        
        {/* Background Track spanning from center of first node to center of last node */}
        <div className="absolute left-[20px] right-[20px] top-5 -translate-y-1/2 h-1 bg-border -z-10">
          {/* Animated Fill Track */}
          <div 
            className="h-full bg-navy transition-all duration-700 ease-in-out"
            style={{ width: `${((step - 1) / (total - 1)) * 100}%` }}
          />
        </div>

        {labels.map((label, idx) => {
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
  );
}

export default function Onboarding() {
  const { user, userDoc, updateOnboarding } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [wards, setWards] = useState([]);

  const [formData, setFormData] = useState({
    fullName: userDoc?.displayName || '',
    phone: '',
    occupation: '',
    bio: '',
    street: '',
    locality: '',
    city: '',
    pincode: '',
    wardId: '',
    lat: null,
    lng: null,
    preferences: [],
    notificationFrequency: 'realtime'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (db) {
      getDocs(collection(db, 'wards')).then(snap => {
        setWards(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }).catch(console.error);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const togglePreference = (pref) => {
    setFormData(prev => {
      const current = prev.preferences;
      if (current.includes(pref)) return { ...prev, preferences: current.filter(p => p !== pref) };
      return { ...prev, preferences: [...current, pref] };
    });
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await updateOnboarding(formData);
      toast.success('Profile complete! Welcome to CivicConnect.');
      navigate('/');
    } catch (err) {
      toast.error('Failed to complete onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !formData.fullName) return toast.error('Please enter your name');
    if (step === 2 && !formData.wardId) return toast.error('Please select a ward');
    setStep(s => Math.min(4, s + 1));
  };

  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const STEP_TITLES = [
    'Welcome to the Public Ledger',
    'Where do you live?',
    'Your Civic Interests',
    "You're all set"
  ];

  const STEP_SUBTITLES = [
    'Register as a civic auditor to begin.',
    'We use this to show you relevant local commitments.',
    'Customize what notifications you receive.',
    'Review your profile before jumping in.'
  ];

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-margin-mobile md:p-margin-desktop font-body-md text-ink">
      
      <div className="w-full max-w-lg bg-surface p-gutter rounded-xl shadow-sm border border-border animate-slide-up">
        
        {/* Title area */}
        <div className="text-center mb-stack-lg border-b border-border pb-stack-md">
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-ink mb-1">
            {STEP_TITLES[step - 1]}
          </h1>
          <p className="font-body-md text-body-md text-muted">
            {STEP_SUBTITLES[step - 1]}
          </p>
        </div>

        <StepSegments step={step} total={4} />

        <div className="min-h-[300px]">
          {/* STEP 1: Identity */}
          {step === 1 && (
            <div className="space-y-stack-md animate-fade-in">
              <div>
                <label className="block font-label-md text-label-md text-ink mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">person</span> Full Name</label>
                <input
                  type="text" name="fullName"
                  className="w-full bg-surface border border-border rounded-lg px-4 py-3 focus:border-navy focus:ring-1 focus:ring-primary focus:outline-none"
                  value={formData.fullName} onChange={handleChange}
                  placeholder="e.g. Jane Doe"
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-ink mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">phone</span> Phone Number (Optional)</label>
                <input
                  type="tel" name="phone"
                  className="w-full bg-surface border border-border rounded-lg px-4 py-3 focus:border-navy focus:ring-1 focus:ring-primary focus:outline-none"
                  value={formData.phone} onChange={handleChange}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-ink mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">work</span> Occupation / Expertise (Optional)</label>
                <input
                  type="text" name="occupation"
                  className="w-full bg-surface border border-border rounded-lg px-4 py-3 focus:border-navy focus:ring-1 focus:ring-primary focus:outline-none"
                  value={formData.occupation} onChange={handleChange}
                  placeholder="e.g. Civil Engineer, Student, Lawyer"
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-ink mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">edit_note</span> Civic Bio (Optional)</label>
                <textarea
                  name="bio"
                  className="w-full bg-surface border border-border rounded-lg px-4 py-3 focus:border-navy focus:ring-1 focus:ring-primary focus:outline-none"
                  value={formData.bio} onChange={handleChange}
                  placeholder="A short description of your civic goals or interests"
                  rows="2"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Location */}
          {step === 2 && (
            <div className="space-y-stack-md animate-fade-in text-center">
              <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                <span className="material-symbols-outlined text-[32px] text-navy">location_on</span>
              </div>

              <div className="text-left">
                <label className="block font-label-md text-label-md text-ink mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_city</span> City</label>
                <select
                  className="w-full bg-surface border border-border rounded-lg px-4 py-3 focus:border-navy focus:ring-1 focus:ring-primary focus:outline-none"
                  value={formData.city || ''}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, city: e.target.value, wardId: '', locality: '', lat: null, lng: null }));
                  }}
                >
                  <option value="" disabled>Select your city...</option>
                  {[...new Set(wards.map(w => w.city))].filter(Boolean).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {formData.city && (
                <div className="text-left">
                  <label className="block font-label-md text-label-md text-ink mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">map</span> Locality / Ward</label>
                  <select
                    name="wardId"
                    className="w-full bg-surface border border-border rounded-lg px-4 py-3 focus:border-navy focus:ring-1 focus:ring-primary focus:outline-none"
                    value={formData.wardId}
                    onChange={(e) => {
                      const selectedWard = wards.find(w => w.id === e.target.value);
                      if (selectedWard) {
                        setFormData(prev => ({
                          ...prev,
                          wardId: selectedWard.id,
                          locality: selectedWard.name,
                          lat: selectedWard.lat,
                          lng: selectedWard.lng,
                          city: selectedWard.city,
                          street: '',
                          pincode: ''
                        }));
                      }
                    }}
                  >
                    <option value="" disabled>Select your area...</option>
                    {wards.filter(w => w.city === formData.city).map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Preferences */}
          {step === 3 && (
            <div className="space-y-stack-lg animate-fade-in">
              <div>
                <label className="block font-label-md text-label-md text-ink mb-2">What issues do you care about most?</label>
                <div className="grid grid-cols-2 gap-2">
                  {['pothole', 'garbage', 'streetlight', 'water_leak'].map(pref => (
                    <button
                      key={pref} type="button"
                      onClick={() => togglePreference(pref)}
                      className={`border rounded-lg py-3 font-label-md text-label-md capitalize transition-colors ${
                        formData.preferences.includes(pref)
                          ? 'bg-navy/10 border-navy text-navy shadow-sm'
                          : 'bg-surface border-border text-muted hover:bg-surface'
                      }`}
                    >
                      {pref.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-label-md text-label-md text-ink mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">notifications</span> Notification Frequency</label>
                <div className="space-y-2">
                  {[
                    { id: 'realtime', label: 'Real-time Alerts', desc: 'Get notified immediately when issues near you are fixed.' },
                    { id: 'weekly', label: 'Weekly Digest', desc: 'A summary of civic progress in your ward every Sunday.' },
                    { id: 'none', label: 'No Notifications', desc: "I'll check the dashboard myself." }
                  ].map(opt => (
                    <label key={opt.id}
                           className={`flex items-start gap-4 border cursor-pointer rounded-lg p-3 transition-colors ${
                             formData.notificationFrequency === opt.id ? 'border-navy bg-navy/10' : 'border-border bg-surface hover:bg-surface'
                           }`}>
                      <input
                        type="radio" name="notificationFrequency" value={opt.id}
                        checked={formData.notificationFrequency === opt.id}
                        onChange={handleChange}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-label-md text-label-md text-ink">{opt.label}</p>
                        <p className="font-caption text-caption text-muted">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Confirmation */}
          {step === 4 && (
            <div className="animate-fade-in text-center">
              <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-sage-fixed-dim">
                <span className="material-symbols-outlined text-[32px] text-sage">check_circle</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-ink mb-1">
                You're officially a Civic Auditor
              </h3>
              <p className="font-body-md text-body-md text-muted mb-stack-md">Profile Review</p>

              <div className="bg-surface border border-border text-left rounded-lg p-gutter mb-stack-md space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-label-md text-label-md text-muted">Name</span>
                  <span className="font-bold text-ink text-sm">{formData.fullName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-label-md text-label-md text-muted">Ward</span>
                  <span className="font-bold text-ink text-sm">{wards.find(w=>w.id === formData.wardId)?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-label-md text-label-md text-muted">Alerts</span>
                  <span className="font-bold text-navy text-sm capitalize">{formData.notificationFrequency}</span>
                </div>
              </div>

              <p className="font-caption text-caption text-muted max-w-[280px] mx-auto">
                You're all set to start holding authorities accountable and witnessing change.
              </p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3 pt-stack-md mt-stack-md border-t border-border">
          {step > 1 && (
            <button onClick={prevStep} className="flex-1 h-12 bg-surface border border-border text-ink font-label-md text-label-md rounded-lg hover:bg-paper transition-colors flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span> Back
            </button>
          )}

          {step < 4 ? (
            <button onClick={nextStep} className="flex-1 h-12 bg-navy text-white font-label-md text-label-md rounded-lg hover:bg-navy/10 transition-colors flex items-center justify-center gap-1">
              Next <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          ) : (
            <button onClick={handleFinish} disabled={isSubmitting} className="flex-1 h-12 bg-sage text-white font-label-md text-label-md rounded-lg hover:bg-sage-fixed transition-colors flex items-center justify-center gap-2">
              {isSubmitting ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Enter Public Ledger'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
