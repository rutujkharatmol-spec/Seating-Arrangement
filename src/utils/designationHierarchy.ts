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
 * Maps any raw designation string to a clean, canonical grouping name
 */
export function getCanonicalDesignation(rawTitle: string | undefined): string {
  if (!rawTitle || !rawTitle.trim()) return 'Unspecified';
  const clean = rawTitle.trim();

  for (const rule of DEFAULT_ACADEMIC_RANKS) {
    if (rule.pattern.test(clean)) {
      return rule.canonical;
    }
  }

  // Capitalize custom designations
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Gets the default priority rank for a canonical designation (lower number = sits closer to front)
 */
export function getDesignationRank(canonical: string): number {
  const match = DEFAULT_ACADEMIC_RANKS.find((r) => r.canonical.toLowerCase() === canonical.toLowerCase());
  return match ? match.rank : 50;
}

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
    const rowList = a.tier === 'UPPER' ? UPPER_ROW_ORDER : LOWER_ROW_ORDER;
    const rowIdxA = rowList.indexOf(a.row);
    const rowIdxB = rowList.indexOf(b.row);
    const rA = rowIdxA === -1 ? 999 : rowIdxA;
    const rB = rowIdxB === -1 ? 999 : rowIdxB;
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

  // 1. Identify which attendees to seat
  const attendeesToSeat = onlyUnseated ? attendees.filter((a) => !a.seatId) : [...attendees];
  const alreadySeated = onlyUnseated ? attendees.filter((a) => Boolean(a.seatId)) : [];
  const takenSeatIds = new Set(alreadySeated.map((a) => a.seatId).filter(Boolean) as string[]);

  // 2. Identify and sort eligible empty seats from Front to Back
  let candidateSeats = seats.filter((s) => !s.isBlocked && s.categoryId !== 'blocked' && !takenSeatIds.has(s.id));
  if (targetCategory && targetCategory !== 'ALL') {
    candidateSeats = candidateSeats.filter((s) => s.categoryId === targetCategory);
  }

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

  const sortedAttendees = [...attendeesToSeat].sort((a, b) => {
    const desigA = getCanonicalDesignation(a.designation).toLowerCase();
    const desigB = getCanonicalDesignation(b.designation).toLowerCase();

    const rankA = priorityMap.has(desigA) ? priorityMap.get(desigA)! : 999;
    const rankB = priorityMap.has(desigB) ? priorityMap.get(desigB)! : 999;

    if (rankA !== rankB) return rankA - rankB;

    // Secondary sorting within the same designation
    if (withinSort === 'alphabetical') {
      return a.name.localeCompare(b.name);
    } else if (withinSort === 'department') {
      const deptA = a.department || '';
      const deptB = b.department || '';
      if (deptA !== deptB) return deptA.localeCompare(deptB);
      return a.name.localeCompare(b.name);
    }

    // Default: original file order
    return 0;
  });

  // 4. Assign seats from front to back
  let seatIdx = 0;
  let seatedCount = 0;
  let unseatedCount = 0;

  const allocationSummaryMap = new Map<string, { count: number; seats: Seat[] }>();

  const assignedAttendees = sortedAttendees.map((a) => {
    const canonical = getCanonicalDesignation(a.designation);
    if (!allocationSummaryMap.has(canonical)) {
      allocationSummaryMap.set(canonical, { count: 0, seats: [] });
    }

    if (seatIdx < sortedSeats.length) {
      const seat = sortedSeats[seatIdx++];
      seatedCount++;
      allocationSummaryMap.get(canonical)!.count++;
      allocationSummaryMap.get(canonical)!.seats.push(seat);
      return {
        ...a,
        seatId: seat.id,
      };
    } else {
      unseatedCount++;
      return {
        ...a,
        seatId: undefined,
      };
    }
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
