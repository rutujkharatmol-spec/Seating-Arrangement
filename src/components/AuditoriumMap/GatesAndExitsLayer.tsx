import React from 'react';

export const GatesAndExitsLayer: React.FC = () => {
  return (
    <g className="gates-exits-layer select-none pointer-events-none">
      {/* ========================================================
          1. BOTTOM GATES (Gate-1 Entry and Gate-2 Entry)
          ======================================================== */}
      {/* Gate-2 (Bottom-Left) */}
      <g transform="translate(10, 930)">
        {/* Green Arrow (pointing into auditorium right/up) */}
        <polygon
          points="0,15 35,15 35,5 55,22 35,39 35,29 0,29"
          fill="#10b981"
          stroke="#064e3b"
          strokeWidth="1.5"
          className="filter drop-shadow-md"
        />
        <text
          x="25"
          y="52"
          textAnchor="middle"
          fill="#34d399"
          fontSize="13"
          fontWeight="bold"
          fontFamily="system-ui"
        >
          Gate-2
        </text>
        <text
          x="25"
          y="66"
          textAnchor="middle"
          fill="#a7f3d0"
          fontSize="11"
          fontWeight="semibold"
          fontFamily="system-ui"
        >
          Entry
        </text>
      </g>

      {/* Gate-1 (Bottom-Right) */}
      <g transform="translate(935, 930)">
        {/* Green Arrow (pointing left into auditorium) */}
        <polygon
          points="55,15 20,15 20,5 0,22 20,39 20,29 55,29"
          fill="#10b981"
          stroke="#064e3b"
          strokeWidth="1.5"
          className="filter drop-shadow-md"
        />
        <text
          x="30"
          y="52"
          textAnchor="middle"
          fill="#34d399"
          fontSize="13"
          fontWeight="bold"
          fontFamily="system-ui"
        >
          Gate-1
        </text>
        <text
          x="30"
          y="66"
          textAnchor="middle"
          fill="#a7f3d0"
          fontSize="11"
          fontWeight="semibold"
          fontFamily="system-ui"
        >
          Entry
        </text>
      </g>

      {/* ========================================================
          2. MID-TIER AISLE EXITS (Red Arrows pointing outwards)
          ======================================================== */}
      {/* Mid Left Exit */}
      <g transform="translate(15, 520)">
        <polygon
          points="45,10 18,10 18,0 0,16 18,32 18,22 45,22"
          fill="#ef4444"
          stroke="#7f1d1d"
          strokeWidth="1.5"
          className="filter drop-shadow"
        />
        <text
          x="22"
          y="44"
          textAnchor="middle"
          fill="#fca5a5"
          fontSize="11"
          fontWeight="bold"
        >
          Exit
        </text>
      </g>

      {/* Mid Right Exit */}
      <g transform="translate(930, 520)">
        <polygon
          points="0,10 27,10 27,0 45,16 27,32 27,22 0,22"
          fill="#ef4444"
          stroke="#7f1d1d"
          strokeWidth="1.5"
          className="filter drop-shadow"
        />
        <text
          x="22"
          y="44"
          textAnchor="middle"
          fill="#fca5a5"
          fontSize="11"
          fontWeight="bold"
        >
          Exit
        </text>
      </g>

      {/* Cross-Aisle Left Exit (between main and upper) */}
      <g transform="translate(340, 260)">
        <polygon
          points="7,25 7,12 0,12 11,0 22,12 15,12 15,25"
          fill="#ef4444"
          stroke="#7f1d1d"
          strokeWidth="1.5"
          className="filter drop-shadow"
        />
        <text
          x="11"
          y="37"
          textAnchor="middle"
          fill="#fca5a5"
          fontSize="10"
          fontWeight="bold"
        >
          Exit
        </text>
      </g>

      {/* Cross-Aisle Right Exit (between main and upper) */}
      <g transform="translate(645, 260)">
        <polygon
          points="7,25 7,12 0,12 11,0 22,12 15,12 15,25"
          fill="#ef4444"
          stroke="#7f1d1d"
          strokeWidth="1.5"
          className="filter drop-shadow"
        />
        <text
          x="11"
          y="37"
          textAnchor="middle"
          fill="#fca5a5"
          fontSize="10"
          fontWeight="bold"
        >
          Exit
        </text>
      </g>

      {/* Top Left Balcony Exit */}
      <g transform="translate(325, 75)">
        <polygon
          points="7,25 7,12 0,12 11,0 22,12 15,12 15,25"
          fill="#ef4444"
          stroke="#7f1d1d"
          strokeWidth="1.5"
        />
        <text
          x="11"
          y="36"
          textAnchor="middle"
          fill="#fca5a5"
          fontSize="10"
          fontWeight="bold"
        >
          Exit
        </text>
      </g>

      {/* Top Right Balcony Exit */}
      <g transform="translate(670, 75)">
        <polygon
          points="7,25 7,12 0,12 11,0 22,12 15,12 15,25"
          fill="#ef4444"
          stroke="#7f1d1d"
          strokeWidth="1.5"
        />
        <text
          x="11"
          y="36"
          textAnchor="middle"
          fill="#fca5a5"
          fontSize="10"
          fontWeight="bold"
        >
          Exit
        </text>
      </g>

      {/* Stage / Podium Representation at the very bottom */}
      <g transform="translate(320, 975)">
        <rect
          x="0"
          y="0"
          width="360"
          height="32"
          rx="6"
          fill="#1e293b"
          stroke="#3b82f6"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          className="filter drop-shadow-lg"
        />
        <text
          x="180"
          y="20"
          textAnchor="middle"
          fill="#93c5fd"
          fontSize="12"
          fontWeight="bold"
          letterSpacing="2"
        >
          ▲ STAGE & PODIUM / DAIS ▲
        </text>
      </g>

    </g>
  );
};
