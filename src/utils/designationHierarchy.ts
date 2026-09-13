import { Attendee, Seat, CategoryId } from '../types/seating';

/**
 * Standard Academic & Institutional Hierarchy (1 = highest / front-most row)
 */
export const DEFAULT_ACADEMIC_RANKS: { pattern: RegExp; canonical: string; rank: number }[] = [
  { pattern: /\b(director|medical superintendent|chief guest|governing body|patron)\b/i, canonical: 'Apex & Leadership', rank: 1 },
  { pattern: /\b(prof\b.*(head|dean)|head of dept|hod|principal)\b/i, canonical: 'Professor & Head / Dean', rank: 2 },
  { pattern: /\b(additional prof|additional professor|addl\b\.?\s*prof)/i, canonical: 'Additional Professor', rank: 4 },
  { pattern: /\b(associate prof|associate professor|asso\b\.?\s*prof)/i, canonical: 'Associate Professor', rank: 5 },
  { pattern: /\b(assistant prof|assistant professor|asst\b\.?\s*prof)/i, canonical: 'Assistant Professor', rank: 6 },
  { pattern: /\b(professor|prof\b)/i, canonical: 'Professor', rank: 3 },
  { pattern: /\b(senior resident|sr\b\.?\s*resident|fellow|pdcc)\b/i, canonical: 'Senior Resident / Fellow', rank: 7 },
  { pattern: /\b(junior resident|jr\b\.?\s*resident|pg resident|resident|md resident|ms resident)\b/i, canonical: 'Junior / PG Resident', rank: 8 },
  { pattern: /\b(tutor|demonstrator|medical officer|mo\b)\b/i, canonical: 'Tutor / Demonstrator', rank: 9 },
  { pattern: /\b(mbbs|intern|graduate)\b/i, canonical: 'MBBS Graduate', rank: 10 },
  { pattern: /\b(nursing|bsc nursing|msc nursing)\b/i, canonical: 'Nursing Graduate', rank: 11 },
  { pattern: /\b(parent|accompanying|guardian|family)\b/i, canonical: 'Parent / Accompanying', rank: 12 },
  { pattern: /\b(it staff|admin|console|reporters|press|volunteer)\b/i, canonical: 'Staff & Organizing', rank: 13 },
];

/**
 * Raw designation -> canonical name. Classifying one title runs up to 13
 * regexes, and a roster has only a few dozen distinct titles across hundreds
 * of people, so the same answer was being recomputed thousands of times.
 */
const canonicalCache = new Map<string, string>();

/** Canonical name (lowercased) -> rank, so the rank lookup is a hash hit. */
const RANK_BY_CANONICAL = new Map<string, number>(
  DEFAULT_ACADEMIC_RANKS.map((r) => [r.canonical.toLowerCase(), r.rank])
);

/**
 * Maps any raw designation string to a clean, canonical grouping name
 */
export function getCanonicalDesignation(rawTitle: string | undefined): string {
  if (!rawTitle) return 'Unspecified';

  const cached = canonicalCache.get(rawTitle);
  if (cached !== undefined) return cached;

  const clean = rawTitle.trim();
  let result: string;

  if (!clean) {
    result = 'Unspecified';
  } else {
    result = clean.charAt(0).toUpperCase() + clean.slice(1);
    for (const rule of DEFAULT_ACADEMIC_RANKS) {
      if (rule.pattern.test(clean)) {
        result = rule.canonical;
        break;
      }
    }
  }

  canonicalCache.set(rawTitle, result);
  return result;
}

/**
 * Gets the default priority rank for a canonical designation (lower number = sits closer to front)
 */
export function getDesignationRank(canonical: string): number {
  return RANK_BY_CANONICAL.get(canonical.toLowerCase()) ?? 50;
}

/**
 * Shared collator. Matches bare `a.localeCompare(b)` (default locale, default
 * options) exactly, but builds the collator once instead of once per call.
 */
const NAME_COLLATOR = new Intl.Collator();

export interface DesignationGroupInfo {
  designation: string;
  count: number;
  sampleAttendees: string[];
}

/**
 * Extracts and groups unique designations from attendees, sorted by standard hierarchy
 */
export function extractUniqueDesignations(attendees: Attendee[]): DesignationGroupInfo[] {
  const groupMap = new Map<string, { count: number; samples: string[] }>();

  attendees.forEach((a) => {
    const canonical = getCanonicalDesignation(a.designation);
    const existing = groupMap.get(canonical);
    if (existing) {
      existing.count++;
      if (existing.samples.length < 3 && a.name) existing.samples.push(a.name);
    } else {
      groupMap.set(canonical, {
        count: 1,
        samples: a.name ? [a.name] : [],
      });
    }
  });

  const result: DesignationGroupInfo[] = Array.from(groupMap.entries()).map(([designation, data]) => ({
    designation,
    count: data.count,
    sampleAttendees: data.samples,
  }));

  // Sort by default academic hierarchy
  result.sort((a, b) => {
    const rankA = getDesignationRank(a.designation);
    const rankB = getDesignationRank(b.designation);
    if (rankA !== rankB) return rankA - rankB;
    return a.designation.localeCompare(b.designation);
  });

  return result;
}

// Lower rows nearest the stage to the back
const LOWER_ROW_ORDER = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X'
];

// Upper balcony front railing to back row
const UPPER_ROW_ORDER = ['UB1', 'UB2', 'UB3', 'UB4', 'UB5'];

// Row -> position, built once. A sort comparator runs O(n log n) times, so an
// Array.indexOf scan in there costs a linear factor for nothing.
const LOWER_ROW_RANK = new Map(LOWER_ROW_ORDER.map((r, i) => [r, i]));
const UPPER_ROW_RANK = new Map(UPPER_ROW_ORDER.map((r, i) => [r, i]));

/**
 * Sorts seats strictly from Front (closest to stage) to Back (furthest).
 * 
 * Supports two row filling patterns:
 * - 'sequential': Left to Right (Seat 1, Seat 2, Seat 3...)
 * - 'center_out': Center Aisle First (Center col 7, then 6 & 8, then 5 & 9...)
 */
export function sortSeatsFrontToBack(
  seats: Seat[],
  pattern: 'sequential' | 'center_out' = 'sequential'
): Seat[] {
  return [...seats].sort((a, b) => {
    // 1. Lower tier (Ground Floor) before Upper Tier (Balcony)
    if (a.tier !== b.tier) {
      return a.tier === 'LOWER' ? -1 : 1;
    }

    // 2. Front rows before Back rows
    const rowRanks = a.tier === 'UPPER' ? UPPER_ROW_RANK : LOWER_ROW_RANK;
    const rA = rowRanks.get(a.row) ?? 999;
    const rB = rowRanks.get(b.row) ?? 999;
    if (rA !== rB) return rA - rB;

    // 3. Within the same row: column order
    if (pattern === 'center_out') {
      const centerCol = (a.block === 'LOWER_CENTER' || a.block === 'UPPER_CENTER') ? 14 : (a.block.includes('RIGHT') ? 4 : 24);
      const distA = Math.abs(a.col - centerCol);
      const distB = Math.abs(b.col - centerCol);
      if (distA !== distB) return distA - distB;
    }

    // Sequential left-to-right
    if (a.col !== b.col) return a.col - b.col;
    return a.id.localeCompare(b.id);
  });
}

export interface AutoSeatByDesignationParams {
  attendees: Attendee[];
  seats: Seat[];
  /** Ordered list of canonical designations (first = front-most rows) */
  designationPriority: string[];
  /** Secondary sort within the same designation */
  withinSort: 'alphabetical' | 'department' | 'original';
  /** Seat fill pattern */
  seatPattern: 'sequential' | 'center_out';
  /** Only assign seats matching this category (if provided) */
  targetCategory?: CategoryId | string;
  /** If true, only seat attendees who currently don't have a seat */
  onlyUnseated?: boolean;
}

export interface AutoSeatByDesignationResult {
  updatedAttendees: Attendee[];
  assignedAttendees: Attendee[];
  seatedCount: number;
  assignedCount: number;
  unseatedCount: number;
  allocationSummary: {
    designation: string;
    count: number;
    firstSeat?: string;
    lastSeat?: string;
    rowSpan?: string;
    rows: string[];
  }[];
  allocationByDesignation: {
    designation: string;
    count: number;
    firstSeat?: string;
    lastSeat?: string;
    rowSpan?: string;
    rows: string[];
  }[];
}

/**
 * Assigns seats from Front to Back according to the user's custom designation priority order.
 */
export function assignSeatsByDesignationOrder(
  params: AutoSeatByDesignationParams
): AutoSeatByDesignationResult {
  const {
    attendees,
    seats,
    designationPriority,
    withinSort = 'alphabetical',
    seatPattern = 'sequential',
    targetCategory,
    onlyUnseated = false,
  } = params;

  // 1. Identify which attendees to seat. One partitioning pass rather than two
  //    filters plus a map plus a filter over the same roster.
  const attendeesToSeat: Attendee[] = [];
  const alreadySeated: Attendee[] = [];
  const takenSeatIds = new Set<string>();

  if (onlyUnseated) {
    for (const a of attendees) {
      if (a.seatId) {
        alreadySeated.push(a);
        takenSeatIds.add(a.seatId);
      } else {
        attendeesToSeat.push(a);
      }
    }
  } else {
    attendeesToSeat.push(...attendees);
  }

  // 2. Identify and sort eligible empty seats from Front to Back. Both
  //    conditions are applied in a single pass instead of two filtered copies.
  const scopedCategory = targetCategory && targetCategory !== 'ALL' ? targetCategory : null;
  const candidateSeats = seats.filter(
    (s) =>
      !s.isBlocked &&
      s.categoryId !== 'blocked' &&
      !takenSeatIds.has(s.id) &&
      (scopedCategory === null || s.categoryId === scopedCategory)
  );

  const sortedSeats = sortSeatsFrontToBack(candidateSeats, seatPattern);

  // 3. Sort attendees by Designation Priority Order
  const resolvedPriority =
    designationPriority && designationPriority.length > 0
      ? designationPriority
      : extractUniqueDesignations(attendeesToSeat).map((g) => g.designation);

  const priorityMap = new Map<string, number>();
  resolvedPriority.forEach((d, idx) => {
    priorityMap.set(d.toLowerCase(), idx);
  });

  // Decorate-sort-undecorate: classify each attendee's designation exactly once
  // (up to 13 regexes plus a lowercase allocation) instead of twice per
  // comparison. For a 900-person roster that is ~900 classifications rather
  // than ~18,000, and it also makes the sort stable on `original` order.
  const decorated = attendeesToSeat.map((attendee, index) => {
    const canonical = getCanonicalDesignation(attendee.designation);
    return {
      attendee,
      index,
      canonical,
      rank: priorityMap.get(canonical.toLowerCase()) ?? 999,
    };
  });

  decorated.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;

    // Secondary sorting within the same designation
    if (withinSort === 'alphabetical') {
      return NAME_COLLATOR.compare(a.attendee.name, b.attendee.name);
    }
    if (withinSort === 'department') {
      const deptA = a.attendee.department || '';
      const deptB = b.attendee.department || '';
      if (deptA !== deptB) return NAME_COLLATOR.compare(deptA, deptB);
      return NAME_COLLATOR.compare(a.attendee.name, b.attendee.name);
    }

    // Default: original file order
    return a.index - b.index;
  });

  // 4. Assign seats from front to back
  let seatIdx = 0;
  let seatedCount = 0;
  let unseatedCount = 0;

  const allocationSummaryMap = new Map<string, { count: number; seats: Seat[] }>();

  const assignedAttendees = decorated.map(({ attendee, canonical }) => {
    let bucket = allocationSummaryMap.get(canonical);
    if (!bucket) {
      bucket = { count: 0, seats: [] };
      allocationSummaryMap.set(canonical, bucket);
    }

    if (seatIdx < sortedSeats.length) {
      const seat = sortedSeats[seatIdx++];
      seatedCount++;
      bucket.count++;
      bucket.seats.push(seat);
      return { ...attendee, seatId: seat.id };
    }

    unseatedCount++;
    return { ...attendee, seatId: undefined };
  });

  // Combine already seated (if onlyUnseated) with newly assigned
  const updatedAttendees = onlyUnseated ? [...alreadySeated, ...assignedAttendees] : assignedAttendees;

  // Build human-readable allocation summary
  const allocationSummary = Array.from(allocationSummaryMap.entries()).map(([designation, data]) => {
    const seatsList = data.seats;
    const firstSeat = seatsList[0]?.id;
    const lastSeat = seatsList[seatsList.length - 1]?.id;
    const rows = Array.from(new Set(seatsList.map((s) => s.row)));
    const rowSpan = rows.length > 0 ? (rows.length === 1 ? `Row ${rows[0]}` : `Rows ${rows[0]}–${rows[rows.length - 1]}`) : 'None';

    return {
      designation,
      count: data.count,
      firstSeat,
      lastSeat,
      rowSpan,
      rows,
    };
  });

  return {
    updatedAttendees,
    assignedAttendees: updatedAttendees,
    seatedCount,
    assignedCount: seatedCount,
    unseatedCount,
    allocationSummary,
    allocationByDesignation: allocationSummary,
  };
}
