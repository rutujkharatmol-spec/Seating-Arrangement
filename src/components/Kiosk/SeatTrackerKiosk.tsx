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
  Share2,
  RefreshCw,
  Cloud,
  ChevronRight,
  Send,
  Navigation
} from 'lucide-react';
import { fetchLiveCloudPlan } from '../../services/cloudSync';

interface SeatTrackerKioskProps {
  seats: Seat[];
  attendees: Attendee[];
  volunteers?: Volunteer[];
  categories?: Record<string, CategoryInfo>;
  eventTitle?: string;
  departmentName?: string;
  onNavigateToAdmin?: () => void;
  onApplyCloudPlan?: (cloudPlan: any) => void;
}

const VIEW_W = 1000;
const VIEW_H = 1050;
const SEAT_SIZE = 20;

export const SeatTrackerKiosk: React.FC<SeatTrackerKioskProps> = ({
  seats: propSeats,
  attendees: propAttendees,
  volunteers = [],
  categories = CATEGORIES,
  eventTitle = 'AIIMS Kalyani Auditorium',
  departmentName = 'Annual Event / Convocation',
  onNavigateToAdmin,
  onApplyCloudPlan,
}) => {
  // Local state for seats and attendees (can be hydrated from cloud)
  const [liveSeats, setLiveSeats] = useState<Seat[]>(propSeats);
  const [liveAttendees, setLiveAttendees] = useState<Attendee[]>(propAttendees);
  const [isCloudFetching, setIsCloudFetching] = useState(false);
  const [cloudSyncedAt, setCloudSyncedAt] = useState<string | null>(null);

  // Synchronize when props update
  useEffect(() => {
    setLiveSeats(propSeats);
    setLiveAttendees(propAttendees);
  }, [propSeats, propAttendees]);

  // Automatic cloud fetch on initial mount (especially helpful on mobile phones with empty localStorage)
  const loadCloudData = useCallback(async () => {
    setIsCloudFetching(true);
    try {
      const result = await fetchLiveCloudPlan();
      if (result && result.plan) {
        const seatedCount = result.plan.attendees?.filter((a) => Boolean(a.seatId))?.length || 0;
        // Never overwrite with unseated or empty plan
        if (seatedCount >= 500) {
          if (result.plan.seats?.length) setLiveSeats(result.plan.seats);
          if (result.plan.attendees?.length) setLiveAttendees(result.plan.attendees);
          setCloudSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          if (onApplyCloudPlan) onApplyCloudPlan(result.plan);
        }
      }
    } catch {
      // Graceful fallback to prop data
    } finally {
      setIsCloudFetching(false);
    }
  }, [onApplyCloudPlan]);

  useEffect(() => {
    // Always fetch latest cloud data on mount for all mobile devices
    loadCloudData();

    // Auto-poll cloud every 25 seconds to receive live seating assignments
    const pollInterval = window.setInterval(() => {
      loadCloudData();
    }, 25000);

    return () => window.clearInterval(pollInterval);
  }, [loadCloudData]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'pass' | 'map' | 'help'>('pass');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // SVG Pan and Zoom
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const viewportRef = useRef<SVGGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Map attendees with seats
  const attendeeMap = useMemo(() => {
    const map = new Map<string, Seat>();
    liveSeats.forEach((s) => {
      if (s.attendeeId) map.set(s.attendeeId, s);
      if (s.attendee?.id) map.set(s.attendee.id, s);
    });
    return map;
  }, [liveSeats]);

  // Search filter
  const matchingResults = useMemo<{ attendees: Attendee[]; seats: Seat[] }>(() => {
    const q = searchTerm.trim().toLowerCase();

    if (!q) {
      if (filterCategory !== 'ALL') {
        const filtered = liveAttendees.filter((a) => a.categoryId === filterCategory);
        return { attendees: filtered, seats: [] };
      }
      return { attendees: [], seats: [] };
    }

    const matchedAttendees = liveAttendees.filter((a) => {
      if (filterCategory !== 'ALL' && a.categoryId !== filterCategory) return false;
      const matchName = a.name.toLowerCase().includes(q);
      const matchPhone = a.phone && a.phone.includes(q);
      const matchDept = a.department && a.department.toLowerCase().includes(q);
      const matchTitle = (a.designation || a.title) && (a.designation || a.title || '').toLowerCase().includes(q);
      const matchSeat = a.seatId && a.seatId.toLowerCase().includes(q);
      const matchNotes = a.notes && a.notes.toLowerCase().includes(q);
      const matchEmail = a.email && a.email.toLowerCase().includes(q);
      return Boolean(matchName || matchPhone || matchDept || matchTitle || matchSeat || matchNotes || matchEmail);
    });

    const matchedSeats = liveSeats.filter((s) => {
      return s.id.toLowerCase().includes(q) || s.seatNumber.toLowerCase().includes(q);
    });

    return {
      attendees: matchedAttendees,
      seats: matchedSeats.slice(0, 10),
    };
  }, [searchTerm, liveAttendees, liveSeats, filterCategory]);

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
    const seat = att.seatId ? liveSeats.find((s) => s.id === att.seatId) : attendeeMap.get(att.id) || null;
    setSelectedSeat(seat || null);

    if (seat) {
      centerOnSeat(seat);
    }
  };

  const handleSelectSeatOnly = (seat: Seat) => {
    setSelectedSeat(seat);
    const att = liveAttendees.find((a) => a.seatId === seat.id);
    setSelectedAttendee(att || null);
    centerOnSeat(seat);
  };

  const handleResetZoom = () => {
    setView({ zoom: 1, x: 0, y: 0 });
  };

  const handleQuickZoom = (zone: 'center' | 'left' | 'right' | 'balcony') => {
    if (zone === 'center') {
      setView({ zoom: 1.6, x: -140, y: -450 });
    } else if (zone === 'left') {
      setView({ zoom: 1.8, x: 50, y: -450 });
    } else if (zone === 'right') {
      setView({ zoom: 1.8, x: -650, y: -450 });
    } else if (zone === 'balcony') {
      setView({ zoom: 1.8, x: -280, y: 50 });
    }
  };

  const handleCopyPass = () => {
    if (!selectedSeat) return;
    const text = `AIIMS Kalyani Seating Pass:\nGuest: ${selectedAttendee?.name || 'Guest'}\nSeat: ${selectedSeat.blockName} Row ${selectedSeat.row}, Seat ${selectedSeat.col} (${selectedSeat.id})\nEntry Gate: ${selectedSeat.gateRecommendation}\nEvent: ${eventTitle}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleShareWhatsApp = () => {
    if (!selectedSeat) return;
    const text = `*AIIMS Kalyani Seating Pass*\n👤 *Guest:* ${selectedAttendee?.name || 'Guest'}\n🪑 *Seat:* ${selectedSeat.id} (${selectedSeat.blockName}, Row ${selectedSeat.row}, Seat ${selectedSeat.col})\n🚪 *Entry Gate:* ${selectedSeat.gateRecommendation}\n🏛️ *Event:* ${eventTitle}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const selectedCat = selectedSeat ? categories[selectedSeat.categoryId] : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white pb-16 lg:pb-0">
      
      {/* -------------------- Top Mobile-First Brand Header -------------------- */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-4 py-2.5 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20 shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] sm:text-xs font-black tracking-widest text-blue-700 uppercase">
                  AIIMS KALYANI
                </span>
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Mobile Tracker
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight truncate">
                Find My Seat & Gate Guide
              </h1>
            </div>
          </div>

          {/* Cloud Sync Status & Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={loadCloudData}
              disabled={isCloudFetching}
              title="Refresh live cloud seating data"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isCloudFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {cloudSyncedAt ? `Synced ${cloudSyncedAt}` : 'Sync'}
              </span>
            </button>

            {onNavigateToAdmin && (
              <button
                onClick={onNavigateToAdmin}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 transition cursor-pointer"
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
        <div className={`space-y-4 lg:col-span-5 ${activeMobileTab !== 'pass' ? 'hidden lg:block' : 'block'}`}>
          
          {/* Big Search Input Box */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-4 h-4 text-blue-600" />
                <span>Type Your Name to Find Seat:</span>
              </label>
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedAttendee(null);
                    setSelectedSeat(null);
                    handleResetZoom();
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-bold"
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (selectedAttendee) setSelectedAttendee(null);
                }}
                placeholder="Type your name, roll no, or seat (e.g. C-H7)..."
                className="w-full bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-blue-600 rounded-2xl px-4 py-3.5 text-base font-semibold text-slate-900 placeholder-slate-400 focus:outline-none shadow-xs transition"
                autoFocus
              />
              {searchTerm && (
                <div className="absolute right-3 top-3.5 text-xs text-slate-500 font-mono font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  {matchingResults.attendees.length} match(es)
                </div>
              )}
            </div>

            {/* Quick Helper Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
              <button
                type="button"
                onClick={() => setFilterCategory('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterCategory === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Zones
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('mbbs')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterCategory === 'mbbs'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                MBBS
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('nursing')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterCategory === 'nursing'
                    ? 'bg-pink-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Nursing
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('faculty')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterCategory === 'faculty'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Faculty
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('accompanying')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterCategory === 'accompanying'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Parents
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('vip')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterCategory === 'vip'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                VIP
              </button>
            </div>
          </div>

          {/* Search Dropdown / Live Results List */}
          {(searchTerm || filterCategory !== 'ALL') && matchingResults.attendees.length > 0 && !selectedAttendee && (
            <div className="bg-white border-2 border-blue-300 rounded-3xl p-3 shadow-xl max-h-80 overflow-y-auto space-y-1.5 scrollbar-thin">
              <div className="text-[11px] font-extrabold text-blue-900 px-2 py-1 uppercase tracking-wider flex items-center justify-between">
                <span>
                  {filterCategory !== 'ALL' && !searchTerm
                    ? `Showing ${categories[filterCategory]?.name || filterCategory} (${matchingResults.attendees.length}):`
                    : 'Select Your Name from Results:'}
                </span>
                <span className="font-mono text-[10px] text-slate-400">Tap name to view pass</span>
              </div>
              {matchingResults.attendees.map((att) => {
                const seat = att.seatId ? liveSeats.find((s) => s.id === att.seatId) : null;
                const cat = categories[att.categoryId] || { name: att.categoryId, shortName: att.categoryId, color: '#3b82f6', textColor: '#ffffff' };

                return (
                  <button
                    key={att.id}
                    onClick={() => handleSelectAttendee(att)}
                    className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/90 border border-slate-200 hover:border-blue-300 text-left transition flex items-center justify-between gap-3 cursor-pointer group active:scale-98"
                  >
                    <div className="min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 group-hover:text-blue-700 truncate">
                        {att.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        {att.designation || att.department || 'Guest Attendee'}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        {seat ? (
                          <div className="font-mono font-black text-sm text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                            {seat.id}
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">Unseated</span>
                        )}
                        <span className="text-[9px] text-slate-500 block mt-0.5 font-bold truncate max-w-[90px]">
                          {cat.shortName || cat.name}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* -------------------- SPOTLIGHT SEAT PASS CARD -------------------- */}
          {selectedSeat && (
            <div className="bg-white border-2 border-blue-500 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 animate-fade-in relative overflow-hidden">
              
              {/* Boarding-Pass Style Header */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-1 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Official Seating Pass</span>
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight truncate">
                    {selectedAttendee ? selectedAttendee.name : 'Reserved Seat'}
                  </h2>
                  {selectedAttendee?.designation && (
                    <p className="text-xs text-slate-600 font-medium mt-0.5 truncate">
                      {selectedAttendee.designation}
                      {selectedAttendee.department ? ` • ${selectedAttendee.department}` : ''}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAttendee(null);
                      setSelectedSeat(null);
                      handleResetZoom();
                    }}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold border border-slate-200 transition cursor-pointer"
                  >
                    Change
                  </button>
                  {selectedCat && (
                    <span
                      className="px-3 py-1 rounded-xl text-xs font-black border shadow-xs shrink-0"
                      style={{
                        backgroundColor: selectedCat.color,
                        color: selectedCat.textColor,
                        borderColor: selectedCat.borderColor,
                      }}
                    >
                      {selectedCat.shortName || selectedCat.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Big Seat Code & Entrance Door Pill Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Seat Code Box */}
                <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-2xl flex flex-col justify-between">
                  <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Armchair className="w-4 h-4 text-blue-600" />
                    <span>Your Confirmed Seat</span>
                  </div>
                  <div className="my-1.5">
                    <span className="text-3xl font-black text-blue-950 font-mono tracking-tight">
                      {selectedSeat.id}
                    </span>
                  </div>
                  <div className="text-xs text-blue-900 font-semibold">
                    {selectedSeat.blockName} • <strong className="text-blue-950">Row {selectedSeat.row}</strong>, Chair {selectedSeat.col}
                  </div>
                </div>

                {/* Entry Gate Box */}
                <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl flex flex-col justify-between">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <DoorOpen className="w-4 h-4 text-emerald-600" />
                    <span>Designated Entrance Door</span>
                  </div>
                  <div className="my-1.5">
                    <span className="text-2xl font-black text-emerald-950">
                      {selectedSeat.gateRecommendation}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-800 font-semibold">
                    {selectedSeat.gateRecommendation === 'Gate-1'
                      ? 'Right Wing Lobby Entrance'
                      : selectedSeat.gateRecommendation === 'Gate-2'
                      ? 'Left Wing Lobby Entrance'
                      : 'Upper Floor Balcony Staircase'}
                  </div>
                </div>

              </div>

              {/* Step-by-Step Walking Directions */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2 text-xs">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-amber-600" />
                  <span>How to Reach Your Chair:</span>
                </div>
                <ol className="space-y-1.5 text-slate-700 list-decimal list-inside pl-1 leading-relaxed">
                  <li>Enter the building through <strong className="text-emerald-700 font-bold">{selectedSeat.gateRecommendation}</strong>.</li>
                  <li>Walk towards the <strong className="text-slate-900">{selectedSeat.blockName}</strong> aisle.</li>
                  <li>Locate <strong className="text-amber-700 font-bold">Row {selectedSeat.row}</strong>, and proceed to <strong className="text-slate-900 font-bold">Seat {selectedSeat.col}</strong>.</li>
                </ol>
              </div>

              {/* Mobile Actions: Copy Pass, View Map, Share on WhatsApp */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyPass}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Copied Details ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Pass Details</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Share seating pass via WhatsApp"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    centerOnSeat(selectedSeat);
                    setActiveMobileTab('map');
                  }}
                  className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>View on Map</span>
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
                onClick={() => setActiveMobileTab('help')}
                className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Contact Gate Volunteers</span>
              </button>
            </div>
          )}

          {/* Initial Helper Card when no search query is typed */}
          {!searchTerm && !selectedSeat && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Quick Instructions for Guests:</span>
              </h3>
              <ul className="text-xs text-slate-600 space-y-2 leading-relaxed list-disc list-inside">
                <li>Type your <strong>first name or surname</strong> in the search box above.</li>
                <li>Tap your name from the search suggestions to open your <strong>Digital Seat Pass</strong>.</li>
                <li>Check your <strong>Designated Entry Gate</strong> (Gate 1 on Right, Gate 2 on Left, or Balcony).</li>
                <li>Switch to the <strong>Hall Map</strong> tab to see an animated beacon pin on your exact chair.</li>
              </ul>
            </div>
          )}

        </div>

        {/* -------------------- RIGHT PANEL: Interactive Light Blueprint Map (7 Cols) -------------------- */}
        <div className={`lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-3 sm:p-4 shadow-xs flex flex-col relative overflow-hidden ${activeMobileTab !== 'map' ? 'hidden lg:flex h-[620px]' : 'flex h-[calc(100vh-140px)] sm:h-[620px]'}`}>
          
          {/* Map Title & Section Quick Zoom Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 text-xs shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                <span>Hall Map</span>
              </span>
              {selectedSeat ? (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold font-mono border border-emerald-200 text-[11px]">
                  Target: {selectedSeat.id}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">Tap any chair to inspect</span>
              )}
            </div>

            {/* Quick Section Jump Pills */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickZoom('left')}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition cursor-pointer"
              >
                Left Wing
              </button>
              <button
                type="button"
                onClick={() => handleQuickZoom('center')}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition cursor-pointer"
              >
                Center
              </button>
              <button
                type="button"
                onClick={() => handleQuickZoom('right')}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition cursor-pointer"
              >
                Right Wing
              </button>
              <button
                type="button"
                onClick={() => handleQuickZoom('balcony')}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition cursor-pointer"
              >
                Balcony
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
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

          {/* Interactive SVG Canvas */}
          <div
            ref={containerRef}
            className="flex-1 min-h-0 relative bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 touch-none"
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

                <rect x="340" y="290" width="320" height="55" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <rect x="340" y="350" width="320" height="375" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <rect x="340" y="730" width="320" height="85" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <rect x="340" y="820" width="320" height="95" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

                <rect x="695" y="290" width="230" height="245" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <rect x="695" y="540" width="230" height="185" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <rect x="695" y="730" width="230" height="215" rx="8" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

                {/* Render All Seats */}
                {liveSeats.map((seat) => {
                  const { x, y } = getSeatCoordinates(seat);
                  const size = SEAT_SIZE;
                  const isSelected = selectedSeat?.id === seat.id;
                  const cat = categories[seat.categoryId] || { color: '#e2e8f0', borderColor: '#64748b' };
                  const isBlocked = seat.isBlocked || seat.categoryId === 'blocked';

                  return (
                    <g
                      key={seat.id}
                      transform={`translate(${x}, ${y})`}
                      onClick={() => handleSelectSeatOnly(seat)}
                      className="cursor-pointer group"
                    >
                      <rect
                        x="0"
                        y="0"
                        width={size}
                        height={size}
                        rx="3"
                        fill={isSelected ? '#3b82f6' : isBlocked ? '#fca5a5' : cat.color}
                        stroke={isSelected ? '#1d4ed8' : isBlocked ? '#e11d48' : cat.borderColor || '#64748b'}
                        strokeWidth={isSelected ? '2.5' : '1'}
                      />
                      
                      {/* Armchair silhouette */}
                      <g transform={`scale(${size / 24}) translate(2, 2)`}>
                        <path
                          d="M4 3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3z"
                          fill={isSelected ? '#ffffff' : isBlocked ? '#e11d48' : '#1e293b'}
                          opacity={isSelected ? 1 : 0.85}
                        />
                      </g>

                      {/* Animated Spotlight Beacon Ring on target seat */}
                      {isSelected && (
                        <g>
                          <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={size * 1.5}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="2.5"
                            className="animate-ping opacity-75"
                          />
                          <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={size * 2.2}
                            fill="none"
                            stroke="#60a5fa"
                            strokeWidth="1.5"
                            className="animate-pulse"
                          />
                        </g>
                      )}
                    </g>
                  );
                })}

              </g>
            </svg>
          </div>

          {/* Floating Back to Pass button on mobile map */}
          {selectedSeat && (
            <div className="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
              <button
                onClick={() => setActiveMobileTab('pass')}
                className="px-4 py-2 rounded-full bg-blue-600 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Armchair className="w-3.5 h-3.5" />
                <span>Return to Pass ({selectedSeat.id})</span>
              </button>
            </div>
          )}

        </div>

        {/* -------------------- VOLUNTEERS HELPDESK VIEW (Mobile Tab 'help') -------------------- */}
        <div className={`space-y-4 lg:col-span-12 ${activeMobileTab !== 'help' ? 'hidden' : 'block'}`}>
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Gate Ushers & Volunteer Helpdesk</h3>
                  <p className="text-xs text-slate-500">Need assistance reaching your seat? Tap to call on-duty volunteers</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {volunteers.map((vol) => (
                <div
                  key={vol.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 hover:bg-slate-100 transition"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{vol.name}</div>
                    <div className="text-xs text-emerald-700 font-medium">{vol.role}</div>
                    <div className="text-[11px] text-slate-500">{vol.location} ({vol.gate || 'Main Lobby'})</div>
                  </div>
                  {vol.phone && (
                    <a
                      href={`tel:${vol.phone.replace(/[^0-9+]/g, '')}`}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Volunteer</span>
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 space-y-1">
              <p className="font-bold">📍 Physical Helpdesk Locations:</p>
              <p>• <strong>Gate-1 Entrance</strong>: Ground floor right lobby near main auditorium entrance.</p>
              <p>• <strong>Gate-2 Entrance</strong>: Ground floor left lobby near academic block connector.</p>
              <p>• <strong>Balcony Helpdesk</strong>: 1st floor elevator exit and stairs foyer.</p>
            </div>
          </div>
        </div>

      </div>

      {/* -------------------- Fixed Mobile Bottom Navigation Bar -------------------- */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveMobileTab('pass')}
          className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition cursor-pointer ${
            activeMobileTab === 'pass'
              ? 'text-blue-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Armchair className="w-5 h-5" />
          <span className="text-[10px]">{selectedSeat ? 'My Pass' : 'Search'}</span>
        </button>

        <button
          onClick={() => setActiveMobileTab('map')}
          className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition cursor-pointer ${
            activeMobileTab === 'map'
              ? 'text-blue-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Navigation className="w-5 h-5" />
          <span className="text-[10px]">Hall Map</span>
        </button>

        <button
          onClick={() => setActiveMobileTab('help')}
          className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition cursor-pointer ${
            activeMobileTab === 'help'
              ? 'text-blue-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span className="text-[10px]">Gate Help</span>
        </button>
      </nav>

    </div>
  );
};
