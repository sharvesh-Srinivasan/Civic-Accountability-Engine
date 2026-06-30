import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-paper p-6 relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-terracotta/5 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-navy/5 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="glass-panel border-white/40 p-10 rounded-3xl max-w-md w-full shadow-[0_8px_40px_rgba(31,38,135,0.12)] relative z-10 flex flex-col items-center text-center animate-fade-in-up">
            <div className="w-20 h-20 bg-terracotta/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-terracotta/20">
              <span className="material-symbols-outlined text-[40px] text-terracotta animate-pulse">construction</span>
            </div>
            
            <h1 className="font-serif text-3xl font-bold text-navy mb-3">We Hit a Bump!</h1>
            <p className="font-body-md text-muted mb-8 max-w-[280px]">
              Something went wrong under the hood, but your data is safe. Let's get you back on track.
            </p>
            
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={() => window.location.href = '/'} 
                className="w-full bg-navy text-white px-6 py-3 rounded-xl font-label-md font-bold uppercase tracking-widest hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-glow-navy transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">home</span> Return Home
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="w-full bg-white/50 border border-white/60 text-navy px-6 py-3 rounded-xl font-label-md font-bold uppercase tracking-widest hover:bg-white hover:-translate-y-0.5 hover:shadow-glass transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span> Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
