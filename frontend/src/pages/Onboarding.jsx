import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { MapPin, User, Bell, CheckCircle, ChevronRight, ChevronLeft, Loader2, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Onboarding() {
  const { user, userDoc, updateOnboarding } = useAuth();
  const [step, setStep] = useState(1);
  const [wards, setWards] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: userDoc?.displayName || '',
    phone: '',
    street: '',
    locality: '',
    city: 'Bengaluru',
    pincode: '',
    wardId: '',
    lat: null,
    lng: null,
    preferences: [],
    notificationFrequency: 'realtime' // realtime, weekly, none
  });

  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch wards
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

  const handleAutoDetect = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey || apiKey === 'your_google_maps_api_key') {
          throw new Error('No valid Google Maps API Key');
        }

        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
        const data = await res.json();

        if (data.status === 'OK' && data.results[0]) {
          const components = data.results[0].address_components;
          let street = '', locality = '', city = '', pincode = '';
          
          components.forEach(comp => {
            if (comp.types.includes('route')) street = comp.long_name;
            if (comp.types.includes('sublocality') || comp.types.includes('neighborhood')) locality = comp.long_name;
            if (comp.types.includes('locality')) city = comp.long_name;
            if (comp.types.includes('postal_code')) pincode = comp.long_name;
          });

          setFormData(prev => ({ ...prev, street, locality, city, pincode, lat: latitude, lng: longitude }));
          
          // Basic ward auto-assignment heuristic (mock logic for demo)
          if (wards.length > 0) {
             const randomWard = wards[Math.floor(Math.random() * wards.length)];
             setFormData(prev => ({ ...prev, wardId: randomWard.id }));
          }
          
          toast.success('Location detected!');
        } else {
          throw new Error('Geocoding failed');
        }
      } catch (err) {
        console.warn("Reverse geocoding fallback triggered:", err.message);
        toast.success("Location recorded! Please manually enter your address details.");
        // Fallback: Just assign a random ward for the demo if api key is missing
        setFormData(prev => ({ ...prev, lat: latitude, lng: longitude }));
        if (wards.length > 0) {
             const randomWard = wards[Math.floor(Math.random() * wards.length)];
             setFormData(prev => ({ ...prev, wardId: randomWard.id }));
        }
      } finally {
        setIsLocating(false);
      }
    }, (err) => {
      setIsLocating(false);
      toast.error('Could not get your location. Please type your address manually.');
    });
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    let finalData = { ...formData };
    
    // Attempt manual geocoding if lat/lng are missing but city/locality exists
    if (!finalData.lat && finalData.city) {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (apiKey && apiKey !== 'your_google_maps_api_key') {
          const addressString = `${finalData.street}, ${finalData.locality}, ${finalData.city}, ${finalData.pincode}`;
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${apiKey}`);
          const data = await res.json();
          if (data.status === 'OK' && data.results[0]) {
            const loc = data.results[0].geometry.location;
            finalData.lat = loc.lat;
            finalData.lng = loc.lng;
          }
        }
      } catch (err) {
        console.warn('Manual geocoding failed', err);
      }
    }

    try {
      await updateOnboarding(finalData);
      toast.success('Profile complete! Welcome to CivicWatch.');
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

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
      
      <div className="w-full max-w-lg">
        {/* Progress header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-navy-600' : 'bg-ink-200'}`} />
            <div className={`w-8 h-1 rounded-full ${step >= 2 ? 'bg-navy-600' : 'bg-ink-200'}`} />
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-navy-600' : 'bg-ink-200'}`} />
            <div className={`w-8 h-1 rounded-full ${step >= 3 ? 'bg-navy-600' : 'bg-ink-200'}`} />
            <div className={`w-3 h-3 rounded-full ${step >= 3 ? 'bg-navy-600' : 'bg-ink-200'}`} />
            <div className={`w-8 h-1 rounded-full ${step >= 4 ? 'bg-navy-600' : 'bg-ink-200'}`} />
            <div className={`w-3 h-3 rounded-full ${step >= 4 ? 'bg-navy-600' : 'bg-ink-200'}`} />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink-900">
            {step === 1 ? 'Welcome to CivicWatch' : 
             step === 2 ? 'Where do you live?' : 
             step === 3 ? 'Your Civic Interests' : 'All set!'}
          </h1>
          <p className="text-ink-500 mt-1 text-sm">
            {step === 1 ? 'Let\'s get your profile set up.' : 
             step === 2 ? 'We use this to show you relevant neighborhood issues.' : 
             step === 3 ? 'Customize what notifications you receive.' : 'Review your profile before jumping in.'}
          </p>
        </div>

        {/* Card Body */}
        <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 border border-border">
          
          {/* STEP 1: Basic Identity */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="input-group">
                <label className="input-label flex items-center gap-2"><User size={14}/> Full Name</label>
                <input 
                  type="text" name="fullName" className="input" 
                  value={formData.fullName} onChange={handleChange} 
                  placeholder="e.g. Jane Doe" 
                />
              </div>
              <div className="input-group">
                <label className="input-label flex items-center gap-2">Phone Number <span className="text-ink-400 font-normal">(Optional)</span></label>
                <input 
                  type="tel" name="phone" className="input" 
                  value={formData.phone} onChange={handleChange} 
                  placeholder="+91 98765 43210" 
                />
              </div>
            </div>
          )}

          {/* STEP 2: Address & Location */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <button 
                type="button" 
                onClick={handleAutoDetect} 
                disabled={isLocating}
                className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 py-3 rounded-lg font-medium transition-colors"
              >
                {isLocating ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
                Auto-detect my location
              </button>
              
              <div className="flex items-center gap-4 my-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-ink-400 uppercase tracking-widest font-semibold">Or enter manually</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group col-span-2">
                  <label className="input-label">Street Address</label>
                  <input type="text" name="street" className="input" value={formData.street} onChange={handleChange} placeholder="House no, Street" />
                </div>
                <div className="input-group">
                  <label className="input-label">Locality / Area</label>
                  <input type="text" name="locality" className="input" value={formData.locality} onChange={handleChange} placeholder="e.g. Indiranagar" />
                </div>
                <div className="input-group">
                  <label className="input-label">Pincode</label>
                  <input type="text" name="pincode" className="input" value={formData.pincode} onChange={handleChange} placeholder="560038" />
                </div>
              </div>

              <div className="input-group pt-2">
                <label className="input-label flex items-center gap-2"><MapPin size={14}/> Ward / Zone</label>
                <select name="wardId" className="input" value={formData.wardId} onChange={handleChange}>
                  <option value="" disabled>Select your ward</option>
                  {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <p className="text-xs text-ink-500 mt-1">This determines which local authorities are responsible for your area.</p>
              </div>
            </div>
          )}

          {/* STEP 3: Preferences */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <label className="input-label mb-2">What issues care you about most?</label>
                <div className="grid grid-cols-2 gap-3">
                  {['pothole', 'garbage', 'streetlight', 'water_leak'].map(pref => (
                    <button 
                      key={pref} type="button"
                      onClick={() => togglePreference(pref)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium capitalize transition-colors
                        ${formData.preferences.includes(pref) ? 'bg-teal-50 border-teal-500 text-teal-800' : 'bg-white border-border text-ink-600 hover:border-ink-300'}
                      `}
                    >
                      {pref.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="input-label flex items-center gap-2 mb-3"><Bell size={14}/> Notification Frequency</label>
                <div className="space-y-3">
                  {[
                    { id: 'realtime', label: 'Real-time Alerts', desc: 'Get notified immediately when issues near you are fixed.' },
                    { id: 'weekly', label: 'Weekly Digest', desc: 'A summary of civic progress in your ward every Sunday.' },
                    { id: 'none', label: 'No Notifications', desc: 'I\'ll check the dashboard myself.' }
                  ].map(opt => (
                    <label key={opt.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${formData.notificationFrequency === opt.id ? 'border-navy-600 bg-navy-50/50' : 'border-border bg-white hover:border-ink-300'}`}>
                      <input 
                        type="radio" name="notificationFrequency" value={opt.id} 
                        checked={formData.notificationFrequency === opt.id} 
                        onChange={handleChange}
                        className="mt-0.5 text-navy-600 focus:ring-navy-600"
                      />
                      <div>
                        <p className="font-medium text-ink-900 text-sm">{opt.label}</p>
                        <p className="text-xs text-ink-500 mt-0.5">{opt.desc}</p>
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
              <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
              </div>
              <h3 className="font-serif text-xl font-semibold text-ink-900 mb-2">You're officially a CivicWatch Citizen</h3>
              
              <div className="bg-canvas border border-border rounded-xl p-4 text-left my-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-500">Name</span>
                  <span className="font-medium text-ink-900">{formData.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Assigned Ward</span>
                  <span className="font-medium text-ink-900">{wards.find(w=>w.id === formData.wardId)?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Alerts</span>
                  <span className="font-medium text-ink-900 capitalize">{formData.notificationFrequency}</span>
                </div>
              </div>
              
              <p className="text-sm text-ink-600">
                You're all set to start making a real-world difference in your neighborhood.
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex gap-3 pt-6 border-t border-border">
            {step > 1 && (
              <button onClick={prevStep} className="btn-secondary flex-1 justify-center">
                <ChevronLeft size={16} /> Back
              </button>
            )}
            
            {step < 4 ? (
              <button onClick={nextStep} className="btn-primary flex-1 justify-center">
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleFinish} disabled={isSubmitting} className="btn-primary bg-teal-600 hover:bg-teal-700 flex-1 justify-center">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Enter Dashboard'}
              </button>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
