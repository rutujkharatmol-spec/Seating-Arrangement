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
  X,
  Compass,
  QrCode,
  FileSpreadsheet,
  Cloud,
  Lock,
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
  onOpenSpreadsheetModal?: () => void;
  onExportJson: () => void;
  onOpenBackup?: () => void;
  onLaunchKiosk?: () => void;
  onOpenCloudSync?: () => void;
  onLockDashboard?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  eventTitle,
  departmentName,
  totalSeats,
  assignedSeatsCount,
  rosterCount = 0,
  canUndo = false,
  canRedo = false,
  undoLabel,
  redoLabel,
  onUndo,
  onRedo,
  onApplyPreset,
  onResetToDefault,
  onClearAllSeating,
  onRegenerateLayout,
  onOpenQuestionnaire,
  onOpenSpreadsheetModal,
  onExportJson,
  onOpenBackup,
  onLaunchKiosk,
  onOpenCloudSync,
  onLockDashboard,
}) => {
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Branding & Event Identity */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-blue-700 uppercase">
                AIIMS KALYANI
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                Auditorium Management
              </span>
            </div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none mt-0.5 truncate max-w-xs sm:max-w-md md:max-w-lg">
              {eventTitle || 'Auditorium Seating Arrangement'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {departmentName ? `${departmentName} • ` : ''}
              Total Capacity: <strong>{totalSeats} Seats</strong>
            </p>
          </div>
        </div>

        {/* Center: Main Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'map'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Map & Floor</span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Live Editor</span>
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'roster'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span>Guest List</span>
            {rosterCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 font-extrabold">
                {rosterCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('print')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'print'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-emerald-600" />
            <span>Print Charts</span>
          </button>
        </div>

        {/* Right: Quick Actions, Undo/Redo, Wizard & Kiosk */}
        <div className="flex items-center gap-2">
          
          {/* Undo / Redo */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1.5 rounded-lg transition ${
                canUndo ? 'text-slate-700 hover:bg-white cursor-pointer shadow-2xs' : 'text-slate-300 cursor-not-allowed'
              }`}
              title={undoLabel ? `Undo: ${undoLabel} (Ctrl+Z)` : 'Undo (Ctrl+Z)'}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded-lg transition ${
                canRedo ? 'text-slate-700 hover:bg-white cursor-pointer shadow-2xs' : 'text-slate-300 cursor-not-allowed'
              }`}
              title={redoLabel ? `Redo: ${redoLabel} (Ctrl+Y)` : 'Redo (Ctrl+Y)'}
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Upload Excel Button */}
          {onOpenSpreadsheetModal && (
            <button
              onClick={onOpenSpreadsheetModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs shadow-2xs transition active:scale-98 cursor-pointer"
              title="Upload student list or guest roster spreadsheet (.xlsx, .xls, .csv)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Upload Excel</span>
            </button>
          )}

          {/* Quick Auto-Arrange Wizard */}
          <button
            onClick={onOpenQuestionnaire}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs shadow-xs shadow-amber-500/20 transition active:scale-98 cursor-pointer"
            title="Auto-calculate seating blueprint based on participant counts"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Arrange</span>
          </button>

          {/* Guest Find My Seat Kiosk Launcher */}
          {onLaunchKiosk && (
            <button
              onClick={onLaunchKiosk}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-xs transition active:scale-98 cursor-pointer"
              title="Launch Guest Self-Service Seat Finder & Direction Kiosk (/seattracker)"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Guest Kiosk</span>
              <span className="text-[10px] font-mono text-emerald-300">/seattracker</span>
            </button>
          )}

          {/* Online Cloud Sync & Mobile QR Code */}
          {onOpenCloudSync && (
            <button
              onClick={onOpenCloudSync}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 font-extrabold text-xs shadow-2xs transition active:scale-98 cursor-pointer"
              title="Publish seating plan online & generate Mobile QR Code for guests"
            >
              <Cloud className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span className="hidden sm:inline">Online Sync & QR</span>
            </button>
          )}

          {/* Preset Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPresetDropdown(!showPresetDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs transition cursor-pointer"
            >
              <span>Presets</span>
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

          {/* Lock Dashboard */}
          {onLockDashboard && (
            <button
              onClick={onLockDashboard}
              className="p-2 rounded-xl text-slate-600 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 border border-slate-200 transition cursor-pointer"
              title="Lock Organizer Portal (Requires PIN 0907 to re-enter)"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

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
                Hover on any chair on the map to see who sits there and which door to enter. Click on a chair to assign a guest name or paint categories.
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <strong className="text-amber-950 font-bold block mb-0.5">2. Change Seat Numbers (Wizard)</strong>
                Click <strong>"Auto-Arrange"</strong> to answer simple counts (e.g. 52 VIPs, 182 Faculty). The computer will instantly arrange all seats!
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <strong className="text-emerald-950 font-bold block mb-0.5">3. 🔍 Guest "Find My Seat" Kiosk (/seattracker)</strong>
                Attendees arriving at the lobby can scan the entrance QR Code or visit <strong>/seattracker</strong> on mobile/tablet to find their seat code, entry gate, and see a pulsing map pin!
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                <strong className="text-purple-950 font-bold block mb-0.5">4. Print Entry Sheets & Badges</strong>
                Go to the Print tab to print ready-made seating charts for Gate 1 and Gate 2, or print entrance pass badges for guests.
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between">
              {onLaunchKiosk && (
                <button
                  type="button"
                  onClick={() => {
                    setShowHelpModal(false);
                    onLaunchKiosk();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Open Kiosk Mode</span>
                </button>
              )}
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-sm ml-auto"
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
