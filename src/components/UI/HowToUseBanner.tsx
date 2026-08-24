import React, { useState } from 'react';
import { HelpCircle, X, Search, Sparkles, Printer, MousePointerClick, CheckCircle2 } from 'lucide-react';

interface HowToUseBannerProps {
  onOpenWizard: () => void;
}

export const HowToUseBanner: React.FC<HowToUseBannerProps> = ({ onOpenWizard }) => {
  const [isOpen, setIsOpen] = useState(() => {
    return localStorage.getItem('aiims_hide_guide') !== 'true';
  });

  if (!isOpen) {
    return (
      <div className="bg-blue-50 border-b border-blue-100 px-4 py-1.5 flex items-center justify-between text-xs text-blue-900">
        <span className="flex items-center gap-1.5 font-medium">
          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>New to this seating system?</span>
        </span>
        <button
          onClick={() => {
            setIsOpen(true);
            localStorage.removeItem('aiims_hide_guide');
          }}
          className="text-blue-700 hover:text-blue-950 font-bold underline cursor-pointer text-[11px]"
        >
          Show Quick Guide (3 Simple Steps)
        </button>
      </div>
    );
  }

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem('aiims_hide_guide', 'true');
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-b border-blue-200 px-4 py-3 text-slate-800 relative shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        
        {/* Title */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-blue-950 uppercase tracking-wide">
              How to use this Seating Manager in 3 Easy Steps:
            </h3>
          </div>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto text-xs">
          
          <div className="flex items-center gap-2 bg-white/90 p-2 rounded-lg border border-blue-200 shadow-2xs">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
              1
            </span>
            <div>
              <p className="font-bold text-slate-900 leading-tight">Find or Click Any Seat</p>
              <p className="text-[11px] text-slate-500">Hover/click a chair to see guest name & gate</p>
            </div>
          </div>

          <div 
            onClick={onOpenWizard}
            className="flex items-center gap-2 bg-white/90 p-2 rounded-lg border border-amber-300 hover:border-amber-400 shadow-2xs cursor-pointer group transition"
          >
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
              2
            </span>
            <div>
              <p className="font-bold text-amber-900 leading-tight group-hover:underline flex items-center gap-1">
                <span>Change Seat Counts</span>
                <Sparkles className="w-3 h-3 text-amber-600" />
              </p>
              <p className="text-[11px] text-slate-500">Answer quick questions to auto-arrange seats</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/90 p-2 rounded-lg border border-blue-200 shadow-2xs">
            <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
              3
            </span>
            <div>
              <p className="font-bold text-slate-900 leading-tight">Print Maps & Badges</p>
              <p className="text-[11px] text-slate-500">Print Gate 1/2 usher sheets or guest passes</p>
            </div>
          </div>

        </div>

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-white/80 transition cursor-pointer self-end md:self-center"
          title="Hide this guide"
        >
          <X className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};
