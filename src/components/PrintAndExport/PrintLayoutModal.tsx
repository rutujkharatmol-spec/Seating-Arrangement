import React, { lazy, Suspense, useMemo, useState } from 'react';
import { Seat, Attendee, Volunteer, CategoryInfo } from '../../types/seating';
import { PrintableChart } from './PrintableChart';
import { SeatPassBadge } from './SeatPassBadge';
/**
 * The ticket sheet pulls in the QR-code encoder, which nothing else needs.
 * Loading it on demand keeps that code out of the initial download for every
 * user who never prints tickets.
 */
const SeatTicketSheet = lazy(() =>
  import('./SeatTicketSheet').then((m) => ({ default: m.SeatTicketSheet }))
);
import { MasterAttendeeList } from './MasterAttendeeList';
import { Printer, Map as MapIcon, DoorOpen, Ticket, Scissors, ListOrdered, Sparkles } from 'lucide-react';
import { CATEGORIES } from '../../data/categories';
import { SAMPLE_TICKETS } from '../../data/sampleTickets';

interface PrintLayoutModalProps {
  seats: Seat[];
  attendees: Attendee[];
  volunteers: Volunteer[];
  eventTitle: string;
  departmentName: string;
  totalSeats: number;
  categories?: Record<string, CategoryInfo>;
}

export const PrintLayoutModal: React.FC<PrintLayoutModalProps> = ({
  seats,
  attendees,
  volunteers,
  eventTitle,
  departmentName,
  totalSeats,
  categories = CATEGORIES,
}) => {
  const [printMode, setPrintMode] = useState<'chart' | 'master' | 'gate1' | 'gate2' | 'gateExam' | 'badges' | 'tickets'>('chart');
  const [badgeViewMode, setBadgeViewMode] = useState<'roster' | 'samples'>('roster');

  /**
   * Seat id -> seat. The three usher sheets and the badge sheet each ran
   * `seats.find(...)` per guest — four nested scans of ~900 guests over ~830
   * seats, recomputed on every render, including simply clicking between the
   * print-mode tabs. One shared map turns each lookup into a hash probe.
   */
  const seatById = useMemo(() => {
    const map = new Map<string, Seat>();
    seats.forEach((s) => map.set(s.id, s));
    return map;
  }, [seats]);

  const ticketableSeats = useMemo(() => seats.filter((s) => !s.isBlocked), [seats]);

  const handleTriggerPrint = () => {
    window.print();
  };

  // The three gate lists share one pass over the roster and are only rebuilt
  // when the plan actually changes, not when the selected print mode does.
  const { gate1Attendees, gate2Attendees, examGateAttendees } = useMemo(() => {
    const gate1: Attendee[] = [];
    const gate2: Attendee[] = [];
    const exam: Attendee[] = [];

    for (const a of attendees) {
      const seat = a.seatId ? seatById.get(a.seatId) : undefined;

      if (
        seat?.gateRecommendation === 'Gate-1' ||
        a.categoryId === 'awardees' ||
        (a.categoryId === 'accompanying' && seat?.tier !== 'EXAM_HALL')
      ) {
        gate1.push(a);
      }
      if (
        seat?.gateRecommendation === 'Gate-2' ||
        a.categoryId === 'senior_faculty' ||
        a.categoryId === 'reporters'
      ) {
        gate2.push(a);
      }
      if (seat?.gateRecommendation === 'Exam Hall Gate' || seat?.tier === 'EXAM_HALL') {
        exam.push(a);
      }
    }

    return { gate1Attendees: gate1, gate2Attendees: gate2, examGateAttendees: exam };
  }, [attendees, seatById]);

  const printOptions = [
    {
      id: 'chart' as const,
      icon: MapIcon,
      title: '1. Full Seating Map',
      description: 'Auditorium & Exam Hall blueprint chart for notice boards & lobby entrance.',
      badge: 'Master Chart',
    },
    {
      id: 'master' as const,
      icon: ListOrdered,
      title: '2. Master Seating List',
      description: 'Every guest with their seat number, grouped by section — for the registration desk.',
      badge: `${attendees.length} Guests`,
    },
    {
      id: 'gate1' as const,
      icon: DoorOpen,
      title: '3. Gate-1 Usher Sheet',
      description: 'Print for volunteers & security managing Gate-1 Entry.',
      badge: `${gate1Attendees.length} Guests`,
    },
    {
      id: 'gate2' as const,
      icon: DoorOpen,
      title: '4. Gate-2 Usher Sheet',
      description: 'Print for volunteers & security managing Gate-2 Entry.',
      badge: `${gate2Attendees.length} Guests`,
    },
    {
      id: 'gateExam' as const,
      icon: DoorOpen,
      title: '5. Exam Hall Usher Sheet',
      description: 'Print for volunteers & ushers managing Exam Section Hall entrance.',
      badge: `${examGateAttendees.length} Guests`,
    },
    {
      id: 'badges' as const,
      icon: Ticket,
      title: '6. Guest Entry Passes',
      description: 'Print admission badges & seat passes with QR code representation.',
      badge: `${attendees.length} Passes`,
    },
    {
      id: 'tickets' as const,
      icon: Scissors,
      title: '7. Seat Tickets (cut & hand out)',
      description: 'One ticket per seat, 8 per A4 page. Includes 1-click Sample Pack preview (Faculty, Admin, VIP, etc.).',
      badge: `${ticketableSeats.length} Seats`,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 print:p-0 print:m-0 print:max-w-none print:w-full print:space-y-0">
      
      {/* Non-Printable Header & Mode Selector */}
      <div className="no-print bg-white border border-slate-300 p-5 rounded-3xl shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-purple-600" />
              <span>Print & PDF Export Center</span>
            </h2>
            <p className="text-xs text-slate-500">
              Select what you want to print, then click the purple "Print Document Now" button below.
            </p>
          </div>

          <button
            onClick={handleTriggerPrint}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/20 transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>🖨️ Print Document Now (or Save as PDF)</span>
          </button>
        </div>

        {/* 4 Big Visual Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {printOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = printMode === opt.id;

            return (
              <button
                key={opt.id}
                onClick={() => setPrintMode(opt.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-purple-50/80 border-purple-600 ring-2 ring-purple-600 shadow-xs scale-[1.02]'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`p-2 rounded-xl ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {opt.badge}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                    {opt.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    {opt.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-bold text-purple-700 flex items-center justify-between">
                  <span>{isSelected ? '✓ Currently Selected' : 'Click to preview'}</span>
                  <span>→</span>
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* Render Area */}
      <div className="print-surface">
        
        {/* 1. AUDITORIUM CHART */}
        {printMode === 'chart' && (
          <PrintableChart
            seats={seats}
            volunteers={volunteers}
            eventTitle={eventTitle}
            departmentName={departmentName}
            categories={categories}
          />
        )}

        {/* 2. MASTER SEATING LIST */}
        {printMode === 'master' && (
          <MasterAttendeeList
            seats={seats}
            attendees={attendees}
            eventTitle={eventTitle}
            departmentName={departmentName}
            categories={categories}
          />
        )}

        {/* 3. GATE 1 USHER LIST */}
        {printMode === 'gate1' && (
          <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto rounded-3xl shadow-sm border border-slate-300 print:shadow-none print:border-0 print:p-0">
            <div className="border-b-2 border-emerald-700 pb-3 mb-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-900 uppercase">
                  Gate-1 Entry Usher Seating Sheet
                </h2>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-bold rounded-xl text-xs font-mono border border-emerald-200">
                  GATE 1 ENTRY (Right Wing & VIP)
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {eventTitle} • {departmentName}
              </p>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                <tr>
                  <th className="p-2.5">Seat</th>
                  <th className="p-2.5">Guest Name</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Designation / Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {gate1Attendees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                      No specific attendees assigned to Gate-1 yet.
                    </td>
                  </tr>
                ) : (
                  gate1Attendees.map((att) => (
                    <tr key={att.id}>
                      <td className="p-2.5 font-mono font-bold text-emerald-900">{att.seatId || '—'}</td>
                      <td className="p-2.5 font-bold text-slate-900">{att.name}</td>
                      <td className="p-2.5">{categories[att.categoryId]?.name || att.categoryId}</td>
                      <td className="p-2.5 text-slate-600">{att.designation || att.department || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. GATE 2 USHER LIST */}
        {printMode === 'gate2' && (
          <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto rounded-3xl shadow-sm border border-slate-300 print:shadow-none print:border-0 print:p-0">
            <div className="border-b-2 border-blue-700 pb-3 mb-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-900 uppercase">
                  Gate-2 Entry Usher Seating Sheet
                </h2>
                <span className="px-3 py-1 bg-blue-100 text-blue-900 font-bold rounded-xl text-xs font-mono border border-blue-200">
                  GATE 2 ENTRY (Left Wing & VIP Center)
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {eventTitle} • {departmentName}
              </p>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                <tr>
                  <th className="p-2.5">Seat</th>
                  <th className="p-2.5">Guest Name</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Designation / Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {gate2Attendees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                      No specific attendees assigned to Gate-2 yet.
                    </td>
                  </tr>
                ) : (
                  gate2Attendees.map((att) => (
                    <tr key={att.id}>
                      <td className="p-2.5 font-mono font-bold text-blue-900">{att.seatId || '—'}</td>
                      <td className="p-2.5 font-bold text-slate-900">{att.name}</td>
                      <td className="p-2.5">{categories[att.categoryId]?.name || att.categoryId}</td>
                      <td className="p-2.5 text-slate-600">{att.designation || att.department || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. EXAM HALL USHER LIST */}
        {printMode === 'gateExam' && (
          <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto rounded-3xl shadow-sm border border-slate-300 print:shadow-none print:border-0 print:p-0">
            <div className="border-b-2 border-pink-700 pb-3 mb-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-900 uppercase">
                  Exam Section Hall Entry Usher Sheet
                </h2>
                <span className="px-3 py-1 bg-pink-100 text-pink-900 font-bold rounded-xl text-xs font-mono border border-pink-200">
                  EXAM SECTION ENTRANCE (Overflow Parents — 100 Seats)
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {eventTitle} • {departmentName}
              </p>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                <tr>
                  <th className="p-2.5">Seat</th>
                  <th className="p-2.5">Guest Name</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Student / Relationship</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {examGateAttendees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                      No guests assigned to Exam Section Hall yet.
                    </td>
                  </tr>
                ) : (
                  examGateAttendees.map((att) => (
                    <tr key={att.id}>
                      <td className="p-2.5 font-mono font-bold text-pink-900">{att.seatId || '—'}</td>
                      <td className="p-2.5 font-bold text-slate-900">{att.name}</td>
                      <td className="p-2.5">{categories[att.categoryId]?.name || att.categoryId}</td>
                      <td className="p-2.5 text-slate-600">{att.department || att.designation || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. SEAT PASS BADGES */}
        {printMode === 'badges' && (
          <div className="space-y-4">
            <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-300 p-3.5 rounded-2xl shadow-2xs">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-black text-slate-900">Pass Mode:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBadgeViewMode('roster')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    badgeViewMode === 'roster'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All Guest Passes ({attendees.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBadgeViewMode('samples')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    badgeViewMode === 'samples'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Sample Pack: 1 of Each Type ({SAMPLE_TICKETS.filter((t) => t.seat.attendee).length})
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              {badgeViewMode === 'samples'
                ? SAMPLE_TICKETS.filter((t) => t.seat.attendee).map((t) => (
                    <SeatPassBadge
                      key={t.id}
                      attendee={t.seat.attendee!}
                      seat={t.seat}
                      eventTitle={eventTitle}
                      departmentName={departmentName}
                      categories={categories}
                    />
                  ))
                : attendees.map((att) => {
                    const seat = att.seatId ? seatById.get(att.seatId) : undefined;
                    return (
                      <SeatPassBadge
                        key={att.id}
                        attendee={att}
                        seat={seat}
                        eventTitle={eventTitle}
                        departmentName={departmentName}
                        categories={categories}
                      />
                    );
                  })}
            </div>
          </div>
        )}

        {/* 5. SEAT TICKETS — one per seat, cut and distribute */}
        {printMode === 'tickets' && (
          <Suspense
            fallback={
              <p className="py-12 text-center text-sm font-semibold text-slate-500">
                Preparing ticket sheet…
              </p>
            }
          >
            <SeatTicketSheet
              seats={seats}
              eventTitle={eventTitle}
              departmentName={departmentName}
              categories={categories}
            />
          </Suspense>
        )}

      </div>

    </div>
  );
};
