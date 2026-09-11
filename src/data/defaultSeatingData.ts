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
export const CONVOCATION_LAYOUT_VERSION = 'convocation-2026-09-11';

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
  /** Faculty: the middle block gets enough rows, after the VIP/admin/reporter rows. */
  faculty: number;
  /** Nursing students: this many seats are taken from the back of the middle block. */
  nursing: number;
  /** MBBS students: rows on the left after the IT rows; other students sit behind. */
  mbbs: number;
}

/** From the organising committee's summary sheet. */
export const DEFAULT_ZONE_COUNTS: ZoneCounts = {
  faculty: 163, // 153 faculty members + 10
  nursing: 45,  // B.Sc (Hons) 37 + M.Sc 2023 2 + M.Sc 2024 6 attending
  mbbs: 108,    // MBBS 2019 (1) + MBBS 2020 (107) attending
};

/**
 * The convocation seating rules:
 *
 * - Balcony: all parents.
 * - Right wing: first 3 rows reporters, next 2 rows admin, the rest parents.
 * - Middle block: first 2 rows VIP, 1 row admin, 1 row reporters, then
 *   faculty, then students (PDCC) behind them, with nursing students in the
 *   last rows.
 * - Left wing: first 2 rows IT dept staff, then MBBS, then the other students
 *   (PG) behind them.
 */
export function assignConvocationZones(seats: Seat[], counts: ZoneCounts = DEFAULT_ZONE_COUNTS): Seat[] {
  const zoneByRow = new Map<string, CategoryId>();

  /** The rows present in a block, front to back, with how many seats each has. */
  const rowsOf = (block: BlockType): [string, number][] => {
    const sizes = new Map<string, number>();
    seats.forEach((s) => {
      if (s.block === block) sizes.set(s.row, (sizes.get(s.row) ?? 0) + 1);
    });
    return [...sizes.entries()].sort((a, b) => FRONT_TO_BACK.indexOf(a[0]) - FRONT_TO_BACK.indexOf(b[0]));
  };

  const assign = (block: BlockType, rows: [string, number][], categoryId: CategoryId) => {
    rows.forEach(([row]) => zoneByRow.set(`${block}|${row}`, categoryId));
  };

  /** How many rows, taken in order, are needed to hold `needed` people. */
  const rowsToHold = (rows: [string, number][], needed: number) => {
    let held = 0;
    let taken = 0;
    while (taken < rows.length && held < needed) held += rows[taken++][1];
    return taken;
  };

  const right = rowsOf('LOWER_RIGHT');
  assign('LOWER_RIGHT', right.slice(0, 3), 'reporters');
  assign('LOWER_RIGHT', right.slice(3, 5), 'admin_staff');
  assign('LOWER_RIGHT', right.slice(5), 'accompanying');

  const middle = rowsOf('LOWER_CENTER');
  assign('LOWER_CENTER', middle.slice(0, 2), 'vip');
  assign('LOWER_CENTER', middle.slice(2, 3), 'admin_staff');
  assign('LOWER_CENTER', middle.slice(3, 4), 'reporters');
  const middleRest = middle.slice(4);
  // Nursing is reserved from the back first, so faculty can never crowd it out.
  const nursingRows = rowsToHold([...middleRest].reverse(), counts.nursing);
  const nursingStart = middleRest.length - nursingRows;
  const facultyRows = rowsToHold(middleRest.slice(0, nursingStart), counts.faculty);
  assign('LOWER_CENTER', middleRest.slice(0, facultyRows), 'faculty');
  assign('LOWER_CENTER', middleRest.slice(facultyRows, nursingStart), 'pdcc');
  assign('LOWER_CENTER', middleRest.slice(nursingStart), 'nursing');

  const left = rowsOf('LOWER_LEFT');
  assign('LOWER_LEFT', left.slice(0, 2), 'it_staff');
  const leftRest = left.slice(2);
  const mbbsRows = rowsToHold(leftRest, counts.mbbs);
  assign('LOWER_LEFT', leftRest.slice(0, mbbsRows), 'mbbs');
  assign('LOWER_LEFT', leftRest.slice(mbbsRows), 'pg');

  return seats.map((s) => ({
    ...s,
    categoryId: s.tier === 'UPPER' ? 'accompanying' : zoneByRow.get(`${s.block}|${s.row}`) ?? 'available',
    isBlocked: false,
  }));
}

export function generateDefaultSeats(): Seat[] {
  return assignConvocationZones(buildSeatGeometry());
}

export const INITIAL_QUESTIONNAIRE_ANSWERS = {
  eventTitle: 'Convocation Seating Arrangement (Auditorium, AIIMS Kalyani)',
  departmentName: 'Convocation Organizing Committee',
  numVip: 26,             // Middle rows B–C
  numSeniorFaculty: 0,
  numFaculty: 163,        // 153 faculty + 10 — decides how many middle rows go to faculty
  numAwardees: 0,
  numReporters: 32,       // Right rows A–C (19) + middle row E (13)
  numAccompanying: 265,   // Whole balcony (132) + right rows F–X (133)
  numBandParty: 0,
  numConsole: 0,
  numBlocked: 0,
  numAudience: 264,       // Everyone else: admin, IT staff and all students
  totalSeats: 750,
  notes: 'AIIMS Kalyani Convocation layout: parents in the balcony and right wing, VIP/admin/reporters up front, faculty then students in the middle, IT staff then students on the left.',
};
