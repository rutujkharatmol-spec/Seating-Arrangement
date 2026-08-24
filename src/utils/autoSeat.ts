import { Attendee, CategoryId, Seat } from '../types/seating';
import { CATEGORIES } from '../data/categories';

/**
 * Automatic seating: takes everyone on the roster who has no seat yet and puts
 * them in the best free seat of their own category.
 *
 * "Best" means closest to the stage and closest to the centre aisle, so the
 * first names on a list get the good seats — which is how these events are
 * actually arranged.
 */

// Front (nearest the stage) to back, for the ground floor.
const LOWER_ROWS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
];

// Front to back for the balcony (UB1 overlooks the stage).
const UPPER_ROWS = ['UB1', 'UB2', 'UB3', 'UB4', 'UB5'];

function rowRank(seat: Seat): number {
  const list = seat.tier === 'UPPER' ? UPPER_ROWS : LOWER_ROWS;
  const idx = list.indexOf(seat.row);
  return idx === -1 ? 999 : idx;
}

/**
 * How desirable a column is, lowest first. The centre block fills outwards
 * from the middle; the wings fill from the aisle nearest the centre.
 */
function colRank(seat: Seat): number {
  switch (seat.block) {
    case 'LOWER_CENTER':
    case 'UPPER_CENTER': {
      const centre = 7; // 13-wide blocks
      return Math.abs(seat.col - centre);
    }
    case 'LOWER_LEFT':
    case 'UPPER_LEFT':
      // Column 7 is the inner aisle side, so count down from it.
      return 7 - seat.col;
    default:
      // Right wing: column 1 is the inner aisle side.
      return seat.col - 1;
  }
}

/** Ground floor before balcony, then front-to-back, then centre-outwards. */
export function compareSeatDesirability(a: Seat, b: Seat): number {
  if (a.tier !== b.tier) return a.tier === 'LOWER' ? -1 : 1;
  const row = rowRank(a) - rowRank(b);
  if (row !== 0) return row;
  const col = colRank(a) - colRank(b);
  if (col !== 0) return col;
  return a.id.localeCompare(b.id);
}

export interface AutoSeatResult {
  attendees: Attendee[];
  /** How many people were given a seat. */
  seated: number;
  /** People we could not seat, because their zone is full. */
  unseated: Attendee[];
  /** Zone -> how many people still need a seat there. */
  shortfallByCategory: Partial<Record<CategoryId, number>>;
  summary: string;
}

/**
 * Seats every unassigned attendee inside their own category's zone.
 * Nobody already seated is moved, and no seat is ever double-booked.
 */
export function autoSeatAttendees(seats: Seat[], attendees: Attendee[]): AutoSeatResult {
  const validSeatIds = new Set(seats.map((s) => s.id));

  const taken = new Set<string>();
  attendees.forEach((a) => {
    if (a.seatId && validSeatIds.has(a.seatId)) taken.add(a.seatId);
  });

  // Free seats grouped by zone, best seat first.
  const freeByCategory = new Map<CategoryId, Seat[]>();
  seats
    .filter((s) => !s.isBlocked && s.categoryId !== 'blocked' && !taken.has(s.id))
    .sort(compareSeatDesirability)
    .forEach((s) => {
      const list = freeByCategory.get(s.categoryId);
      if (list) list.push(s);
      else freeByCategory.set(s.categoryId, [s]);
    });

  let seated = 0;
  const unseated: Attendee[] = [];
  const shortfallByCategory: Partial<Record<CategoryId, number>> = {};

  const updated = attendees.map((a) => {
    const alreadySeated = a.seatId && validSeatIds.has(a.seatId);
    if (alreadySeated) return a;

    const pool = freeByCategory.get(a.categoryId);
    const seat = pool?.shift();

    if (!seat) {
      unseated.push(a);
      shortfallByCategory[a.categoryId] = (shortfallByCategory[a.categoryId] ?? 0) + 1;
      // Clear a dangling seatId that points at a seat which no longer exists.
      return a.seatId ? { ...a, seatId: undefined } : a;
    }

    seated++;
    return { ...a, seatId: seat.id };
  });

  const summary = buildSummary(seated, shortfallByCategory);

  return { attendees: updated, seated, unseated, shortfallByCategory, summary };
}

function buildSummary(
  seated: number,
  shortfall: Partial<Record<CategoryId, number>>
): string {
  const shortNames = (Object.keys(shortfall) as CategoryId[]).map(
    (id) => `${shortfall[id]} ${CATEGORIES[id]?.shortName ?? id}`
  );

  if (seated === 0 && shortNames.length === 0) {
    return 'Everyone on the roster already has a seat.';
  }
  if (shortNames.length === 0) {
    return `Seated ${seated} ${seated === 1 ? 'guest' : 'guests'}.`;
  }
  return `Seated ${seated}. No free seat left for: ${shortNames.join(', ')}.`;
}

export interface PlanIssue {
  kind: 'over-capacity' | 'wrong-zone' | 'unseated';
  message: string;
}

/**
 * Quick sanity check surfaced in the UI, so problems are noticed before the
 * chart is printed rather than on the morning of the event.
 */
export function findPlanIssues(seats: Seat[], attendees: Attendee[]): PlanIssue[] {
  const issues: PlanIssue[] = [];
  const seatById = new Map(seats.map((s) => [s.id, s]));

  const unseated = attendees.filter((a) => !a.seatId).length;
  if (unseated > 0) {
    issues.push({
      kind: 'unseated',
      message: `${unseated} ${unseated === 1 ? 'guest has' : 'guests have'} no seat yet.`,
    });
  }

  const wrongZone = attendees.filter((a) => {
    if (!a.seatId) return false;
    const seat = seatById.get(a.seatId);
    return seat ? seat.categoryId !== a.categoryId : false;
  }).length;

  if (wrongZone > 0) {
    issues.push({
      kind: 'wrong-zone',
      message: `${wrongZone} ${wrongZone === 1 ? 'guest is' : 'guests are'} sitting outside their own zone.`,
    });
  }

  // Demand vs supply per zone, counting only people who still need placing.
  const supply = new Map<CategoryId, number>();
  seats.forEach((s) => {
    if (s.isBlocked || s.categoryId === 'blocked') return;
    supply.set(s.categoryId, (supply.get(s.categoryId) ?? 0) + 1);
  });

  const demand = new Map<CategoryId, number>();
  attendees.forEach((a) => {
    demand.set(a.categoryId, (demand.get(a.categoryId) ?? 0) + 1);
  });

  demand.forEach((count, catId) => {
    const available = supply.get(catId) ?? 0;
    if (count > available) {
      issues.push({
        kind: 'over-capacity',
        message: `${CATEGORIES[catId]?.name ?? catId}: ${count} guests but only ${available} seats in that zone.`,
      });
    }
  });

  return issues;
}
