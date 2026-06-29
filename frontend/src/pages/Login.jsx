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
  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginWithGoogle();
      toast.success('Signed in with Google');
      navigate('/');
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || err.message);
    }
  };

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
    <div className="min-h-screen bg-paper flex flex-col md:flex-row font-body-md text-ink">
      
      {/* Left pane: Branding/Info */}
      <div className="w-full md:w-1/2 bg-navy flex flex-col justify-between p-margin-mobile md:p-margin-desktop border-b md:border-b-0 md:border-r border-navy-light relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 110%, rgba(255,255,255,0.3) 0%, transparent 50%)' }}></div>
        <div className="relative z-10 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-2 mb-stack-lg">
            <span className="material-symbols-outlined text-[32px] text-white">account_balance</span>
            <span className="font-serif text-2xl font-bold text-white">CivicConnect</span>
          </div>
          
          <h1 className="font-serif text-4xl text-white mb-stack-md leading-tight">
            The Public Trust<br />Ledger
          </h1>
          <p className="font-body-lg text-body-lg text-white/70 max-w-md">
            Hold local authorities accountable. Every civic commitment, publicly recorded.
          </p>
        </div>
        
        <div className="relative z-10 hidden md:block animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="bg-white/10 p-gutter rounded-xl border border-white/20 max-w-sm backdrop-blur-sm">
            <p className="font-label-md text-label-md text-white mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">verified</span> Official Portal
            </p>
            <p className="text-sm text-white/70">
              This system is maintained by the Department of Citizen Services. Your data is secure and protected.
            </p>
          </div>
        </div>
      </div>

      {/* Right pane: Auth Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-paper relative z-10">
        <div className="w-full max-w-md bg-surface p-gutter rounded-xl shadow-sm border border-border animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          
          <div className="text-center mb-stack-lg">
            <h2 className="font-headline-lg text-headline-lg text-ink">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="font-body-md text-body-md text-muted mt-1">
              {mode === 'login' ? 'Sign in to access your civic dashboard' : 'Join your community network'}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex bg-paper rounded-lg p-1 mb-stack-md border border-border">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 font-label-md text-label-md rounded-md transition-all duration-150 ${mode === 'login' ? 'bg-navy text-white shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 py-2 font-label-md text-label-md rounded-md transition-all duration-150 ${mode === 'signup' ? 'bg-navy text-white shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="bg-terracotta/10 text-terracotta p-3 rounded-lg mb-stack-md flex items-center gap-2 border border-terracotta font-body-md text-sm">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block font-label-md text-label-md text-ink mb-1">Full Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted">person</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-3 focus:border-navy focus:ring-1 focus:ring-primary focus:outline-none"
                    placeholder="Jane Doe"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-label-md text-label-md text-ink mb-1">Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-3 focus:border-navy focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-ink mb-1">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted">lock</span>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg pl-10 pr-10 py-3 focus:border-navy focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy transition-colors"
                >
                  <span className="material-symbols-outlined">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-white font-label-md text-label-md py-3 rounded-lg hover:bg-navy-light hover:scale-[1.01] hover:shadow-md transition-all duration-150 mt-2 flex items-center justify-center h-[48px] disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100"
            >
              {loading ? <span className="material-symbols-outlined animate-spin">sync</span> : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-center space-x-2">
            <div className="h-px bg-border flex-1"></div>
            <span className="font-label-md text-muted text-xs uppercase">Or</span>
            <div className="h-px bg-border flex-1"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full mt-4 bg-white border border-border text-ink font-label-md text-label-md py-3 rounded-lg hover:bg-surface hover:scale-[1.01] hover:shadow-sm transition-all duration-150 flex items-center justify-center gap-3 h-[48px] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" className="shrink-0">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
            Sign in with Google
          </button>

          <div className="mt-stack-lg text-center pt-stack-md border-t border-border">
            <Link to="/" className="font-label-md text-label-md text-navy hover:underline flex items-center justify-center gap-1">
              Continue to public dashboard <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
