import React, { useState } from 'react';
import { 
  Building2, 
  Sparkles, 
  Users, 
  Printer, 
  Map, 
  RotateCcw, 
  Download, 
  Upload,
  ChevronDown,
  HelpCircle,
  Undo2,
  Redo2,
  Trash2,
  X
} from 'lucide-react';
import { PRESET_TEMPLATES } from '../data/presetTemplates';
import { SeatingPreset } from '../types/seating';

export interface HeaderProps {
  activeTab: 'map' | 'editor' | 'roster' | 'print';
  setActiveTab: (tab: 'map' | 'editor' | 'roster' | 'print') => void;
  eventTitle: string;
  departmentName: string;
  totalSeats: number;
  assignedSeatsCount: number;
  rosterCount?: number;
  canUndo?: boolean;
  canRedo?: boolean;
  undoLabel?: string | null;
  redoLabel?: string | null;
  onUndo?: () => void;
  onRedo?: () => void;
  onApplyPreset: (preset: SeatingPreset) => void;
  onResetToDefault: () => void;
  onClearAllSeating?: () => void;
  onRegenerateLayout?: () => void;
  onOpenQuestionnaire: () => void;
  onExportJson: () => void;
  onOpenBackup?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  eventTitle,
  departmentName,
  totalSeats,
  assignedSeatsCount,
  rosterCount,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  onUndo,
  onRedo,
  onApplyPreset,
  onResetToDefault,
  onClearAllSeating,
  onRegenerateLayout,
  onOpenQuestionnaire,
  onExportJson,
  onOpenBackup,
}) => {
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight">
                AIIMS Kalyani <span className="font-semibold text-blue-700">Auditorium Seating Manager</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                {totalSeats} Total Seats
              </span>
            </div>
            <p className="text-xs text-slate-500 line-clamp-1">
              {departmentName} • {eventTitle}
            </p>
          </div>
        </div>

        {/* Big Friendly Navigation Tabs */}
        <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner flex-wrap">
          
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'map'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <Map className="w-4 h-4" />
            <span>1. Auditorium Map</span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-700" />
            <span>2. Auto-Arrange Wizard</span>
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'roster'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Guest List ({rosterCount ?? assignedSeatsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('print')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'print'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>4. Print & Export</span>
          </button>

        </nav>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          
          {/* Undo / Redo */}
          {onUndo && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                title={undoLabel ? `Undo: ${undoLabel} (Ctrl+Z)` : 'Undo (Ctrl+Z)'}
                className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                title={redoLabel ? `Redo: ${redoLabel} (Ctrl+Y)` : 'Redo (Ctrl+Y)'}
                className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Wizard Trigger */}
          <button
            onClick={onOpenQuestionnaire}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 shadow-sm transition active:scale-95 cursor-pointer"
            title="Answer quick questions to automatically distribute seats"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quick Auto-Arrange</span>
          </button>

          {/* Preset Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPresetDropdown(!showPresetDropdown)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs transition cursor-pointer"
            >
              <span>Event Templates</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showPresetDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-50 animate-fade-in text-xs">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  Select Event Template:
                </div>
                {PRESET_TEMPLATES.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onApplyPreset(preset);
                      setShowPresetDropdown(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-bold text-slate-900">{preset.name}</span>
                    <span className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Help Button */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
            title="How to use this web application"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Reset Blueprint */}
          <button
            onClick={onResetToDefault}
            className="p-2 rounded-xl text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
            title="Reset Seating to Master Blueprint"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Open Backup */}
          {onOpenBackup && (
            <button
              onClick={onOpenBackup}
              className="p-2 rounded-xl text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 transition cursor-pointer"
              title="Open / Restore Backup JSON File"
            >
              <Upload className="w-4 h-4" />
            </button>
          )}

          {/* Backup JSON */}
          <button
            onClick={onExportJson}
            className="p-2 rounded-xl text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 transition cursor-pointer"
            title="Backup Configuration (JSON)"
          >
            <Download className="w-4 h-4" />
          </button>

        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 rounded-3xl p-6 shadow-2xl max-w-lg w-full text-slate-900 relative">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-blue-100 text-blue-700">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">How to Use This System</h3>
                <p className="text-xs text-slate-500">Super simple guide for event coordinators & staff</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <strong className="text-blue-950 font-bold block mb-0.5">1. View & Spotlight Chairs</strong>
                Hover on any chair on the map to see who sits there and which door to enter. Click on a chair to assign a guest name.
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <strong className="text-amber-950 font-bold block mb-0.5">2. Change Seat Numbers (Wizard)</strong>
                Click <strong>"Quick Auto-Arrange"</strong> or Tab 2 to answer simple questions (e.g. 52 VIPs, 182 Faculty). The computer will instantly arrange all seats!
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <strong className="text-emerald-950 font-bold block mb-0.5">3. Search & Guest List</strong>
                Type a name like "Dean" or a seat code like "C-A1" in the search box to find anyone instantly.
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                <strong className="text-purple-950 font-bold block mb-0.5">4. Print Entry Sheets & Badges</strong>
                Go to Tab 4 to print ready-made seating charts for Gate 1 and Gate 2, or print entrance pass badges for guests.
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                Got it, let's start!
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
