import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Seat, Volunteer, CategoryId, TierType, Attendee } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';
import { SeatNode } from './SeatNode';
import { VolunteersLayer } from './VolunteersLayer';
import { GatesAndExitsLayer } from './GatesAndExitsLayer';
import { MapControls } from './MapControls';
import { Legend } from './Legend';
import { SeatInspector } from '../Editor/SeatInspector';
import { MapPin, User, Shield, MousePointerSquareDashed, X } from 'lucide-react';

interface AuditoriumMapProps {
  seats: Seat[];
  volunteers: Volunteer[];
  selectedCategory: CategoryId | 'all';
  onSelectCategory: (cat: CategoryId | 'all') => void;
  selectedSeats: Seat[];
  unassignedAttendees: Attendee[];
  onToggleSelectSeat: (seat: Seat, multi: boolean) => void;
  onSelectSeatIds: (ids: string[], additive: boolean) => void;
  onClearSelection: () => void;
  onSelectRow: (seat: Seat) => void;
  onSelectZone: (seat: Seat) => void;
  onUpdateSeatsCategory: (seatIds: string[], categoryId: CategoryId) => void;
  onSaveAttendee: (seatId: string, attendee: Partial<Attendee>) => void;
  onAssignExistingAttendee: (seatId: string, attendeeId: string) => void;
  onClearSeat: (seatId: string) => void;
  onToggleBlockedSeats: (seatIds: string[], isBlocked: boolean) => void;
  searchQuery: string;
  matchingSeatIds: string[];
  selectedTier: TierType | 'ALL';
  showVolunteers: boolean;
  showAisles: boolean;
  eventTitle: string;
  departmentName: string;
  /** When set, the map pans and zooms to this seat, then reports back. */
  focusSeatId: string | null;
  onFocusHandled: () => void;
}

/** The drawing is authored in these units; pan and zoom sit on top of it. */
const VIEW_W = 1000;
const VIEW_H = 1050;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

/** Above this zoom the chair glyph is replaced by the readable seat number. */
const LABEL_ZOOM = 1.7;

const LOWER_ROW_LIST = [
  'X', 'W', 'V', 'U', 'T', 'S', 'R', 'Q', 'P', 'O', 'N', 'M',
  'L', 'K', 'J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A',
];

const UPPER_ROW_ORDER = ['UB5', 'UB4', 'UB3', 'UB2', 'UB1'];

const SEAT_SIZE = 20;

/** Where each seat is drawn. Pure, so it is safe to call from anywhere. */
export function getSeatCoordinates(seat: Seat): { x: number; y: number } {
  if (seat.tier === 'UPPER') {
    const y = 90 + Math.max(0, UPPER_ROW_ORDER.indexOf(seat.row)) * 25;
    if (seat.block === 'UPPER_LEFT') return { x: 90 + (seat.col - 1) * 28, y };
    if (seat.block === 'UPPER_RIGHT') return { x: 705 + (seat.col - 1) * 28, y };
    return seat.row === 'UB5'
      ? { x: 380 + (seat.col - 1) * 26, y }
      : { x: 350 + (seat.col - 1) * 23, y };
  }

  const y = 300 + Math.max(0, LOWER_ROW_LIST.indexOf(seat.row)) * 26.5;
  if (seat.block === 'LOWER_LEFT') return { x: 85 + (seat.col - 1) * 28, y };
  if (seat.block === 'LOWER_RIGHT') return { x: 705 + (seat.col - 1) * 28, y };
  return { x: 350 + (seat.col - 1) * 23, y };
}

export const AuditoriumMap: React.FC<AuditoriumMapProps> = ({
  seats,
  volunteers,
  selectedCategory,
  onSelectCategory,
  selectedSeats,
  unassignedAttendees,
  onToggleSelectSeat,
  onSelectSeatIds,
  onClearSelection,
  onSelectRow,
  onSelectZone,
  onUpdateSeatsCategory,
  onSaveAttendee,
  onAssignExistingAttendee,
  onClearSeat,
  onToggleBlockedSeats,
  searchQuery,
  matchingSeatIds,
  selectedTier,
  showVolunteers,
  showAisles,
  eventTitle,
  departmentName,
  focusSeatId,
  onFocusHandled,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<SVGGElement>(null);

  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const { zoom } = view;
  const [isFullscreen, setIsFullscreen] = useState(false);

  /** Either panning the view or dragging a selection box — never both. */
  const [drag, setDrag] = useState<
    | { mode: 'pan'; startClient: { x: number; y: number }; startPan: { x: number; y: number } }
    | { mode: 'lasso'; origin: { x: number; y: number }; current: { x: number; y: number }; additive: boolean }
    | null
  >(null);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    type: 'seat' | 'volunteer';
    seat?: Seat;
    volunteer?: Volunteer;
  }>({ visible: false, x: 0, y: 0, type: 'seat' });

  const selectedIds = useMemo(() => new Set(selectedSeats.map((s) => s.id)), [selectedSeats]);
  const matchingIds = useMemo(() => new Set(matchingSeatIds), [matchingSeatIds]);

  const seatCounts = useMemo(() => {
    const counts = {} as Record<CategoryId, number>;
    seats.forEach((s) => {
      counts[s.categoryId] = (counts[s.categoryId] ?? 0) + 1;
    });
    return counts;
  }, [seats]);

  const isSeatDimmed = useCallback(
    (seat: Seat) => {
      if (selectedTier !== 'ALL' && seat.tier !== selectedTier) return true;
      if (selectedCategory !== 'all' && seat.categoryId !== selectedCategory) return true;
      if (searchQuery.trim() && !matchingIds.has(seat.id)) return true;
      return false;
    },
    [selectedTier, selectedCategory, searchQuery, matchingIds]
  );

  // ------------------------------------------------------------------
  // View transform
  // ------------------------------------------------------------------

  const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

  /** Zooms about the middle of the view, so the map doesn't drift off screen. */
  const zoomAboutCentre = useCallback((factor: number) => {
    setView((v) => {
      const next = clampZoom(v.zoom * factor);
      if (next === v.zoom) return v;
      const ratio = next / v.zoom;
      return {
        zoom: next,
        x: VIEW_W / 2 - (VIEW_W / 2 - v.x) * ratio,
        y: VIEW_H / 2 - (VIEW_H / 2 - v.y) * ratio,
      };
    });
  }, []);

  const resetView = useCallback(() => setView({ zoom: 1, x: 0, y: 0 }), []);

  /** Puts a point of the drawing in the middle of the view at a given zoom. */
  const centreOn = useCallback((x: number, y: number, nextZoom: number) => {
    const z = clampZoom(nextZoom);
    setView({ zoom: z, x: VIEW_W / 2 - z * x, y: VIEW_H / 2 - z * y });
  }, []);

  useEffect(() => {
    if (!focusSeatId) return;
    const seat = seats.find((s) => s.id === focusSeatId);
    if (seat) {
      const { x, y } = getSeatCoordinates(seat);
      centreOn(x + SEAT_SIZE / 2, y + SEAT_SIZE / 2, 2.2);
    }
    onFocusHandled();
  }, [focusSeatId, seats, centreOn, onFocusHandled]);

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(
        () => setIsFullscreen(true),
        () => undefined
      );
    } else {
      document.exitFullscreen().then(
        () => setIsFullscreen(false),
        () => undefined
      );
    }
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ------------------------------------------------------------------
  // Pointer handling: plain drag pans, Shift-drag draws a selection box
  // ------------------------------------------------------------------

  /** Screen point -> drawing coordinates, accounting for viewBox, pan and zoom. */
  const toDrawingPoint = useCallback((clientX: number, clientY: number) => {
    const g = viewportRef.current;
    const ctm = g?.getScreenCTM();
    if (!g || !ctm) return null;
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  }, []);

  /** Screen pixels -> drawing units, for turning a mouse delta into a pan. */
  const screenToDrawingScale = useCallback(() => {
    const ctm = viewportRef.current?.getScreenCTM();
    // ctm.a already includes the zoom, which pan must not be scaled by.
    return ctm && ctm.a !== 0 ? ctm.a / zoom : 1;
  }, [zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    if (e.shiftKey) {
      const origin = toDrawingPoint(e.clientX, e.clientY);
      if (!origin) return;
      e.preventDefault();
      setDrag({ mode: 'lasso', origin, current: origin, additive: e.ctrlKey || e.metaKey });
      return;
    }

    setDrag({ mode: 'pan', startClient: { x: e.clientX, y: e.clientY }, startPan: { x: view.x, y: view.y } });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drag) return;

    if (drag.mode === 'lasso') {
      const current = toDrawingPoint(e.clientX, e.clientY);
      if (current) setDrag({ ...drag, current });
      return;
    }

    const scale = screenToDrawingScale();
    setView((v) => ({
      ...v,
      x: drag.startPan.x + (e.clientX - drag.startClient.x) / scale,
      y: drag.startPan.y + (e.clientY - drag.startClient.y) / scale,
    }));
  };

  const finishDrag = () => {
    if (drag?.mode === 'lasso') {
      const { origin, current, additive } = drag;
      const left = Math.min(origin.x, current.x);
      const right = Math.max(origin.x, current.x);
      const top = Math.min(origin.y, current.y);
      const bottom = Math.max(origin.y, current.y);

      // A tiny box is a mis-click, not an attempt to select nothing.
      if (right - left > 4 || bottom - top > 4) {
        const ids = seats
          .filter((s) => {
            if (isSeatDimmed(s)) return false;
            const { x, y } = getSeatCoordinates(s);
            const cx = x + SEAT_SIZE / 2;
            const cy = y + SEAT_SIZE / 2;
            return cx >= left && cx <= right && cy >= top && cy <= bottom;
          })
          .map((s) => s.id);

        if (ids.length > 0) onSelectSeatIds(ids, additive);
      }
    }
    setDrag(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    zoomAboutCentre(e.deltaY < 0 ? 1.12 : 1 / 1.12);
  };

  // A React onWheel handler is passive, so preventDefault there is ignored.
  // Registering directly lets us stop the page scrolling behind the map.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const block = (e: WheelEvent) => e.preventDefault();
    node.addEventListener('wheel', block, { passive: false });
    return () => node.removeEventListener('wheel', block);
  }, []);

  // ------------------------------------------------------------------
  // Tooltips
  // ------------------------------------------------------------------

  const showTooltipAt = useCallback((e: React.MouseEvent, payload: Partial<typeof tooltip>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTooltip({
      visible: true,
      // Flip to the other side near the edges so the card stays on screen.
      x: x > rect.width - 300 ? x - 275 : x + 16,
      y: y > rect.height - 220 ? y - 200 : y + 16,
      type: 'seat',
      ...payload,
    } as typeof tooltip);
  }, []);

  const hideTooltip = useCallback(
    () => setTooltip((t) => (t.visible ? { ...t, visible: false } : t)),
    []
  );

  const handleSeatClick = useCallback(
    (e: React.MouseEvent, seat: Seat) => onToggleSelectSeat(seat, e.shiftKey || e.ctrlKey || e.metaKey),
    [onToggleSelectSeat]
  );

  const handleSeatEnter = useCallback(
    (e: React.MouseEvent, seat: Seat) => showTooltipAt(e, { type: 'seat', seat }),
    [showTooltipAt]
  );

  const handleVolunteerEnter = useCallback(
    (e: React.MouseEvent, volunteer: Volunteer) => showTooltipAt(e, { type: 'volunteer', volunteer }),
    [showTooltipAt]
  );

  const labelMode: 'icon' | 'number' = zoom >= LABEL_ZOOM ? 'number' : 'icon';

  const lassoRect =
    drag?.mode === 'lasso'
      ? {
          x: Math.min(drag.origin.x, drag.current.x),
          y: Math.min(drag.origin.y, drag.current.y),
          width: Math.abs(drag.current.x - drag.origin.x),
          height: Math.abs(drag.current.y - drag.origin.y),
        }
      : null;

  return (
    <div className={`flex ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-192px)] min-h-[560px]'}`}>

      {/* ---------------------------- Map ---------------------------- */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={finishDrag}
        onMouseLeave={() => {
          finishDrag();
          hideTooltip();
        }}
        onWheel={handleWheel}
        className={`relative flex-1 min-w-0 bg-slate-100/60 overflow-hidden select-none border-b border-slate-200 ${
          drag?.mode === 'pan' ? 'cursor-grabbing' : drag?.mode === 'lasso' ? 'cursor-crosshair' : 'cursor-grab'
        }`}
      >
        <div className="absolute top-3 left-3 z-20 max-w-xs hidden lg:block">
          <Legend
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
            seatCounts={seatCounts}
          />
        </div>

        <MapControls
          zoom={zoom}
          onZoomIn={() => zoomAboutCentre(1.2)}
          onZoomOut={() => zoomAboutCentre(1 / 1.2)}
          onResetZoom={resetView}
          onFitScreen={resetView}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
        />

        {/* How to select many seats — the one non-obvious interaction */}
        <div className="absolute bottom-3 left-3 z-20 hidden md:flex items-center gap-1.5 bg-white/95 backdrop-blur px-2.5 py-1.5 rounded-lg border border-slate-300 shadow-sm text-[11px] text-slate-600 font-medium">
          <MousePointerSquareDashed className="w-3.5 h-3.5 text-blue-600" />
          <span>
            Drag to move • <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px]">Shift</kbd>
            +drag to select many • scroll to zoom
          </span>
        </div>

        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-full">
          <defs>
            <pattern id="lightGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
            </pattern>
            <radialGradient id="stageGlowLight" cx="50%" cy="100%" r="60%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width={VIEW_W} height={VIEW_H} fill="#ffffff" />

          <g ref={viewportRef} transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
            <rect width={VIEW_W} height={VIEW_H} fill="url(#lightGrid)" />
            <rect x="200" y="800" width="600" height="250" fill="url(#stageGlowLight)" />

            {/* Titles */}
            <text x="500" y="32" textAnchor="middle" fill="#0f172a" fontSize="18" fontWeight="bold" fontFamily="system-ui" letterSpacing="0.5">
              {eventTitle}
            </text>
            <text x="500" y="50" textAnchor="middle" fill="#475569" fontSize="13" fontWeight="600" fontFamily="system-ui">
              {departmentName}
            </text>
            <text x="500" y="68" textAnchor="middle" fill="#0284c7" fontSize="14" fontWeight="bold" fontFamily="system-ui">
              Total Seats – {seats.length}
            </text>

            <g transform="translate(60, 45)">
              <g transform="scale(0.8)" fill="#059669">
                <circle cx="12" cy="5" r="3.5" fill="#10b981" />
                <path d="M6 11c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v5c0 .55-.45 1-1 1h-1v7c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-6h-2v6c0 .55-.45 1-1 1H8c-.55 0-1-.45-1-1v-7H6c-.55 0-1-.45-1-1v-5z" />
              </g>
              <text x="26" y="10" fill="#334155" fontSize="10" fontWeight="bold">Volunteers</text>
              <text x="26" y="21" fill="#334155" fontSize="10" fontWeight="bold">Arrangement</text>
            </g>

            {/* Balcony outlines */}
            <rect x="65" y="78" width="870" height="160" rx="24" fill="#f8fafc" fillOpacity="0.8" stroke="#94a3b8" strokeWidth="1.5" />
            <rect x="80" y="85" width="215" height="145" rx="10" fill="#faf5ff" stroke="#a855f7" strokeWidth="1" strokeDasharray="3 3" />
            {showAisles && (
              <text x="187" y="150" textAnchor="middle" fill="#6b21a8" fontSize="9" fontWeight="bold">
                5×7=35 seats Reserved for Audience
              </text>
            )}

            <rect x="340" y="85" width="320" height="145" rx="10" fill="#faf5ff" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3" />
            {showAisles && (
              <>
                <text x="500" y="106" textAnchor="middle" fill="#6b21a8" fontSize="8" fontWeight="bold">
                  6+4=10 seats Reserved for Audience
                </text>
                <text x="500" y="132" textAnchor="middle" fill="#6b21a8" fontSize="8" fontWeight="bold">
                  1×13=13 Reserved for Audience
                </text>
                <rect x="345" y="138" width="310" height="85" rx="6" fill="#fef08a" fillOpacity="0.35" stroke="#eab308" strokeWidth="1.2" />
                <text x="500" y="180" textAnchor="middle" fill="#854d0e" fontSize="9" fontWeight="bold">
                  3×13=39 seats Reserved for Band Party
                </text>
              </>
            )}

            <rect x="695" y="85" width="215" height="145" rx="10" fill="#faf5ff" stroke="#a855f7" strokeWidth="1" strokeDasharray="3 3" />
            {showAisles && (
              <text x="802" y="150" textAnchor="middle" fill="#6b21a8" fontSize="9" fontWeight="bold">
                5×7=35 seats Reserved for Audience
              </text>
            )}

            {/* Ground floor zone outlines */}
            <rect x="75" y="290" width="230" height="295" rx="8" fill="#faf5ff" fillOpacity="0.4" stroke="#9333ea" strokeWidth="1" />
            {showAisles && (
              <text x="190" y="445" textAnchor="middle" fill="#7e22ce" fontSize="10" fontWeight="bold">
                11×7=77 Reserved for Audience
              </text>
            )}

            <rect x="75" y="590" width="230" height="135" rx="8" fill="#ecfeff" fillOpacity="0.5" stroke="#0891b2" strokeWidth="1" />
            {showAisles && (
              <text x="190" y="660" textAnchor="middle" fill="#0e7490" fontSize="10" fontWeight="bold">
                5×7=35 seats console
              </text>
            )}

            <rect x="75" y="730" width="230" height="215" rx="8" fill="#fff7ed" fillOpacity="0.6" stroke="#ea580c" strokeWidth="1" />
            {showAisles && (
              <text x="190" y="840" textAnchor="middle" fill="#c2410c" fontSize="10" fontWeight="bold">
                8×7-2=54 seats Registrar + Senior Faculty
              </text>
            )}

            <rect x="340" y="290" width="320" height="60" rx="8" fill="#eff6ff" fillOpacity="0.5" stroke="#3b82f6" strokeWidth="1" />
            {showAisles && (
              <text x="500" y="325" textAnchor="middle" fill="#1d4ed8" fontSize="9" fontWeight="bold">
                13×2=26 Reserved for Accompanying Person
              </text>
            )}

            <rect x="340" y="355" width="320" height="375" rx="8" fill="#fefce8" fillOpacity="0.5" stroke="#ca8a04" strokeWidth="1" />
            {showAisles && (
              <text x="500" y="540" textAnchor="middle" fill="#854d0e" fontSize="11" fontWeight="bold">
                14×13=182 Reserved for FACULTY
              </text>
            )}

            <rect x="340" y="735" width="320" height="85" rx="8" fill="#f0f9ff" fillOpacity="0.6" stroke="#0284c7" strokeWidth="1" />
            {showAisles && (
              <text x="500" y="780" textAnchor="middle" fill="#0369a1" fontSize="10" fontWeight="bold">
                3×13=39 seats Reporter
              </text>
            )}

            <rect x="340" y="805" width="320" height="140" rx="8" fill="#f0fdf4" fillOpacity="0.6" stroke="#16a34a" strokeWidth="1" />
            {showAisles && (
              <text x="500" y="875" textAnchor="middle" fill="#15803d" fontSize="10" fontWeight="bold">
                4×13=52 seats for VIP
              </text>
            )}

            <rect x="695" y="290" width="230" height="245" rx="8" fill="#eff6ff" fillOpacity="0.5" stroke="#3b82f6" strokeWidth="1" />
            {showAisles && (
              <text x="810" y="415" textAnchor="middle" fill="#1d4ed8" fontSize="10" fontWeight="bold">
                7×9=63 Reserved for Accompanying Person
              </text>
            )}

            <rect x="695" y="540" width="230" height="185" rx="8" fill="#f0fdf4" fillOpacity="0.5" stroke="#d946ef" strokeWidth="1.5" />
            {showAisles && (
              <text x="810" y="635" textAnchor="middle" fill="#a21caf" fontSize="10" fontWeight="bold">
                7×7=49 seats for Awardees
              </text>
            )}

            <rect x="695" y="730" width="230" height="215" rx="8" fill="#fff1f2" fillOpacity="0.5" stroke="#e11d48" strokeWidth="1.5" />
            {showAisles && (
              <text x="810" y="840" textAnchor="middle" fill="#be123c" fontSize="10" fontWeight="bold">
                7×8-2=54 seats blocked
              </text>
            )}

            {/* Row letters down the sides */}
            {LOWER_ROW_LIST.map((rowLetter, idx) => {
              const yPos = 315 + idx * 26.5;
              return (
                <g key={rowLetter}>
                  <text x="315" y={yPos} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="bold">{rowLetter}</text>
                  <text x="670" y={yPos} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="bold">{rowLetter}</text>
                  <text x="935" y={yPos} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="bold">{rowLetter}</text>
                </g>
              );
            })}

            <GatesAndExitsLayer />

            <g className="seats-layer">
              {seats.map((seat) => {
                const { x, y } = getSeatCoordinates(seat);
                return (
                  <SeatNode
                    key={seat.id}
                    seat={seat}
                    x={x}
                    y={y}
                    size={SEAT_SIZE}
                    isSelected={selectedIds.has(seat.id)}
                    isHighlighted={matchingIds.has(seat.id)}
                    dimmed={isSeatDimmed(seat)}
                    labelMode={labelMode}
                    onClick={handleSeatClick}
                    onMouseEnter={handleSeatEnter}
                    onMouseLeave={hideTooltip}
                  />
                );
              })}
            </g>

            {showVolunteers && (
              <VolunteersLayer
                volunteers={volunteers}
                onHoverVolunteer={handleVolunteerEnter}
                onLeaveVolunteer={hideTooltip}
              />
            )}

            {lassoRect && (
              <rect
                {...lassoRect}
                fill="#3b82f6"
                fillOpacity="0.12"
                stroke="#2563eb"
                strokeWidth={1.5 / zoom}
                strokeDasharray={`${5 / zoom} ${3 / zoom}`}
                pointerEvents="none"
              />
            )}
          </g>
        </svg>

        {/* Hover card */}
        {tooltip.visible && (
          <div className="absolute z-30 pointer-events-none" style={{ left: tooltip.x, top: tooltip.y }}>
            {tooltip.type === 'seat' && tooltip.seat && (
              <div className="bg-white/98 text-slate-900 p-3.5 rounded-2xl border border-slate-300 shadow-2xl backdrop-blur-md min-w-[240px] max-w-[300px]">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-slate-400/40"
                      style={{ backgroundColor: CATEGORIES[tooltip.seat.categoryId]?.color ?? '#0284c7' }}
                    />
                    <span className="font-extrabold text-sm text-slate-900 font-mono truncate">
                      Seat {tooltip.seat.id}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                    Row {tooltip.seat.row}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <Row label="Zone" value={CATEGORIES[tooltip.seat.categoryId]?.name ?? tooltip.seat.categoryId} strong />
                  <Row label="Block" value={tooltip.seat.blockName} />

                  {tooltip.seat.attendee ? (
                    <div className="mt-2 pt-2 bg-blue-50/80 p-2.5 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-1.5 text-blue-950 font-bold text-xs">
                        <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{tooltip.seat.attendee.name}</span>
                      </div>
                      {tooltip.seat.attendee.designation && (
                        <p className="text-[11px] text-slate-700 font-medium mt-0.5">{tooltip.seat.attendee.designation}</p>
                      )}
                      {tooltip.seat.attendee.department && (
                        <p className="text-[10px] text-slate-500">{tooltip.seat.attendee.department}</p>
                      )}
                    </div>
                  ) : tooltip.seat.isBlocked ? (
                    <p className="mt-2 text-rose-700 font-bold text-[11px]">Blocked — nobody may sit here</p>
                  ) : (
                    <p className="mt-2 text-emerald-700 font-bold text-[11px]">Empty — click to seat a guest</p>
                  )}

                  <div className="mt-2 pt-1.5 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>Enter through</span>
                    <span className="font-bold text-emerald-700">{tooltip.seat.gateRecommendation}</span>
                  </div>
                </div>
              </div>
            )}

            {tooltip.type === 'volunteer' && tooltip.volunteer && (
              <div className="bg-white/98 text-slate-900 p-3.5 rounded-2xl border border-emerald-400 shadow-2xl backdrop-blur-md min-w-[220px]">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5 mb-1.5 text-emerald-800 font-bold text-xs">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Volunteer checkpoint</span>
                </div>
                <p className="font-bold text-sm text-slate-900">{tooltip.volunteer.name}</p>
                <p className="text-xs text-emerald-700 font-semibold">{tooltip.volunteer.role}</p>
                <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  {tooltip.volunteer.location}
                </p>
                {tooltip.volunteer.phone && (
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">{tooltip.volunteer.phone}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------- Editing panel, beside the map ------------------- */}
      <aside
        className={`shrink-0 border-l border-slate-200 bg-slate-50 overflow-y-auto ${
          selectedSeats.length > 0 ? 'w-[340px] block' : 'w-[340px] hidden xl:block'
        }`}
      >
        <div
          className={`sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-2 ${
            selectedSeats.length > 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
          }`}
        >
          <span className="text-xs font-bold">
            {selectedSeats.length === 0
              ? 'Seat editor'
              : selectedSeats.length === 1
              ? `Editing seat ${selectedSeats[0].id}`
              : `Editing ${selectedSeats.length} seats`}
          </span>
          {selectedSeats.length > 0 && (
            <button
              onClick={onClearSelection}
              aria-label="Close the editing panel"
              className="p-1 rounded hover:bg-blue-500 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="p-3">
          <SeatInspector
            selectedSeats={selectedSeats}
            unassignedAttendees={unassignedAttendees}
            onUpdateSeatsCategory={onUpdateSeatsCategory}
            onSaveAttendee={onSaveAttendee}
            onAssignExistingAttendee={onAssignExistingAttendee}
            onClearSeat={onClearSeat}
            onToggleBlockedSeats={onToggleBlockedSeats}
            onClearSelection={onClearSelection}
            onSelectRow={onSelectRow}
            onSelectZone={onSelectZone}
          />
        </div>
      </aside>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="flex items-center justify-between gap-3 text-slate-500">
    <span className="shrink-0">{label}</span>
    <span className={`text-right truncate ${strong ? 'font-bold text-slate-900' : 'text-slate-700 font-medium'}`}>
      {value}
    </span>
  </div>
);
