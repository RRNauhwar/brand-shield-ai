import React from 'react';
import { Shield, Sparkles } from 'lucide-react';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-surface-0 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-brand-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-violet-600 to-cyan-500 flex items-center justify-center shadow-glow-brand text-white">
            <Shield className="w-7 h-7" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-none flex items-center gap-1.5">
              BrandShield <span className="text-brand-400">AI</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">
              Brand Intelligence & Governance Command Center
            </p>
          </div>
        </div>
      </div>

      {/* Auth Card Container */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-surface-1 py-8 px-6 shadow-2xl rounded-2xl border border-surface-border sm:px-10">
          {children}
        </div>

        {/* Security badge footer */}
        <div className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span>Gemini 2.5 Flash + Deterministic Governance Rules</span>
        </div>
      </div>
    </div>
  );
};
