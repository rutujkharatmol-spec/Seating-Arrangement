import React, { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { Attendee, CategoryId, CategoryInfo, Seat } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';
import { compareSeatDesirability } from '../../utils/autoSeat';
import { SeatPassBadge } from '../PrintAndExport/SeatPassBadge';
// The same cut-and-hand-out ticket the Print Charts sheet produces, loaded
// only when a ticket actually exists so it stays out of the first paint.
const SeatTicket = lazy(() =>
  import('../PrintAndExport/SeatTicketSheet').then((m) => ({ default: m.SeatTicket }))
);
import {
  AlertTriangle,
  Armchair,
  Check,
  Printer,
  Scissors,
  Sparkles,
  TicketPlus,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { SAMPLE_TICKETS } from '../../data/sampleTickets';

interface WalkInTicketDeskProps {
  seats: Seat[];
  attendees: Attendee[];
  categories?: Record<string, CategoryInfo>;
  eventTitle: string;
  departmentName: string;
  onIssue: (attendee: Attendee) => void;
  onUndoIssue: (attendeeId: string) => void;
}

/** Sections that exist to hold the seated roster rather than walk-in guests. */
const BACK_OF_LIST = new Set(['available']);

/**
 * Counter for people who turn up without being on the roster — press, a late
 * faculty member, an extra guardian. Type a name, pick the section they belong
 * to, and the desk hands out the best chair that section still has free and
 * prints the pass.
 *
 * It only ever fills chairs nobody holds, so issuing a ticket can never move
 * or displace anyone already seated.
 */
export const WalkInTicketDesk: React.FC<WalkInTicketDeskProps> = ({
  seats,
  attendees,
  categories = CATEGORIES,
  eventTitle,
  departmentName,
  onIssue,
  onUndoIssue,
}) => {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>('faculty');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [seatChoice, setSeatChoice] = useState<'auto' | 'none' | string>('auto');
  const [issued, setIssued] = useState<Attendee[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [printScope, setPrintScope] = useState<'one' | 'all'>('one');
  const [samplePreviewIndex, setSamplePreviewIndex] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  /**
   * Fills the form with a specimen so an usher can see how a section's ticket
   * prints. It only ever fills blanks: anything already typed belongs to the
   * person standing at the desk and is left alone.
   */
  const handleApplySample = (sampleItem: typeof SAMPLE_TICKETS[0]) => {
    if (!sampleItem.seat.attendee) return;
    const att = sampleItem.seat.attendee;
    if (!name.trim()) setName(att.name);
    if (!designation.trim()) setDesignation(att.designation || '');
    if (!department.trim()) setDepartment(att.department || '');
    setCategoryId(att.categoryId);
    setSeatChoice('auto');
  };

  const seatById = useMemo(() => new Map(seats.map((s) => [s.id, s])), [seats]);

  /** Chairs nobody holds, best first, grouped by the section they belong to. */
  const freeByCategory = useMemo(() => {
    const taken = new Set(attendees.map((a) => a.seatId).filter(Boolean) as string[]);
    const map = new Map<CategoryId, Seat[]>();
    for (const seat of seats) {
      if (seat.isBlocked || taken.has(seat.id)) continue;
      const list = map.get(seat.categoryId);
      if (list) list.push(seat);
      else map.set(seat.categoryId, [seat]);
    }
    map.forEach((list) => list.sort(compareSeatDesirability));
    return map;
  }, [seats, attendees]);

  const sections = useMemo(
    () =>
      Object.values(categories)
        .slice()
        .sort((a, b) => {
          const aBack = BACK_OF_LIST.has(a.id) ? 1 : 0;
          const bBack = BACK_OF_LIST.has(b.id) ? 1 : 0;
          if (aBack !== bBack) return aBack - bBack;
          return (a.priority ?? 99) - (b.priority ?? 99) || a.name.localeCompare(b.name);
        }),
    [categories]
  );

  const freeHere = freeByCategory.get(categoryId) ?? [];
  const nextSeat = seatChoice === 'auto' ? freeHere[0] : seatChoice === 'none' ? undefined : seatById.get(seatChoice);
  const sectionFull = freeHere.length === 0;

  const trimmedName = name.trim();
  const nameClash = useMemo(
    () =>
      trimmedName.length > 1 &&
      attendees.find((a) => a.name.trim().toLowerCase() === trimmedName.toLowerCase()),
    [attendees, trimmedName]
  );

  /**
   * SeatTicket draws a chair, so hand it the real chair with its occupant
   * attached. A pass issued without a chair has no ticket to cut, and falls
   * back to the badge instead.
   */
  const ticketSeatFor = (a: Attendee): Seat | null => {
    const chair = a.seatId ? seatById.get(a.seatId) : undefined;
    if (!chair) return null;
    return { ...chair, categoryId: a.categoryId, attendee: a, attendeeId: a.id };
  };

  const activeTicket = issued.find((a) => a.id === activeTicketId) ?? null;
  const activeTicketSeat = activeTicket ? ticketSeatFor(activeTicket) : null;
  const toPrint = printScope === 'all' ? issued : activeTicket ? [activeTicket] : [];

  const TICKETS_PER_PAGE = 8;
  const withChairs = toPrint
    .map((attendee) => ({ attendee, seat: ticketSeatFor(attendee) }))
    .filter((t): t is { attendee: Attendee; seat: Seat } => t.seat !== null);
  const badgeOnly = toPrint.filter((a) => !a.seatId);
  const ticketPages: { attendee: Attendee; seat: Seat }[][] = [];
  for (let i = 0; i < withChairs.length; i += TICKETS_PER_PAGE) {
    ticketPages.push(withChairs.slice(i, i + TICKETS_PER_PAGE));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedName) return;

    const cat = categories[categoryId];
    const attendee: Attendee = {
      id: `att-walkin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmedName,
      designation: designation.trim() || cat?.shortName || '',
      department: department.trim(),
      institution: 'AIIMS Kalyani',
      email: '',
      phone: phone.trim(),
      categoryId,
      seatId: nextSeat?.id,
      // Hold the chair printed on the pass, so a later re-seat never moves it.
      seatLock: Boolean(nextSeat),
      isVip: categoryId === 'vip',
      notes: `Issued at the desk on ${new Date().toLocaleString()}`,
    };

    onIssue(attendee);
    setIssued((prev) => [attendee, ...prev]);
    setActiveTicketId(attendee.id);
    setPrintScope('one');

    setName('');
    setDesignation('');
    setDepartment('');
    setPhone('');
    setSeatChoice('auto');
    nameRef.current?.focus();
  };

  const handleUndo = (attendee: Attendee) => {
    onUndoIssue(attendee.id);
    setIssued((prev) => prev.filter((a) => a.id !== attendee.id));
    setActiveTicketId((current) => (current === attendee.id ? null : current));
  };

  const print = (scope: 'one' | 'all') => {
    setPrintScope(scope);
    // Let the print-only container render the right tickets before the dialog.
    window.setTimeout(() => window.print(), 0);
  };

  const field = 'w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
  const label = 'block font-bold text-slate-700 mb-1 text-xs';

  return (
    <>
      <div className="no-print max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
            <TicketPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Walk-in Ticket Desk</h2>
            <p className="text-xs text-slate-500">
              Issue a seat pass on the spot. Only chairs nobody already holds are handed out, so
              the confirmed seating is never disturbed.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-6 items-start">
          {/* ---------------------------------------------------------- form */}
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-300 rounded-3xl p-5 shadow-sm space-y-4"
          >
            <div>
              <label className="block font-black text-slate-900 mb-1.5 text-sm" htmlFor="walkin-name">
                Name of the guest *
              </label>
              <input
                id="walkin-name"
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Type the name as it should appear on the ticket"
                autoComplete="off"
                autoFocus
                className="w-full bg-white border-2 border-slate-400 rounded-xl px-3.5 py-2.5 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:font-normal placeholder:text-sm placeholder:text-slate-400"
              />
              {nameClash && (
                <p className="mt-1.5 text-[11px] text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Already on the list as <strong>{nameClash.name}</strong>
                    {nameClash.seatId ? `, seat ${nameClash.seatId}` : ' (no seat)'} — issuing this
                    adds a second person.
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className={label} htmlFor="walkin-section">
                Section *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sections.map((cat) => {
                  const free = (freeByCategory.get(cat.id) ?? []).length;
                  const selected = cat.id === categoryId;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(cat.id);
                        setSeatChoice('auto');
                      }}
                      className={`text-left px-3 py-2 rounded-xl border transition cursor-pointer ${
                        selected
                          ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/60'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded shrink-0 border"
                          style={{ backgroundColor: cat.color, borderColor: cat.borderColor }}
                        />
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {cat.shortName || cat.name}
                        </span>
                      </span>
                      <span
                        className={`block text-[10px] mt-0.5 font-semibold ${
                          free === 0 ? 'text-rose-600' : 'text-slate-500'
                        }`}
                      >
                        {free === 0 ? 'no chairs free' : `${free} free`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label} htmlFor="walkin-designation">
                  Designation
                </label>
                <input
                  id="walkin-designation"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder={categories[categoryId]?.shortName || 'Optional'}
                  autoComplete="off"
                  className={field}
                />
              </div>
              <div>
                <label className={label} htmlFor="walkin-department">
                  Department / Organisation
                </label>
                <input
                  id="walkin-department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Optional"
                  autoComplete="off"
                  className={field}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label} htmlFor="walkin-phone">
                  Phone
                </label>
                <input
                  id="walkin-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                  inputMode="tel"
                  autoComplete="off"
                  className={field}
                />
              </div>
              <div>
                <label className={label} htmlFor="walkin-seat">
                  Chair
                </label>
                <select
                  id="walkin-seat"
                  value={seatChoice}
                  onChange={(e) => setSeatChoice(e.target.value)}
                  className={`${field} cursor-pointer`}
                >
                  <option value="auto" disabled={sectionFull}>
                    {sectionFull
                      ? 'Best free chair — none left in this section'
                      : `Best free chair (${freeHere[0]?.id})`}
                  </option>
                  <option value="none">No chair — standing / escorted</option>
                  {freeHere.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} — {s.blockName}, row {s.row} · {s.gateRecommendation}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {sectionFull && seatChoice === 'auto' && (
              <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Every chair in {categories[categoryId]?.name} is taken. Pick another section, or
                  issue the pass without a chair.
                </span>
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 min-w-0">
                <Armchair className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                <span className="truncate">
                  {nextSeat
                    ? `Will be seated at ${nextSeat.id} — ${nextSeat.blockName}, ${nextSeat.gateRecommendation}`
                    : 'Will be issued without a chair'}
                </span>
              </p>
              <button
                type="submit"
                disabled={!trimmedName || (sectionFull && seatChoice === 'auto')}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Issue ticket
              </button>
            </div>
          </form>

          {/* ------------------------------------------------------- preview */}
          <div className="space-y-3">
            {activeTicket ? (
              <>
                {/* Exactly what comes out of the printer. */}
                <div className="w-[99mm] border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm">
                  {activeTicketSeat ? (
                    <Suspense
                      fallback={<div className="h-[62mm] grid place-items-center text-xs text-slate-400">Loading ticket…</div>}
                    >
                      <SeatTicket
                        seat={activeTicketSeat}
                        eventTitle={eventTitle}
                        categories={categories}
                      />
                    </Suspense>
                  ) : (
                    <SeatPassBadge
                      attendee={activeTicket}
                      seat={undefined}
                      eventTitle={eventTitle}
                      departmentName={departmentName}
                      categories={categories}
                    />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>Same ticket as Print Charts &rarr; Seat Tickets — 8 per A4, cut along the dashed lines.</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => print('one')}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Print this ticket
                  </button>
                  {issued.length > 1 && (
                    <button
                      onClick={() => print('all')}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      Print all {issued.length}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-3 w-72">
                <div className="bg-gradient-to-r from-amber-50 to-purple-50 border border-amber-300/80 rounded-2xl p-2.5 flex items-center justify-between text-xs text-amber-950 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-black">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Sample Pass Preview</span>
                  </div>
                  <select
                    value={samplePreviewIndex}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setSamplePreviewIndex(idx);
                    }}
                    className="bg-white border border-amber-300 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    {SAMPLE_TICKETS.map((t, idx) => (
                      <option key={t.id} value={idx}>
                        {t.badgeLabel}
                      </option>
                    ))}
                  </select>
                </div>

                {SAMPLE_TICKETS[samplePreviewIndex]?.seat?.attendee ? (
                  <>
                    <SeatPassBadge
                      attendee={SAMPLE_TICKETS[samplePreviewIndex].seat.attendee}
                      seat={SAMPLE_TICKETS[samplePreviewIndex].seat}
                      eventTitle={eventTitle}
                      departmentName={departmentName}
                      categories={categories}
                    />
                    <button
                      type="button"
                      onClick={() => handleApplySample(SAMPLE_TICKETS[samplePreviewIndex])}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Load {SAMPLE_TICKETS[samplePreviewIndex].badgeLabel} into Form
                    </button>
                  </>
                ) : (
                  <div className="w-72 h-[380px] rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center text-center p-6">
                    <p className="text-xs text-slate-400">
                      The pass appears here once a ticket is issued, ready to print.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* --------------------------------------------------- session list */}
        {issued.length > 0 && (
          <div className="mt-6 bg-white border border-slate-300 rounded-3xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Issued at this desk ({issued.length})
            </h3>
            <ul className="divide-y divide-slate-100">
              {issued.map((a) => {
                const seat = a.seatId ? seatById.get(a.seatId) : undefined;
                const cat = categories[a.categoryId];
                const selected = a.id === activeTicketId;
                return (
                  <li key={a.id} className="flex items-center gap-3 py-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat?.color || '#94a3b8' }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-800 truncate">
                        {a.name}
                      </span>
                      <span className="block text-[11px] text-slate-500 truncate">
                        {cat?.name || a.categoryId}
                        {seat ? ` · ${seat.id}, ${seat.blockName}` : ' · no chair'}
                      </span>
                    </span>
                    <button
                      onClick={() => {
                        setActiveTicketId(a.id);
                        setPrintScope('one');
                      }}
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                        selected
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {selected ? (
                        <span className="inline-flex items-center gap-1">
                          <Check className="w-3 h-3" /> Showing
                        </span>
                      ) : (
                        'Show'
                      )}
                    </button>
                    <button
                      onClick={() => handleUndo(a)}
                      title={`Cancel the ticket for ${a.name}`}
                      className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {/* Specimen passes, for checking how each section's ticket prints. */}
        <div className="mt-6 bg-gradient-to-r from-purple-50/80 via-amber-50/80 to-blue-50/80 border border-purple-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-purple-600 text-white shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black text-slate-900">
              Sample Pass Fill:
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Fills the form with a specimen of each type — only when the name is still empty
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'sample-faculty', label: 'Faculty' },
              { id: 'sample-admin', label: 'Admin Staff' },
              { id: 'sample-vip', label: 'VIP' },
              { id: 'sample-mbbs', label: 'MBBS' },
              { id: 'sample-reporters', label: 'Press/Media' },
              { id: 'sample-awardees', label: 'Awardee' },
            ].map(({ id, label }) => {
              const sample = SAMPLE_TICKETS.find((s) => s.id === id);
              if (!sample) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    handleApplySample(sample);
                    const idx = SAMPLE_TICKETS.findIndex((s) => s.id === id);
                    if (idx >= 0) setSamplePreviewIndex(idx);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white hover:bg-purple-100 text-slate-700 hover:text-purple-900 border border-slate-200 shadow-2xs transition active:scale-95 cursor-pointer"
                >
                  {label}
                </button>
              );
            })}
            <select
              value={samplePreviewIndex}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setSamplePreviewIndex(idx);
                if (SAMPLE_TICKETS[idx]) handleApplySample(SAMPLE_TICKETS[idx]);
              }}
              className="px-2 py-1 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 cursor-pointer"
            >
              <option value="" disabled>More Types ▾</option>
              {SAMPLE_TICKETS.map((s, idx) => (
                <option key={s.id} value={idx}>
                  {s.badgeLabel} ({s.categoryName})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Print surface — kept outside the no-print wrapper so it survives.
          Same sheet as Print Charts → "Seat Tickets": 8 per A4, cut along the
          dashed lines. */}
      <div className="hidden print:block print-surface">
        <Suspense fallback={null}>
          {ticketPages.map((page, pageIdx) => (
            <div
              key={pageIdx}
              className="ticket-page mx-auto bg-white w-[198mm] print:w-full print:mx-0"
              style={{ pageBreakAfter: pageIdx === ticketPages.length - 1 && !badgeOnly.length ? 'auto' : 'always' }}
            >
              <div className="grid grid-cols-2">
                {page.map(({ attendee, seat }) => (
                  <SeatTicket
                    key={attendee.id}
                    seat={seat}
                    eventTitle={eventTitle}
                    categories={categories}
                  />
                ))}
              </div>
            </div>
          ))}
        </Suspense>

        {/* Passes issued without a chair have no seat ticket, so they print as
            the badge instead. */}
        {badgeOnly.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {badgeOnly.map((a) => (
              <SeatPassBadge
                key={a.id}
                attendee={a}
                seat={undefined}
                eventTitle={eventTitle}
                departmentName={departmentName}
                categories={categories}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};
