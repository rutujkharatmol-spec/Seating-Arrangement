import React, { useState } from 'react';
import { Seat, Attendee, Volunteer } from '../../types/seating';
import { PrintableChart } from './PrintableChart';
import { SeatPassBadge } from './SeatPassBadge';
import { Printer, Map, DoorOpen, Ticket, Download } from 'lucide-react';
import { CATEGORIES } from '../../data/categories';

interface PrintLayoutModalProps {
  seats: Seat[];
  attendees: Attendee[];
  volunteers: Volunteer[];
  eventTitle: string;
  departmentName: string;
  totalSeats: number;
}

export const PrintLayoutModal: React.FC<PrintLayoutModalProps> = ({
  seats,
  attendees,
  volunteers,
  eventTitle,
  departmentName,
  totalSeats,
}) => {
  const [printMode, setPrintMode] = useState<'chart' | 'gate1' | 'gate2' | 'badges'>('chart');

  const handleTriggerPrint = () => {
    window.print();
  };

  const gate1Attendees = attendees.filter((a) => {
    const seat = seats.find((s) => s.id === a.seatId);
    return seat?.gateRecommendation === 'Gate-1' || a.categoryId === 'awardees' || a.categoryId === 'accompanying';
  });

  const gate2Attendees = attendees.filter((a) => {
    const seat = seats.find((s) => s.id === a.seatId);
    return seat?.gateRecommendation === 'Gate-2' || a.categoryId === 'senior_faculty' || a.categoryId === 'reporters' || a.categoryId === 'console';
  });

  const printOptions = [
    {
      id: 'chart' as const,
      icon: Map,
      title: '1. Full Seating Map',
      description: 'Auditorium blueprint chart for notice boards & lobby entrance.',
      badge: 'Master Chart',
    },
    {
      id: 'gate1' as const,
      icon: DoorOpen,
      title: '2. Gate-1 Usher Sheet',
      description: 'Print for volunteers & security managing Gate-1 Entry.',
      badge: `${gate1Attendees.length} Guests`,
    },
    {
      id: 'gate2' as const,
      icon: DoorOpen,
      title: '3. Gate-2 Usher Sheet',
      description: 'Print for volunteers & security managing Gate-2 Entry.',
      badge: `${gate2Attendees.length} Guests`,
    },
    {
      id: 'badges' as const,
      icon: Ticket,
      title: '4. Guest Entry Passes',
      description: 'Print admission badges & seat passes with QR code representation.',
      badge: `${attendees.length} Passes`,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

                  <h3 className="text-xs font-black text-slate-900 leading-tight">
                    {opt.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    {opt.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-bold text-purple-700">
                  {isSelected ? '✓ Selected to Print' : 'Click to Select'}
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* Printable Area */}
      <div className="printable-content">
        
        {/* 1. CHART PRINT */}
        {printMode === 'chart' && (
          <PrintableChart
            seats={seats}
            volunteers={volunteers}
            eventTitle={eventTitle}
            departmentName={departmentName}
            totalSeats={totalSeats}
          />
        )}

        {/* 2. GATE 1 USHER LIST */}
        {printMode === 'gate1' && (
          <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto rounded-3xl shadow-sm border border-slate-300 print:shadow-none print:border-0 print:p-0">
            <div className="border-b-2 border-emerald-700 pb-3 mb-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-900 uppercase">
                  Gate-1 Entry Usher Seating Sheet
                </h2>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-bold rounded-xl text-xs font-mono border border-emerald-200">
                  GATE 1 ENTRY (Right Wing & Center Rows)
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
                      <td className="p-2.5 font-mono font-bold text-blue-900">{att.seatId || '—'}</td>
                      <td className="p-2.5 font-bold text-slate-900">{att.name}</td>
                      <td className="p-2.5">{CATEGORIES[att.categoryId]?.name || att.categoryId}</td>
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
                      <td className="p-2.5">{CATEGORIES[att.categoryId]?.name || att.categoryId}</td>
                      <td className="p-2.5 text-slate-600">{att.designation || att.department || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. SEAT PASS BADGES */}
        {printMode === 'badges' && (
          <div className="flex flex-wrap gap-4 justify-center">
            {attendees.map((att) => {
              const seat = seats.find((s) => s.id === att.seatId);
              return (
                <SeatPassBadge
                  key={att.id}
                  attendee={att}
                  seat={seat}
                  eventTitle={eventTitle}
                  departmentName={departmentName}
                />
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};
