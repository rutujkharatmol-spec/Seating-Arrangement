import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Seat, Attendee, Volunteer, CategoryInfo } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';
import { getSeatCoordinates } from '../AuditoriumMap/AuditoriumMap';
import { 
  Search, 
  MapPin, 
  DoorOpen, 
  Armchair, 
  User, 
  Building2, 
  Compass, 
  Phone, 
  Shield, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Copy,
  Layers,
  HelpCircle,
  QrCode
} from 'lucide-react';

interface SeatTrackerKioskProps {
  seats: Seat[];
  attendees: Attendee[];
  volunteers?: Volunteer[];
  categories?: Record<string, CategoryInfo>;
  eventTitle?: string;
  departmentName?: string;
  onNavigateToAdmin?: () => void;
}

const VIEW_W = 1000;
const VIEW_H = 1050;
const SEAT_SIZE = 20;

export const SeatTrackerKiosk: React.FC<SeatTrackerKioskProps> = ({
  seats,
  attendees,
  volunteers = [],
  categories = CATEGORIES,
  eventTitle = 'AIIMS Kalyani Auditorium',
  departmentName = 'Annual Event / Convocation',
  onNavigateToAdmin,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [copied, setCopied] = useState(false);
  const [showVolunteersList, setShowVolunteersList] = useState(false);

  // SVG Pan and Zoom
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const viewportRef = useRef<SVGGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Join attendees with seats
  const attendeeMap = useMemo(() => {
    const map = new Map<string, Seat>();
    seats.forEach((s) => {
      if (s.attendeeId) map.set(s.attendeeId, s);
      if (s.attendee?.id) map.set(s.attendee.id, s);
    });
    return map;
  }, [seats]);

  // Search filter
  const matchingResults = useMemo<{ attendees: Attendee[]; seats: Seat[] }>(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return { attendees: [], seats: [] };

    // Search in attendees
    const matchedAttendees = attendees.filter((a) => {
      const matchName = a.name.toLowerCase().includes(q);
      const matchPhone = a.phone && a.phone.includes(q);
      const matchDept = a.department && a.department.toLowerCase().includes(q);
      const matchTitle = (a.designation || a.title) && (a.designation || a.title || '').toLowerCase().includes(q);
      const matchSeat = a.seatId && a.seatId.toLowerCase().includes(q);
      const matchNotes = a.notes && a.notes.toLowerCase().includes(q);
      const matchEmail = a.email && a.email.toLowerCase().includes(q);
      return Boolean(matchName || matchPhone || matchDept || matchTitle || matchSeat || matchNotes || matchEmail);
    });

    // Also search in seats (by seat ID like "C-A7", "A7")
    const matchedSeats = seats.filter((s) => {
      const matchId = s.id.toLowerCase().includes(q) || s.seatNumber.toLowerCase().includes(q);
      return matchId;
    });

    return {
      attendees: matchedAttendees,
      seats: matchedSeats.slice(0, 10),
    };
  }, [searchTerm, attendees, seats]);

  // Center on seat
  const centerOnSeat = useCallback((seat: Seat) => {
    const { x, y } = getSeatCoordinates(seat);
    const targetZoom = 2.4;
    setView({
      zoom: targetZoom,
      x: VIEW_W / 2 - targetZoom * (x + SEAT_SIZE / 2),
      y: VIEW_H / 2 - targetZoom * (y + SEAT_SIZE / 2),
    });
  }, []);

  const handleSelectAttendee = (att: Attendee) => {
    setSelectedAttendee(att);
    const seat = att.seatId ? seats.find((s) => s.id === att.seatId) : attendeeMap.get(att.id) || null;
    setSelectedSeat(seat || null);

    if (seat) {
      centerOnSeat(seat);
    }
  };

  const handleSelectSeatOnly = (seat: Seat) => {
    setSelectedSeat(seat);
    const att = attendees.find((a) => a.seatId === seat.id);
    setSelectedAttendee(att || null);
    centerOnSeat(seat);
  };

  const handleResetZoom = () => {
    setView({ zoom: 1, x: 0, y: 0 });
  };

  const handleCopyPass = () => {
    if (!selectedSeat) return;
    const text = `AIIMS Kalyani Seating Pass:\nGuest: ${selectedAttendee?.name || 'Guest'}\nSeat: ${selectedSeat.blockName} Row ${selectedSeat.row}, Seat ${selectedSeat.col} (${selectedSeat.id})\nEntry Gate: ${selectedSeat.gateRecommendation}\nEvent: ${eventTitle}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const selectedCoordinates = selectedSeat ? getSeatCoordinates(selectedSeat) : null;
  const selectedCat = selectedSeat ? categories[selectedSeat.categoryId] : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* -------------------- Top Brand Header (Light Theme) -------------------- */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-blue-700 uppercase">
                  AIIMS KALYANI
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Guest Self-Service Kiosk
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate max-w-xs sm:max-w-md md:max-w-xl">
                🔍 Find My Seat & Entry Door Navigator
              </h1>
            </div>
          </div>

          {/* Quick links & Admin switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVolunteersList(!showVolunteersList)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Gate Helpdesk</span>
            </button>

            {onNavigateToAdmin && (
              <button
                onClick={onNavigateToAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition cursor-pointer"
                title="Return to Coordinator Admin Dashboard"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Admin Manager</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* -------------------- Main Kiosk Workspace -------------------- */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* -------------------- LEFT PANEL: Search & Guest Info (5 Cols) -------------------- */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Big Search Input Box */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-4 h-4 text-blue-600" />
                <span>Search Your Name or Seat:</span>
              </label>
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedAttendee(null);
                    setSelectedSeat(null);
                    handleResetZoom();
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type your name (e.g. Dr. Rajesh), phone, or seat (e.g. C-A7)..."
                className="w-full bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-blue-600 rounded-2xl px-4 py-3.5 text-sm sm:text-base font-semibold text-slate-900 placeholder-slate-400 focus:outline-none shadow-xs transition"
                autoFocus
              />
              {searchTerm && (
                <div className="absolute right-3 top-3.5 text-xs text-slate-500 font-mono font-bold">
                  {matchingResults.attendees.length} match(es)
                </div>
              )}
            </div>

            {/* Quick Helper Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-semibold">Quick search:</span>
              <button
                type="button"
                onClick={() => setSearchTerm('VIP')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer transition"
              >
                👑 VIP
              </button>
              <button
                type="button"
                onClick={() => setSearchTerm('Faculty')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer transition"
              >
                🎓 Faculty
              </button>
              <button
                type="button"
                onClick={() => setSearchTerm('Awardees')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer transition"
              >
                🏆 Awardees
              </button>
              <button
                type="button"
                onClick={() => setSearchTerm('C-A')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-medium cursor-pointer transition"
              >
                Row A
              </button>
            </div>
          </div>

          {/* Search Dropdown / Live Results List */}
          {searchTerm && matchingResults.attendees.length > 0 && !selectedAttendee && (
            <div className="bg-white border border-slate-200 rounded-3xl p-3 shadow-xl max-h-80 overflow-y-auto space-y-1.5 scrollbar-thin">
              <div className="text-[11px] font-bold text-slate-500 px-2 py-1 uppercase tracking-wider">
                Select Your Name from the List:
              </div>
              {matchingResults.attendees.map((att) => {
                const seat = att.seatId ? seats.find((s) => s.id === att.seatId) : null;
                const cat = categories[att.categoryId] || { name: att.categoryId, color: '#3b82f6' };

                return (
                  <button
                    key={att.id}
                    onClick={() => handleSelectAttendee(att)}
                    className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 text-left transition flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 group-hover:text-blue-700 truncate">
                        {att.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        {att.designation || att.department || 'Guest'}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {seat ? (
                        <div className="font-mono font-black text-sm text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                          {seat.id}
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-bold">Unseated</span>
                      )}
                      <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                        {cat.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* -------------------- SPOTLIGHT SEAT CARD (Light Theme) -------------------- */}
          {selectedSeat && (
            <div className="bg-white border-2 border-blue-500 rounded-3xl p-5 shadow-xl space-y-4 animate-fade-in relative overflow-hidden">
              
              {/* Guest & Status Header */}
              <div className="flex items-start justify-between gap-2 relative z-10">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 flex items-center gap-1 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Seat Confirmed</span>
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                    {selectedAttendee ? selectedAttendee.name : 'Reserved Seat'}
                  </h2>
                  {selectedAttendee?.designation && (
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      {selectedAttendee.designation}
                      {selectedAttendee.department ? ` • ${selectedAttendee.department}` : ''}
                    </p>
                  )}
                </div>

                {selectedCat && (
                  <span
                    className="px-3 py-1 rounded-xl text-xs font-extrabold border shadow-xs shrink-0"
                    style={{
                      backgroundColor: selectedCat.color,
                      color: selectedCat.textColor,
                      borderColor: selectedCat.borderColor,
                    }}
                  >
                    {selectedCat.name}
                  </span>
                )}
              </div>

              {/* Huge Seat Code & Entrance Door Pill Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                
                {/* Seat Code */}
                <div className="bg-blue-50/60 border border-blue-100 p-3.5 rounded-2xl flex flex-col justify-between">
                  <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Armchair className="w-4 h-4 text-blue-600" />
                    <span>Your Seat Code</span>
                  </div>
                  <div className="my-1">
                    <span className="text-2xl sm:text-3xl font-black text-blue-950 font-mono tracking-tight">
                      {selectedSeat.id}
                    </span>
                  </div>
                  <div className="text-xs text-blue-900 font-medium">
                    {selectedSeat.blockName} • <strong className="text-blue-950">Row {selectedSeat.row}</strong>, Chair {selectedSeat.col}
                  </div>
                </div>

                {/* Entry Gate */}
                <div className="bg-emerald-50/60 border border-emerald-100 p-3.5 rounded-2xl flex flex-col justify-between">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <DoorOpen className="w-4 h-4 text-emerald-600" />
                    <span>Recommended Entry</span>
                  </div>
                  <div className="my-1">
                    <span className="text-xl sm:text-2xl font-black text-emerald-900">
                      {selectedSeat.gateRecommendation}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-800 font-medium">
                    {selectedSeat.gateRecommendation === 'Gate-1'
                      ? 'Right Wing Entrance Lobby'
                      : selectedSeat.gateRecommendation === 'Gate-2'
                      ? 'Left Wing Entrance Lobby'
                      : 'Upper Floor Balcony Stairs'}
                  </div>
                </div>

              </div>

              {/* Step-by-Step Walking Directions */}
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-2 relative z-10 text-xs">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-amber-600" />
                  <span>How to Reach Your Seat:</span>
                </div>
                <ol className="space-y-1.5 text-slate-700 list-decimal list-inside pl-1 leading-relaxed">
                  <li>Enter the auditorium building through <strong className="text-emerald-700">{selectedSeat.gateRecommendation}</strong>.</li>
                  <li>Walk towards the <strong className="text-slate-900">{selectedSeat.blockName}</strong> aisle.</li>
                  <li>Find <strong className="text-amber-700">Row {selectedSeat.row}</strong>, and proceed to <strong className="text-slate-900">Seat {selectedSeat.col}</strong>.</li>
                </ol>
              </div>

              {/* Actions: Save Pass / Copy */}
              <div className="flex items-center gap-2 pt-1 relative z-10">
                <button
                  type="button"
                  onClick={handleCopyPass}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xs transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Copied Details ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Seating Pass</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => centerOnSeat(selectedSeat)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
                >
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Spotlight on Map</span>
                </button>
              </div>

            </div>
          )}

          {/* If No Match Found */}
          {searchTerm && matchingResults.attendees.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-3 shadow-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl inline-block text-amber-600">
                <Armchair className="w-8 h-8 mx-auto" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No pre-assigned seat found for "{searchTerm}"</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Please check the spelling or visit the <strong>Gate-1 / Gate-2 Reception Helpdesk</strong>. You may also proceed to <strong>General Audience Seating in the Balcony</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowVolunteersList(true)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-emerald-700 text-xs font-bold border border-slate-200 transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Contact On-Duty Gate Volunteers</span>
              </button>
            </div>
          )}

          {/* On-Duty Volunteers Helpdesk Accordion */}
          {showVolunteersList && volunteers.length > 0 && (
            <div className="bg-white border border-emerald-300 rounded-3xl p-4 shadow-md space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-extrabold text-xs text-emerald-800 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>On-Duty Ushers & Gate Volunteer Helpdesk</span>
                </span>
                <button
                  onClick={() => setShowVolunteersList(false)}
                  className="text-xs text-slate-400 hover:text-slate-700 p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin text-xs">
                {volunteers.map((vol) => (
                  <div
                    key={vol.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{vol.name}</div>
                      <div className="text-[10px] text-emerald-700">{vol.role} • {vol.location}</div>
                    </div>
                    {vol.phone && (
                      <a
                        href={`tel:${vol.phone.replace(/[^0-9+]/g, '')}`}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-mono font-bold border border-emerald-200 shrink-0 flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{vol.phone}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* -------------------- RIGHT PANEL: Interactive Light Blueprint Map (7 Cols) -------------------- */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-3 sm:p-4 shadow-xs flex flex-col h-[650px] relative overflow-hidden">
          
          {/* Map Title & Controls */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">
                Auditorium Floor Blueprint
              </span>
              {selectedSeat && (
                <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold font-mono border border-blue-200">
                  Target: {selectedSeat.id}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setView((v) => ({ ...v, zoom: Math.min(4, v.zoom * 1.25) }))}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setView((v) => ({ ...v, zoom: Math.max(0.5, v.zoom / 1.25) }))}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
                title="Reset View"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive SVG Canvas (Light Blueprint) */}
          <div
            ref={containerRef}
            className="flex-1 min-h-0 relative bg-slate-50 rounded-2xl overflow-hidden border border-slate-200"
          >
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-full">
              <defs>
                <pattern id="lightKioskGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
                </pattern>
                <radialGradient id="lightKioskStageGlow" cx="50%" cy="100%" r="60%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                </radialGradient>
              </defs>

              <rect width={VIEW_W} height={VIEW_H} fill="#f8fafc" />

              <g ref={viewportRef} transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
                <rect width={VIEW_W} height={VIEW_H} fill="url(#lightKioskGrid)" />
                <rect x="200" y="800" width="600" height="250" fill="url(#lightKioskStageGlow)" />

                {/* Stage Representation */}
                <g transform="translate(320, 960)">
                  <rect x="0" y="0" width="360" height="32" rx="6" fill="#f1f5f9" stroke="#0284c7" strokeWidth="2" />
                  <text x="180" y="21" textAnchor="middle" fill="#0369a1" fontSize="13" fontWeight="bold" letterSpacing="1">
                    ▲ STAGE & PODIUM / DAIS ▲
                  </text>
                </g>

                {/* Gate-2 and Gate-1 Entrance Badges */}
                <g transform="translate(20, 920)">
                  <polygon points="0,15 30,15 30,5 50,22 30,39 30,29 0,29" fill="#10b981" />
                  <text x="25" y="55" textAnchor="middle" fill="#047857" fontSize="12" fontWeight="bold">Gate-2 Entry (Left)</text>
                </g>
                <g transform="translate(930, 920)">
                  <polygon points="50,15 20,15 20,5 0,22 20,39 20,29 50,29" fill="#10b981" />
                  <text x="25" y="55" textAnchor="middle" fill="#047857" fontSize="12" fontWeight="bold">Gate-1 Entry (Right)</text>
                </g>

                {/* Balcony Gate */}
                <g transform="translate(450, 45)">
                  <text x="50" y="15" textAnchor="middle" fill="#7e22ce" fontSize="12" fontWeight="bold">▲ Balcony Entry Gate ▲</text>
                </g>

                {/* Dashed Section Dividers */}
                <rect x="65" y="78" width="870" height="160" rx="20" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="6 4" />
                <rect x="75" y="290" width="230" height="295" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <rect x="75" y="590" width="230" height="135" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <rect x="75" y="730" width="230" height="215" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

                <rect x="340" y="290" width="320" height="60" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <rect x="340" y="355" width="320" height="375" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <rect x="340" y="735" width="320" height="85" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <rect x="340" y="805" width="320" height="140" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

                <rect x="695" y="290" width="230" height="245" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <rect x="695" y="540" width="230" height="185" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <rect x="695" y="730" width="230" height="215" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

                {/* Render All Seats with Pure Colors */}
                {seats.map((seat) => {
                  const { x, y } = getSeatCoordinates(seat);
                  const isTarget = selectedSeat?.id === seat.id;
                  const cat = categories[seat.categoryId] || { name: seat.categoryId, color: '#e2e8f0', borderColor: '#94a3b8', textColor: '#0f172a' };

                  return (
                    <g
                      key={seat.id}
                      transform={`translate(${x}, ${y})`}
                      onClick={() => handleSelectSeatOnly(seat)}
                      className="cursor-pointer"
                    >
                      <rect
                        x="0"
                        y="0"
                        width={SEAT_SIZE}
                        height={SEAT_SIZE}
                        rx="4"
                        fill={isTarget ? '#2563eb' : cat.color}
                        stroke={isTarget ? '#1d4ed8' : cat.borderColor}
                        strokeWidth={isTarget ? 2.5 : 1}
                        opacity={selectedSeat && !isTarget ? 0.38 : 1}
                      />
                      <text
                        x={SEAT_SIZE / 2}
                        y={SEAT_SIZE / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={8}
                        fontWeight="bold"
                        fill={isTarget ? '#ffffff' : cat.textColor || '#0f172a'}
                        pointerEvents="none"
                      >
                        {seat.col}
                      </text>
                    </g>
                  );
                })}

                {/* Animated Pulsing Pin Locator on Target Seat */}
                {selectedSeat && selectedCoordinates && (
                  <g transform={`translate(${selectedCoordinates.x + SEAT_SIZE / 2}, ${selectedCoordinates.y + SEAT_SIZE / 2})`}>
                    {/* Animated Pulsing Radar Rings */}
                    <circle r="22" fill="#2563eb" fillOpacity="0.2" className="animate-ping" />
                    <circle r="36" fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="4 2" className="animate-pulse" />
                    
                    {/* Glowing Pin Marker */}
                    <g transform="translate(0, -28)">
                      <rect
                        x="-55"
                        y="-26"
                        width="110"
                        height="24"
                        rx="12"
                        fill="#1e40af"
                        stroke="#ffffff"
                        strokeWidth="2"
                        filter="drop-shadow(0px 4px 8px rgba(0,0,0,0.25))"
                      />
                      <text
                        x="0"
                        y="-10"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="900"
                        fontFamily="ui-monospace, monospace"
                      >
                        YOUR SEAT: {selectedSeat.id}
                      </text>
                      <polygon points="0,0 -6,-6 6,-6" fill="#1e40af" />
                    </g>
                  </g>
                )}

              </g>
            </svg>
          </div>

          {/* Footer instruction */}
          <div className="mt-2 text-center text-[11px] text-slate-500 font-medium">
            💡 Click or tap any chair on the map to inspect its seat number and entry door.
          </div>

        </div>

      </div>

    </div>
  );
};
