import React, { useMemo, useState } from 'react';
import { Seat, Attendee, Volunteer } from '../../types/seating';
import { PrintableChart } from './PrintableChart';
import { SeatPassBadge } from './SeatPassBadge';
import { Printer, Info } from 'lucide-react';
import { CATEGORIES } from '../../data/categories';
import { exportSeatingToCsv } from '../../utils/exportHelpers';

interface PrintLayoutModalProps {
  seats: Seat[];
  attendees: Attendee[];
  volunteers: Volunteer[];
  eventTitle: string;
  departmentName: string;
  totalSeats: number;
}

type PrintMode = 'chart' | 'guests' | 'gate1' | 'gate2' | 'badges';

const MODES: { id: PrintMode; label: string; blurb: string }[] = [
  { id: 'chart', label: 'Auditorium chart', blurb: 'The colour-coded floor plan of every zone.' },
  { id: 'guests', label: 'Guest list (A–Z)', blurb: 'Alphabetical name-to-seat sheet for the reception desk.' },
  { id: 'gate1', label: 'Gate-1 sheet', blurb: 'Only the guests entering through Gate-1, in seat order.' },
  { id: 'gate2', label: 'Gate-2 sheet', blurb: 'Only the guests entering through Gate-2, in seat order.' },
  { id: 'badges', label: 'Seat passes', blurb: 'One cut-out admission pass per seated guest.' },
];

export const PrintLayoutModal: React.FC<PrintLayoutModalProps> = ({
  seats,
  attendees,
  volunteers,
  eventTitle,
  departmentName,
  totalSeats,
}) => {
  const [printMode, setPrintMode] = useState<PrintMode>('chart');

  const seatById = useMemo(() => new Map(seats.map((s) => [s.id, s])), [seats]);

  const seatedGuests = useMemo(
    () => attendees.filter((a) => a.seatId && seatById.has(a.seatId)),
    [attendees, seatById]
  );

  const byName = useMemo(
    () => [...seatedGuests].sort((a, b) => a.name.localeCompare(b.name)),
    [seatedGuests]
  );

  /** Grouped strictly by the gate printed on the seat, so nobody is listed twice. */
  const byGate = useMemo(() => {
    const groups = new Map<string, Attendee[]>();
    seatedGuests.forEach((a) => {
      const gate = seatById.get(a.seatId!)!.gateRecommendation;
      const list = groups.get(gate);
      if (list) list.push(a);
      else groups.set(gate, [a]);
    });
    groups.forEach((list) => list.sort((a, b) => a.seatId!.localeCompare(b.seatId!)));
    return groups;
  }, [seatedGuests, seatById]);

  const activeMode = MODES.find((m) => m.id === printMode)!;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

      <div className="no-print bg-white border border-slate-300 p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-purple-600" />
              <span>Print & export</span>
            </h2>
            <p className="text-xs text-slate-500">
              Pick what you need, then print it or save it as a PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportSeatingToCsv(seats, attendees, eventTitle)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition cursor-pointer"
            >
              Export all seats (CSV)
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / save as PDF</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setPrintMode(mode.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                printMode === mode.id ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              {mode.label}
              {mode.id === 'badges' && ` (${seatedGuests.length})`}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {activeMode.blurb}
          {printMode !== 'chart' && seatedGuests.length === 0 && (
            <strong className="text-amber-700">
              {' '}Nobody is seated yet, so this sheet will be empty.
            </strong>
          )}
        </p>
      </div>

      <div className="printable-content">
        {printMode === 'chart' && (
          <PrintableChart
            seats={seats}
            volunteers={volunteers}
            eventTitle={eventTitle}
            departmentName={departmentName}
            totalSeats={totalSeats}
          />
        )}

        {printMode === 'guests' && (
          <GuestSheet
            title="Guest list — alphabetical"
            subtitle={`${eventTitle} • ${departmentName}`}
            accent="border-slate-800"
            guests={byName}
            seatById={seatById}
          />
        )}

        {printMode === 'gate1' && (
          <GuestSheet
            title="Gate-1 usher sheet"
            subtitle={`${eventTitle} • ${departmentName}`}
            accent="border-emerald-700"
            badge="GATE 1 ENTRY"
            guests={byGate.get('Gate-1') ?? []}
            seatById={seatById}
          />
        )}

        {printMode === 'gate2' && (
          <GuestSheet
            title="Gate-2 usher sheet"
            subtitle={`${eventTitle} • ${departmentName}`}
            accent="border-blue-700"
            badge="GATE 2 ENTRY"
            guests={byGate.get('Gate-2') ?? []}
            seatById={seatById}
          />
        )}

        {printMode === 'badges' && (
          <div className="flex flex-wrap gap-4 justify-center">
            {seatedGuests.map((att) => (
              <SeatPassBadge
                key={att.id}
                attendee={att}
                seat={seatById.get(att.seatId!)}
                eventTitle={eventTitle}
                departmentName={departmentName}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

/** One printed table of guests. Shared by the A–Z list and both gate sheets. */
const GuestSheet: React.FC<{
  title: string;
  subtitle: string;
  accent: string;
  badge?: string;
  guests: Attendee[];
  seatById: Map<string, Seat>;
}> = ({ title, subtitle, accent, badge, guests, seatById }) => (
  <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto rounded-2xl shadow-sm border border-slate-300 print:shadow-none print:border-0 print:p-0 print:max-w-none">
    <div className={`border-b-2 ${accent} pb-3 mb-4`}>
      <div className="flex justify-between items-center gap-4">
        <h2 className="text-xl font-extrabold text-slate-900 uppercase">{title}</h2>
        <span className="px-3 py-1 bg-slate-100 text-slate-900 font-bold rounded-lg text-xs font-mono border border-slate-300 whitespace-nowrap">
          {badge ? `${badge} • ` : ''}{guests.length} guest{guests.length === 1 ? '' : 's'}
        </span>
      </div>
      <p className="text-xs text-slate-600 mt-1">{subtitle}</p>
    </div>

    {guests.length === 0 ? (
      <p className="text-sm text-slate-500 py-6 text-center">No guests on this sheet yet.</p>
    ) : (
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
          <tr>
            <th className="p-2 w-8">#</th>
            <th className="p-2">Seat</th>
            <th className="p-2">Guest name</th>
            <th className="p-2">Zone</th>
            <th className="p-2">Designation / department</th>
            <th className="p-2">Row</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {guests.map((att, i) => {
            const seat = seatById.get(att.seatId!);
            return (
              <tr key={att.id} className="break-inside-avoid">
                <td className="p-2 text-slate-400 font-mono">{i + 1}</td>
                <td className="p-2 font-mono font-bold text-blue-900">{att.seatId}</td>
                <td className="p-2 font-bold">{att.name}</td>
                <td className="p-2">{CATEGORIES[att.categoryId]?.name ?? att.categoryId}</td>
                <td className="p-2 text-slate-600">
                  {[att.designation, att.department].filter(Boolean).join(' • ') || '—'}
                </td>
                <td className="p-2 font-mono text-slate-700">{seat ? `${seat.blockName.split(' ')[0]} ${seat.row}` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    )}
  </div>
);
