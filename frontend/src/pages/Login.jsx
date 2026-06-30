import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

const ERROR_MESSAGES = {
  'auth/email-already-in-use':  'An account with this email already exists.',
  'auth/wrong-password':        'Incorrect password. Please try again.',
  'auth/user-not-found':        'No account found with this email.',
  'auth/weak-password':         'Password must be at least 6 characters.',
  'auth/invalid-credential':    'Invalid email or password.',
  'auth/api-key-not-valid':     'Firebase is not configured — add your API keys to .env',
  'auth/popup-closed-by-user':  'Sign-in cancelled. Please try again.',
  'auth/cancelled-popup-request': 'Sign-in cancelled. Please try again.',
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
        navigate('/');
      } else {
        await login(email, password);
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        if (auth.currentUser) await setDoc(doc(db, 'users', auth.currentUser.uid), { role: 'citizen', isAuthority: false }, { merge: true });
        toast.success('Welcome back.');
        navigate('/');
      }
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-body-md text-ink bg-surface">
      
      {/* Left pane: Branding/Info */}
      <div className="w-full md:w-5/12 bg-gradient-to-br from-navy via-[#1e2030] to-ink flex flex-col justify-between p-12 md:p-16 relative overflow-hidden shadow-[inset_-20px_0_40px_rgba(0,0,0,0.2)]">
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-navy-light/20 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-sage/10 blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-glass">
              <img src="/shield.svg" alt="CivicWatch Logo" className="w-8 h-8 drop-shadow-md" />
            </div>
            <span className="font-serif text-2xl font-bold text-white tracking-wide">CivicWatch</span>
          </div>
          
          <h1 className="font-serif text-5xl text-white mb-6 leading-[1.1] tracking-tight text-balance">
            The Public Trust<br />Ledger
          </h1>
          <p className="font-body-lg text-lg text-white/70 max-w-sm leading-relaxed">
            Hold local authorities accountable. Every civic commitment, publicly recorded and tracked.
          </p>
        </div>
        
        <div className="relative z-10 hidden md:block animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10 max-w-sm backdrop-blur-md shadow-glass">
            <p className="font-label-md text-sm text-white mb-2 flex items-center gap-2 uppercase tracking-widest font-bold">
              <span className="material-symbols-outlined text-[18px] text-sage">verified</span> Official Portal
            </p>
            <p className="text-sm text-white/60 leading-relaxed">
              This system is maintained by the Department of Citizen Services. Your data is secure and protected by enterprise-grade encryption.
            </p>
          </div>
        </div>
      </div>

      {/* Right pane: Auth Form */}
      <div className="w-full md:w-7/12 flex items-center justify-center p-8 md:p-24 bg-[#f8f9fa] relative z-10 overflow-hidden">
        
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-sage/5 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-10 left-10 w-72 h-72 bg-navy/5 rounded-full blur-[80px]"></div>
        </div>

        <div className="w-full max-w-[420px] bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-white/50 animate-fade-in-up relative z-20" style={{ animationDelay: '100ms' }}>
          
          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl font-bold text-navy mb-2 tracking-tight">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="font-body-md text-muted">
              {mode === 'login' ? 'Sign in to access your civic dashboard' : 'Join your community network'}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex bg-surface rounded-xl p-1 mb-8 border border-border shadow-inner">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2.5 font-label-md text-sm font-bold rounded-lg transition-all duration-300 ${mode === 'login' ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              Citizen
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 py-2.5 font-label-md text-sm font-bold rounded-lg transition-all duration-300 ${mode === 'signup' ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-ink'}`}
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
                <label className="block font-label-md text-xs font-bold uppercase tracking-wider text-muted mb-2">Full Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted text-[20px]">person</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-white border border-border rounded-xl pl-11 pr-4 py-3.5 focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none transition-all shadow-sm font-body-md"
                    placeholder="Jane Doe"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-label-md text-xs font-bold uppercase tracking-wider text-muted mb-2">Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted text-[20px]">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white border border-border rounded-xl pl-11 pr-4 py-3.5 focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none transition-all shadow-sm font-body-md"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-label-md text-xs font-bold uppercase tracking-wider text-muted mb-2">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted text-[20px]">lock</span>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border border-border rounded-xl pl-11 pr-11 py-3.5 focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none transition-all shadow-sm font-body-md"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-navy transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-label-md text-sm font-bold tracking-wide py-3.5 rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 mt-6 flex items-center justify-center h-[52px] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none bg-navy hover:bg-navy-light`}
            >
              {loading ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <>
              <div className="mt-4 flex items-center justify-center space-x-2">
                <div className="h-px bg-border flex-1"></div>
                <span className="font-label-md text-muted text-xs uppercase">Or</span>
                <div className="h-px bg-border flex-1"></div>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full mt-6 bg-white border border-border text-ink font-label-md text-sm font-bold tracking-wide py-3.5 rounded-xl hover:bg-surface hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 flex items-center justify-center gap-3 h-[52px] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
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
            </>

          <div className="mt-10 text-center pt-8 border-t border-border">
            <Link to="/" className="font-label-md text-sm font-bold text-navy hover:text-navy-light hover:underline flex items-center justify-center gap-1 transition-colors">
              Continue to public dashboard <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
