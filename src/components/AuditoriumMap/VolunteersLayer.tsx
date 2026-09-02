import React from 'react';
import { Volunteer } from '../../types/seating';

interface VolunteersLayerProps {
  volunteers: Volunteer[];
  onSelectVolunteer?: (vol: Volunteer) => void;
  onHoverVolunteer?: (e: React.MouseEvent, vol: Volunteer) => void;
  onLeaveVolunteer?: () => void;
}

const VolunteersLayerComponent: React.FC<VolunteersLayerProps> = ({
  volunteers,
  onSelectVolunteer,
  onHoverVolunteer,
  onLeaveVolunteer,
}) => {
  return (
    <g className="volunteers-layer pointer-events-auto">
      {volunteers.map((vol) => (
        <g
          key={vol.id}
          transform={`translate(${vol.x}, ${vol.y})`}
          onClick={() => onSelectVolunteer && onSelectVolunteer(vol)}
          onMouseEnter={(e) => onHoverVolunteer && onHoverVolunteer(e, vol)}
          onMouseLeave={onLeaveVolunteer}
          className="cursor-pointer group"
        >
          {/* Volunteer Pin Bubble */}
          <circle
            cx="12"
            cy="12"
            r="15"
            fill="#0f172a"
            stroke="#10b981"
            strokeWidth="2"
            className="group-hover:stroke-emerald-400 group-hover:fill-slate-800 transition-all drop-shadow-md"
          />

          {/* Volunteer Human Icon (SVG matching blueprint) */}
          <g transform="translate(4, 4) scale(0.65)" fill="#10b981">
            {/* Head */}
            <circle cx="12" cy="5" r="3.5" fill="#34d399" />
            {/* Torso & Arms */}
            <path
              d="M6 11c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v5c0 .55-.45 1-1 1h-1v7c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-6h-2v6c0 .55-.45 1-1 1H8c-.55 0-1-.45-1-1v-7H6c-.55 0-1-.45-1-1v-5z"
              fill="#10b981"
            />
          </g>

          {/* Label under icon */}
          <text
            x="12"
            y="35"
            textAnchor="middle"
            fill="#6ee7b7"
            fontSize="9"
            fontWeight="bold"
            className="select-none font-sans drop-shadow"
          >
            Vol
          </text>
        </g>
      ))}
    </g>
  );
};

// Memoized: the volunteer set and handlers are stable during pan/zoom, so this
// SVG layer should not re-render on every frame.
export const VolunteersLayer = React.memo(VolunteersLayerComponent);
