import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, userDoc, isAuthority, isAdmin, logout, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  if (location.pathname === '/login' || location.pathname === '/onboarding') return null;

  return (
    <>
      {/* Mobile TopNav (Visible only on md:hidden) */}
      <header className="md:hidden bg-surface text-navy w-full h-16 border-b border-border flex justify-between items-center px-margin-mobile fixed top-0 z-50">
        <div className="font-serif text-2xl font-bold text-navy">
          CivicConnect
        </div>
        <div className="flex gap-4">
          <span className="material-symbols-outlined cursor-pointer active:opacity-80 transition-all hover:scale-110 text-muted hover:text-navy">notifications</span>
        </div>
      </header>

      {/* Mobile BottomNav (Visible only on md:hidden) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-surface border-t border-border flex justify-around items-center h-16 z-50 pb-safe">
        <Link to="/" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/') ? 'text-navy font-bold' : 'text-muted hover:text-navy'}`}>
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: isActive('/') ? "'FILL' 1" : "" }}>local_library</span>
          <span className="text-[10px]">Ledger</span>
        </Link>
        {user ? (
          <>
            <Link to="/report/new" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/report/new') ? 'text-navy font-bold' : 'text-muted hover:text-navy'}`}>
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: isActive('/report/new') ? "'FILL' 1" : "" }}>add_a_photo</span>
              <span className="text-[10px]">Log Evidence</span>
            </Link>
            <Link to="/profile" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/profile') ? 'text-navy font-bold' : 'text-muted hover:text-navy'}`}>
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: isActive('/profile') ? "'FILL' 1" : "" }}>person</span>
              <span className="text-[10px]">Profile</span>
            </Link>
            {isAdmin && (
              <Link to="/admin" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/admin') ? 'text-navy font-bold' : 'text-muted hover:text-navy'}`}>
                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: isActive('/admin') ? "'FILL' 1" : "" }}>admin_panel_settings</span>
                <span className="text-[10px]">Admin</span>
              </Link>
            )}
          </>
        ) : (
          <Link to="/login" className="flex flex-col items-center gap-1 text-muted hover:text-navy transition-colors">
            <span className="material-symbols-outlined text-[24px]">login</span>
            <span className="text-[10px]">Sign In</span>
          </Link>
        )}
      </nav>

      {/* SideNavBar (Hidden on Mobile) */}
      <nav className="hidden md:flex bg-surface text-ink h-full w-64 fixed left-0 top-0 border-r border-border flex-col py-stack-lg z-50 transition-all duration-300 shadow-none">
        <div className="px-gutter mb-stack-lg">
          <div className="font-serif text-3xl font-bold text-navy mb-2 tracking-tight">
            CivicConnect
          </div>
          {loading ? (
            <div className="flex items-center gap-3 mt-4">
              <div className="w-10 h-10 rounded-full bg-paper animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-20 bg-paper rounded animate-pulse" />
                <div className="h-2 w-12 bg-paper rounded animate-pulse" />
              </div>
            </div>
          ) : user ? (
            <div className="flex items-center gap-3 mt-4 group">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-navy text-white font-bold ring-2 ring-transparent group-hover:ring-navy-light transition-all duration-150">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-label-md text-label-md truncate max-w-[120px] text-ink">{user.displayName || 'Citizen'}</p>
                {isAuthority ? (
                  <p className="font-caption text-caption text-sage font-bold uppercase tracking-wider">Authority</p>
                ) : (
                  <div className="flex items-center gap-1 mt-0.5" title="Civic Score">
                    <span className="material-symbols-outlined text-[14px] text-terracotta">military_tech</span>
                    <span className="font-caption text-caption font-bold text-navy">{userDoc?.civicScore || 0} pts</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="font-caption text-caption text-muted mt-4">Guest Mode</div>
          )}
        </div>
        
        <div className="flex-1 px-4 font-label-md text-label-md overflow-y-auto">
          <Link
            to="/"
            className={`${isActive('/') ? 'bg-navy text-white shadow-sm' : 'text-muted hover:bg-navy-surface hover:text-navy'} font-bold rounded-lg flex items-center gap-4 px-4 py-3 cursor-pointer mb-1 transition-colors duration-150 ease-out`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive('/') ? "'FILL' 1" : "" }}>local_library</span>
            Public Ledger
          </Link>

          <Link
            to="/leaderboard"
            className={`${isActive('/leaderboard') ? 'bg-navy text-white shadow-sm' : 'text-muted hover:bg-navy-surface hover:text-navy'} font-bold rounded-lg flex items-center gap-4 px-4 py-3 cursor-pointer mb-1 transition-colors duration-150 ease-out`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive('/leaderboard') ? "'FILL' 1" : "" }}>emoji_events</span>
            Leaderboard
          </Link>

          {user && (
            <Link
              to="/profile"
              className={`${isActive('/profile') ? 'bg-navy text-white shadow-sm' : 'text-muted hover:bg-navy-surface hover:text-navy'} font-bold rounded-lg flex items-center gap-4 px-4 py-3 cursor-pointer mb-1 transition-colors duration-150 ease-out`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive('/profile') ? "'FILL' 1" : "" }}>person</span>
              My Profile
            </Link>
          )}

          {user && (
            <Link
              to="/my-reports"
              className={`${isActive('/my-reports') ? 'bg-navy text-white shadow-sm' : 'text-muted hover:bg-navy-surface hover:text-navy'} font-bold rounded-lg flex items-center gap-4 px-4 py-3 cursor-pointer mb-1 transition-colors duration-150 ease-out`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive('/my-reports') ? "'FILL' 1" : "" }}>folder_special</span>
              My Evidence Log
            </Link>
          )}

          {isAuthority && (
            <Link
              to="/authority"
              className={`${isActive('/authority') ? 'bg-navy text-white shadow-sm' : 'text-muted hover:bg-navy-surface hover:text-navy'} font-bold rounded-lg flex items-center gap-4 px-4 py-3 cursor-pointer mb-1 transition-colors duration-150 ease-out`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive('/authority') ? "'FILL' 1" : "" }}>admin_panel_settings</span>
              Authority Portal
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              className={`${isActive('/admin') ? 'bg-navy text-white shadow-sm' : 'text-muted hover:bg-navy-surface hover:text-navy'} font-bold rounded-lg flex items-center gap-4 px-4 py-3 cursor-pointer mb-1 transition-colors duration-150 ease-out`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive('/admin') ? "'FILL' 1" : "" }}>settings_applications</span>
              Admin Console
            </Link>
          )}

          <div className="mt-stack-lg px-4">
            {user ? (
              <Link to="/report/new" className="w-full bg-navy text-white h-12 rounded-lg flex items-center justify-center gap-2 font-label-md text-label-md hover:scale-[1.02] hover:shadow-md transition-all duration-150">
                <span className="material-symbols-outlined">add_a_photo</span>
                Log Evidence
              </Link>
            ) : (
              <Link to="/login" className="w-full bg-navy text-white h-12 rounded-lg flex items-center justify-center gap-2 font-label-md text-label-md hover:scale-[1.02] hover:shadow-md transition-all duration-150">
                <span className="material-symbols-outlined">login</span>
                Sign In
              </Link>
            )}
          </div>
        </div>
        
        {user && (
          <div className="px-4 mt-auto font-label-md text-label-md border-t border-border pt-stack-md">
            <button onClick={handleLogout} className="w-full text-terracotta hover:bg-terracotta/10 flex items-center gap-4 px-4 py-3 cursor-pointer rounded-lg mb-1 transition-colors duration-150">
              <span className="material-symbols-outlined">logout</span>
              Sign Out
            </button>
          </div>
        )}
      </nav>
    </>
  );
}
