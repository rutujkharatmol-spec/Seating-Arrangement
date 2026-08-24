import React from 'react';
import { Attendee, Seat } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';
import { Building2, QrCode, Armchair, MapPin } from 'lucide-react';

interface SeatPassBadgeProps {
  attendee: Attendee;
  seat?: Seat;
  eventTitle: string;
  departmentName: string;
}

export const SeatPassBadge: React.FC<SeatPassBadgeProps> = ({
  attendee,
  seat,
  eventTitle,
  departmentName,
}) => {
  const cat = CATEGORIES[attendee.categoryId] || {
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

        {/* Attendee Name & Title */}
        <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <span className="text-[9px] uppercase font-bold text-slate-400">Honourable Guest</span>
          <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
            {attendee.name}
          </h3>
          {attendee.designation && (
            <p className="text-[11px] text-slate-700 font-medium mt-0.5">
              {attendee.designation}
            </p>
          )}
          {attendee.department && (
            <p className="text-[10px] text-slate-500">{attendee.department}</p>
          )}
        </div>

        {/* Category Pill */}
        <div className="mt-2">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block border"
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

      {/* Seat & Gate Box */}
      <div className="mt-4 pt-3 border-t border-dashed border-slate-300 flex items-center justify-between">
        <div>
          <div className="text-[9px] uppercase font-bold text-slate-400">Assigned Seat</div>
          <div className="text-xl font-black font-mono text-blue-950 flex items-center gap-1">
            <Armchair className="w-4 h-4 text-blue-600" />
            <span>{attendee.seatId || 'OPEN'}</span>
          </div>
          <div className="text-[9px] font-bold text-emerald-700 mt-0.5 flex items-center gap-0.5">
            <MapPin className="w-2.5 h-2.5" />
            <span>{seat?.gateRecommendation || 'Gate-1 or Gate-2'}</span>
          </div>
        </div>

        {/* QR Code representation */}
        <div className="w-12 h-12 bg-slate-100 border border-slate-300 rounded-lg p-1 flex items-center justify-center">
          <QrCode className="w-9 h-9 text-slate-800" />
        </div>
      </div>
    </div>
  );
};
