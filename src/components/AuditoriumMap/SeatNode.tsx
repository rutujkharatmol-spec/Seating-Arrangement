import React from 'react';
import { Seat } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';

interface SeatNodeProps {
  seat: Seat;
  isSelected: boolean;
  isHighlighted: boolean;
  dimmed: boolean;
  /** Zoomed out the tile shows a chair; zoomed in it shows the seat number. */
  labelMode: 'icon' | 'number';
  onClick: (e: React.MouseEvent, seat: Seat) => void;
  onMouseEnter: (e: React.MouseEvent, seat: Seat) => void;
  onMouseLeave: () => void;
  x: number;
  y: number;
  size?: number;
}

const SeatNodeComponent: React.FC<SeatNodeProps> = ({
  seat,
  isSelected,
  isHighlighted,
  dimmed,
  labelMode,
  onClick,
  onMouseEnter,
  onMouseLeave,
  x,
  y,
  size = 20,
}) => {
  const cat = CATEGORIES[seat.categoryId] ?? {
    color: '#94a3b8',
    borderColor: '#475569',
    textColor: '#0f172a',
  };

  const hasAttendee = Boolean(seat.attendee || seat.attendeeId);
  const isBlocked = seat.isBlocked || seat.categoryId === 'blocked';

  const fillColor = isBlocked ? '#fecdd3' : cat.color;
  const strokeColor = isSelected
    ? '#0284c7'
    : isHighlighted
    ? '#f59e0b'
    : isBlocked
    ? '#f43f5e'
    : cat.borderColor;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => onClick(e, seat)}
      onMouseEnter={(e) => onMouseEnter(e, seat)}
      onMouseLeave={onMouseLeave}
      className="cursor-pointer group"
      style={{ opacity: dimmed ? 0.22 : 1 }}
    >
      {isHighlighted && (
        <rect
          x={-3.5}
          y={-3.5}
          width={size + 7}
          height={size + 7}
          rx="6"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
        />
      )}

      {isSelected && (
        <rect
          x={-3.5}
          y={-3.5}
          width={size + 7}
          height={size + 7}
          rx="6"
          fill="none"
          stroke="#0284c7"
          strokeWidth="2.5"
        />
      )}

      <rect
        x="0"
        y="0"
        width={size}
        height={size}
        rx="4"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1}
        className="transition-[filter] group-hover:brightness-105"
      />

      {labelMode === 'number' ? (
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.38}
          fontWeight="700"
          fontFamily="ui-monospace, monospace"
          fill={isBlocked ? '#9f1239' : cat.textColor ?? '#0f172a'}
          pointerEvents="none"
        >
          {seat.col}
        </text>
      ) : (
        <g transform={`scale(${size / 24}) translate(2, 2)`} pointerEvents="none">
          {/* Backrest */}
          <path
            d="M4 3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3z"
            fill={isBlocked ? '#e11d48' : '#1e293b'}
            opacity="0.85"
          />
          {/* Cushion */}
          <rect x="3" y="11" width="14" height="5" rx="1.5" fill={isBlocked ? '#be123c' : '#0f172a'} />
          {/* Armrests */}
          <rect x="1" y="6" width="2" height="8" rx="1" fill={isBlocked ? '#be123c' : '#334155'} />
          <rect x="17" y="6" width="2" height="8" rx="1" fill={isBlocked ? '#be123c' : '#334155'} />
          <path d="M8 17h4v2H8z" fill="#475569" />
        </g>
      )}

      {/* Somebody is sitting here */}
      {hasAttendee && (
        <circle cx={size - 3} cy={3} r="3" fill="#2563eb" stroke="#ffffff" strokeWidth="1" pointerEvents="none" />
      )}

      {isBlocked && labelMode === 'icon' && (
        <line x1="3" y1="3" x2={size - 3} y2={size - 3} stroke="#b91c1c" strokeWidth="1.5" pointerEvents="none" />
      )}
    </g>
  );
};

/**
 * 763 of these re-render on every pan and hover otherwise, which makes
 * dragging the map feel sticky.
 */
export const SeatNode = React.memo(SeatNodeComponent);
