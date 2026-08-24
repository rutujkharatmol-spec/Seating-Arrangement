import React from 'react';
import { Seat, Volunteer, CategoryInfo } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';

interface PrintableChartProps {
  seats: Seat[];
  volunteers: Volunteer[];
  eventTitle: string;
  departmentName: string;
  totalSeats: number;
  categories?: Record<string, CategoryInfo>;
}

export const PrintableChart: React.FC<PrintableChartProps> = ({
  seats,
  volunteers,
  eventTitle,
  departmentName,
  totalSeats,
  categories = CATEGORIES,
}) => {
  const lowerRowList = ['X','W','V','U','T','S','R','Q','P','O','N','M','L','K','J','I','H','G','F','E','D','C','B','A'];

  const getSeatCoordinates = (seat: Seat) => {
    const seatSize = 18;

    if (seat.tier === 'UPPER') {
      const ubRowOrder = ['UB5', 'UB4', 'UB3', 'UB2', 'UB1'];
      const rIdx = ubRowOrder.indexOf(seat.row);
      const y = 90 + rIdx * 24;

      if (seat.block === 'UPPER_LEFT') {
        const x = 90 + (seat.col - 1) * 26;
        return { x, y, size: seatSize };
      }
      if (seat.block === 'UPPER_RIGHT') {
        const x = 705 + (seat.col - 1) * 26;
        return { x, y, size: seatSize };
      }
      if (seat.block === 'UPPER_CENTER') {
        if (seat.row === 'UB5') {
          const x = 380 + (seat.col - 1) * 24;
          return { x, y, size: seatSize };
        } else {
          const x = 350 + (seat.col - 1) * 22;
          return { x, y, size: seatSize };
        }
      }
    }

    const rIdx = lowerRowList.indexOf(seat.row);
    const y = 295 + rIdx * 25.5;

    if (seat.block === 'LOWER_LEFT') {
      const x = 85 + (seat.col - 1) * 26;
      return { x, y, size: seatSize };
    }
    if (seat.block === 'LOWER_CENTER') {
      const x = 350 + (seat.col - 1) * 22;
      return { x, y, size: seatSize };
    }
    if (seat.block === 'LOWER_RIGHT') {
      const x = 705 + (seat.col - 1) * 26;
      return { x, y, size: seatSize };
    }

    return { x: 0, y: 0, size: seatSize };
  };

  const activeCategories = Object.values(categories).filter((c) => c.id !== 'available');

  return (
    <div className="printable-chart bg-white text-slate-900 p-6 max-w-4xl mx-auto rounded-xl shadow-lg border border-slate-300 print:border-0 print:shadow-none print:p-0">
      
      {/* Printable Header */}
      <div className="text-center mb-4 border-b-2 border-slate-800 pb-3">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 font-serif">
          {eventTitle}
        </h1>
        <h2 className="text-sm font-bold text-slate-700 mt-0.5">
          {departmentName}
        </h2>
        <div className="inline-block mt-1 px-3 py-0.5 bg-slate-100 border border-slate-400 rounded-full text-xs font-bold text-slate-800 font-mono">
          Total Seats – {totalSeats}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full aspect-[1/1.05] border border-slate-300 rounded-lg overflow-hidden bg-white p-2">
        <svg viewBox="0 0 1000 1040" className="w-full h-full">
          {/* Upper Balcony Outline */}
          <rect
            x="65"
            y="78"
            width="870"
            height="155"
            rx="18"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />

          {/* Clean Dashed Section Boundaries (No Muddy Background Fills) */}
          <rect x="80" y="85" width="215" height="145" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <rect x="340" y="85" width="320" height="145" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <rect x="695" y="85" width="215" height="145" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

          {/* Lower Floor Dashed Section Boundaries */}
          <rect x="75" y="285" width="230" height="285" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <rect x="75" y="575" width="230" height="135" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <rect x="75" y="715" width="230" height="215" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

          <rect x="340" y="285" width="320" height="55" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <rect x="340" y="345" width="320" height="365" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <rect x="340" y="715" width="320" height="80" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <rect x="340" y="785" width="320" height="145" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

          <rect x="695" y="285" width="230" height="235" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <rect x="695" y="525" width="230" height="185" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <rect x="695" y="715" width="230" height="215" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

          {/* Row Labels */}
          {lowerRowList.map((rowLetter, idx) => {
            const yPos = 308 + idx * 25.5;
            return (
              <g key={rowLetter}>
                <text x="315" y={yPos} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">
                  {rowLetter}
                </text>
                <text x="670" y={yPos} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">
                  {rowLetter}
                </text>
                <text x="935" y={yPos} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">
                  {rowLetter}
                </text>
              </g>
            );
          })}

          {/* Render Seats */}
          {seats.map((seat) => {
            const { x, y, size } = getSeatCoordinates(seat);
            const cat = categories[seat.categoryId] || { color: '#e2e8f0', borderColor: '#64748b' };
            const isBlocked = seat.isBlocked || seat.categoryId === 'blocked';

            return (
              <g key={seat.id} transform={`translate(${x}, ${y})`}>
                <rect
                  x="0"
                  y="0"
                  width={size}
                  height={size}
                  rx="3"
                  fill={isBlocked ? '#fca5a5' : cat.color}
                  stroke={isBlocked ? '#e11d48' : cat.borderColor || '#64748b'}
                  strokeWidth="1"
                />
                {/* Armchair silhouette */}
                <g transform={`scale(${size / 24}) translate(2, 2)`}>
                  <path d="M4 3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3z" fill={isBlocked ? '#e11d48' : '#1e293b'} opacity="0.9" />
                  <rect x="3" y="11" width="14" height="5" rx="1.5" fill={isBlocked ? '#881337' : '#0f172a'} />
                  <rect x="1" y="6" width="2" height="8" rx="1" fill={isBlocked ? '#881337' : '#334155'} />
                  <rect x="17" y="6" width="2" height="8" rx="1" fill={isBlocked ? '#881337' : '#334155'} />
                </g>
              </g>
            );
          })}

          {/* Stage representation at bottom */}
          <g transform="translate(320, 960)">
            <rect x="0" y="0" width="360" height="28" rx="4" fill="#f8fafc" stroke="#0284c7" strokeWidth="1.5" />
            <text x="180" y="18" textAnchor="middle" fill="#0369a1" fontSize="11" fontWeight="bold">
              ▲ STAGE & PODIUM / DAIS ▲
            </text>
          </g>

          {/* Gate-2 and Gate-1 bottom labels */}
          <g transform="translate(20, 930)">
            <polygon points="0,12 25,12 25,5 40,18 25,31 25,24 0,24" fill="#16a34a" />
            <text x="20" y="44" textAnchor="middle" fill="#15803d" fontSize="11" fontWeight="bold">Gate-2 Entry</text>
          </g>
          <g transform="translate(940, 930)">
            <polygon points="40,12 15,12 15,5 0,18 15,31 15,24 40,24" fill="#16a34a" />
            <text x="20" y="44" textAnchor="middle" fill="#15803d" fontSize="11" fontWeight="bold">Gate-1 Entry</text>
          </g>
        </svg>
      </div>

      {/* Legend Footer */}
      <div className="mt-4 pt-3 border-t border-slate-300 grid grid-cols-3 sm:grid-cols-5 gap-2 text-[10px]">
        {activeCategories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded border border-slate-400 shrink-0"
              style={{ backgroundColor: cat.color, borderColor: cat.borderColor }}
            />
            <span className="truncate font-semibold text-slate-800">
              {cat.shortName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
