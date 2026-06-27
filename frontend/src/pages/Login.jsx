import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const ERROR_MESSAGES = {
  'auth/email-already-in-use':  'An account with this email already exists.',
  'auth/wrong-password':        'Incorrect password. Please try again.',
  'auth/user-not-found':        'No account found with this email.',
  'auth/weak-password':         'Password must be at least 6 characters.',
  'auth/invalid-credential':    'Invalid email or password.',
  'auth/api-key-not-valid':     'Firebase is not configured — add your API keys to .env',
};

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signup(email, password, displayName);
        toast.success('Account created. Welcome to CivicConnect!');
      } else {
        await login(email, password);
        toast.success('Welcome back.');
      }
      navigate('/');
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col md:flex-row font-body-md text-on-surface">
      
      {/* Left pane: Branding/Info */}
      <div className="w-full md:w-1/2 bg-surface-container flex flex-col justify-between p-margin-mobile md:p-margin-desktop border-b md:border-b-0 md:border-r border-outline-variant relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 10% 90%, var(--tw-colors-primary) 0%, transparent 50%)' }}></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-stack-lg">
            <span className="material-symbols-outlined text-[32px] text-primary">account_balance</span>
            <span className="font-headline-md text-headline-md font-bold text-primary">CivicConnect</span>
          </div>
          
          <h1 className="font-display-lg text-display-lg text-on-surface mb-stack-md">
            Your voice in local governance.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md">
            Report issues, track authority commitments, and hold your ward accountable with our official civic portal.
          </p>
        </div>
        
        <div className="relative z-10 hidden md:block">
          <div className="bg-surface-container-lowest p-gutter rounded-xl border border-outline-variant shadow-sm max-w-sm">
            <p className="font-label-md text-label-md text-primary mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">verified</span> Official Portal
            </p>
            <p className="text-sm text-on-surface-variant">
              This system is maintained by the Department of Citizen Services. Your data is secure and protected.
            </p>
          </div>
        </div>
      </div>

      {/* Right pane: Auth Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-surface-bright relative z-10">
        <div className="w-full max-w-md bg-surface-container-lowest p-gutter rounded-xl shadow-sm border border-outline-variant animate-slide-up">
          
          <div className="text-center mb-stack-lg">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              {mode === 'login' ? 'Sign in to access your civic dashboard' : 'Join your community network'}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex bg-surface-container rounded-lg p-1 mb-stack-md">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 font-label-md text-label-md rounded-md transition-colors ${mode === 'login' ? 'bg-surface-container-lowest shadow-sm text-primary border border-outline-variant' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 py-2 font-label-md text-label-md rounded-md transition-colors ${mode === 'signup' ? 'bg-surface-container-lowest shadow-sm text-primary border border-outline-variant' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="bg-error-container text-on-error-container p-3 rounded-lg mb-stack-md flex items-center gap-2 border border-error font-body-md text-sm">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1">Full Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">person</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-10 pr-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                    placeholder="Jane Doe"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-10 pr-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">lock</span>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-10 pr-10 py-3 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary font-label-md text-label-md py-3 rounded-lg hover:bg-primary-container mt-2 flex items-center justify-center h-[48px]"
            >
              {loading ? <span className="material-symbols-outlined animate-spin">sync</span> : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-stack-lg text-center pt-stack-md border-t border-outline-variant">
            <Link to="/" className="font-label-md text-label-md text-primary hover:underline flex items-center justify-center gap-1">
              Continue to public dashboard <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
