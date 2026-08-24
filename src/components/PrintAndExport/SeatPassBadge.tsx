import React from 'react';
import { Attendee, Seat, CategoryInfo } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';
import { Building2, QrCode, Armchair, MapPin } from 'lucide-react';

interface SeatPassBadgeProps {
  attendee: Attendee;
  seat?: Seat;
  eventTitle: string;
  departmentName: string;
  categories?: Record<string, CategoryInfo>;
}

export const SeatPassBadge: React.FC<SeatPassBadgeProps> = ({
  attendee,
  seat,
  eventTitle,
  departmentName,
  categories = CATEGORIES,
}) => {
  const cat = categories[attendee.categoryId] || {
    id: attendee.categoryId,
    name: attendee.categoryId,
    shortName: attendee.categoryId,
    color: '#3b82f6',
    textColor: '#ffffff',
    borderColor: '#2563eb',
    description: '',
    defaultCount: 0,
    priority: 99,
  };

  return (
    <div className="seat-badge bg-white text-slate-900 border-2 border-slate-800 rounded-2xl p-4 w-72 shadow-md relative overflow-hidden flex flex-col justify-between print:break-inside-avoid">
      {/* Decorative top color bar */}
      <div
        className="absolute top-0 left-0 right-0 h-3"
        style={{ backgroundColor: cat.color }}
      />

      <div>
        {/* Header */}
        <div className="flex items-center gap-2 pt-1 border-b border-slate-200 pb-2">
          <div className="p-1.5 rounded-lg bg-blue-900 text-white">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-black tracking-wider uppercase text-blue-950">
              AIIMS KALYANI
            </div>
            <div className="text-[9px] text-slate-500 font-medium truncate max-w-[190px]">
              {departmentName}
            </div>
          </div>
        </div>

        {/* Event Name */}
        <div className="mt-2">
          <h4 className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight">
            {eventTitle}
          </h4>
        </div>

        {/* Guest Name & Category Badge */}
        <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="text-sm font-black text-slate-900 leading-tight">
            {attendee.name}
          </div>
          {attendee.designation && (
            <div className="text-[11px] text-slate-600 font-medium mt-0.5">
              {attendee.designation}
            </div>
          )}
          {attendee.department && (
            <div className="text-[10px] text-slate-500">
              {attendee.department}
            </div>
          )}

          <div className="mt-2">
            <span
              className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border"
              style={{
                backgroundColor: cat.color,
                color: cat.textColor,
                borderColor: cat.borderColor,
              }}
            >
              {cat.name}
            </span>
          </div>
        </div>

        {/* Seat & Door Details */}
        <div className="mt-3 grid grid-cols-2 gap-2 bg-blue-50/80 p-2.5 rounded-xl border border-blue-200">
          <div>
            <div className="text-[9px] font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1">
              <Armchair className="w-3 h-3 text-blue-600" />
              <span>Assigned Seat</span>
            </div>
            <div className="text-lg font-black text-blue-900 font-mono mt-0.5">
              {seat ? seat.id : 'UNSEATED'}
            </div>
            {seat && (
              <div className="text-[9px] text-slate-600 font-medium">
                {seat.blockName} • Row {seat.row}
              </div>
            )}
          </div>

          <div>
            <div className="text-[9px] font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-600" />
              <span>Entry Door</span>
            </div>
            <div className="text-xs font-black text-emerald-800 mt-1">
              {seat?.gateRecommendation || 'Main Entrance'}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400">
        <span>Auditorium Pass</span>
        <QrCode className="w-5 h-5 text-slate-700" />
      </div>
    </div>
  );
};
