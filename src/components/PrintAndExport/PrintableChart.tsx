import React from 'react';
import { Seat, Volunteer, CategoryId } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';

interface PrintableChartProps {
  seats: Seat[];
  volunteers: Volunteer[];
  eventTitle: string;
  departmentName: string;
  totalSeats: number;
}

export const PrintableChart: React.FC<PrintableChartProps> = ({
  seats,
  volunteers,
  eventTitle,
  departmentName,
  totalSeats,
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
            fill="#f8fafc"
            stroke="#475569"
            strokeWidth="1.5"
          />
          <text x="187" y="145" textAnchor="middle" fill="#581c87" fontSize="9" fontWeight="bold">
            5×7=35 seats Reserved for Audience
          </text>
          <text x="500" y="102" textAnchor="middle" fill="#581c87" fontSize="8" fontWeight="bold">
            6+4=10 seats Reserved for Audience
          </text>
          <text x="500" y="125" textAnchor="middle" fill="#581c87" fontSize="8" fontWeight="bold">
            1×13=13 Reserved for Audience
          </text>
          <rect x="345" y="132" width="310" height="85" rx="4" fill="#fef9c3" stroke="#ca8a04" strokeWidth="1" />
          <text x="500" y="175" textAnchor="middle" fill="#854d0e" fontSize="9" fontWeight="bold">
            3×13=39 seats Reserved for Band Party
          </text>
          <text x="802" y="145" textAnchor="middle" fill="#581c87" fontSize="9" fontWeight="bold">
            5×7=35 seats Reserved for Audience
          </text>

          {/* Lower Tier Zone Outlines */}
          <rect x="75" y="285" width="230" height="285" rx="6" fill="#faf5ff" stroke="#7e22ce" strokeWidth="1.2" />
          <text x="190" y="435" textAnchor="middle" fill="#6b21a8" fontSize="10" fontWeight="bold">
            11×7=77 Reserved for Audience
          </text>

          <rect x="75" y="575" width="230" height="135" rx="6" fill="#ecfeff" stroke="#0891b2" strokeWidth="1.2" />
          <text x="190" y="645" textAnchor="middle" fill="#155e75" fontSize="10" fontWeight="bold">
            5×7=35 seats console
          </text>

          <rect x="75" y="715" width="230" height="215" rx="6" fill="#fff7ed" stroke="#c2410c" strokeWidth="1.2" />
          <text x="190" y="825" textAnchor="middle" fill="#9a3412" fontSize="10" fontWeight="bold">
            8×7-2=54 seats Registrar + Senior Faculty
          </text>

          <rect x="340" y="285" width="320" height="55" rx="6" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.2" />
          <text x="500" y="318" textAnchor="middle" fill="#1e40af" fontSize="9" fontWeight="bold">
            13×2=26 Reserved for Accompanying Person
          </text>

          <rect x="340" y="345" width="320" height="365" rx="6" fill="#fefce8" stroke="#ca8a04" strokeWidth="1.2" />
          <text x="500" y="530" textAnchor="middle" fill="#854d0e" fontSize="11" fontWeight="bold">
            14×13=182 Reserved for FACULTY
          </text>

          <rect x="340" y="715" width="320" height="80" rx="6" fill="#f0f9ff" stroke="#0369a1" strokeWidth="1.2" />
          <text x="500" y="760" textAnchor="middle" fill="#075985" fontSize="10" fontWeight="bold">
            3×13=39 seats Reporter
          </text>

          <rect x="340" y="785" width="320" height="145" rx="6" fill="#f0fdf4" stroke="#15803d" strokeWidth="1.2" />
          <text x="500" y="860" textAnchor="middle" fill="#166534" fontSize="10" fontWeight="bold">
            4×13=52 seats for VIP
          </text>

          <rect x="695" y="285" width="230" height="235" rx="6" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.2" />
          <text x="810" y="405" textAnchor="middle" fill="#1e40af" fontSize="10" fontWeight="bold">
            7×9=63 Reserved for Accompanying Person
          </text>

          <rect x="695" y="525" width="230" height="185" rx="6" fill="#f0fdf4" stroke="#d946ef" strokeWidth="1.5" />
          <text x="810" y="620" textAnchor="middle" fill="#701a75" fontSize="10" fontWeight="bold">
            7×7=49 seats for Awardees
          </text>

          <rect x="695" y="715" width="230" height="215" rx="6" fill="#fff1f2" stroke="#e11d48" strokeWidth="1.5" />
          <text x="810" y="825" textAnchor="middle" fill="#9f1239" fontSize="10" fontWeight="bold">
            7×8-2=54 seats blocked
          </text>

          {/* Row Labels */}
          {lowerRowList.map((rowLetter, idx) => {
            const yPos = 308 + idx * 25.5;
            return (
              <g key={rowLetter}>
                <text x="315" y={yPos} textAnchor="middle" fill="#475569" fontSize="10" fontWeight="bold">
                  {rowLetter}
                </text>
                <text x="670" y={yPos} textAnchor="middle" fill="#475569" fontSize="10" fontWeight="bold">
                  {rowLetter}
                </text>
                <text x="935" y={yPos} textAnchor="middle" fill="#475569" fontSize="10" fontWeight="bold">
                  {rowLetter}
                </text>
              </g>
            );
          })}

          {/* Render Seats */}
          {seats.map((seat) => {
            const { x, y, size } = getSeatCoordinates(seat);
            const cat = CATEGORIES[seat.categoryId] || { color: '#e2e8f0', borderColor: '#64748b' };
            const isBlocked = seat.isBlocked || seat.categoryId === 'blocked';

            return (
              <g key={seat.id} transform={`translate(${x}, ${y})`}>
                <rect
                  x="0"
                  y="0"
                  width={size}
                  height={size}
                  rx="3"
                  fill={isBlocked ? '#fecdd3' : cat.color}
                  stroke={isBlocked ? '#e11d48' : cat.borderColor}
                  strokeWidth="1"
                />
                {/* Armchair silhouette */}
                <g transform={`scale(${size / 24}) translate(2, 2)`}>
                  <path d="M4 3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3z" fill="#1e293b" opacity="0.9" />
                  <rect x="3" y="11" width="14" height="5" rx="1.5" fill="#0f172a" />
                  <rect x="1" y="6" width="2" height="8" rx="1" fill="#334155" />
                  <rect x="17" y="6" width="2" height="8" rx="1" fill="#334155" />
                </g>
              </g>
            );
          })}

          {/* Stage representation at bottom */}
          <g transform="translate(320, 960)">
            <rect x="0" y="0" width="360" height="28" rx="4" fill="#f1f5f9" stroke="#0284c7" strokeWidth="1.5" />
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
        {Object.values(CATEGORIES).filter(c => c.id !== 'available').map((cat) => (
          <div key={cat.id} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded border border-slate-400 flex-shrink-0"
              style={{ backgroundColor: cat.color }}
            />
            <span className="font-medium text-slate-700 truncate">{cat.name}</span>
          </div>
        ))}
      </div>

    </div>
  );
};
