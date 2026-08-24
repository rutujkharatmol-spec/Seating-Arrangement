import React, { useEffect, useMemo, useState } from 'react';
import { Seat, CategoryId, Attendee, QuestionnaireAnswers, Volunteer, CategoryInfo } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';
import {
  Armchair,
  User,
  Ban,
  Check,
  Trash2,
  Tag,
  Rows3,
  LayoutGrid,
  UserPlus,
  Paintbrush,
  Sliders,
  Sparkles,
  RotateCcw,
  Shield,
  Edit2,
  Plus,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Settings,
  Layers,
  ArrowLeftRight
} from 'lucide-react';
import { validateQuestionnaire } from '../../utils/seatAlgorithms';

export interface SeatInspectorProps {
  selectedSeats: Seat[];
  unassignedAttendees: Attendee[];
  onUpdateSeatsCategory: (seatIds: string[], categoryId: CategoryId) => void;
  onSaveAttendee: (seatId: string, attendee: Partial<Attendee>) => void;
  onAssignExistingAttendee: (seatId: string, attendeeId: string) => void;
  onClearSeat: (seatId: string) => void;
  onToggleBlockedSeats: (seatIds: string[], isBlocked: boolean) => void;
  onClearSelection: () => void;
  onSelectRow?: (seat: Seat) => void;
  onSelectZone?: (seat: Seat) => void;
  onSwapSeats?: (seatIdA: string, seatIdB: string) => void;

  // Direct editing additions
  categories?: Record<string, CategoryInfo>;
  onOpenSectionManager?: () => void;
  answers?: QuestionnaireAnswers;
  onApplyAnswers?: (answers: QuestionnaireAnswers) => void;
  paintCategory?: CategoryId | null;
  onSetPaintCategory?: (cat: CategoryId | null) => void;
  volunteers?: Volunteer[];
  onAddVolunteer?: (vol: Volunteer) => void;
  onUpdateVolunteer?: (vol: Volunteer) => void;
  onDeleteVolunteer?: (id: string) => void;
}

const EMPTY_FORM = { name: '', title: '', dept: '', email: '', phone: '' };

export const SeatInspector: React.FC<SeatInspectorProps> = ({
  selectedSeats,
  unassignedAttendees,
  onUpdateSeatsCategory,
  onSaveAttendee,
  onAssignExistingAttendee,
  onClearSeat,
  onToggleBlockedSeats,
  onClearSelection,
  onSelectRow,
  onSelectZone,
  categories = CATEGORIES,
  onOpenSectionManager,
  answers,
  onApplyAnswers,
  paintCategory,
  onSetPaintCategory,
  volunteers = [],
  onAddVolunteer,
  onUpdateVolunteer,
  onDeleteVolunteer,
  onSwapSeats,
}) => {
  const singleSeat = selectedSeats.length === 1 ? selectedSeats[0] : null;
  const isMultiple = selectedSeats.length > 1;

  // Sidebar sub-tab when no seat selected
  const [sidebarTab, setSidebarTab] = useState<'counts' | 'paint' | 'volunteers'>('counts');

  // Form for single seat attendee
  const [form, setForm] = useState(EMPTY_FORM);

  // Form for seat counts (if answers provided)
  const [countForm, setCountForm] = useState<QuestionnaireAnswers>(() => {
    return answers || {
      eventTitle: 'Seating Arrangement (Auditorium, AIIMS Kalyani)',
      departmentName: 'Department of Physiology',
      numVip: 52,
      numSeniorFaculty: 54,
      numFaculty: 182,
      numAwardees: 49,
      numReporters: 39,
      numAccompanying: 89,
      numBandParty: 39,
      numConsole: 35,
      numBlocked: 54,
      numAudience: 174,
      totalSeats: 763,
      notes: '',
    };
  });

  // Volunteer editing
  const [editingVolId, setEditingVolId] = useState<string | null>(null);
  const [volName, setVolName] = useState('');
  const [volRole, setVolRole] = useState('');
  const [volLocation, setVolLocation] = useState('');
  const [volPhone, setVolPhone] = useState('');
  const [volGate, setVolGate] = useState('Gate-1');

  useEffect(() => {
    if (answers) setCountForm(answers);
  }, [answers]);

  useEffect(() => {
    const att = singleSeat?.attendee;
    setForm(
      att
        ? {
            name: att.name ?? '',
            title: att.designation ?? att.title ?? '',
            dept: att.department ?? '',
            email: att.email ?? '',
            phone: att.phone ?? '',
          }
        : EMPTY_FORM
    );
  }, [singleSeat?.id, singleSeat?.attendee?.id]);

  const seatIds = useMemo(() => selectedSeats.map((s) => s.id), [selectedSeats]);

  const matchingUnassigned = useMemo(() => {
    if (!singleSeat) return [];
    const sameZone = unassignedAttendees.filter((a) => a.categoryId === singleSeat.categoryId);
    const others = unassignedAttendees.filter((a) => a.categoryId !== singleSeat.categoryId);
    return [...sameZone, ...others].slice(0, 200);
  }, [singleSeat, unassignedAttendees]);

  const validation = validateQuestionnaire(countForm, countForm.totalSeats || 763);

  const handleCountChange = (key: keyof QuestionnaireAnswers, val: number) => {
    setCountForm((prev) => ({
      ...prev,
      [key]: Math.max(0, val),
    }));
  };

  const handleAutoBalanceAudience = () => {
    const currentWithoutAudience =
      countForm.numVip +
      countForm.numSeniorFaculty +
      countForm.numFaculty +
      countForm.numAwardees +
      countForm.numReporters +
      countForm.numAccompanying +
      countForm.numBandParty +
      countForm.numConsole +
      countForm.numBlocked;

    const remainingForAudience = Math.max(0, (countForm.totalSeats || 763) - currentWithoutAudience);

    setCountForm((prev) => ({
      ...prev,
      numAudience: remainingForAudience,
    }));
  };

  const handleApplyCounts = (e: React.FormEvent) => {
    e.preventDefault();
    if (onApplyAnswers) {
      onApplyAnswers(countForm);
    }
  };

  const handleSaveAttendee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleSeat) return;

    if (!form.name.trim()) {
      onClearSeat(singleSeat.id);
      return;
    }

    onSaveAttendee(singleSeat.id, {
      id: singleSeat.attendee?.id,
      name: form.name.trim(),
      designation: form.title.trim(),
      department: form.dept.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      categoryId: singleSeat.categoryId,
      seatId: singleSeat.id,
    });
  };

  const handleSaveVolunteer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!volName.trim()) return;

    if (editingVolId) {
      const existing = volunteers.find((v) => v.id === editingVolId);
      if (existing && onUpdateVolunteer) {
        onUpdateVolunteer({
          ...existing,
          name: volName.trim(),
          role: volRole.trim() || 'Usher',
          location: volLocation.trim() || 'Aisle',
          phone: volPhone.trim(),
          gate: volGate,
        });
      }
      setEditingVolId(null);
    } else if (onAddVolunteer) {
      onAddVolunteer({
        id: `vol-${Date.now()}`,
        name: volName.trim(),
        role: volRole.trim() || 'Usher',
        location: volLocation.trim() || 'Gate Checkpoint',
        phone: volPhone.trim(),
        gate: volGate,
        x: 500,
        y: 500,
      });
    }

    setVolName('');
    setVolRole('');
    setVolLocation('');
    setVolPhone('');
  };

  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const activeCategoryList = Object.values(categories).filter((c) => c.id !== 'available');

  // =========================================================================
  // VIEW 1: SEATS ARE SELECTED (Single or Multi-Seat Inspector)
  // =========================================================================
  if (selectedSeats.length > 0) {
    return (
      <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-xl text-slate-900 space-y-4 animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 shrink-0">
              <Armchair className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-black text-slate-900 font-mono truncate">
                {isMultiple ? `${selectedSeats.length} Seats Selected` : `Seat ${singleSeat!.id}`}
              </h3>
              <p className="text-[10px] text-slate-500 truncate">
                {isMultiple
                  ? seatIds.slice(0, 4).join(', ') + (selectedSeats.length > 4 ? ` +${selectedSeats.length - 4} more` : '')
                  : `${singleSeat!.blockName} • Row ${singleSeat!.row}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClearSelection}
            className="text-[11px] text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 transition cursor-pointer font-bold shrink-0"
          >
            Deselect
          </button>
        </div>

        {/* 🔀 1-Click Swap Seats Card (When exactly 2 seats are selected) */}
        {selectedSeats.length === 2 && onSwapSeats && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                <span>Quick Swap Guests / Seats</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-800">
                2 Seats Selected
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Seat A */}
              <div className="p-2.5 rounded-xl bg-white border border-blue-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Seat A</span>
                  <span className="font-mono font-black text-blue-700">{selectedSeats[0].id}</span>
                </div>
                <div className="font-bold text-slate-900 truncate">
                  {selectedSeats[0].attendee ? selectedSeats[0].attendee.name : <em className="text-slate-400 font-normal">Empty Seat</em>}
                </div>
                {selectedSeats[0].attendee?.designation && (
                  <div className="text-[10px] text-slate-500 truncate">
                    {selectedSeats[0].attendee.designation}
                  </div>
                )}
              </div>

              {/* Seat B */}
              <div className="p-2.5 rounded-xl bg-white border border-blue-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Seat B</span>
                  <span className="font-mono font-black text-blue-700">{selectedSeats[1].id}</span>
                </div>
                <div className="font-bold text-slate-900 truncate">
                  {selectedSeats[1].attendee ? selectedSeats[1].attendee.name : <em className="text-slate-400 font-normal">Empty Seat</em>}
                </div>
                {selectedSeats[1].attendee?.designation && (
                  <div className="text-[10px] text-slate-500 truncate">
                    {selectedSeats[1].attendee.designation}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSwapSeats(selectedSeats[0].id, selectedSeats[1].id)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Swap Occupants ({selectedSeats[0].id} ⇄ {selectedSeats[1].id})</span>
            </button>
          </div>
        )}

        {/* Quick Row / Zone Selection Buttons */}
        {(onSelectRow || onSelectZone) && singleSeat && (
          <div className="flex flex-wrap gap-1.5">
            {onSelectRow && (
              <button
                type="button"
                onClick={() => onSelectRow(singleSeat)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer"
              >
                <Rows3 className="w-3 h-3 text-blue-600" />
                Select Row {singleSeat.row}
              </button>
            )}
            {onSelectZone && (
              <button
                type="button"
                onClick={() => onSelectZone(singleSeat)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer"
              >
                <LayoutGrid className="w-3 h-3 text-blue-600" />
                Select All {categories[singleSeat.categoryId]?.shortName ?? 'Zone'}
              </button>
            )}
          </div>
        )}

        {/* Category Reassignment Buttons */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Tag className="w-3 h-3 text-blue-600" />
              <span>Set Zone for {isMultiple ? `All ${selectedSeats.length} Seats` : 'This Seat'}:</span>
            </label>

            {onOpenSectionManager && (
              <button
                type="button"
                onClick={onOpenSectionManager}
                className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
              >
                + Custom Section
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1 max-h-52 overflow-y-auto pr-0.5 scrollbar-thin">
            {activeCategoryList.map((cat) => {
              const isActive = !isMultiple && singleSeat!.categoryId === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onUpdateSeatsCategory(seatIds, cat.id)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer shadow-2xs ${
                    isActive ? 'ring-2 ring-slate-900 scale-[1.02]' : 'hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: cat.color,
                    color: cat.textColor,
                    borderColor: cat.borderColor,
                  }}
                >
                  <span className="truncate">{cat.shortName}</span>
                  {isActive && <Check className="w-3 h-3 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Block / Unblock Quick Action */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-1">
          <span className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
            <Ban className="w-3 h-3 text-rose-600" />
            <span>Availability:</span>
          </span>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onToggleBlockedSeats(seatIds, true)}
              className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 transition cursor-pointer"
            >
              Block ({selectedSeats.length})
            </button>
            <button
              type="button"
              onClick={() => onToggleBlockedSeats(seatIds, false)}
              className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
            >
              Unblock
            </button>
          </div>
        </div>

        {/* Assign Guest Name (Single Seat Only) */}
        {singleSeat && (
          <div className="pt-2.5 border-t border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Guest Assignment:</span>
              </label>
              {singleSeat.attendee && (
                <button
                  type="button"
                  onClick={() => onClearSeat(singleSeat.id)}
                  className="text-[10px] text-rose-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  Clear
                </button>
              )}
            </div>

            {/* Quick Assign from Unassigned Roster */}
            {matchingUnassigned.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) onAssignExistingAttendee(singleSeat.id, e.target.value);
                }}
                className="w-full bg-emerald-50/80 border border-emerald-300 rounded-lg px-2 py-1 text-[11px] text-slate-900 font-medium focus:outline-none cursor-pointer"
              >
                <option value="">Choose from {unassignedAttendees.length} unseated guest{unassignedAttendees.length === 1 ? '' : 's'}…</option>
                {matchingUnassigned.slice(0, 30).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({categories[a.categoryId]?.shortName ?? a.categoryId})
                  </option>
                ))}
              </select>
            )}

            {/* Form */}
            <form onSubmit={handleSaveAttendee} className="space-y-1.5">
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="Guest Full Name (e.g. Dr. Rajesh Verma)"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-medium placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />

              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={form.title}
                  onChange={set('title')}
                  placeholder="Designation"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <input
                  type="text"
                  value={form.dept}
                  onChange={set('dept')}
                  placeholder="Department"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition active:scale-98 cursor-pointer"
              >
                {singleSeat.attendee ? 'Update Guest' : 'Seat Guest'}
              </button>
            </form>
          </div>
        )}

      </div>
    );
  }

  // =========================================================================
  // VIEW 2: NO SEAT SELECTED -> COMPLETE DIRECT EDITING SIDEBAR DASHBOARD
  // =========================================================================
  return (
    <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-xl text-slate-900 space-y-3.5 animate-fade-in">
      
      {/* Direct Editing Tabs */}
      <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
        <button
          type="button"
          onClick={() => setSidebarTab('counts')}
          className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
            sidebarTab === 'counts'
              ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🔢 Counts</span>
        </button>

        <button
          type="button"
          onClick={() => setSidebarTab('paint')}
          className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
            sidebarTab === 'paint'
              ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🎨 Paint</span>
        </button>

        <button
          type="button"
          onClick={() => setSidebarTab('volunteers')}
          className={`flex-1 py-1.5 rounded-lg transition cursor-pointer text-center ${
            sidebarTab === 'volunteers'
              ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🧑‍💼 Volunteers ({volunteers.length})</span>
        </button>
      </div>

      {/* -------------------- 1. SEAT COUNTS EDITOR TAB -------------------- */}
      {sidebarTab === 'counts' && (
        <form onSubmit={handleApplyCounts} className="space-y-3 text-xs">
          
          {/* Balance status pill */}
          <div className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] ${
            validation.isValid && validation.difference === 0
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
              : validation.difference > 0
              ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
              : 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
          }`}>
            <span>Total: {validation.totalRequested} / {countForm.totalSeats || 763}</span>
            {validation.difference !== 0 && (
              <button
                type="button"
                onClick={handleAutoBalanceAudience}
                className="text-amber-800 hover:underline font-extrabold cursor-pointer"
              >
                Auto-Balance ✓
              </button>
            )}
          </div>

          {/* Stepper Grid for Default Categories */}
          <div className="grid grid-cols-2 gap-1.5 max-h-[340px] overflow-y-auto pr-0.5 scrollbar-thin">
            {activeCategoryList.map((cat) => {
              const keyMap: Record<string, keyof QuestionnaireAnswers> = {
                vip: 'numVip',
                faculty: 'numFaculty',
                senior_faculty: 'numSeniorFaculty',
                awardees: 'numAwardees',
                reporters: 'numReporters',
                accompanying: 'numAccompanying',
                band_party: 'numBandParty',
                console: 'numConsole',
                audience: 'numAudience',
                blocked: 'numBlocked',
              };
              const key = keyMap[cat.id];
              const count = key ? (countForm as any)[key] ?? 0 : 0;

              return (
                <div
                  key={cat.id}
                  className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex flex-col justify-between"
                  style={{ borderColor: cat.borderColor }}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 mb-1">
                    <span className="truncate">{cat.shortName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{key ? count : 'custom'}</span>
                  </div>

                  {key ? (
                    <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleCountChange(key, count - 5)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={count}
                        onChange={(e) => handleCountChange(key, parseInt(e.target.value) || 0)}
                        className="w-10 text-center text-xs font-mono font-bold text-slate-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleCountChange(key, count + 5)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic py-1">
                      Use Paint tool on map
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {onOpenSectionManager && (
            <button
              type="button"
              onClick={onOpenSectionManager}
              className="w-full py-1.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Add, Edit or Delete Sections</span>
            </button>
          )}

          <button
            type="submit"
            className="w-full py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Apply & Recalculate Seating Plan</span>
          </button>
        </form>
      )}

      {/* -------------------- 2. PAINT BRUSH TOOL TAB -------------------- */}
      {sidebarTab === 'paint' && (
        <div className="space-y-3 text-xs">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-[11px] leading-relaxed">
            <p className="font-bold flex items-center gap-1 mb-0.5">
              <Paintbrush className="w-3.5 h-3.5 text-blue-600" />
              <span>Direct Click-to-Paint Tool</span>
            </p>
            Pick a section below, then click any chair on the map to instantly change its zone!
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-0.5 scrollbar-thin">
            {activeCategoryList.map((cat) => {
              const isBrushActive = paintCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSetPaintCategory && onSetPaintCategory(isBrushActive ? null : cat.id)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                    isBrushActive ? 'ring-2 ring-slate-900 scale-105 font-black shadow-md' : 'hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: cat.color,
                    color: cat.textColor,
                    borderColor: cat.borderColor,
                  }}
                >
                  <span className="truncate">{cat.shortName}</span>
                  {isBrushActive && <Paintbrush className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>

          {onOpenSectionManager && (
            <button
              type="button"
              onClick={onOpenSectionManager}
              className="w-full py-1.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Custom Section</span>
            </button>
          )}

          {paintCategory && (
            <button
              type="button"
              onClick={() => onSetPaintCategory && onSetPaintCategory(null)}
              className="w-full py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition cursor-pointer"
            >
              Turn Off Paintbrush (Normal Mode)
            </button>
          )}
        </div>
      )}

      {/* -------------------- 3. VOLUNTEERS EDITOR TAB -------------------- */}
      {sidebarTab === 'volunteers' && (
        <div className="space-y-3 text-xs">
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5 scrollbar-thin">
            {volunteers.map((vol) => (
              <div
                key={vol.id}
                className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-1 shadow-2xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">{vol.name}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold">{vol.role} • {vol.gate || 'Gate-1'}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVolId(vol.id);
                      setVolName(vol.name);
                      setVolRole(vol.role);
                      setVolLocation(vol.location);
                      setVolPhone(vol.phone || '');
                      setVolGate(vol.gate || 'Gate-1');
                    }}
                    className="p-1 rounded text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  {onDeleteVolunteer && (
                    <button
                      type="button"
                      onClick={() => onDeleteVolunteer(vol.id)}
                      className="p-1 rounded text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add / Edit Form */}
          <form onSubmit={handleSaveVolunteer} className="pt-2 border-t border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-800 text-[11px]">
              {editingVolId ? 'Edit Volunteer Checkpoint' : 'Add New Volunteer'}
            </div>

            <input
              type="text"
              value={volName}
              onChange={(e) => setVolName(e.target.value)}
              placeholder="Volunteer Name"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-medium focus:outline-none"
              required
            />

            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                value={volRole}
                onChange={(e) => setVolRole(e.target.value)}
                placeholder="Role (e.g. VIP Usher)"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] text-slate-900 focus:outline-none"
              />
              <select
                value={volGate}
                onChange={(e) => setVolGate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-1.5 py-1 text-[11px] text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="Gate-1">Gate-1</option>
                <option value="Gate-2">Gate-2</option>
                <option value="Balcony Gate">Balcony</option>
                <option value="Stage/VIP">Stage</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              {editingVolId ? 'Update Volunteer' : 'Add Volunteer'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
};
