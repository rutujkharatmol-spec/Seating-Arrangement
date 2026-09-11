import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Seat, Volunteer, CategoryId, TierType, Attendee, QuestionnaireAnswers, CategoryInfo } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';
import { SeatNode } from './SeatNode';
import { VolunteersLayer } from './VolunteersLayer';
import { GatesAndExitsLayer } from './GatesAndExitsLayer';
import { MapControls } from './MapControls';
import { Legend } from './Legend';
import { SeatInspector } from '../Editor/SeatInspector';
import { MapPin, User, Shield, MousePointerSquareDashed, X, Paintbrush, Edit3, Settings, ArrowLeftRight } from 'lucide-react';

export interface AuditoriumMapProps {
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
  onUpdateEventMetadata?: (title: string, dept: string) => void;
  categories?: Record<string, CategoryInfo>;
  onOpenSectionManager?: () => void;
  answers?: QuestionnaireAnswers;
  onApplyAnswers?: (answers: QuestionnaireAnswers) => void;
  onAddVolunteer?: (vol: Volunteer) => void;
  onUpdateVolunteer?: (vol: Volunteer) => void;
  onDeleteVolunteer?: (id: string) => void;
  onSwapSeats?: (seatIdA: string, seatIdB: string) => void;
  focusSeatId: string | null;
  onFocusHandled: () => void;
  onInitiateSwap?: (seatId: string) => void;
  swapSourceSeatId?: string | null;
}

const VIEW_W = 1000;
const VIEW_H = 1050;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

const LABEL_ZOOM = 1.7;

const LOWER_ROW_LIST = [
  'X', 'W', 'V', 'U', 'T', 'S', 'R', 'Q', 'P', 'O', 'N', 'M',
  'L', 'K', 'J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A',
];

const UPPER_ROW_ORDER = ['UB5', 'UB4', 'UB3', 'UB2', 'UB1'];

// Row -> index lookup built once, so getSeatCoordinates is O(1) per seat
// instead of an Array.indexOf scan. It runs 763 times per map render and once
// per seat in the Kiosk, so the constant factor matters.
const LOWER_ROW_INDEX: Record<string, number> = {};
LOWER_ROW_LIST.forEach((r, i) => { LOWER_ROW_INDEX[r] = i; });
const UPPER_ROW_INDEX: Record<string, number> = {};
UPPER_ROW_ORDER.forEach((r, i) => { UPPER_ROW_INDEX[r] = i; });

const SEAT_SIZE = 20;

export function getSeatCoordinates(seat: Seat): { x: number; y: number } {
  if (seat.x !== undefined && seat.y !== undefined) {
    return { x: seat.x, y: seat.y };
  }

  if (seat.tier === 'UPPER') {
    const y = 90 + (UPPER_ROW_INDEX[seat.row] ?? 0) * 25;
    if (seat.block === 'UPPER_RIGHT') {
      return { x: 873 - (seat.col - 1) * 28, y };
    }
    if (seat.block === 'UPPER_CENTER') {
      if (seat.row === 'UB5') {
        return { x: 614 - (seat.col - 8) * 26, y };
      }
      return { x: 626 - (seat.col - 8) * 23, y };
    }
    if (seat.row === 'UB5') {
      return { x: 258 - (seat.col - 18) * 28, y };
    }
    return { x: 258 - (seat.col - 21) * 28, y };
  }

  const y = 300 + (LOWER_ROW_INDEX[seat.row] ?? 0) * 26.5;
  if (seat.block === 'LOWER_RIGHT') {
    if (seat.row === 'A') {
      return { x: 817 - (seat.col - 1) * 28, y };
    }
    return { x: 873 - (seat.col - 1) * 28, y };
  }
  if (seat.block === 'LOWER_CENTER') {
    return { x: 626 - (seat.col - 8) * 23, y };
  }
  if (seat.row === 'A') {
    return { x: 253 - (seat.col - 6) * 28, y };
  }
  if (seat.row === 'X') {
    return { x: 253 - (seat.col - 8) * 28, y };
  }
  return { x: 253 - (seat.col - 21) * 28, y };
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
  onUpdateEventMetadata,
  categories = CATEGORIES,
  onOpenSectionManager,
  answers,
  onApplyAnswers,
  onAddVolunteer,
  onUpdateVolunteer,
  onDeleteVolunteer,
  onSwapSeats,
  focusSeatId,
  onFocusHandled,
  onInitiateSwap,
  swapSourceSeatId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<SVGGElement>(null);
  // The screen->drawing inverse matrix, captured once at drag start. The map's
  // transform is fixed for the duration of a drag, so reusing it avoids a
  // getScreenCTM() layout read on every mousemove.
  const dragMatrixRef = useRef<DOMMatrix | null>(null);

  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const { zoom } = view;
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Direct Category Paint Brush tool
  const [paintCategory, setPaintCategory] = useState<CategoryId | null>(null);

  /** Either panning the view or dragging a selection box */
  const [drag, setDrag] = useState<
    | { mode: 'pan'; startClient: { x: number; y: number }; startPan: { x: number; y: number }; scale: number }
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
    const counts = {} as Record<string, number>;
    seats.forEach((s) => {
      counts[s.categoryId] = (counts[s.categoryId] ?? 0) + 1;
    });
    return counts;
  }, [seats]);

  // Seat positions depend only on seat identity, so compute them once per seats
  // change rather than on every pan/zoom frame. Reused by lasso hit-testing.
  const seatLayout = useMemo(
    () => seats.map((seat) => ({ seat, ...getSeatCoordinates(seat) })),
    [seats]
  );

  const isSeatDimmed = useCallback(
    (seat: Seat) => {
      if (selectedTier !== 'ALL' && seat.tier !== selectedTier) return true;
      if (selectedCategory !== 'all' && seat.categoryId !== selectedCategory) return true;
      if (searchQuery.trim() && !matchingIds.has(seat.id)) return true;
      return false;
    },
    [selectedTier, selectedCategory, searchQuery, matchingIds]
  );

  const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

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

  // Uses the matrix cached at drag start where possible; falls back to a live
  // read (e.g. focus-to-seat) when no drag is in progress.
  const toDrawingPoint = useCallback((clientX: number, clientY: number) => {
    let inverse = dragMatrixRef.current;
    if (!inverse) {
      const ctm = viewportRef.current?.getScreenCTM();
      if (!ctm) return null;
      inverse = ctm.inverse();
    }
    const pt = new DOMPoint(clientX, clientY).matrixTransform(inverse);
    return { x: pt.x, y: pt.y };
  }, []);

  // Capture the transform once per drag: the inverse matrix (for lasso point
  // mapping) and the screen->drawing scale (for pan deltas).
  const beginDrag = () => {
    const ctm = viewportRef.current?.getScreenCTM();
    dragMatrixRef.current = ctm ? ctm.inverse() : null;
    return ctm && ctm.a !== 0 ? ctm.a / zoom : 1;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // In paintbrush mode: never pan the viewport on left click.
    // Instead, left click & drag does box painting over seats without moving the screen.
    if (paintCategory) {
      if (e.button === 1 || e.altKey) {
        // Allow intentional pan if middle mouse button or Alt key is held
        const scale = beginDrag();
        setDrag({ mode: 'pan', startClient: { x: e.clientX, y: e.clientY }, startPan: { x: view.x, y: view.y }, scale });
        return;
      }
      if (e.button === 0) {
        beginDrag();
        const origin = toDrawingPoint(e.clientX, e.clientY);
        if (!origin) return;
        setDrag({ mode: 'lasso', origin, current: origin, additive: true });
        return;
      }
      return;
    }

    if (e.button !== 0) return;

    if (e.shiftKey) {
      beginDrag();
      const origin = toDrawingPoint(e.clientX, e.clientY);
      if (!origin) return;
      e.preventDefault();
      setDrag({ mode: 'lasso', origin, current: origin, additive: e.ctrlKey || e.metaKey });
      return;
    }

    const scale = beginDrag();
    setDrag({ mode: 'pan', startClient: { x: e.clientX, y: e.clientY }, startPan: { x: view.x, y: view.y }, scale });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drag) return;

    if (drag.mode === 'lasso') {
      const current = toDrawingPoint(e.clientX, e.clientY);
      if (current) setDrag({ ...drag, current });
      return;
    }

    const { scale, startPan, startClient } = drag;
    setView((v) => ({
      ...v,
      x: startPan.x + (e.clientX - startClient.x) / scale,
      y: startPan.y + (e.clientY - startClient.y) / scale,
    }));
  };

  const finishDrag = () => {
    dragMatrixRef.current = null;
    if (drag?.mode === 'lasso') {
      const { origin, current, additive } = drag;
      const left = Math.min(origin.x, current.x);
      const right = Math.max(origin.x, current.x);
      const top = Math.min(origin.y, current.y);
      const bottom = Math.max(origin.y, current.y);

      if (right - left > 4 || bottom - top > 4) {
        // Hit-test against the precomputed layout instead of recomputing
        // coordinates for all 763 seats here.
        const ids: string[] = [];
        for (const { seat, x, y } of seatLayout) {
          if (isSeatDimmed(seat)) continue;
          const cx = x + SEAT_SIZE / 2;
          const cy = y + SEAT_SIZE / 2;
          if (cx >= left && cx <= right && cy >= top && cy <= bottom) ids.push(seat.id);
        }

        if (ids.length > 0) {
          if (paintCategory) {
            onUpdateSeatsCategory(ids, paintCategory);
          } else {
            onSelectSeatIds(ids, additive);
          }
        }
      }
    }
    setDrag(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    zoomAboutCentre(e.deltaY < 0 ? 1.12 : 1 / 1.12);
  };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const block = (e: WheelEvent) => e.preventDefault();
    node.addEventListener('wheel', block, { passive: false });
    return () => node.removeEventListener('wheel', block);
  }, []);

  const showTooltipAt = useCallback((e: React.MouseEvent, payload: Partial<typeof tooltip>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTooltip({
      visible: true,
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
    (e: React.MouseEvent, seat: Seat) => {
      e.stopPropagation();
      if (paintCategory) {
        onUpdateSeatsCategory([seat.id], paintCategory);
        return;
      }
      onToggleSelectSeat(seat, e.shiftKey || e.ctrlKey || e.metaKey);
    },
    [paintCategory, onUpdateSeatsCategory, onToggleSelectSeat]
  );

  const handleSeatEnter = useCallback(
    (e: React.MouseEvent, seat: Seat) => {
      if (paintCategory && e.buttons === 1) {
        e.stopPropagation();
        onUpdateSeatsCategory([seat.id], paintCategory);
      }
      showTooltipAt(e, { type: 'seat', seat });
    },
    [paintCategory, onUpdateSeatsCategory, showTooltipAt]
  );

  const handleVolunteerEnter = useCallback(
    (e: React.MouseEvent, volunteer: Volunteer) => showTooltipAt(e, { type: 'volunteer', volunteer }),
    [showTooltipAt]
  );

  const labelMode: 'icon' | 'number' = zoom >= LABEL_ZOOM ? 'number' : 'icon';

  // The 763 seat nodes are the map's heaviest subtree. Building them in a memo
  // that excludes pan/zoom (`view`) means a pan or zoom keeps the exact same
  // element reference, so React skips reconciling all 763 children and only
  // updates the one transform attribute on the parent <g>. This is what keeps
  // panning smooth. It rebuilds only when something that actually affects a
  // seat's appearance changes (data, selection, search, dimming, label mode).
  const seatNodes = useMemo(
    () =>
      seatLayout.map(({ seat, x, y }) => (
        <SeatNode
          key={seat.id}
          seat={seat}
          categoryInfo={categories[seat.categoryId]}
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
      )),
    [seatLayout, categories, selectedIds, matchingIds, isSeatDimmed, labelMode, handleSeatClick, handleSeatEnter, hideTooltip]
  );

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

      {/* ---------------------------- Map Area ---------------------------- */}
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
        className={`relative flex-1 min-w-0 bg-white overflow-hidden select-none border-b border-slate-200 ${
          drag?.mode === 'pan' ? 'cursor-grabbing' : drag?.mode === 'lasso' ? 'cursor-crosshair' : paintCategory ? 'cursor-cell' : 'cursor-grab'
        }`}
      >
        {/* Top-Left Legend */}
        <div className="absolute top-3 left-3 z-20 max-w-xs hidden lg:block">
          <Legend
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
            seatCounts={seatCounts}
            categories={categories}
            onOpenSectionManager={onOpenSectionManager}
          />
        </div>

        {/* Floating Quick Swap Action Bar when 2 Seats Selected */}
        {selectedSeats.length === 2 && onSwapSeats && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 text-white px-4 py-2 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 backdrop-blur-md animate-fade-in text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-800">
                {selectedSeats[0].id}
              </span>
              <span className="text-slate-400">⇄</span>
              <span className="font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-800">
                {selectedSeats[1].id}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-700" />

            <button
              type="button"
              onClick={() => onSwapSeats(selectedSeats[0].id, selectedSeats[1].id)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black transition cursor-pointer shadow-sm"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Swap Guests</span>
            </button>

            <button
              type="button"
              onClick={onClearSelection}
              className="text-slate-400 hover:text-white text-[11px] cursor-pointer"
              title="Cancel Selection"
            >
              ✕
            </button>
          </div>
        )}

        {/* Floating Paintbrush Active Banner */}
        {paintCategory && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white px-4 py-2 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs animate-bounce">
            <Paintbrush className="w-4 h-4 text-amber-400" />
            <span>
              Painting as: <strong className="text-amber-400">{categories[paintCategory]?.name || paintCategory}</strong>
            </span>
            <button
              onClick={() => setPaintCategory(null)}
              className="px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] cursor-pointer"
            >
              Exit Paint Mode (✕)
            </button>
          </div>
        )}

        {/* Map Zoom Controls */}
        <MapControls
          zoom={zoom}
          onZoomIn={() => zoomAboutCentre(1.2)}
          onZoomOut={() => zoomAboutCentre(1 / 1.2)}
          onResetZoom={resetView}
          onFitScreen={resetView}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
        />

        {/* Quick Interaction Tip */}
        <div className="absolute bottom-3 left-3 z-20 hidden md:flex items-center gap-1.5 bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-300 shadow-sm text-xs text-slate-700 font-medium">
          <MousePointerSquareDashed className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            {paintCategory
              ? '🎨 Click or drag over any chair to paint it directly!'
              : '💡 Click any chair to edit details • Drag to pan • Scroll to zoom'}
          </span>
        </div>

        {/* SVG Drawing Canvas */}
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-full">
          <defs>
            <pattern id="lightGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />
            </pattern>
            <radialGradient id="stageGlowLight" cx="50%" cy="100%" r="60%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width={VIEW_W} height={VIEW_H} fill="#ffffff" />

          <g ref={viewportRef} transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
            <rect width={VIEW_W} height={VIEW_H} fill="url(#lightGrid)" />
            <rect x="200" y="800" width="600" height="250" fill="url(#stageGlowLight)" />

            {/* Event Titles */}
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

            {/* Clean, Non-Overlapping Dashed Boundaries (No Muddy Background Fills) */}
            {/* Balcony Tier */}
            <rect x="65" y="78" width="870" height="160" rx="24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="6 4" />
            <rect x="80" y="85" width="215" height="145" rx="10" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
            <rect x="340" y="85" width="320" height="145" rx="10" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
            <rect x="695" y="85" width="215" height="145" rx="10" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

            {/* Lower Floor Dashed Section Dividers */}
            <rect x="75" y="290" width="230" height="295" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
            <rect x="75" y="590" width="230" height="135" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
            <rect x="75" y="730" width="230" height="215" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

            <rect x="340" y="290" width="320" height="60" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
            <rect x="340" y="355" width="320" height="375" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
            <rect x="340" y="735" width="320" height="85" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
            <rect x="340" y="805" width="320" height="110" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

            <rect x="695" y="290" width="230" height="245" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
            <rect x="695" y="540" width="230" height="185" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
            <rect x="695" y="730" width="230" height="215" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

            {/* Row Letter Labels */}
            {LOWER_ROW_LIST.map((rowLetter, idx) => {
              const yPos = 315 + idx * 26.5;
              return (
                <g key={rowLetter}>
                  <text x="315" y={yPos} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">{rowLetter}</text>
                  <text x="670" y={yPos} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">{rowLetter}</text>
                  <text x="935" y={yPos} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">{rowLetter}</text>
                </g>
              );
            })}

            <GatesAndExitsLayer />

            {/* Individual Seat Nodes (Pure, crisp, high-contrast colors) */}
            <g className="seats-layer">{seatNodes}</g>

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

        {/* Hover Tooltip Card */}
        {tooltip.visible && (
          <div className="absolute z-30 pointer-events-none" style={{ left: tooltip.x, top: tooltip.y }}>
            {tooltip.type === 'seat' && tooltip.seat && (
              <div className="bg-white/98 text-slate-900 p-3 rounded-2xl border border-slate-300 shadow-2xl backdrop-blur-md min-w-[220px] max-w-[280px]">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1.5 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-slate-400/40"
                      style={{ backgroundColor: categories[tooltip.seat.categoryId]?.color ?? '#0284c7' }}
                    />
                    <span className="font-black text-xs text-slate-900 font-mono truncate">
                      Seat {tooltip.seat.id}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                    Row {tooltip.seat.row}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <Row label="Zone" value={categories[tooltip.seat.categoryId]?.name ?? tooltip.seat.categoryId} strong />
                  <Row label="Block" value={tooltip.seat.blockName} />

                  {tooltip.seat.attendee ? (
                    <div className="mt-1.5 pt-1.5 bg-blue-50/80 p-2 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-1 text-blue-950 font-bold text-xs">
                        <User className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="truncate">{tooltip.seat.attendee.name}</span>
                      </div>
                      {tooltip.seat.attendee.designation && (
                        <p className="text-[10px] text-slate-700 font-medium mt-0.5">{tooltip.seat.attendee.designation}</p>
                      )}
                    </div>
                  ) : tooltip.seat.isBlocked ? (
                    <p className="mt-1 text-rose-700 font-bold text-[10px]">🚫 Blocked Seat</p>
                  ) : (
                    <p className="mt-1 text-emerald-700 font-bold text-[10px]">✓ Open Seat (Click to assign)</p>
                  )}

                  <div className="mt-1.5 pt-1 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>Entry Door:</span>
                    <span className="font-bold text-emerald-700">{tooltip.seat.gateRecommendation}</span>
                  </div>
                </div>
              </div>
            )}

            {tooltip.type === 'volunteer' && tooltip.volunteer && (
              <div className="bg-white/98 text-slate-900 p-3 rounded-2xl border border-emerald-400 shadow-2xl backdrop-blur-md min-w-[200px]">
                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 mb-1 text-emerald-800 font-bold text-xs">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Volunteer Checkpoint</span>
                </div>
                <p className="font-bold text-xs text-slate-900">{tooltip.volunteer.name}</p>
                <p className="text-[11px] text-emerald-700 font-semibold">{tooltip.volunteer.role}</p>
                <p className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  {tooltip.volunteer.location}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------- COMPLETE LIVE EDITING SIDEBAR ------------------- */}
      <aside className="w-[330px] md:w-[350px] shrink-0 border-l border-slate-200 bg-slate-50 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-2 bg-slate-900 text-white shadow-xs">
          <span className="text-xs font-bold flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {selectedSeats.length === 0
                ? 'Direct Editor Panel'
                : selectedSeats.length === 1
                ? `Editing Seat ${selectedSeats[0].id}`
                : `Editing ${selectedSeats.length} Seats`}
            </span>
          </span>

          <div className="flex items-center gap-1">
            {onOpenSectionManager && selectedSeats.length === 0 && (
              <button
                type="button"
                onClick={onOpenSectionManager}
                title="Manage Sections"
                className="p-1 rounded hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}

            {selectedSeats.length > 0 && (
              <button
                onClick={onClearSelection}
                aria-label="Deselect"
                className="text-[11px] px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white font-bold transition cursor-pointer"
              >
                Done (✕)
              </button>
            )}
          </div>
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
            categories={categories}
            onOpenSectionManager={onOpenSectionManager}
            answers={answers}
            onApplyAnswers={onApplyAnswers}
            paintCategory={paintCategory}
            onSetPaintCategory={setPaintCategory}
            volunteers={volunteers}
            onAddVolunteer={onAddVolunteer}
            onUpdateVolunteer={onUpdateVolunteer}
            onDeleteVolunteer={onDeleteVolunteer}
            onSwapSeats={onSwapSeats}
            onInitiateSwap={onInitiateSwap}
            swapSourceSeatId={swapSourceSeatId}
          />
        </div>
      </aside>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="flex items-center justify-between gap-2 text-slate-500">
    <span className="shrink-0">{label}:</span>
    <span className={`text-right truncate ${strong ? 'font-bold text-slate-900' : 'text-slate-700 font-medium'}`}>
      {value}
    </span>
  </div>
);
