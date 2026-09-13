import React from 'react';
import { Attendee, CategoryInfo, Seat } from '../../types/seating';
import { CATEGORIES } from '../../data/categories';

interface MasterAttendeeListProps {
  seats: Seat[];
  attendees: Attendee[];
  eventTitle: string;
  departmentName: string;
  categories?: Record<string, CategoryInfo>;
}

/**
 * Every guest on the roster with the seat they have been given, grouped by
 * section and alphabetical inside each one, so a name can be looked up quickly
 * at the registration desk. Guests still waiting for a seat are listed last.
 */
export const MasterAttendeeList: React.FC<MasterAttendeeListProps> = ({
  seats,
  attendees,
  eventTitle,
  departmentName,
  categories = CATEGORIES,
}) => {
  const seatById = React.useMemo(() => {
    const map = new Map<string, Seat>();
    seats.forEach((s) => map.set(s.id, s));
    return map;
  }, [seats]);

  const groups = React.useMemo(() => {
    const byCategory = new Map<string, Attendee[]>();
    attendees.forEach((a) => {
      const list = byCategory.get(a.categoryId);
      if (list) list.push(a);
      else byCategory.set(a.categoryId, [a]);
    });

    // Sections in the order they are listed in the legend, then anything custom.
    const order = Object.values(categories)
      .filter((c) => c.id !== 'available')
      .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
      .map((c) => c.id);
    const ids = [...byCategory.keys()].sort(
      (a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99)
    );

    return ids.map((id) => ({
      id,
      label: categories[id]?.name || id,
      accent: categories[id]?.color || '#94a3b8',
      people: byCategory
        .get(id)!
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((a) => {
          const seat = a.seatId ? seatById.get(a.seatId) : undefined;
          return {
            id: a.id,
            name: a.name,
            seat: seat ? seat.seatNumber : '—',
            where: seat ? seat.blockName : 'No seat yet',
          };
        }),
    }));
  }, [attendees, categories, seatById]);

  const seated = attendees.filter((a) => a.seatId).length;

  return (
    <div className="master-list bg-white text-slate-900 p-8 max-w-4xl mx-auto rounded-3xl shadow-sm border border-slate-300 print:shadow-none print:border-0 print:p-0 print:max-w-none print:w-full">
      <div className="border-b-2 border-slate-800 pb-3 mb-4 print:mb-3 print:pb-2">
        <div className="flex justify-between items-baseline gap-3">
          <h2 className="text-xl font-black text-slate-900 uppercase print:text-lg">
            Master Seating List
          </h2>
          <span className="px-3 py-1 bg-slate-100 text-slate-900 font-bold rounded-xl text-xs font-mono border border-slate-300 whitespace-nowrap print:px-2 print:py-0">
            {seated} seated / {attendees.length} guests
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-1 print:text-[10px]">
          {eventTitle} • {departmentName}
        </p>
      </div>

      <div className="space-y-4 print:space-y-3">
        {groups.map((group) => (
          <section key={group.id} className="master-list-section">
            <div
              className="flex items-baseline gap-2 border-l-4 pl-2 mb-1.5 print:mb-1"
              style={{ borderColor: group.accent }}
            >
              <h3 className="text-xs font-black uppercase tracking-wide text-slate-900 print:text-[10px]">
                {group.label}
              </h3>
              <span className="text-[10px] font-semibold text-slate-500 print:text-[9px]">
                {group.people.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 print:grid-cols-2 print:gap-x-5">
              {group.people.map((p) => (
                <div
                  key={p.id}
                  className="flex items-baseline gap-2 border-b border-slate-100 py-0.5 print:py-0 break-inside-avoid"
                >
                  <span className="font-mono font-black text-[11px] w-10 shrink-0 text-slate-900 print:text-[9px] print:w-8">
                    {p.seat}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800 truncate print:text-[9px]">
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
