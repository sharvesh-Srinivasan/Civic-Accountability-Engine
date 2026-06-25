import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, MapPin, Plus, FileText, LogOut, Menu, X, ChevronDown, Trophy } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthority, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-16 gap-6">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 flex-shrink-0 group"
            onClick={() => setMenuOpen(false)}
          >
            <div className="w-8 h-8 bg-navy-600 rounded flex items-center justify-center
                            group-hover:bg-navy-700 transition-colors">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-serif font-semibold text-navy-800 text-lg tracking-tight">
              CivicWatch
            </span>
          </Link>

          {/* Divider */}
          <div className="hidden md:block h-5 w-px bg-border" />

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            <Link
              to="/"
              className={isActive('/') ? 'nav-link-active' : 'nav-link'}
            >
              Dashboard
            </Link>
            {user && (
              <Link
                to="/my-reports"
                className={isActive('/my-reports') ? 'nav-link-active' : 'nav-link'}
              >
                My Reports
              </Link>
            )}
            {isAuthority && (
              <Link
                to="/authority"
                className={isActive('/authority') ? 'nav-link-active' : 'nav-link'}
              >
                Authority View
              </Link>
            )}
          </nav>

          {/* Right side actions */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            {user ? (
              <>
                {/* User info */}
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-7 h-7 rounded-full bg-navy-100 flex items-center
                                  justify-center text-navy-700 font-semibold text-xs">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <span className="text-ink-600 font-medium max-w-[120px] truncate">
                    {user.displayName || user.email}
                  </span>
                  {isAuthority && (
                    <span className="badge badge-acknowledged text-xs">Authority</span>
                  )}
                  {!isAuthority && userDoc && (
                    <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-xs font-semibold ml-2 border border-amber-200">
                      <Trophy size={12} /> {userDoc.civicPoints || 0} pts
                    </div>
                  )}
                </div>
                <div className="h-4 w-px bg-border" />
                {/* Report CTA — always visible */}
                <Link to="/report/new" className="btn-primary btn-sm">
                  <Plus size={14} /> Report Issue
                </Link>
                <button onClick={handleLogout} className="btn-ghost btn-sm">
                  <LogOut size={14} /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">Sign in</Link>
                <Link to="/report/new" className="btn-primary btn-sm">
                  <Plus size={14} /> Report an Issue
                </Link>
              </>
            )}
          </div>

          {/* Mobile: Report CTA + hamburger */}
          <div className="md:hidden flex items-center gap-2 ml-auto">
            <Link to="/report/new" className="btn-primary btn-sm">
              <Plus size={14} />
              <span className="sr-only">Report</span>
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-ink-500 hover:text-ink-800 hover:bg-canvas rounded-md transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-white animate-fade-in">
          <nav className="max-w-6xl mx-auto px-4 py-3 space-y-1">
            <Link to="/" onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/') ? 'bg-navy-50 text-navy-700' : 'text-ink-600 hover:bg-canvas'}`}>
              <MapPin size={16} /> Dashboard
            </Link>
            {user && (
              <Link to="/my-reports" onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/my-reports') ? 'bg-navy-50 text-navy-700' : 'text-ink-600 hover:bg-canvas'}`}>
                <FileText size={16} /> My Reports
              </Link>
            )}
            {isAuthority && (
              <Link to="/authority" onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/authority') ? 'bg-navy-50 text-navy-700' : 'text-ink-600 hover:bg-canvas'}`}>
                <Shield size={16} /> Authority View
              </Link>
            )}
            <div className="divider my-2" />
            {user ? (
              <>
                <div className="px-3 py-2 text-sm text-ink-500">
                  Signed in as <span className="font-medium text-ink-700">{user.displayName || user.email}</span>
                </div>
                <Link to="/report/new" onClick={() => setMenuOpen(false)} className="btn-primary w-full justify-center text-sm">
                  <Plus size={14} /> Report an Issue
                </Link>
                <button onClick={handleLogout} className="btn-ghost w-full justify-center text-sm text-ink-500 mt-1">
                  <LogOut size={14} /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-secondary w-full justify-center text-sm">
                  Sign in
                </Link>
                <Link to="/report/new" onClick={() => setMenuOpen(false)} className="btn-primary w-full justify-center text-sm mt-1">
                  <Plus size={14} /> Report an Issue
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
