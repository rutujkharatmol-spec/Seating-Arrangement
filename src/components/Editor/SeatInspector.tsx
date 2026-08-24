import React, { useEffect, useMemo, useState } from 'react';
import { Seat, CategoryId, Attendee } from '../../types/seating';
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
} from 'lucide-react';

interface SeatInspectorProps {
  selectedSeats: Seat[];
  /** Roster entries with no seat yet, offered as a quick pick list. */
  unassignedAttendees: Attendee[];
  onUpdateSeatsCategory: (seatIds: string[], categoryId: CategoryId) => void;
  onSaveAttendee: (seatId: string, attendee: Partial<Attendee>) => void;
  onAssignExistingAttendee: (seatId: string, attendeeId: string) => void;
  onClearSeat: (seatId: string) => void;
  onToggleBlockedSeats: (seatIds: string[], isBlocked: boolean) => void;
  onClearSelection: () => void;
  /** Map-only helpers for grabbing a whole row or zone in one click. */
  onSelectRow?: (seat: Seat) => void;
  onSelectZone?: (seat: Seat) => void;
}

const CATEGORY_LIST: CategoryId[] = [
  'vip',
  'senior_faculty',
  'faculty',
  'awardees',
  'reporters',
  'accompanying',
  'console',
  'band_party',
  'audience',
  'blocked',
];

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
}) => {
  const singleSeat = selectedSeats.length === 1 ? selectedSeats[0] : null;
  const isMultiple = selectedSeats.length > 1;

  const [form, setForm] = useState(EMPTY_FORM);

  // Re-fill the form whenever a different seat is picked, otherwise the
  // previous guest's details linger and get saved onto the new seat.
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
    // Guests whose own category matches this seat's zone come first.
    const sameZone = unassignedAttendees.filter((a) => a.categoryId === singleSeat.categoryId);
    const others = unassignedAttendees.filter((a) => a.categoryId !== singleSeat.categoryId);
    return [...sameZone, ...others].slice(0, 200);
  }, [singleSeat, unassignedAttendees]);

  if (selectedSeats.length === 0) {
    return (
      <div className="bg-white border border-slate-300 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
        <Armchair className="w-12 h-12 mx-auto text-slate-400 mb-2" />
        <h3 className="text-sm font-bold text-slate-800">No seat selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          Click any chair on the auditorium map to change its zone, block it, or seat a guest.
          Hold <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">Shift</kbd> and
          drag to select many seats at once.
        </p>
      </div>
    );
  }

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

  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="bg-white border border-slate-300 rounded-2xl p-5 shadow-xl text-slate-900 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 shrink-0">
            <Armchair className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 font-mono truncate">
              {isMultiple ? `${selectedSeats.length} seats selected` : `Seat ${singleSeat!.id}`}
            </h3>
            <p className="text-[11px] text-slate-500 truncate">
              {isMultiple
                ? seatIds.slice(0, 5).join(', ') + (selectedSeats.length > 5 ? ` +${selectedSeats.length - 5} more` : '')
                : `${singleSeat!.blockName} • Row ${singleSeat!.row} • Seat ${singleSeat!.col}`}
            </p>
          </div>
        </div>

        <button
          onClick={onClearSelection}
          className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 transition cursor-pointer font-semibold shrink-0"
        >
          Deselect
        </button>
      </div>

      {/* Grab a whole row or zone without clicking every chair */}
      {(onSelectRow || onSelectZone) && singleSeat && (
        <div className="flex flex-wrap gap-2">
          {onSelectRow && (
            <button
              type="button"
              onClick={() => onSelectRow(singleSeat)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 transition cursor-pointer"
            >
              <Rows3 className="w-3.5 h-3.5 text-blue-600" />
              Select all of row {singleSeat.row}
            </button>
          )}
          {onSelectZone && (
            <button
              type="button"
              onClick={() => onSelectZone(singleSeat)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 transition cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
              Select whole {CATEGORIES[singleSeat.categoryId]?.shortName ?? 'zone'} zone
            </button>
          )}
        </div>
      )}

      {/* Zone reassignment */}
      <div>
        <label className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-blue-600" />
          <span>Change zone for {isMultiple ? `all ${selectedSeats.length} seats` : 'this seat'}</span>
        </label>

        <div className="grid grid-cols-2 gap-1.5">
          {CATEGORY_LIST.map((catId) => {
            const cat = CATEGORIES[catId];
            const isActive = !isMultiple && singleSeat!.categoryId === catId;

            return (
              <button
                key={catId}
                type="button"
                onClick={() => onUpdateSeatsCategory(seatIds, catId)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                  isActive ? 'ring-2 ring-slate-900 font-bold scale-[1.02]' : 'hover:opacity-90'
                }`}
                style={{
                  backgroundColor: cat.color,
                  color: cat.textColor,
                  borderColor: cat.borderColor,
                }}
              >
                <span>{cat.shortName}</span>
                {isActive && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Block / unblock */}
      <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
          <Ban className="w-3.5 h-3.5 text-rose-600" />
          <span>Availability</span>
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onToggleBlockedSeats(seatIds, true)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 transition cursor-pointer"
          >
            Block ({selectedSeats.length})
          </button>
          <button
            type="button"
            onClick={() => onToggleBlockedSeats(seatIds, false)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
          >
            Unblock
          </button>
        </div>
      </div>

      {/* Seating a guest — single seat only */}
      {singleSeat && (
        <div className="pt-3 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Who is sitting here?</span>
            </label>
            {singleSeat.attendee && (
              <button
                type="button"
                onClick={() => onClearSeat(singleSeat.id)}
                className="text-[11px] text-rose-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Empty this seat
              </button>
            )}
          </div>

          {/* Pick someone already on the roster */}
          {matchingUnassigned.length > 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 space-y-1.5">
              <p className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                Seat someone from the roster
              </p>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) onAssignExistingAttendee(singleSeat.id, e.target.value);
                }}
                className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">
                  Choose from {unassignedAttendees.length} guest{unassignedAttendees.length === 1 ? '' : 's'} without a seat…
                </option>
                {matchingUnassigned.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.designation ? ` — ${a.designation}` : ''} ({CATEGORIES[a.categoryId]?.shortName ?? a.categoryId})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Or type a new guest */}
          <form onSubmit={handleSaveAttendee} className="space-y-2">
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="Guest full name (e.g. Dr. A. K. Sharma)"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-xs"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={form.title}
                onChange={set('title')}
                placeholder="Designation / title"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-xs"
              />
              <input
                type="text"
                value={form.dept}
                onChange={set('dept')}
                placeholder="Department / organisation"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="Email address"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-xs"
              />
              <input
                type="text"
                value={form.phone}
                onChange={set('phone')}
                placeholder="Contact phone"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition active:scale-98 cursor-pointer"
            >
              {singleSeat.attendee ? 'Update guest details' : 'Seat this guest'}
            </button>
          </form>
        </div>
      )}

      {isMultiple && (
        <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
          Guests are seated one at a time. Select a single seat to name the person sitting in it,
          or use <strong className="text-slate-700">Auto-seat roster</strong> to fill every zone at once.
        </p>
      )}

    </div>
  );
};
