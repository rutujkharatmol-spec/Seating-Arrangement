import React, { useState, useMemo } from 'react';
import { Attendee, Seat, CategoryId } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';
import {
  Search,
  UserPlus,
  Upload,
  Download,
  Trash2,
  UserCheck,
  Armchair,
  Building,
  Wand2,
  Eraser,
  AlertTriangle,
  CircleSlash,
} from 'lucide-react';
import { exportSeatingToCsv } from '../../utils/exportHelpers';
import { PlanIssue } from '../../utils/autoSeat';

interface AttendeeListProps {
  attendees: Attendee[];
  seats: Seat[];
  issues: PlanIssue[];
  onUpdateAttendee: (attendee: Attendee) => void;
  onDeleteAttendee: (id: string) => void;
  onOpenAddModal: () => void;
  onOpenCsvModal: () => void;
  onSelectSeatOnMap: (seatId: string) => void;
  onAutoSeat: () => void;
  onClearAllSeating: () => void;
  onClearSeat: (seatId: string) => void;
  eventTitle: string;
}

export const AttendeeList: React.FC<AttendeeListProps> = ({
  attendees,
  seats,
  issues,
  onUpdateAttendee,
  onDeleteAttendee,
  onOpenAddModal,
  onOpenCsvModal,
  onSelectSeatOnMap,
  onAutoSeat,
  onClearAllSeating,
  onClearSeat,
  eventTitle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<CategoryId | 'ALL'>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');

  const filteredAttendees = useMemo(() => {
    return attendees.filter((a) => {
      const matchSearch =
        !searchTerm.trim() ||
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.designation && a.designation.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.department && a.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.seatId && a.seatId.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = selectedCategoryFilter === 'ALL' || a.categoryId === selectedCategoryFilter;
      const matchStatus =
        selectedStatusFilter === 'ALL' ||
        (selectedStatusFilter === 'ASSIGNED' && Boolean(a.seatId)) ||
        (selectedStatusFilter === 'UNASSIGNED' && !a.seatId);

      return matchSearch && matchCat && matchStatus;
    });
  }, [attendees, searchTerm, selectedCategoryFilter, selectedStatusFilter]);

  const seatedCount = useMemo(() => attendees.filter((a) => a.seatId).length, [attendees]);
  const unseatedCount = attendees.length - seatedCount;

  const handleExportCsv = () => {
    exportSeatingToCsv(seats, attendees, eventTitle);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <span>Guest list</span>
          </h2>
          <p className="text-xs text-slate-500">
            {seatedCount} of {attendees.length} guests have a seat
            {unseatedCount > 0 ? ` \u2014 ${unseatedCount} still waiting` : ''}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onClearAllSeating}
            disabled={seatedCount === 0}
            title="Take every guest out of their seat, keeping the list itself"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Eraser className="w-3.5 h-3.5 text-amber-600" />
            <span>Empty all seats</span>
          </button>

          <button
            onClick={onOpenCsvModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Add guest</span>
          </button>

          <button
            onClick={onAutoSeat}
            disabled={unseatedCount === 0}
            title="Give every unseated guest the best free seat in their own zone"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Wand2 className="w-4 h-4" />
            <span>
              {unseatedCount > 0
                ? `Auto-seat ${unseatedCount} guest${unseatedCount === 1 ? '' : 's'}`
                : 'Everyone is seated'}
            </span>
          </button>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-950">
          <p className="font-bold flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Worth checking before you print
          </p>
          <ul className="list-disc list-inside space-y-0.5 font-medium">
            {issues.map((issue, i) => (
              <li key={`${issue.kind}-${i}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-300 shadow-xs text-xs">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, role, department or seat…"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
          />
        </div>

        {/* Category Dropdown Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
          >
            <option value="ALL">All zones</option>
            {Object.values(CATEGORIES).map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Assignment Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
          >
            <option value="ALL">Seated and unseated</option>
            <option value="ASSIGNED">Seated only</option>
            <option value="UNASSIGNED">Not seated yet</option>
          </select>
        </div>

      </div>

      {/* Attendee Table */}
      <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Guest</th>
                <th className="py-3 px-4">Role & department</th>
                <th className="py-3 px-4">Zone</th>
                <th className="py-3 px-4">Seat</th>
                <th className="py-3 px-4">Entry gate</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAttendees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No guests match your search.
                  </td>
                </tr>
              ) : (
                filteredAttendees.map((att) => {
                  const cat = CATEGORIES[att.categoryId] || {
                    id: att.categoryId,
                    name: att.categoryId,
                    shortName: att.categoryId,
                    color: '#94a3b8',
                    textColor: '#0f172a',
                    borderColor: '#64748b',
                    description: '',
                    defaultCount: 0,
                    priority: 99,
                    recommendedGate: 'Gate-1 or Gate-2',
                  };
                  const seat = att.seatId ? seats.find((s) => s.id === att.seatId) : null;

                  return (
                    <tr key={att.id} className="hover:bg-slate-50 transition">
                      
                      {/* Name & Contact */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{att.name}</span>
                          {att.isVip && (
                            <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-amber-100 text-amber-900 rounded border border-amber-300">
                              VIP
                            </span>
                          )}
                        </div>
                        {att.institution && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{att.institution}</span>
                          </div>
                        )}
                        {(att.email || att.phone) && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                            {att.email && <span>{att.email}</span>}
                            {att.phone && <span>{att.phone}</span>}
                          </div>
                        )}
                      </td>

                      {/* Role / Dept */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">
                          {att.designation || att.title || '—'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {att.department || '—'}
                        </div>
                      </td>

                      {/* Zone — editable, because it decides where auto-seating puts them */}
                      <td className="py-3 px-4">
                        <select
                          value={att.categoryId}
                          onChange={(e) =>
                            onUpdateAttendee({
                              ...att,
                              categoryId: e.target.value as CategoryId,
                              isVip: e.target.value === 'vip',
                            })
                          }
                          title="Change which zone this guest belongs to"
                          className="px-2 py-1 rounded-md text-[11px] font-bold border shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[170px]"
                          style={{
                            backgroundColor: cat.color,
                            color: cat.textColor,
                            borderColor: cat.borderColor,
                          }}
                        >
                          {Object.values(CATEGORIES)
                            .filter((c) => c.id !== 'available' && c.id !== 'blocked')
                            .map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                      </td>

                      {/* Assigned Seat */}
                      <td className="py-3 px-4">
                        {att.seatId ? (
                          <button
                            onClick={() => onSelectSeatOnMap(att.seatId!)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-300 text-blue-900 font-mono font-bold hover:bg-blue-100 transition cursor-pointer shadow-2xs"
                            title="Show this seat on the map"
                          >
                            <Armchair className="w-3.5 h-3.5 text-blue-600" />
                            <span>{att.seatId}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Not seated yet</span>
                        )}
                      </td>

                      {/* Recommended Gate */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-emerald-700">
                          {seat?.gateRecommendation || cat.recommendedGate || 'Gate-1 / Gate-2'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {att.seatId && (
                          <button
                            onClick={() => onClearSeat(att.seatId!)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Take this guest out of their seat (they stay on the list)"
                          >
                            <CircleSlash className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteAttendee(att.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Remove this guest from the list entirely"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
