import React from 'react';
import { getSavedLanguage } from '../lib/i18n';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    const lang = getSavedLanguage();
    return {
      hasError: true,
      message: error.message || (lang === 'en' ? 'An unexpected error occurred.' : 'অপ্রত্যাশিত ত্রুটি ঘটেছে।')
    };
  }

  render() {
    if (this.state.hasError) {
      const isEn = getSavedLanguage() === 'en';
      return (
        <div className="min-h-screen bg-[#0B1120] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
            <h2 className="text-xl font-bold text-rose-400">
              {isEn ? 'Something went wrong' : 'একটি সমস্যা হয়েছে'}
            </h2>
            <p className="text-sm text-slate-300 break-words">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors"
            >
              {isEn ? 'Reload Page' : 'পেজ রিলোড করুন'}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
