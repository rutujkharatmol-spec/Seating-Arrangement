import { Seat, BlockType, TierType, CategoryId } from '../types/seating';

export function generateDefaultSeats(): Seat[] {
  const seats: Seat[] = [];

  // ==========================================
  // 1. UPPER TIER (Balcony / Top Level)
  // Total Seats = 132
  // ==========================================

  // --- Upper Left Block (5 rows x 7 cols = 35 seats: Audience) ---
  const upperLeftRows = ['UB5', 'UB4', 'UB3', 'UB2', 'UB1'];
  upperLeftRows.forEach((rName, rIdx) => {
    for (let c = 1; c <= 7; c++) {
      const id = `UL-${rName}-${c}`;
      seats.push({
        id,
        tier: 'UPPER',
        block: 'UPPER_LEFT',
        blockName: 'Upper Left Balcony',
        row: rName,
        col: c,
        seatNumber: `${rName}-${c}`,
        categoryId: 'audience',
        isBlocked: false,
        gateRecommendation: 'Balcony Gate',
      });
    }
  });

  // --- Upper Center Block (62 seats) ---
  // Row 5 (Topmost): 10 seats (Audience: 6+4=10)
  for (let c = 1; c <= 10; c++) {
    const id = `UC-UB5-${c}`;
    seats.push({
      id,
      tier: 'UPPER',
      block: 'UPPER_CENTER',
      blockName: 'Upper Center Balcony',
      row: 'UB5',
      col: c,
      seatNumber: `UB5-${c}`,
      categoryId: 'audience',
      isBlocked: false,
      gateRecommendation: 'Balcony Gate',
    });
  }

  // Row 4: 13 seats (Audience: 1x13=13)
  for (let c = 1; c <= 13; c++) {
    const id = `UC-UB4-${c}`;
    seats.push({
      id,
      tier: 'UPPER',
      block: 'UPPER_CENTER',
      blockName: 'Upper Center Balcony',
      row: 'UB4',
      col: c,
      seatNumber: `UB4-${c}`,
      categoryId: 'audience',
      isBlocked: false,
      gateRecommendation: 'Balcony Gate',
    });
  }

  // Rows 3, 2, 1: 3 rows x 13 cols = 39 seats (Band Party: 3x13=39)
  ['UB3', 'UB2', 'UB1'].forEach((rName) => {
    for (let c = 1; c <= 13; c++) {
      const id = `UC-${rName}-${c}`;
      seats.push({
        id,
        tier: 'UPPER',
        block: 'UPPER_CENTER',
        blockName: 'Upper Center Balcony',
        row: rName,
        col: c,
        seatNumber: `${rName}-${c}`,
        categoryId: 'band_party',
        isBlocked: false,
        gateRecommendation: 'Balcony Gate',
      });
    }
  });

  // --- Upper Right Block (5 rows x 7 cols = 35 seats: Audience) ---
  const upperRightRows = ['UB5', 'UB4', 'UB3', 'UB2', 'UB1'];
  upperRightRows.forEach((rName) => {
    for (let c = 1; c <= 7; c++) {
      const id = `UR-${rName}-${c}`;
      seats.push({
        id,
        tier: 'UPPER',
        block: 'UPPER_RIGHT',
        blockName: 'Upper Right Balcony',
        row: rName,
        col: c,
        seatNumber: `${rName}-${c}`,
        categoryId: 'audience',
        isBlocked: false,
        gateRecommendation: 'Balcony Gate',
      });
    }
  });

  // ==========================================
  // 2. LOWER TIER (Main Floor)
  // Rows A (Front) to X (Back)
  // Total Seats = 618
  // ==========================================

  // All Lower Tier Rows from front to back:
  // A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X
  const lowerRows = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
    'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U',
    'V', 'W', 'X'
  ];

  // --- LOWER LEFT WING (166 seats) ---
  // Rows A-H (8 rows): 54 seats (Row A has 5 seats [cols 3-7], Rows B-H have 7 seats) -> Registrar + Senior Faculty
  // Rows I-M (5 rows x 7 cols = 35 seats) -> Console
  // Rows N-X (11 rows x 7 cols = 77 seats) -> Audience
  lowerRows.forEach((rowLetter) => {
    let cat: CategoryId = 'audience';
    if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(rowLetter)) {
      cat = 'senior_faculty';
    } else if (['I', 'J', 'K', 'L', 'M'].includes(rowLetter)) {
      cat = 'console';
    } else {
      cat = 'audience';
    }

    const startCol = rowLetter === 'A' ? 3 : 1; // Row A has 5 seats (54 = 5 + 7*7)
    for (let c = startCol; c <= 7; c++) {
      const id = `L-${rowLetter}${c}`;
      seats.push({
        id,
        tier: 'LOWER',
        block: 'LOWER_LEFT',
        blockName: 'Left Wing (Ground Floor)',
        row: rowLetter,
        col: c,
        seatNumber: `${rowLetter}${c}`,
        categoryId: cat,
        isBlocked: false,
        gateRecommendation: 'Gate-2',
      });
    }
  });

  // --- LOWER CENTER BLOCK (299 seats) ---
  // Rows A-D (4 rows x 13 cols = 52 seats) -> VIP
  // Rows E-G (3 rows x 13 cols = 39 seats) -> Reporter
  // Rows H-U (14 rows x 13 cols = 182 seats) -> Faculty
  // Rows V-W (2 rows x 13 cols = 26 seats) -> Accompanying Person
  const centerRows = [
    'A', 'B', 'C', 'D', // 4 rows VIP = 52 seats (13 * 4 = 52)
    'E', 'F', 'G',      // 3 rows Reporter = 39 seats
    'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', // 14 rows Faculty = 182 seats
    'V', 'W'            // 2 rows Accompanying = 26 seats
  ];

  centerRows.forEach((rowLetter) => {
    let cat: CategoryId = 'faculty';
    if (['A', 'B', 'C', 'D'].includes(rowLetter)) {
      cat = 'vip';
    } else if (['E', 'F', 'G'].includes(rowLetter)) {
      cat = 'reporters';
    } else if (['V', 'W'].includes(rowLetter)) {
      cat = 'accompanying';
    } else {
      cat = 'faculty';
    }

    for (let c = 1; c <= 13; c++) {
      const id = `C-${rowLetter}${c}`;
      seats.push({
        id,
        tier: 'LOWER',
        block: 'LOWER_CENTER',
        blockName: 'Center Block (Ground Floor)',
        row: rowLetter,
        col: c,
        seatNumber: `${rowLetter}${c}`,
        categoryId: cat,
        isBlocked: false,
        gateRecommendation: cat === 'vip' || cat === 'reporters' ? 'Gate-2' : 'Gate-1',
      });
    }
  });

  // --- LOWER RIGHT WING (166 seats) ---
  // Rows A-H (8 rows): 54 seats (Row A has 5 seats [cols 1-5], Rows B-H have 7 seats) -> Blocked
  // Rows I-O (7 rows x 7 cols = 49 seats) -> Awardees
  // Rows P-X (9 rows x 7 cols = 63 seats) -> Accompanying Person
  lowerRows.forEach((rowLetter) => {
    let cat: CategoryId = 'accompanying';
    let isBlocked = false;

    if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(rowLetter)) {
      cat = 'blocked';
      isBlocked = true;
    } else if (['I', 'J', 'K', 'L', 'M', 'N', 'O'].includes(rowLetter)) {
      cat = 'awardees';
    } else {
      cat = 'accompanying';
    }

    const endCol = rowLetter === 'A' ? 5 : 7; // Row A has 5 seats (54 = 5 + 7*7)
    for (let c = 1; c <= endCol; c++) {
      const id = `R-${rowLetter}${c}`;
      seats.push({
        id,
        tier: 'LOWER',
        block: 'LOWER_RIGHT',
        blockName: 'Right Wing (Ground Floor)',
        row: rowLetter,
        col: c,
        seatNumber: `${rowLetter}${c}`,
        categoryId: cat,
        isBlocked,
        gateRecommendation: 'Gate-1',
      });
    }
  });

  return seats;
}

export const INITIAL_QUESTIONNAIRE_ANSWERS = {
  eventTitle: 'Seating Arrangement (Auditorium, AIIMS Kalyani)',
  departmentName: 'Department of Physiology',
  numVip: 52,             // 4 rows x 13 = 52 VIP seats (Rows A, B, C, D)
  numSeniorFaculty: 54,
  numFaculty: 182,
  numAwardees: 49,
  numReporters: 39,
  numAccompanying: 89,    // 26 Center + 63 Right
  numBandParty: 39,
  numConsole: 35,
  numBlocked: 54,
  numAudience: 174,       // 77 Left + 35 Upper Left + 27 Upper Center + 35 Upper Right
  totalSeats: 763,
  notes: 'Official AIIMS Kalyani Auditorium Master Seating Blueprint (52 VIP Seats across Rows A-D)',
};
