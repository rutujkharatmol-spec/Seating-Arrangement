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
const UPPER_ROWS = ['UB1', 'UB2', 'UB3', 'UB4', 'UB5', 'UB6'];

// Exam hall rows A through J
const EXAM_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const TIER_ORDER: Record<string, number> = {
  LOWER: 0,
  UPPER: 1,
  EXAM_HALL: 2,
};

function rowRank(seat: Seat): number {
  if (seat.tier === 'EXAM_HALL') {
    const idx = EXAM_ROWS.indexOf(seat.row);
    return idx === -1 ? 999 : idx;
  }
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
    case 'EXAM_HALL': {
      // Centre aisle in exam hall is between col 5 and 6
      return Math.abs(seat.col - 5.5);
    }
    case 'LOWER_CENTER':
    case 'UPPER_CENTER': {
      const centre = seat.row === 'UB5' || seat.row === 'UB6' ? 12.5 : 14;
      return Math.abs(seat.col - centre);
    }
    case 'LOWER_LEFT':
    case 'UPPER_LEFT': {
      const aisle = seat.row === 'A' ? 6 : seat.row === 'X' ? 8 : seat.row === 'UB5' ? 18 : 21;
      return seat.col - aisle;
    }
    default: {
      // Right wing: inner aisle is seat 5 for Row A, 6 for Row P, 7 elsewhere
      const aisle = seat.row === 'A' ? 5 : seat.row === 'P' ? 6 : 7;
      return Math.abs(seat.col - aisle);
    }
  }
}

/** Ground floor before balcony before exam hall, then front-to-back, then centre-outwards. */
export function compareSeatDesirability(a: Seat, b: Seat): number {
  if (a.tier !== b.tier) {
    return (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99);
  }
  const row = rowRank(a) - rowRank(b);
  if (row !== 0) return row;
  const col = colRank(a) - colRank(b);
  if (col !== 0) return col;
  return a.id.localeCompare(b.id);
}

/**
 * The order the pre-assigned roster has always been seated in: ground floor
 * before the balcony before the exam hall, front row to back row.
 */
export function compareSeatFillOrder(a: Seat, b: Seat): number {
  if (a.tier !== b.tier) {
    return (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99);
  }
  const row = rowRank(a) - rowRank(b);
  if (row !== 0) return row;
  if (a.tier === 'EXAM_HALL') {
    return a.col - b.col || a.id.localeCompare(b.id);
  }
  return b.col - a.col || a.id.localeCompare(b.id);
}

/** Parents of the same student ("Guest of …") sit together, or not at all. */
const HOUSEHOLD_CATEGORY: CategoryId = 'accompanying';

/**
 * Seats the whole roster from scratch, zone by zone, keeping roster order —
 * used when the zone layout itself changes. Everyone sits in their own zone;
 * anyone whose zone is already full is left without a seat. When the parents'
 * section runs out, a family that no longer fits is left out as a whole rather
 * than split, and the spare seat goes to the next family that fits.
 *
 * Anyone marked seatLock keeps the exact seat named on the committee's chart:
 * that seat is taken out of its zone pool first, so no one else is given it.
 */
export function seatRosterByZone(
  seats: Seat[],
  attendees: Attendee[]
): { attendees: Attendee[]; unseated: Attendee[] } {
  // Reserved seats, claimed in roster order so a repeated seat goes to the
  // person listed first.
  const lockedByAttendee = new Map<string, string>();
  const reserved = new Set<string>();
  const seatIds = new Set(seats.filter((s) => !s.isBlocked).map((s) => s.id));
  attendees.forEach((a) => {
    if (!a.seatLock || !a.seatId) return;
    if (!seatIds.has(a.seatId) || reserved.has(a.seatId)) return;
    reserved.add(a.seatId);
    lockedByAttendee.set(a.id, a.seatId);
  });

  const pools = new Map<CategoryId, { seats: Seat[]; next: number }>();
  seats
    .filter((s) => !s.isBlocked && !reserved.has(s.id))
    .sort(compareSeatFillOrder)
    .forEach((s) => {
      const pool = pools.get(s.categoryId);
      if (pool) pool.seats.push(s);
      else pools.set(s.categoryId, { seats: [s], next: 0 });
    });

  const unseated: Attendee[] = [];
  const updated: Attendee[] = new Array(attendees.length);

  for (let i = 0; i < attendees.length; ) {
    const first = attendees[i];

    const locked = lockedByAttendee.get(first.id);
    if (locked) {
      updated[i] = { ...first, seatId: locked };
      i += 1;
      continue;
    }

    // A household is the run of consecutive parents listed for one student.
    let end = i + 1;
    if (first.categoryId === HOUSEHOLD_CATEGORY && first.department) {
      while (
        end < attendees.length &&
        attendees[end].categoryId === first.categoryId &&
        attendees[end].department === first.department
      ) {
        end++;
      }
    }

    const pool = pools.get(first.categoryId);
    const fits = pool !== undefined && pool.seats.length - pool.next >= end - i;

    for (let j = i; j < end; j++) {
      if (fits) {
        updated[j] = { ...attendees[j], seatId: pool.seats[pool.next++].id };
      } else {
        unseated.push(attendees[j]);
        updated[j] = { ...attendees[j], seatId: undefined };
      }
    }
    i = end;
  }

  return { attendees: updated, unseated };
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
