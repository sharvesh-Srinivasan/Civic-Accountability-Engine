import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, userDoc, isAuthority, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  // Wait to load fully before rendering auth-dependent nav items
  if (user === undefined) return null;
  if (location.pathname === '/login' || location.pathname === '/onboarding') return null;

  return (
    <>
      {/* Mobile TopNav (Visible only on md:hidden) */}
      <header className="md:hidden bg-surface-container-lowest dark:bg-surface-container-low text-primary dark:text-primary-fixed-dim w-full h-16 border-b border-outline-variant dark:border-outline flex justify-between items-center px-margin-mobile fixed top-0 z-50">
        <div className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim">
          CivicConnect
        </div>
        <div className="flex gap-4">
          <span className="material-symbols-outlined cursor-pointer active:opacity-80">account_circle</span>
          <span className="material-symbols-outlined cursor-pointer active:opacity-80">notifications</span>
        </div>
      </header>

      {/* SideNavBar (Hidden on Mobile) */}
      <nav className="hidden md:flex bg-surface-container-low dark:bg-surface-container-lowest text-primary dark:text-primary-fixed-dim h-full w-64 fixed left-0 top-0 border-r border-outline-variant dark:border-outline flex-col py-stack-lg z-50">
        <div className="px-gutter mb-stack-lg">
          <div className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim mb-2">
            CivicConnect
          </div>
          {user ? (
            <div className="flex items-center gap-3 mt-4">
              <div className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center bg-primary text-on-primary font-bold">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-label-md text-label-md truncate max-w-[120px]">{user.displayName || 'Citizen'}</p>
                {isAuthority && <p className="font-caption text-caption text-secondary">Authority</p>}
              </div>
            </div>
          ) : (
            <div className="font-caption text-caption text-outline mt-4">Guest Mode</div>
          )}
        </div>
        
        <div className="flex-1 px-4 font-label-md text-label-md overflow-y-auto">
          {/* Active Tab: Dashboard */}
          <Link
            to="/"
            className={`${isActive('/') ? 'bg-primary-fixed dark:bg-primary-container text-on-primary-fixed dark:text-on-primary-container' : 'text-on-surface-variant dark:text-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-variant'} font-bold rounded-lg flex items-center gap-4 px-4 py-3 cursor-pointer mb-1 transition-all`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive('/') ? "'FILL' 1" : "" }}>dashboard</span>
            Dashboard
          </Link>

          {user && (
            <Link
              to="/my-reports"
              className={`${isActive('/my-reports') ? 'bg-primary-fixed dark:bg-primary-container text-on-primary-fixed' : 'text-on-surface-variant hover:bg-surface-container-high'} font-bold rounded-lg flex items-center gap-4 px-4 py-3 cursor-pointer mb-1 transition-all`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive('/my-reports') ? "'FILL' 1" : "" }}>assignment</span>
              My Reports
            </Link>
          )}

          {isAuthority && (
            <Link
              to="/authority"
              className={`${isActive('/authority') ? 'bg-primary-fixed dark:bg-primary-container text-on-primary-fixed' : 'text-on-surface-variant hover:bg-surface-container-high'} font-bold rounded-lg flex items-center gap-4 px-4 py-3 cursor-pointer mb-1 transition-all`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive('/authority') ? "'FILL' 1" : "" }}>admin_panel_settings</span>
              Authority Portal
            </Link>
          )}

          <div className="mt-stack-lg px-4">
            {user ? (
              <Link to="/report/new" className="w-full bg-primary text-on-primary h-12 rounded flex items-center justify-center gap-2 font-label-md text-label-md hover:bg-primary-container transition-colors">
                <span className="material-symbols-outlined">add</span>
                Report Issue
              </Link>
            ) : (
              <Link to="/login" className="w-full bg-primary text-on-primary h-12 rounded flex items-center justify-center gap-2 font-label-md text-label-md hover:bg-primary-container transition-colors">
                <span className="material-symbols-outlined">login</span>
                Sign In
              </Link>
            )}
          </div>
        </div>
        
        {user && (
          <div className="px-4 mt-auto font-label-md text-label-md border-t border-outline-variant pt-stack-md">
            <button onClick={handleLogout} className="w-full text-error hover:bg-error-container flex items-center gap-4 px-4 py-3 cursor-pointer rounded-lg mb-1 transition-all">
              <span className="material-symbols-outlined">logout</span>
              Sign Out
            </button>
          </div>
        )}
      </nav>
    </>
  );
}
