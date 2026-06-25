import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
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
        toast.success('Account created. Welcome to CivicWatch!');
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
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-16 bg-paper">
      <div className="w-full max-w-sm animate-slide-up">

        {/* Logo mark */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 items-center justify-center
                          bg-navy-600 rounded-lg mb-4">
            <Shield size={22} className="text-white" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink-900">
            {mode === 'login' ? 'Sign in to CivicWatch' : 'Create your account'}
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            {mode === 'login'
              ? 'Report issues and track authority commitments.'
              : 'Join citizens making their city more accountable.'}
          </p>
        </div>

        {/* Card */}
        <div className="card-padded">

          {/* Tab switch */}
          <div className="flex rounded-md border border-border overflow-hidden mb-6">
            {[
              { val: 'login',  label: 'Sign In' },
              { val: 'signup', label: 'Sign Up' },
            ].map(({ val, label }) => (
              <button
                key={val}
                type="button"
                onClick={() => { setMode(val); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors
                  ${mode === val
                    ? 'bg-navy-600 text-white'
                    : 'bg-white text-ink-500 hover:bg-canvas hover:text-ink-700'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Error banner */}
          {error && (
            <div className="warn-bar mb-4 animate-fade-in">
              <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="input-group">
                <label className="input-label">Full name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    id="display-name"
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="input pl-9"
                    placeholder="Jane Citizen"
                    required
                  />
                </div>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-9 pr-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400
                             hover:text-ink-600 transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              id="submit-auth"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white
                                   rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-ink-400 mt-4">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              className="text-navy-600 hover:text-navy-700 font-medium"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-ink-400 mt-5">
          Public dashboard available without an account ·{' '}
          <Link to="/" className="text-navy-600 hover:underline">View Dashboard</Link>
        </p>
      </div>
    </div>
  );
}
