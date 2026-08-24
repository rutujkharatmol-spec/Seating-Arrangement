import React, { useEffect, useRef, useState } from 'react';
import {
  Armchair,
  Settings2,
  Users,
  Printer,
  Download,
  RotateCcw,
  Sparkles,
  Building2,
  Undo2,
  Redo2,
  FolderOpen,
  ChevronDown,
  Eraser,
  LayoutGrid,
  Save,
} from 'lucide-react';
import { SeatingPreset } from '../types/seating';
import { PRESET_TEMPLATES } from '../data/presetTemplates';

type TabId = 'map' | 'editor' | 'roster' | 'print';

interface HeaderProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  eventTitle: string;
  departmentName: string;
  totalSeats: number;
  assignedSeatsCount: number;
  rosterCount: number;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  onUndo: () => void;
  onRedo: () => void;
  onApplyPreset: (preset: SeatingPreset) => void;
  onResetToDefault: () => void;
  onClearAllSeating: () => void;
  onRegenerateLayout: () => void;
  onOpenQuestionnaire: () => void;
  onExportJson: () => void;
  onOpenBackup: () => void;
}

const TABS: { id: TabId; label: string; icon: React.ReactNode; active: string }[] = [
  { id: 'map', label: 'Seating map', icon: <Armchair className="w-4 h-4" />, active: 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' },
  { id: 'editor', label: 'Setup', icon: <Settings2 className="w-4 h-4" />, active: 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30' },
  { id: 'roster', label: 'Guest list', icon: <Users className="w-4 h-4" />, active: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30' },
  { id: 'print', label: 'Print', icon: <Printer className="w-4 h-4" />, active: 'bg-purple-600 text-white shadow-sm shadow-purple-600/30' },
];

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the menu on an outside click or Escape, as a menu should.
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const runFromMenu = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <header className="no-print bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2.5">

        {/* Identity */}
        <div className="flex items-center gap-3 min-w-0 flex-1 lg:flex-none lg:max-w-sm">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-600/30 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1
              className="font-extrabold text-sm md:text-base tracking-tight text-slate-900 truncate"
              title={eventTitle}
            >
              {eventTitle}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              <span className="text-slate-700 font-semibold">{departmentName}</span>
              <span className="text-slate-300 mx-1.5">•</span>
              <span className="text-slate-600 font-semibold">{totalSeats} seats</span>
              <span className="text-slate-300 mx-1.5">•</span>
              <span className="text-emerald-700 font-bold">{assignedSeatsCount} of {rosterCount} guests seated</span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 shadow-inner order-3 lg:order-none w-full lg:w-auto lg:mx-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                activeTab === tab.id ? tab.active : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.id === 'roster' && rosterCount > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full font-extrabold ${
                  activeTab === 'roster' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {rosterCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">

          {/* Undo / redo — the safety net for everything else */}
          <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 p-0.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title={canUndo ? `Undo: ${undoLabel} (Ctrl+Z)` : 'Nothing to undo'}
              className="p-1.5 rounded-md text-slate-700 hover:text-blue-700 hover:bg-white disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed transition cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title={canRedo ? `Redo: ${redoLabel} (Ctrl+Shift+Z)` : 'Nothing to redo'}
              className="p-1.5 rounded-md text-slate-700 hover:text-blue-700 hover:bg-white disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed transition cursor-pointer"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenQuestionnaire}
            title="Answer a few questions to lay out the zones automatically"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-xs transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Setup wizard</span>
          </button>

          {/* Plan menu — everything file-shaped, out of the way but labelled */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-xs transition cursor-pointer"
            >
              <span>Plan</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl border border-slate-300 shadow-2xl p-1.5 z-50 text-xs"
              >
                <MenuItem
                  icon={<Save className="w-4 h-4 text-blue-600" />}
                  label="Save backup file"
                  hint="Downloads the whole plan as one .json file"
                  onClick={runFromMenu(onExportJson)}
                />
                <MenuItem
                  icon={<FolderOpen className="w-4 h-4 text-blue-600" />}
                  label="Open backup file"
                  hint="Restores a plan you saved earlier"
                  onClick={runFromMenu(onOpenBackup)}
                />

                <Divider />

                <div className="px-2.5 py-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Load an event preset
                  </label>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const preset = PRESET_TEMPLATES.find((t) => t.id === e.target.value);
                      if (preset) {
                        setMenuOpen(false);
                        onApplyPreset(preset);
                      }
                    }}
                    className="w-full bg-slate-50 hover:bg-white text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                  >
                    <option value="" disabled>Choose a preset…</option>
                    {PRESET_TEMPLATES.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                    ))}
                  </select>
                </div>

                <Divider />

                <MenuItem
                  icon={<LayoutGrid className="w-4 h-4 text-slate-500" />}
                  label="Rebuild seat layout"
                  hint="Redraws all seats using the current zone counts"
                  onClick={runFromMenu(onRegenerateLayout)}
                />
                <MenuItem
                  icon={<Eraser className="w-4 h-4 text-amber-600" />}
                  label="Empty every seat"
                  hint="Unseats all guests but keeps the guest list"
                  onClick={runFromMenu(onClearAllSeating)}
                />
                <MenuItem
                  icon={<RotateCcw className="w-4 h-4 text-rose-600" />}
                  label="Reset to master blueprint"
                  hint="Back to the standard AIIMS Kalyani arrangement"
                  danger
                  onClick={runFromMenu(onResetToDefault)}
                />

                <Divider />

                <p className="px-2.5 py-1.5 text-[10px] text-slate-500 leading-relaxed">
                  Your work saves automatically in this browser. Use{' '}
                  <strong className="text-slate-700">Save backup file</strong> before big changes or to
                  move the plan to another computer.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onExportJson}
            title="Save a backup file of the whole plan"
            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 shadow-xs transition cursor-pointer hidden sm:block"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};

const Divider = () => <div className="h-px bg-slate-200 my-1.5" />;

const MenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  hint: string;
  danger?: boolean;
  onClick: () => void;
}> = ({ icon, label, hint, danger, onClick }) => (
  <button
    role="menuitem"
    onClick={onClick}
    className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition cursor-pointer ${
      danger ? 'hover:bg-rose-50' : 'hover:bg-slate-100'
    }`}
  >
    <span className="mt-0.5 shrink-0">{icon}</span>
    <span className="min-w-0">
      <span className={`block font-bold ${danger ? 'text-rose-800' : 'text-slate-900'}`}>{label}</span>
      <span className="block text-[10px] text-slate-500 leading-snug">{hint}</span>
    </span>
  </button>
);
