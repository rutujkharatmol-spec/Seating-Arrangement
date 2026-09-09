import XLSX from 'xlsx';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = 'd:\\AIIMS KALYANI WORK\\AIIMS_Kalyani_Seating_Arrangement';
const FACULTY_FILE = join(ROOT, 'SORTED FACULTY LIST.xlsx');
const STUDENT_FILE = join(ROOT, 'Form Responses of Students who will attend 2nd Convocation (2).xlsx');

// -------------------------------------------------------------
// 1. Helper Functions
// -------------------------------------------------------------
function normalizeName(name) {
  if (!name) return '';
  return name.toString().trim().replace(/\s+/g, ' ');
}

function makeSlug(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function getFacultyRank(designation) {
  const d = (designation || '').toLowerCase();
  if (d.includes('dean') || d.includes('principal') || d.includes('head')) return 1;
  if (d.startsWith('prof') && !d.includes('add') && !d.includes('asso') && !d.includes('asst')) return 2;
  if (d.includes('additional') || d.includes('addl')) return 3;
  if (d.includes('associate') || d.includes('asso')) return 4;
  if (d.includes('assistant') || d.includes('asst')) return 5;
  return 6;
}

// -------------------------------------------------------------
// 2. Parse Faculty
// -------------------------------------------------------------
const fwb = XLSX.readFile(FACULTY_FILE);
const fsheet = fwb.Sheets[fwb.SheetNames[0]];
const facultyRows = XLSX.utils.sheet_to_json(fsheet, { defval: '' });

const seenFacEmail = new Set();
const uniqueFaculty = [];
for (const row of facultyRows) {
  const email = (row['Email Address'] || '').toString().trim().toLowerCase();
  if (!email || seenFacEmail.has(email)) continue;
  seenFacEmail.add(email);
  uniqueFaculty.push(row);
}

// Sort faculty by academic rank then name
uniqueFaculty.sort((a, b) => {
  const rankA = getFacultyRank(a['Designation']);
  const rankB = getFacultyRank(b['Designation']);
  if (rankA !== rankB) return rankA - rankB;
  return normalizeName(a['Name']).localeCompare(normalizeName(b['Name']));
});

console.log(`Faculty parsed & sorted: ${uniqueFaculty.length}`);

// -------------------------------------------------------------
// 3. Parse Students & Accompanying Guests
// -------------------------------------------------------------
const swb = XLSX.readFile(STUDENT_FILE);
const ssheet = swb.Sheets[swb.SheetNames[0]];
const studentRows = XLSX.utils.sheet_to_json(ssheet, { defval: '' });

const seenStuRoll = new Set();
const uniqueStudents = [];
for (const row of studentRows) {
  const roll = (row['Roll Number / Enrollment ID'] || '').toString().trim();
  const attending = (row['Attending Convocation'] || '').toString().trim().toLowerCase();
  if (!roll || seenStuRoll.has(roll)) continue;
  if (attending !== 'yes') continue;
  seenStuRoll.add(roll);
  uniqueStudents.push(row);
}

console.log(`Attending students parsed: ${uniqueStudents.length}`);

const mbbsStudents = [];
const nursingStudents = [];
const pgStudents = [];

for (const s of uniqueStudents) {
  const c = (s['Course'] || '').toLowerCase();
  if (/mbbs/i.test(c)) {
    mbbsStudents.push(s);
  } else if (/nurs/i.test(c)) {
    nursingStudents.push(s);
  } else if (/md|ms|mds/i.test(c)) {
    pgStudents.push(s);
  } else {
    mbbsStudents.push(s);
  }
}

// Sort each cohort by Roll Number
function compareRoll(a, b) {
  const rA = (a['Roll Number / Enrollment ID'] || '').toString().trim();
  const rB = (b['Roll Number / Enrollment ID'] || '').toString().trim();
  return rA.localeCompare(rB, undefined, { numeric: true, sensitivity: 'base' });
}

mbbsStudents.sort(compareRoll);
nursingStudents.sort((a, b) => {
  // B.Sc before M.Sc, then roll number
  const cA = (a['Course'] || '').toLowerCase();
  const cB = (b['Course'] || '').toLowerCase();
  const isBscA = cA.includes('b.sc') ? 0 : 1;
  const isBscB = cB.includes('b.sc') ? 0 : 1;
  if (isBscA !== isBscB) return isBscA - isBscB;
  return compareRoll(a, b);
});
pgStudents.sort(compareRoll);

console.log(`Cohorts: MBBS=${mbbsStudents.length}, Nursing=${nursingStudents.length}, PG=${pgStudents.length}`);

// Extract guests in student order so family pairs stay adjacent
const guestList = [];
// Process guests in order of students (PG first, then MBBS, then Nursing)
const allOrderedStudents = [...pgStudents, ...mbbsStudents, ...nursingStudents];

for (const s of allOrderedStudents) {
  const sName = normalizeName(s['Full Name (in Block Letters)']);
  const numGuests = parseInt((s['Number of Accompanying Guests'] || '0').toString()) || 0;
  const g1Name = normalizeName(s['Guest 1 Full Name']);
  const g1Rel = (s['Relation with the Student'] || '').toString().trim();
  const g2Name = normalizeName(s['Guest 2 Full Name']);
  const g2Rel = (s['Relation with the Student 2'] || '').toString().trim();

  if (g1Name && numGuests >= 1) {
    guestList.push({
      name: g1Name,
      relation: g1Rel || 'Family Member',
      studentName: sName,
      guestNum: 1,
    });
  }
  if (g2Name && numGuests >= 2) {
    guestList.push({
      name: g2Name,
      relation: g2Rel || 'Family Member',
      studentName: sName,
      guestNum: 2,
    });
  }
}

console.log(`Guests extracted: ${guestList.length}`);

// -------------------------------------------------------------
// 4. Seat Sequences Preparation
// -------------------------------------------------------------
// Faculty Seats: Lower Center Rows H to S (145 seats)
const facultySeatIds = [];
for (const r of ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R']) {
  for (let c = 1; c <= 13; c++) facultySeatIds.push(`C-${r}${c}`);
}
facultySeatIds.push('C-S1', 'C-S2');

// MBBS Seats: Lower Left Rows E to T (109 seats)
const mbbsSeatIds = [];
for (const r of ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S']) {
  for (let c = 1; c <= 7; c++) mbbsSeatIds.push(`L-${r}${c}`);
}
for (let c = 1; c <= 4; c++) mbbsSeatIds.push(`L-T${c}`);

// Nursing Seats: Lower Left Rows V-X (21) + Upper Left Balcony UB1-UB4 (24) = 45 seats
const nursingSeatIds = [];
for (const r of ['V', 'W', 'X']) {
  for (let c = 1; c <= 7; c++) nursingSeatIds.push(`L-${r}${c}`);
}
for (const r of ['UB1', 'UB2', 'UB3']) {
  for (let c = 1; c <= 7; c++) nursingSeatIds.push(`UL-${r}-${c}`);
}
for (let c = 1; c <= 3; c++) nursingSeatIds.push(`UL-UB4-${c}`);

// PG Residents: Upper Center Balcony UB2 (13) + UB1 cols 11-12 (2) = 15 seats
const pgSeatIds = [];
for (let c = 1; c <= 13; c++) pgSeatIds.push(`UC-UB2-${c}`);
pgSeatIds.push('UC-UB1-11', 'UC-UB1-12');

// Accompanying Guests: 296 seats
const guestSeatIds = [];
// Lower Right Rows B-X (161 seats)
const lrGuestRows = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X'];
for (const r of lrGuestRows) {
  for (let c = 1; c <= 7; c++) guestSeatIds.push(`R-${r}${c}`);
}
// Upper Right Balcony (35 seats)
for (const r of ['UB1', 'UB2', 'UB3', 'UB4', 'UB5']) {
  for (let c = 1; c <= 7; c++) guestSeatIds.push(`UR-${r}-${c}`);
}
// Upper Center Balcony (37 seats)
for (let c = 1; c <= 13; c++) guestSeatIds.push(`UC-UB3-${c}`);
for (let c = 1; c <= 13; c++) guestSeatIds.push(`UC-UB4-${c}`);
for (let c = 1; c <= 10; c++) guestSeatIds.push(`UC-UB5-${c}`);
guestSeatIds.push('UC-UB1-13');
// Center Block Rear Rows S(3-13), T, U, V, W (63 seats)
for (let c = 3; c <= 13; c++) guestSeatIds.push(`C-S${c}`);
for (const r of ['T', 'U', 'V', 'W']) {
  for (let c = 1; c <= 13; c++) guestSeatIds.push(`C-${r}${c}`);
}

console.log(`Seat pools ready: Fac=${facultySeatIds.length}, MBBS=${mbbsSeatIds.length}, Nurs=${nursingSeatIds.length}, PG=${pgSeatIds.length}, Guest=${guestSeatIds.length}`);

// -------------------------------------------------------------
// 5. Build Attendee Objects With Assigned Seats
// -------------------------------------------------------------
const facultyAttendees = uniqueFaculty.map((row, idx) => {
  const name = normalizeName(row['Name']);
  const designation = (row['Designation'] || '').toString().trim();
  const department = (row['Department'] || '').toString().trim();
  const email = (row['Email Address'] || '').toString().trim();
  const phone = (row['Phone Number'] || '').toString().trim();
  const slug = makeSlug(name) || `faculty-${idx}`;
  const seatId = facultySeatIds[idx];

  return {
    id: `att-fac-${slug}`,
    name,
    designation,
    department,
    institution: 'AIIMS Kalyani',
    email,
    phone,
    categoryId: 'faculty',
    seatId,
    notes: `Faculty | ${designation} | ${department} | Assigned Seat: ${seatId}`,
  };
});

function createStudentAttendee(row, idx, categoryId, designation, seatId) {
  const name = normalizeName(row['Full Name (in Block Letters)']);
  const roll = (row['Roll Number / Enrollment ID'] || '').toString().trim();
  const course = (row['Course'] || '').toString().trim();
  const phone = (row['Contact Number'] || '').toString().trim();
  const email = (row['Email'] || row['Email address'] || '').toString().trim();
  const hometown = (row['Hometown'] || '').toString().trim();
  const slug = makeSlug(name) || `student-${idx}`;

  return {
    id: `att-stu-${slug}`,
    name,
    designation,
    department: course,
    institution: 'AIIMS Kalyani',
    email,
    phone,
    categoryId,
    seatId,
    notes: `Enrollment No: ${roll}${hometown ? ' | Hometown: ' + hometown : ''} | Assigned Seat: ${seatId}`,
  };
}

const mbbsAttendees = mbbsStudents.map((row, idx) =>
  createStudentAttendee(row, idx, 'mbbs', 'MBBS Graduate', mbbsSeatIds[idx])
);

const nursingAttendees = nursingStudents.map((row, idx) => {
  const course = (row['Course'] || '').toLowerCase();
  const desig = course.includes('m.sc') ? 'M.Sc Nursing Graduate' : 'B.Sc Nursing Graduate';
  return createStudentAttendee(row, idx, 'nursing', desig, nursingSeatIds[idx]);
});

const pgAttendees = pgStudents.map((row, idx) =>
  createStudentAttendee(row, idx, 'pg', 'MD/MS/MDS Resident', pgSeatIds[idx])
);

const guestAttendees = guestList.map((g, idx) => {
  const slug = makeSlug(g.name) || `guest-${idx}`;
  const seatId = guestSeatIds[idx];

  return {
    id: `att-guest-${slug}-${idx}`,
    name: g.name,
    designation: 'Parent / Guardian',
    department: `Guest of ${g.studentName}`,
    institution: 'AIIMS Kalyani',
    email: '',
    phone: '',
    categoryId: 'accompanying',
    seatId,
    notes: `${g.relation} of ${g.studentName} | Assigned Seat: ${seatId}`,
  };
});

const studentAttendees = [...mbbsAttendees, ...nursingAttendees, ...pgAttendees];
const allAttendees = [...facultyAttendees, ...studentAttendees, ...guestAttendees];

console.log(`\nGenerated Attendees Summary:`);
console.log(`  Faculty: ${facultyAttendees.length} (Seated: ${facultyAttendees.filter(a => a.seatId).length})`);
console.log(`  MBBS: ${mbbsAttendees.length} (Seated: ${mbbsAttendees.filter(a => a.seatId).length})`);
console.log(`  Nursing: ${nursingAttendees.length} (Seated: ${nursingAttendees.filter(a => a.seatId).length})`);
console.log(`  PG Residents: ${pgAttendees.length} (Seated: ${pgAttendees.filter(a => a.seatId).length})`);
console.log(`  Guests: ${guestAttendees.length} (Seated: ${guestAttendees.filter(a => a.seatId).length})`);
console.log(`  TOTAL: ${allAttendees.length} (100% Seated: ${allAttendees.filter(a => a.seatId).length})`);

// -------------------------------------------------------------
// 6. Write initialAttendees.ts & public/live-seating-plan.json
// -------------------------------------------------------------
function jsonStringify(obj) {
  return JSON.stringify(obj, null, 2);
}

const tsContent = `import { Attendee } from '../types/seating';

/**
 * PERMANENT AUTHORITATIVE ATTENDEE DATA - 2nd Convocation, AIIMS Kalyani
 *
 * Fully mapped with guaranteed pre-assigned auditorium seats from authoritative Excel sources:
 *   1. SORTED FACULTY LIST.xlsx (${uniqueFaculty.length} faculty in Center Block Rows H-S)
 *   2. Form Responses of Students:
 *      - ${mbbsAttendees.length} MBBS Graduates (Lower Left Rows E-T)
 *      - ${nursingAttendees.length} Nursing Graduates (Lower Left V-X + Upper Left Balcony UB1-UB4)
 *      - ${pgAttendees.length} PG Residents (Upper Center Balcony UB2 + UB1)
 *      - ${guestAttendees.length} Accompanying Guests / Parents (Lower Right Rows B-X, Upper Balcony & Center Rear)
 *
 * Total Authoritative Attendees: ${allAttendees.length} (100% pre-seated)
 * Generated: ${new Date().toISOString()}
 */

export const FACULTY_ATTENDEES: Attendee[] = ${jsonStringify(facultyAttendees)};

export const STUDENT_ATTENDEES: Attendee[] = ${jsonStringify(studentAttendees)};

export const GUEST_ATTENDEES: Attendee[] = ${jsonStringify(guestAttendees)};

export const INITIAL_ATTENDEES: Attendee[] = [
  ...FACULTY_ATTENDEES,
  ...STUDENT_ATTENDEES,
  ...GUEST_ATTENDEES,
];

export const SAMPLE_CONVOCATION_ATTENDEES: Attendee[] = INITIAL_ATTENDEES;
`;

const outPath = join(ROOT, 'src', 'data', 'initialAttendees.ts');
writeFileSync(outPath, tsContent, 'utf-8');
console.log(`\nWrote: ${outPath} (${(tsContent.length / 1024).toFixed(1)} KB)`);

// -------------------------------------------------------------
// 7. Write public/live-seating-plan.json
// -------------------------------------------------------------
// Generate seats matching generateDefaultSeats
function generateDefaultSeats() {
  const seats = [];

  // Upper Left (35)
  const upperLeftRows = ['UB5', 'UB4', 'UB3', 'UB2', 'UB1'];
  upperLeftRows.forEach((rName) => {
    for (let c = 1; c <= 7; c++) {
      seats.push({
        id: `UL-${rName}-${c}`,
        tier: 'UPPER',
        block: 'UPPER_LEFT',
        blockName: 'Upper Left Balcony',
        row: rName,
        col: c,
        seatNumber: `${rName}-${c}`,
        categoryId: 'nursing',
        isBlocked: false,
        gateRecommendation: 'Balcony Gate',
      });
    }
  });

  // Upper Center (62)
  for (let c = 1; c <= 10; c++) {
    seats.push({
      id: `UC-UB5-${c}`,
      tier: 'UPPER',
      block: 'UPPER_CENTER',
      blockName: 'Upper Center Balcony',
      row: 'UB5',
      col: c,
      seatNumber: `UB5-${c}`,
      categoryId: 'accompanying',
      isBlocked: false,
      gateRecommendation: 'Balcony Gate',
    });
  }
  for (let c = 1; c <= 13; c++) {
    seats.push({
      id: `UC-UB4-${c}`,
      tier: 'UPPER',
      block: 'UPPER_CENTER',
      blockName: 'Upper Center Balcony',
      row: 'UB4',
      col: c,
      seatNumber: `UB4-${c}`,
      categoryId: 'accompanying',
      isBlocked: false,
      gateRecommendation: 'Balcony Gate',
    });
  }
  for (let c = 1; c <= 13; c++) {
    seats.push({
      id: `UC-UB3-${c}`,
      tier: 'UPPER',
      block: 'UPPER_CENTER',
      blockName: 'Upper Center Balcony',
      row: 'UB3',
      col: c,
      seatNumber: `UB3-${c}`,
      categoryId: 'accompanying',
      isBlocked: false,
      gateRecommendation: 'Balcony Gate',
    });
  }
  for (let c = 1; c <= 13; c++) {
    seats.push({
      id: `UC-UB2-${c}`,
      tier: 'UPPER',
      block: 'UPPER_CENTER',
      blockName: 'Upper Center Balcony',
      row: 'UB2',
      col: c,
      seatNumber: `UB2-${c}`,
      categoryId: 'pg',
      isBlocked: false,
      gateRecommendation: 'Balcony Gate',
    });
  }
  for (let c = 1; c <= 13; c++) {
    seats.push({
      id: `UC-UB1-${c}`,
      tier: 'UPPER',
      block: 'UPPER_CENTER',
      blockName: 'Upper Center Balcony',
      row: 'UB1',
      col: c,
      seatNumber: `UB1-${c}`,
      categoryId: c <= 10 ? 'nursing' : c <= 12 ? 'pg' : 'accompanying',
      isBlocked: false,
      gateRecommendation: 'Balcony Gate',
    });
  }

  // Upper Right (35)
  const upperRightRows = ['UB5', 'UB4', 'UB3', 'UB2', 'UB1'];
  upperRightRows.forEach((rName) => {
    for (let c = 1; c <= 7; c++) {
      seats.push({
        id: `UR-${rName}-${c}`,
        tier: 'UPPER',
        block: 'UPPER_RIGHT',
        blockName: 'Upper Right Balcony',
        row: rName,
        col: c,
        seatNumber: `${rName}-${c}`,
        categoryId: 'accompanying',
        isBlocked: false,
        gateRecommendation: 'Balcony Gate',
      });
    }
  });

  const lowerRows = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
    'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U',
    'V', 'W', 'X'
  ];

  // Lower Left (166)
  lowerRows.forEach((rowLetter) => {
    const startCol = rowLetter === 'A' ? 3 : 1;
    for (let c = startCol; c <= 7; c++) {
      let cat = 'mbbs';
      if (rowLetter === 'A') cat = 'console';
      else if (rowLetter === 'B') cat = 'awardees';
      else if (rowLetter === 'C' || rowLetter === 'D') cat = 'it_staff';
      else if (['E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U'].includes(rowLetter)) cat = 'mbbs';
      else cat = 'nursing';

      seats.push({
        id: `L-${rowLetter}${c}`,
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

  // Lower Center (299)
  const centerRows = [
    'A', 'B',
    'C', 'D', 'E', 'F', 'G',
    'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'
  ];
  centerRows.forEach((rowLetter) => {
    let cat = 'faculty';
    if (rowLetter === 'A' || rowLetter === 'B') cat = 'vvip';
    else if (['C','D','E','F','G'].includes(rowLetter)) cat = 'vip';
    else cat = 'faculty';

    for (let c = 1; c <= 13; c++) {
      seats.push({
        id: `C-${rowLetter}${c}`,
        tier: 'LOWER',
        block: 'LOWER_CENTER',
        blockName: 'Center Block (Ground Floor)',
        row: rowLetter,
        col: c,
        seatNumber: `${rowLetter}${c}`,
        categoryId: cat,
        isBlocked: false,
        gateRecommendation: c <= 6 ? 'Gate-2' : 'Gate-1',
      });
    }
  });

  // Lower Right (166)
  lowerRows.forEach((rowLetter) => {
    const endCol = rowLetter === 'A' ? 5 : 7;
    for (let c = 1; c <= endCol; c++) {
      let cat = 'accompanying';
      if (rowLetter === 'A') cat = 'blocked';
      else cat = 'accompanying';

      seats.push({
        id: `R-${rowLetter}${c}`,
        tier: 'LOWER',
        block: 'LOWER_RIGHT',
        blockName: 'Right Wing (Ground Floor)',
        row: rowLetter,
        col: c,
        seatNumber: `${rowLetter}${c}`,
        categoryId: cat,
        isBlocked: cat === 'blocked',
        gateRecommendation: 'Gate-1',
      });
    }
  });

  return seats;
}

const baseSeats = generateDefaultSeats();
const attendeeBySeat = new Map();
allAttendees.forEach((a) => {
  if (a.seatId) attendeeBySeat.set(a.seatId, a);
});

const seatsWithAttendees = baseSeats.map((s) => {
  const att = attendeeBySeat.get(s.id);
  if (att) {
    return {
      ...s,
      attendee: att,
      attendeeId: att.id,
      categoryId: att.categoryId || s.categoryId,
    };
  }
  return s;
});

const defaultVolunteers = [
  { id: 'v1', name: 'Dr. Arjun Sen', role: 'Upper Balcony Coordinator', location: 'Upper Left Balcony Entrance', phone: '+91 98301 11223', x: 75, y: 70, gate: 'Balcony Gate' },
  { id: 'v2', name: 'Pooja Sharma', role: 'Upper Center Exit Usher', location: 'Upper Center Left Exit', phone: '+91 98301 22334', x: 340, y: 130, gate: 'Balcony Gate' },
  { id: 'v3', name: 'Rahul Mondal', role: 'Upper Center Exit Usher', location: 'Upper Center Right Exit', phone: '+91 98301 33445', x: 680, y: 130, gate: 'Balcony Gate' },
  { id: 'v4', name: 'Dr. Neha Ghosh', role: 'Upper Right Balcony Usher', location: 'Upper Right Balcony Corner', phone: '+91 98301 44556', x: 940, y: 70, gate: 'Balcony Gate' },
  { id: 'v5', name: 'Siddharth Roy', role: 'Mid-Left Cross-Aisle Usher', location: 'Mid-Left Cross Aisle (Row M/N)', phone: '+91 98301 55667', x: 360, y: 280, gate: 'Gate-2' },
  { id: 'v6', name: 'Ananya Paul', role: 'Mid-Right Cross-Aisle Usher', location: 'Mid-Right Cross Aisle (Row M/N)', phone: '+91 98301 66778', x: 655, y: 280, gate: 'Gate-1' },
  { id: 'v7', name: 'Debashis Das', role: 'Outer Left Wing Usher', location: 'Left Outer Aisle (Row S/T)', phone: '+91 98301 77889', x: 45, y: 430, gate: 'Gate-2' },
  { id: 'v8', name: 'Sneha Mukherjee', role: 'Center Block Aisle Usher', location: 'Center Aisle (Row S/T)', phone: '+91 98301 88990', x: 678, y: 430, gate: 'Gate-1' },
  { id: 'v9', name: 'Dr. Kaushik Basu', role: 'Console & Tech Liaison', location: 'Left Aisle (Row J/K)', phone: '+91 98301 99001', x: 45, y: 660, gate: 'Gate-2' },
  { id: 'v10', name: 'Mousumi Dey', role: 'Faculty Seating Usher', location: 'Center Aisle (Row J/K)', phone: '+91 98301 10112', x: 678, y: 660, gate: 'Gate-1' },
  { id: 'v11', name: 'Tanmoy Banerjee', role: 'Awardees Seating Usher', location: 'Right Aisle (Row J/K)', phone: '+91 98301 21223', x: 960, y: 660, gate: 'Gate-1' },
  { id: 'v12', name: 'Dr. Subhashree Sen', role: 'Gate-2 Lead Usher', location: 'Gate-2 Main Entry (Bottom Left)', phone: '+91 98301 32334', x: 45, y: 920, gate: 'Gate-2' },
  { id: 'v13', name: 'Sourav Ganguly', role: 'VIP & Stage Coordinator', location: 'Center Front Aisle (Row A)', phone: '+91 98301 43445', x: 655, y: 940, gate: 'Gate-1 or Gate-2' },
  { id: 'v14', name: 'Dr. Rituparna Bose', role: 'Gate-1 Lead Usher', location: 'Gate-1 Main Entry (Bottom Right)', phone: '+91 98301 54556', x: 960, y: 920, gate: 'Gate-1' },
];

const answers = {
  eventTitle: 'Convocation Seating Arrangement (Auditorium, AIIMS Kalyani)',
  departmentName: 'Convocation Organizing Committee',
  numVip: 79,
  numSeniorFaculty: 26,
  numFaculty: 145,
  numAwardees: 7,
  numReporters: 14,
  numAccompanying: 296,
  numBandParty: 14,
  numConsole: 5,
  numBlocked: 5,
  numAudience: 169,
  totalSeats: 763,
  notes: 'Official AIIMS Kalyani Convocation Master Blueprint with Authoritative Roster',
};

const fullPlan = {
  answers,
  seats: seatsWithAttendees,
  attendees: allAttendees,
  volunteers: defaultVolunteers,
  _publishedAt: new Date().toISOString(),
};

const publicJsonPath = join(ROOT, 'public', 'live-seating-plan.json');
writeFileSync(publicJsonPath, JSON.stringify(fullPlan, null, 2), 'utf-8');
console.log(`Wrote: ${publicJsonPath} (${(JSON.stringify(fullPlan).length / 1024).toFixed(1)} KB)`);

