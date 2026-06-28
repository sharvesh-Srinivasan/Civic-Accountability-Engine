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
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
          <div className="bg-error-container text-on-error-container p-8 rounded-xl max-w-md w-full border border-error">
            <div className="flex justify-center mb-4">
              <span className="material-symbols-outlined text-[48px]">warning</span>
            </div>
            <h1 className="font-headline-md text-headline-md mb-2 text-center">Something went wrong.</h1>
            <p className="font-body-md text-body-md mb-6 text-center opacity-90">
              The application encountered an unexpected error.
            </p>
            <div className="flex justify-center">
              <button 
                onClick={() => window.location.reload()} 
                className="bg-error text-on-error px-6 py-2 rounded-md font-label-md text-label-md hover:bg-error/90 transition-colors shadow-sm"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
