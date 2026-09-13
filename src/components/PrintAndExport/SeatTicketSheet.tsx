import React, { useMemo, useState } from 'react';
import { Seat, CategoryInfo, BlockType } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';
import {
  Ticket,
  Scissors,
  Search,
  Printer,
  ChevronLeft,
  CheckSquare,
  Square,
  Crown,
  GraduationCap,
  HeartPulse,
  Stethoscope,
  Award,
  Users,
  Camera,
  Briefcase,
  Monitor,
  Compass,
  Sliders,
  Armchair,
  LucideIcon,
} from 'lucide-react';

interface SeatTicketSheetProps {
  seats: Seat[];
  eventTitle: string;
  departmentName: string;
  categories?: Record<string, CategoryInfo>;
}

/**
 * A4 portrait fits 2 x 4 tickets. Each ticket is 65mm tall, so four rows
 * (260mm) still fit even when the print dialog uses 15mm page margins.
 * Ticket width follows the grid column, so it adapts to the printable width.
 */
const TICKETS_PER_PAGE = 8;

const AREA_LABEL: Record<BlockType, string> = {
  UPPER_LEFT: 'Balcony',
  UPPER_CENTER: 'Balcony',
  UPPER_RIGHT: 'Balcony',
  LOWER_LEFT: 'Left Wing',
  LOWER_CENTER: 'Middle Block',
  LOWER_RIGHT: 'Right Wing',
};

/** Order the printed pile follows: front rows first, area by area. */
const AREA_ORDER = ['Middle Block', 'Left Wing', 'Right Wing', 'Balcony'];
const ROW_ORDER = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
  'UB1', 'UB2', 'UB3', 'UB4', 'UB5',
];

/** Each group gets its own emblem so the printed piles are easy to tell apart. */
const SECTION_ICON: Record<string, LucideIcon> = {
  vip: Crown,
  faculty: GraduationCap,
  mbbs: GraduationCap,
  nursing: HeartPulse,
  pg: Stethoscope,
  accompanying: Users,
  reporters: Camera,
  admin_staff: Briefcase,
  it_staff: Monitor,
  guide: Compass,
};

type Occupancy = 'all' | 'named' | 'empty';

/** White or near-black text, whichever stays readable on the section colour. */
function readableOn(hex: string): string {
  const clean = (hex || '').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  if (full.length !== 6) return '#0f172a';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.45 ? '#0f172a' : '#ffffff';
}

export const SeatTicketSheet: React.FC<SeatTicketSheetProps> = ({
  seats,
  eventTitle,
  departmentName,
  categories = CATEGORIES,
}) => {
  const [section, setSection] = useState<string>('all');
  const [area, setArea] = useState<string>('all');
  const [occupancy, setOccupancy] = useState<Occupancy>('all');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  /** null until Generate is pressed — nothing prints before that. */
  const [generated, setGenerated] = useState<Seat[] | null>(null);

  // Blocked seats are not for sitting, so they never get a ticket.
  const printable = useMemo(() => seats.filter((s) => !s.isBlocked), [seats]);

  const sectionOptions = useMemo(() => {
    const counts = new Map<string, number>();
    printable.forEach((s) => counts.set(s.categoryId, (counts.get(s.categoryId) ?? 0) + 1));
    return [...counts.entries()]
      .map(([id, count]) => ({ id, count, name: categories[id]?.name ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [printable, categories]);

  const areaOptions = useMemo(() => {
    const counts = new Map<string, number>();
    printable.forEach((s) => counts.set(AREA_LABEL[s.block], (counts.get(AREA_LABEL[s.block]) ?? 0) + 1));
    return AREA_ORDER.filter((a) => counts.has(a)).map((a) => ({ name: a, count: counts.get(a)! }));
  }, [printable]);

  const bySeatOrder = (a: Seat, b: Seat) => {
    const areaDiff = AREA_ORDER.indexOf(AREA_LABEL[a.block]) - AREA_ORDER.indexOf(AREA_LABEL[b.block]);
    if (areaDiff !== 0) return areaDiff;
    const rowDiff = ROW_ORDER.indexOf(a.row) - ROW_ORDER.indexOf(b.row);
    if (rowDiff !== 0) return rowDiff;
    return a.col - b.col;
  };

  /** Seats matching the filters and the search box. */
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return printable
      .filter((s) => {
        if (section !== 'all' && s.categoryId !== section) return false;
        if (area !== 'all' && AREA_LABEL[s.block] !== area) return false;
        if (occupancy === 'named' && !s.attendee) return false;
        if (occupancy === 'empty' && s.attendee) return false;
        if (q) {
          const hay = `${s.id} ${s.attendee?.name ?? ''} ${s.attendee?.department ?? ''} ${
            categories[s.categoryId]?.name ?? ''
          }`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort(bySeatOrder);
  }, [printable, section, area, occupancy, query, categories]);

  const pickedCount = picked.size;

  const togglePick = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const generate = (list: Seat[]) => {
    setGenerated([...list].sort(bySeatOrder));
    window.setTimeout(() => {
      document.querySelector('.ticket-page')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const pages = useMemo(() => {
    if (!generated) return [];
    const out: Seat[][] = [];
    for (let i = 0; i < generated.length; i += TICKETS_PER_PAGE) {
      out.push(generated.slice(i, i + TICKETS_PER_PAGE));
    }
    return out;
  }, [generated]);

  const selectClass =
    'bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer';

  // ------------------------------------------------------------ generated view
  if (generated) {
    return (
      <div className="space-y-4 print:space-y-0">
        <div className="no-print bg-white border border-slate-300 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
          <button
            onClick={() => setGenerated(null)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Change selection
          </button>

          <div className="flex items-center gap-2 text-xs font-bold text-purple-900 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
            <Ticket className="w-4 h-4 text-purple-600" />
            {generated.length} ticket{generated.length === 1 ? '' : 's'} ready · {pages.length} page
            {pages.length === 1 ? '' : 's'}
          </div>

          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            8 per A4 page — cut along the dashed lines, tear off the coloured stub at the door.
          </p>

          <button
            onClick={() => window.print()}
            className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print these tickets
          </button>
        </div>

        <div className="space-y-6 print:space-y-0">
          {pages.map((page, pageIdx) => (
            <div
              key={pageIdx}
              className="ticket-page mx-auto bg-white w-[198mm] print:w-full print:mx-0 shadow-sm print:shadow-none border border-slate-200 print:border-0"
              style={{ pageBreakAfter: pageIdx === pages.length - 1 ? 'auto' : 'always' }}
            >
              <div className="grid grid-cols-2">
                {page.map((seat) => (
                  <SeatTicket
                    key={seat.id}
                    seat={seat}
                    eventTitle={eventTitle}
                    categories={categories}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------ selection view
  return (
    <div className="no-print space-y-4">
      <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Section
            </label>
            <select value={section} onChange={(e) => setSection(e.target.value)} className={selectClass}>
              <option value="all">All sections ({printable.length})</option>
              {sectionOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Area
            </label>
            <select value={area} onChange={(e) => setArea(e.target.value)} className={selectClass}>
              <option value="all">Whole auditorium</option>
              {areaOptions.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name} ({a.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Seats
            </label>
            <select
              value={occupancy}
              onChange={(e) => setOccupancy(e.target.value as Occupancy)}
              className={selectClass}
            >
              <option value="all">Every seat</option>
              <option value="named">Only seats with a guest name</option>
              <option value="empty">Only empty seats</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Find one person or seat
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Rekha Dutt or F20"
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Pick list */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px]">
            <button
              onClick={() => setPicked(new Set(shown.map((s) => s.id)))}
              className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-purple-700 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Tick all {shown.length} shown
            </button>
            {pickedCount > 0 && (
              <button
                onClick={() => setPicked(new Set())}
                className="flex items-center gap-1.5 font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
            <span className="ml-auto font-bold text-slate-600">
              {shown.length} shown · {pickedCount} ticked
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {shown.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">
                No seats match. Change the filters or clear the search.
              </p>
            ) : (
              shown.slice(0, 400).map((s) => {
                const cat = categories[s.categoryId];
                const isPicked = picked.has(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 px-3 py-1.5 text-xs cursor-pointer transition ${
                      isPicked ? 'bg-purple-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isPicked}
                      onChange={() => togglePick(s.id)}
                      className="w-3.5 h-3.5 accent-purple-600 cursor-pointer"
                    />
                    <span className="font-mono font-bold text-slate-900 w-16 shrink-0">{s.id}</span>
                    <span className="flex-1 min-w-0 truncate text-slate-700">
                      {s.attendee ? s.attendee.name : <em className="text-slate-400">empty seat</em>}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0"
                      style={{
                        backgroundColor: cat?.color,
                        color: cat?.textColor,
                        borderColor: cat?.borderColor,
                      }}
                    >
                      {cat?.shortName ?? s.categoryId}
                    </span>
                  </label>
                );
              })
            )}
            {shown.length > 400 && (
              <p className="px-3 py-2 text-[11px] text-slate-500 bg-slate-50">
                Only the first 400 are listed here — "Generate all {shown.length} shown" still covers
                every one of them.
              </p>
            )}
          </div>
        </div>

        {/* Generate */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => generate(shown.filter((s) => picked.has(s.id)))}
            disabled={pickedCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-md transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Ticket className="w-4 h-4" />
            Generate {pickedCount > 0 ? `${pickedCount} ` : ''}ticked ticket{pickedCount === 1 ? '' : 's'}
          </button>

          <button
            onClick={() => generate(shown)}
            disabled={shown.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Ticket className="w-4 h-4 text-purple-600" />
            Generate all {shown.length} shown
          </button>

          <p className="text-[11px] text-slate-500">
            Tick rows for one-off tickets, or generate a whole group at once.
          </p>
        </div>
      </div>
    </div>
  );
};

const SeatTicket: React.FC<{
  seat: Seat;
  eventTitle: string;
  categories: Record<string, CategoryInfo>;
}> = ({ seat, eventTitle, categories }) => {
  const cat = categories[seat.categoryId];
  const guest = seat.attendee;

  const accent = cat?.borderColor || '#475569';
  const tint = cat?.color || '#e2e8f0';
  const onAccent = readableOn(accent);
  const Icon = SECTION_ICON[seat.categoryId] ?? Armchair;

  return (
    <div className="seat-ticket relative w-full h-[65mm] flex border border-dashed border-slate-400 overflow-hidden bg-white">
      {/* Colour stub — torn off at the door */}
      <div
        className="w-[27mm] shrink-0 flex flex-col items-center justify-center text-center px-[2mm]"
        style={{ backgroundColor: accent, color: onAccent }}
      >
        <Icon className="w-[5mm] h-[5mm] opacity-90" />
        <div className="text-[5.5pt] font-bold uppercase tracking-[0.18em] mt-[1mm] opacity-90">Seat</div>
        <div className="font-ticket-seat text-[19pt] font-extrabold leading-none tracking-tight">
          {seat.id}
        </div>
        <div className="text-[6pt] font-semibold opacity-90 mt-[0.5mm]">
          Row {seat.row} · No. {seat.col}
        </div>
        <div className="w-[14mm] h-px my-[1.5mm] opacity-40" style={{ backgroundColor: onAccent }} />
        <div className="text-[5.5pt] uppercase tracking-[0.14em] opacity-90">Enter by</div>
        <div className="text-[8pt] font-extrabold leading-tight">{seat.gateRecommendation}</div>
      </div>

      {/* Perforation, so it reads as a real tear-off ticket */}
      <div className="absolute left-[27mm] top-0 h-full border-l border-dashed border-slate-400" />
      <div className="absolute left-[27mm] -top-[1.6mm] w-[3.2mm] h-[3.2mm] -translate-x-1/2 rounded-full bg-white border border-slate-300" />
      <div className="absolute left-[27mm] -bottom-[1.6mm] w-[3.2mm] h-[3.2mm] -translate-x-1/2 rounded-full bg-white border border-slate-300" />

      {/* Main body */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-[2mm] shrink-0" style={{ backgroundColor: tint }} />

        <div className="flex-1 min-w-0 px-[4mm] py-[2.5mm] flex flex-col justify-between">
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[6.5pt] font-black tracking-[0.16em] text-blue-950 uppercase">
                AIIMS Kalyani
              </span>
              <span className="text-[5.5pt] text-slate-400 uppercase tracking-wider shrink-0">
                Admit one
              </span>
            </div>
            <div className="font-ticket-name text-[8pt] italic text-slate-600 truncate leading-tight">
              {eventTitle}
            </div>
          </div>

          {/* Who the ticket belongs to */}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            {guest ? (
              <>
                <div className="font-ticket-name text-[13pt] font-bold text-slate-900 leading-tight truncate">
                  {guest.name}
                </div>
                {(guest.designation || guest.department) && (
                  <div className="text-[6.5pt] text-slate-500 truncate leading-tight mt-[0.3mm]">
                    {[guest.designation, guest.department].filter(Boolean).join(' · ')}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-[6pt] uppercase tracking-wider text-slate-400">Name</div>
                <div className="border-b border-dotted border-slate-400 h-[4.5mm]" />
              </>
            )}
          </div>

          {/* Group badge — printed large so ushers can sort at a glance */}
          <div className="flex items-end justify-between gap-2">
            <span
              className="inline-flex items-center gap-[1.5mm] max-w-[42mm] whitespace-nowrap text-[8pt] font-black uppercase tracking-wide px-[3mm] py-[1.2mm] rounded-full border"
              style={{ backgroundColor: tint, color: cat?.textColor ?? '#0f172a', borderColor: accent }}
            >
              <Icon className="w-[3.2mm] h-[3.2mm] shrink-0" />
              <span className="truncate">{cat?.shortName ?? cat?.name ?? seat.categoryId}</span>
            </span>
            <span className="text-[5.5pt] text-slate-400 text-right leading-tight shrink-0">
              {AREA_LABEL[seat.block]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
