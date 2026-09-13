import { Seat, CategoryId, BlockType, TierType } from '../types/seating';

/**
 * AIIMS Kalyani auditorium — 750 seats.
 *
 * Geometry is fixed: the balcony runs UB1 (front railing) to UB5 (back), 132
 * seats; the ground floor runs row A (by the stage) to row X (back), 618 seats.
 * Rows A and X have wing seats only, so the middle block runs from B to W.
 * Seat numbers run continuously right-to-left along each row.
 *
 * Which section each seat belongs to is decided separately, by
 * assignConvocationZones, so the built-in plan, the Auto-Arrange tool and the
 * layout migration all share one set of rules.
 */

/**
 * Bump whenever the zone rules change. Any saved plan (cloud, snapshot or
 * browser cache) carrying an older version is moved onto the new layout once.
 */
export const CONVOCATION_LAYOUT_VERSION = 'convocation-2026-09-13-no-console';

const LOWER_ROW_LIST = [
  'X', 'W', 'V', 'U', 'T', 'S', 'R', 'Q', 'P', 'O', 'N', 'M',
  'L', 'K', 'J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A',
];
const UPPER_ROW_ORDER = ['UB5', 'UB4', 'UB3', 'UB2', 'UB1'];

const LOWER_ROW_INDEX: Record<string, number> = {};
LOWER_ROW_LIST.forEach((r, i) => { LOWER_ROW_INDEX[r] = i; });
const UPPER_ROW_INDEX: Record<string, number> = {};
UPPER_ROW_ORDER.forEach((r, i) => { UPPER_ROW_INDEX[r] = i; });

/** Ground-floor rows from the stage backwards. */
const FRONT_TO_BACK = [...LOWER_ROW_LIST].reverse();

const BLOCK_NAMES: Record<BlockType, string> = {
  UPPER_RIGHT: 'Upper Right Balcony',
  UPPER_CENTER: 'Upper Center Balcony',
  UPPER_LEFT: 'Upper Left Balcony',
  LOWER_RIGHT: 'Right Wing (Ground Floor)',
  LOWER_CENTER: 'Center Block (Ground Floor)',
  LOWER_LEFT: 'Left Wing (Ground Floor)',
};

function makeSeat(
  tier: TierType,
  block: BlockType,
  row: string,
  col: number,
  id: string,
  gateRecommendation: Seat['gateRecommendation'],
  x: number,
  y: number
): Seat {
  return {
    id,
    tier,
    block,
    blockName: BLOCK_NAMES[block],
    row,
    col,
    seatNumber: id,
    categoryId: 'available',
    isBlocked: false,
    gateRecommendation,
    x,
    y,
  };
}

/** Every seat with its position and entry gate, before any section is set. */
function buildSeatGeometry(): Seat[] {
  const seats: Seat[] = [];

  // --- Balcony: UB5 has 24 seats (7 + 10 + 7), UB4–UB1 have 27 (7 + 13 + 7) ---
  for (const row of UPPER_ROW_ORDER) {
    const y = 90 + UPPER_ROW_INDEX[row] * 25;
    const isBackRow = row === 'UB5';
    const centreEnd = isBackRow ? 17 : 20;
    const leftStart = centreEnd + 1;

    for (let c = 1; c <= 7; c++) {
      seats.push(makeSeat('UPPER', 'UPPER_RIGHT', row, c, `${row}-${c}`, 'Balcony Gate', 873 - (c - 1) * 28, y));
    }
    for (let c = 8; c <= centreEnd; c++) {
      const x = isBackRow ? 614 - (c - 8) * 26 : 626 - (c - 8) * 23;
      seats.push(makeSeat('UPPER', 'UPPER_CENTER', row, c, `${row}-${c}`, 'Balcony Gate', x, y));
    }
    for (let c = leftStart; c <= leftStart + 6; c++) {
      seats.push(makeSeat('UPPER', 'UPPER_LEFT', row, c, `${row}-${c}`, 'Balcony Gate', 258 - (c - leftStart) * 28, y));
    }
  }

  // --- Row A: wings only, 5 + 5 ---
  const rowAY = 300 + LOWER_ROW_INDEX['A'] * 26.5;
  for (let c = 1; c <= 5; c++) {
    seats.push(makeSeat('LOWER', 'LOWER_RIGHT', 'A', c, `A${c}`, 'Gate-1', 817 - (c - 1) * 28, rowAY));
  }
  for (let c = 6; c <= 10; c++) {
    seats.push(makeSeat('LOWER', 'LOWER_LEFT', 'A', c, `A${c}`, 'Gate-2', 253 - (c - 6) * 28, rowAY));
  }

  // --- Rows B–W: 7 right + 13 middle + 7 left ---
  for (const row of FRONT_TO_BACK.slice(1, -1)) {
    const y = 300 + LOWER_ROW_INDEX[row] * 26.5;
    for (let c = 1; c <= 7; c++) {
      seats.push(makeSeat('LOWER', 'LOWER_RIGHT', row, c, `${row}${c}`, 'Gate-1', 873 - (c - 1) * 28, y));
    }
    for (let c = 8; c <= 20; c++) {
      const gate = c <= 14 ? 'Gate-1' : 'Gate-2';
      seats.push(makeSeat('LOWER', 'LOWER_CENTER', row, c, `${row}${c}`, gate, 626 - (c - 8) * 23, y));
    }
    for (let c = 21; c <= 27; c++) {
      seats.push(makeSeat('LOWER', 'LOWER_LEFT', row, c, `${row}${c}`, 'Gate-2', 253 - (c - 21) * 28, y));
    }
  }

  // --- Row X: wings only, 7 + 7 ---
  const rowXY = 300 + LOWER_ROW_INDEX['X'] * 26.5;
  for (let c = 1; c <= 7; c++) {
    seats.push(makeSeat('LOWER', 'LOWER_RIGHT', 'X', c, `X${c}`, 'Gate-1', 873 - (c - 1) * 28, rowXY));
  }
  for (let c = 8; c <= 14; c++) {
    seats.push(makeSeat('LOWER', 'LOWER_LEFT', 'X', c, `X${c}`, 'Gate-2', 253 - (c - 8) * 28, rowXY));
  }

  return seats;
}

/**
 * Head counts that decide where the variable boundaries fall. Everything else
 * in the layout is a fixed number of rows.
 */
export interface ZoneCounts {
  /** Faculty: the middle block gets enough rows, after the VIP rows. */
  faculty: number;
  /** Nursing students: this many seats from Left Wing back + Center back. */
  nursing: number;
  /** MBBS students: left wing rows (split around the IT staff rows). */
  mbbs: number;
}

/** From the organising committee's summary sheet (PDF). */
export const DEFAULT_ZONE_COUNTS: ZoneCounts = {
  faculty: 175,  // Center rows E–Q (13 rows × 13 = 169 capacity, but 175 is the count)
  nursing: 45,   // Left T–X (35) + Center V–W (26) = 61 capacity, 45 placed
  mbbs: 108,     // Left C–L (70) + Left P–S (28) = 98 capacity, 108 is the count
};

/** One run of seats inside a block, filled front row to back row. */
interface ZoneSegment {
  categoryId: CategoryId;
  seats: number;
}

/**
 * Exact seat counts taken from the committee's chart. Segments are filled in
 * order — front row to back row, and right to left within a row — so a group
 * can finish part-way through a row when its count doesn't divide evenly by
 * the row width. Each plan must add up to its block's capacity.
 *
 * Left 166 · Middle 286 · Right 166 · Balcony 132 = 750 seats.
 */
const LEFT_WING_PLAN: ZoneSegment[] = [
  { categoryId: 'guide', seats: 5 },      // Row A
  { categoryId: 'mbbs', seats: 49 },      // Rows B–H
  { categoryId: 'it_staff', seats: 21 },  // Rows I–K
  { categoryId: 'mbbs', seats: 59 },      // Rows L–S, then 3 seats of row T
  { categoryId: 'nursing', seats: 32 },   // Rest of row T, then rows U–X
];

const MIDDLE_BLOCK_PLAN: ZoneSegment[] = [
  { categoryId: 'available', seats: 13 }, // Row B
  { categoryId: 'vip', seats: 26 },       // Rows C–D
  { categoryId: 'faculty', seats: 175 },  // Rows E–Q, then 6 seats of row R
  { categoryId: 'available', seats: 44 }, // Rest of row R, rows S–T, 11 of row U
  { categoryId: 'pg', seats: 15 },        // Last 2 of row U + row V — right in front of nursing
  { categoryId: 'nursing', seats: 13 },   // Row W
];

const RIGHT_WING_PLAN: ZoneSegment[] = [
  { categoryId: 'accompanying', seats: 5 },    // Row A
  { categoryId: 'reporters', seats: 21 },      // Rows B–D
  { categoryId: 'admin_staff', seats: 30 },    // Rows E–H, then 2 seats of row I
  { categoryId: 'accompanying', seats: 110 },  // Rest of row I, then rows J–X
];

/** The whole balcony is parents, so it needs no segment plan. */

/**
 * The convocation seating rules, as seat counts rather than whole rows:
 *
 * - Balcony: parents (132).
 * - Right wing: parents 5, reporters 21, admin 30, parents 110.
 * - Middle block: blank 13, VIP 26, faculty 175, blank 44, PG 15, nursing 13
 *   (PG sits immediately in front of nursing, with no gap between them).
 * - Left wing: guide 5, MBBS 49, IT staff 21, MBBS 59, nursing 32.
 */
export function assignConvocationZones(seats: Seat[], _counts: ZoneCounts = DEFAULT_ZONE_COUNTS): Seat[] {
  const zoneBySeat = new Map<string, CategoryId>();

  const fillBlock = (block: BlockType, plan: ZoneSegment[]) => {
    const ordered = seats
      .filter((s) => s.block === block)
      .sort((a, b) => {
        const rowDiff = FRONT_TO_BACK.indexOf(a.row) - FRONT_TO_BACK.indexOf(b.row);
        return rowDiff !== 0 ? rowDiff : a.col - b.col;
      });

    let i = 0;
    for (const segment of plan) {
      for (let n = 0; n < segment.seats && i < ordered.length; n++, i++) {
        zoneBySeat.set(ordered[i].id, segment.categoryId);
      }
    }
    // Any seat the plan doesn't reach stays 'available'.
  };

  fillBlock('LOWER_LEFT', LEFT_WING_PLAN);
  fillBlock('LOWER_CENTER', MIDDLE_BLOCK_PLAN);
  fillBlock('LOWER_RIGHT', RIGHT_WING_PLAN);

  return seats.map((s) => ({
    ...s,
    categoryId: s.tier === 'UPPER' ? 'accompanying' : zoneBySeat.get(s.id) ?? 'available',
    isBlocked: false,
  }));
}

export function generateDefaultSeats(): Seat[] {
  return assignConvocationZones(buildSeatGeometry());
}

export const INITIAL_QUESTIONNAIRE_ANSWERS = {
  eventTitle: 'Convocation Seating Arrangement (Auditorium, AIIMS Kalyani)',
  departmentName: 'Convocation Organizing Committee',
  numVip: 26,             // Center rows C–D
  numSeniorFaculty: 0,
  numFaculty: 175,        // Center rows E–Q
  numAwardees: 0,
  numReporters: 21,       // Right rows B–D
  numAccompanying: 247,   // Balcony (132) + Right rows J–X (105) + Right A (5) + misc
  numBandParty: 0,
  numConsole: 0,
  numBlocked: 0,
  numAudience: 281,       // Everyone else: admin(30), IT staff(21), MBBS(108), nursing(45), PG(15), guide(5), blank(57)
  totalSeats: 750,
  notes: 'AIIMS Kalyani Convocation layout (matching PDF): parents in balcony + right back, VIP in center front, faculty in center middle, reporters in right front, admin in right mid-front, IT staff in left middle, MBBS in left (split around IT), nursing in left back + center back, PG in center rows T–U, guides in left row B.',
};

