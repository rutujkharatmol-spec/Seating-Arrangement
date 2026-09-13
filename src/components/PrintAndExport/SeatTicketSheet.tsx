import React, { useMemo, useState } from 'react';
import QRCode from 'qrcode';
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
  Building2,
  MapPin,
  QrCode,
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
  EXAM_HALL: 'Exam Section Hall',
};

/** Order the printed pile follows: front rows first, area by area. */
const AREA_ORDER = ['Middle Block', 'Left Wing', 'Right Wing', 'Balcony', 'Exam Section Hall'];
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

const TicketBarcode: React.FC<{ code: string }> = ({ code }) => {
  const bars = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < code.length; i++) {
      seed = (seed * 31 + code.charCodeAt(i)) & 0xffffffff;
    }
    const widths = [1, 2, 1, 1, 3, 1, 2, 1, 1, 2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2];
    return widths.map((w, idx) => ({
      width: w * 0.32,
      isSpace: idx % 2 === 1,
    }));
  }, [code]);

  return (
    <div className="flex items-center justify-center h-[2.6mm] overflow-hidden my-[0.3mm]">
      {bars.map((b, i) => (
        <span
          key={i}
          className={`h-full inline-block ${b.isSpace ? 'bg-transparent' : 'bg-slate-800'}`}
          style={{ width: `${b.width}mm` }}
        />
      ))}
    </div>
  );
};

const TicketQrCode: React.FC<{ value: string; sizeMm?: number }> = ({ value, sizeMm = 15 }) => {
  const qr = useMemo(() => {
    try {
      const q = QRCode.create(value, { errorCorrectionLevel: 'M' });
      const count = q.modules.size;
      let d = '';
      for (let row = 0; row < count; row++) {
        for (let col = 0; col < count; col++) {
          if (q.modules.get(row, col)) {
            d += `M${col},${row}h1v1h-1z `;
          }
        }
      }
      return { count, d };
    } catch {
      return null;
    }
  }, [value]);

  if (!qr) return null;

  return (
    <svg
      viewBox={`-2 -2 ${qr.count + 4} ${qr.count + 4}`}
      style={{ width: `${sizeMm}mm`, height: `${sizeMm}mm` }}
      shapeRendering="crispEdges"
      className="shrink-0 block"
    >
      <rect x="-2" y="-2" width={qr.count + 4} height={qr.count + 4} fill="#ffffff" />
      <path d={qr.d} fill="#0f172a" />
    </svg>
  );
};

function splitName(fullName: string): { givenName: string; surname: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { givenName: fullName, surname: '' };
  }
  const surname = parts[parts.length - 1];
  const givenName = parts.slice(0, parts.length - 1).join(' ');
  return { givenName, surname };
}

const SeatTicket: React.FC<{
  seat: Seat;
  eventTitle: string;
  categories: Record<string, CategoryInfo>;
}> = ({ seat, eventTitle, categories }) => {
  const cat = categories[seat.categoryId];
  const guest = seat.attendee;

  // Use a rich dark executive tone for unassigned seats so they never look dull
  const isUnassigned = !cat || seat.categoryId === 'unassigned';
  const accent = isUnassigned ? '#1e293b' : cat?.borderColor || '#475569';
  const tint = isUnassigned ? '#f1f5f9' : cat?.color || '#e2e8f0';
  const onAccent = readableOn(accent);
  const Icon = SECTION_ICON[seat.categoryId] ?? Armchair;

  const trackerUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/#seattracker';
    const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
    return `${base}/#seattracker?seat=${encodeURIComponent(seat.id)}`;
  }, [seat.id]);

  const nameParts = useMemo(() => {
    return guest?.name ? splitName(guest.name) : null;
  }, [guest?.name]);

  const guestRoleLabel = guest
    ? seat.categoryId === 'vip'
      ? 'Honourable Dignitary'
      : seat.categoryId === 'faculty'
      ? 'Distinguished Faculty'
      : seat.categoryId.startsWith('mbbs') || seat.categoryId === 'nursing' || seat.categoryId === 'pg'
      ? 'Graduating Scholar'
      : 'Honoured Guest'
    : 'Auditorium Seat Pass';

  const categoryDisplayName = isUnassigned
    ? 'Standard Admission'
    : cat?.shortName ?? cat?.name ?? seat.categoryId;

  return (
    <div className="seat-ticket relative w-full h-[65mm] flex border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs print:border-slate-400 print:shadow-none transition-shadow hover:shadow-md">
      {/* -------------------- Left Coupon Stub (Torn off at door) -------------------- */}
      <div
        className="w-[24mm] shrink-0 relative flex flex-col items-center justify-between text-center p-[1.5mm] overflow-hidden"
        style={{
          background: `linear-gradient(175deg, ${accent} 0%, ${accent}ee 60%, ${accent}dd 100%)`,
          color: onAccent,
        }}
      >
        {/* Subtle decorative inner border */}
        <div className="absolute inset-[1mm] border border-white/25 rounded-md pointer-events-none" />

        {/* Top: Category Icon Emblem & Brand */}
        <div className="relative z-1 flex flex-col items-center w-full pt-[3mm]">
          <div className="w-[5.8mm] h-[5.8mm] rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/35 shadow-2xs">
            <Icon className="w-[3.2mm] h-[3.2mm] opacity-95" />
          </div>
          <span className="text-[4.2pt] font-black uppercase tracking-[0.2em] mt-[0.8mm] opacity-90 leading-none">
            AIIMS KALYANI
          </span>
          <span className="text-[3.6pt] font-extrabold uppercase tracking-widest opacity-70 leading-none mt-[0.3mm]">
            Entry Stub
          </span>
        </div>

        {/* Center: Large Bold Seat ID */}
        <div className="relative z-1 my-auto flex flex-col items-center">
          <span className="text-[4.2pt] font-black uppercase tracking-widest opacity-75 leading-none">
            SEAT
          </span>
          <div className="font-ticket-seat text-[19pt] font-black tracking-tight leading-none drop-shadow-xs my-[0.4mm]">
            {seat.id}
          </div>
          <div className="text-[5pt] font-extrabold tracking-wider opacity-90 uppercase leading-none bg-black/15 px-[1.5mm] py-[0.4mm] rounded">
            Row {seat.row} · #{seat.col}
          </div>
        </div>

        {/* Bottom: Enter Via Gate Card */}
        <div className="relative z-1 flex flex-col items-center w-full mb-[3mm]">
          <div className="w-full bg-white/95 text-slate-900 rounded py-[0.8mm] px-[1mm] shadow-2xs border border-black/10">
            <div className="text-[3.8pt] font-black uppercase tracking-widest text-slate-500 leading-none">
              GATE
            </div>
            <div className="text-[7pt] font-black text-slate-950 tracking-tight leading-tight mt-[0.2mm] truncate">
              {seat.gateRecommendation}
            </div>
          </div>
          <span className="text-[3.6pt] font-extrabold tracking-wider uppercase opacity-75 mt-[0.8mm] leading-none">
            Retain At Door
          </span>
        </div>
      </div>

      {/* -------------------- Main Ticket Body -------------------- */}
      <div className="flex-1 min-w-0 flex flex-col relative bg-white">
        {/* Top Luxury Banner Ribbon */}
        <div className="h-[6.2mm] shrink-0 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border-b border-blue-400/30 px-[2.8mm] flex items-center justify-between text-white shadow-2xs">
          <div className="flex items-center gap-[1.2mm] leading-none">
            <span className="text-[6.2pt] font-black tracking-[0.16em] text-white uppercase whitespace-nowrap drop-shadow-xs">
              AIIMS KALYANI
            </span>
            <span className="text-sky-400 font-bold text-[5.5pt]">·</span>
            <span className="text-[5.2pt] font-extrabold tracking-wider text-sky-200 uppercase whitespace-nowrap">
              CONVOCATION 2026
            </span>
          </div>

          <div className="flex items-center">
            <span className="text-[4.8pt] font-mono font-black text-sky-100 bg-white/15 border border-white/25 uppercase tracking-wide px-[2.2mm] py-[0.5mm] rounded-md shadow-2xs whitespace-nowrap">
              PASS #{seat.id}
            </span>
          </div>
        </div>

        {/* Ultra-subtle Watermark Behind Body */}
        <div className="absolute inset-0 top-[6mm] pointer-events-none flex items-center justify-center opacity-[0.018] overflow-hidden select-none">
          <Building2 className="w-[45mm] h-[45mm] text-slate-950" />
        </div>

        {/* Ticket Content: Center Info Column + Right Smart QR Bar */}
        <div className="flex-1 min-w-0 flex items-stretch relative z-1">
          {/* Left / Center Info Column */}
          <div className="flex-1 min-w-0 p-[2.2mm] flex flex-col justify-between">
            {/* Header Subtitle */}
            <div className="min-w-0 flex items-center justify-between">
              <span className="text-[4.6pt] font-extrabold text-slate-400 uppercase tracking-widest">
                AUDITORIUM CEREMONIAL PASS
              </span>
              <span className="text-[4.6pt] font-bold text-slate-400 uppercase tracking-wider">
                MAIN AUDITORIUM
              </span>
            </div>

            {/* Centerpiece: Prestigious Guest Certificate Plaque */}
            <div className="min-w-0 my-auto p-[1.8mm] rounded-lg bg-gradient-to-r from-amber-50/40 via-slate-50/60 to-white border border-slate-200 shadow-2xs relative">
              <div
                className="absolute left-0 top-0 bottom-0 w-[1.5mm] rounded-l-lg"
                style={{ backgroundColor: accent }}
              />
              <div className="pl-[1.2mm] min-w-0">
                <div className="text-[4.2pt] font-black uppercase tracking-widest text-amber-800 leading-none mb-[0.6mm]">
                  {guestRoleLabel}
                </div>
                {guest && nameParts ? (
                  <>
                    <div className="font-ticket-name font-black text-slate-900 leading-[1.12] tracking-tight drop-shadow-2xs">
                      <div className="text-[10.5pt] truncate">{nameParts.givenName}</div>
                      {nameParts.surname && (
                        <div className="text-[10.5pt] truncate">{nameParts.surname}</div>
                      )}
                    </div>
                    {(guest.designation || guest.department) && (
                      <div className="text-[5.5pt] font-semibold text-slate-600 leading-tight mt-[0.5mm] break-words line-clamp-2">
                        {seat.categoryId === 'accompanying' && guest.department
                          ? guest.department
                          : [guest.designation, guest.department].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="font-ticket-name text-[11pt] font-bold text-slate-400 italic leading-tight">
                      [ Reserved Auditorium Seat ]
                    </div>
                    <div className="text-[6pt] text-slate-400 mt-[0.3mm]">
                      Row {seat.row} · Seat No. {seat.col}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Row: Category Badge + Area Location Pill */}
            <div className="flex items-center justify-between gap-1 min-w-0 pt-[0.6mm] border-t border-slate-100">
              {/* Category Badge */}
              <span
                className="inline-flex items-center gap-[1.2mm] whitespace-nowrap text-[6.2pt] font-black uppercase tracking-wide px-[2mm] py-[0.6mm] rounded-md border shadow-2xs shrink-0"
                style={{ backgroundColor: tint, color: cat?.textColor ?? '#0f172a', borderColor: accent }}
              >
                <Icon className="w-[2.6mm] h-[2.6mm] shrink-0" />
                <span className="truncate max-w-[26mm]">{categoryDisplayName}</span>
              </span>

              {/* Area location with MapPin */}
              <div className="inline-flex items-center gap-[0.8mm] text-[6pt] font-extrabold text-slate-800 bg-slate-100 border border-slate-200 px-[2mm] py-[0.6mm] rounded-md shadow-2xs shrink-0">
                <MapPin className="w-[2.4mm] h-[2.4mm] text-rose-600 shrink-0" />
                <span>{seat.block === 'EXAM_HALL' ? 'Exam Section Hall' : `${AREA_LABEL[seat.block]} · Row ${seat.row}`}</span>
              </div>
            </div>
          </div>

          {/* Right Smart QR Bar (Boarding Pass Style) */}
          <div className="w-[21mm] shrink-0 border-l border-dashed border-slate-300 bg-slate-50/70 p-[1.5mm] flex flex-col items-center justify-between text-center">
            {/* Header Badge */}
            <div className="flex items-center gap-[0.8mm] bg-indigo-600 text-white px-[1.6mm] py-[0.4mm] rounded-full shadow-2xs">
              <QrCode className="w-[2.2mm] h-[2.2mm] shrink-0" />
              <span className="text-[3.8pt] font-black uppercase tracking-widest leading-none">
                3D LOCATOR
              </span>
            </div>

            {/* QR Code Container with Precision Camera Reticle Brackets */}
            <div className="relative p-[0.6mm] bg-white rounded-md border border-slate-200 shadow-2xs my-[0.3mm]">
              <div className="absolute -top-[1px] -left-[1px] w-[1.8mm] h-[1.8mm] border-t-2 border-l-2 border-indigo-600 rounded-tl-[2px]" />
              <div className="absolute -top-[1px] -right-[1px] w-[1.8mm] h-[1.8mm] border-t-2 border-r-2 border-indigo-600 rounded-tr-[2px]" />
              <div className="absolute -bottom-[1px] -left-[1px] w-[1.8mm] h-[1.8mm] border-b-2 border-l-2 border-indigo-600 rounded-bl-[2px]" />
              <div className="absolute -bottom-[1px] -right-[1px] w-[1.8mm] h-[1.8mm] border-b-2 border-r-2 border-indigo-600 rounded-br-[2px]" />
              <TicketQrCode value={trackerUrl} sizeMm={14.8} />
            </div>

            {/* Scan Guidance & Realistic Barcode Strip */}
            <div className="flex flex-col items-center leading-tight w-full">
              <span className="text-[3.8pt] font-black text-slate-800 tracking-tight">SCAN FOR MAP</span>
              <TicketBarcode code={seat.id} />
              <span className="text-[3.6pt] font-mono font-bold text-slate-500 tracking-wide">
                AK26-{seat.id}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
