/**
 * Writes the final seat numbers back into "Confirmed Students Data.xlsx".
 *
 *   node scripts/update_excel_seats.mjs
 *
 * Only the twelve seat columns are touched — student seat/row/block/gate, and
 * the same four for each of the two guests. Every other cell, and the sheet's
 * formatting, is left exactly as it was. A guest who lost their chair (marked
 * "Not Confirmed", or beyond the confirmed count) has their seat cells cleared
 * rather than left showing a stale number.
 *
 * The original is copied to "Confirmed Students Data (before seat update).xlsx"
 * before anything is written.
 */
import XLSX from 'xlsx';
import { copyFileSync, existsSync, readFileSync } from 'fs';

const FILE = 'Confirmed Students Data.xlsx';
const BACKUP = 'Confirmed Students Data (before seat update).xlsx';
const PLAN = 'public/live-seating-plan.json';

const txt = (v) => String(v ?? '').trim();
const key = (v) => txt(v).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const digits = (v) => txt(v).replace(/\D/g, '');

// ---------------------------------------------------------------- the plan --
const plan = JSON.parse(readFileSync(PLAN, 'utf-8'));
const seatById = new Map(plan.seats.map((s) => [s.id, s]));

const STUDENT_CATS = new Set(['mbbs', 'nursing', 'pg', 'awardees']);
const studentsByName = new Map();
const studentsByPhone = new Map();
for (const a of plan.attendees) {
  if (!STUDENT_CATS.has(a.categoryId)) continue;
  studentsByName.set(key(a.name), a);
  const p = digits(a.phone);
  if (p.length >= 10) studentsByPhone.set(p.slice(-10), a);
}

/** Guests grouped by the student they belong to. */
const guestsByStudent = new Map();
for (const a of plan.attendees) {
  if (a.categoryId !== 'accompanying') continue;
  const m = /^Guest of (.*)$/.exec(txt(a.department));
  if (!m) continue;
  const k = key(m[1]);
  if (!guestsByStudent.has(k)) guestsByStudent.set(k, []);
  guestsByStudent.get(k).push(a);
}

// ------------------------------------------------------------ the workbook --
if (!existsSync(BACKUP)) copyFileSync(FILE, BACKUP);
const wb = XLSX.readFile(FILE, { cellStyles: true });
const ws = wb.Sheets.Sheet1;
const range = XLSX.utils.decode_range(ws['!ref']);

const header = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0 })[0];
const col = (name) => {
  const i = header.findIndex((h) => txt(h) === name);
  if (i === -1) throw new Error(`column not found: ${name}`);
  return i;
};

const C = {
  name: col('Name of the Student'),
  phone: col('Contact No'),
  guest1: col('Guest-1'),
  guest2: col('Guest -2'),
  student: [col('Student Seat No'), col('Row of Seat'), col('Block of Seat'), col('Entry Gate')],
  g1: [col('Seat No'), col('Row of Seat 2'), col('Block of Seat 2'), col('Entry Gate 2')],
  g2: [col('Seat No 2'), col('Row of Seat 3'), col('Block of Seat 3'), col('Entry Gate 3')],
};

const read = (r, c) => {
  const cell = ws[XLSX.utils.encode_cell({ r, c })];
  return cell ? txt(cell.v) : '';
};

/** Sets a value, keeping whatever formatting the cell already carries. */
const write = (r, c, value) => {
  const addr = XLSX.utils.encode_cell({ r, c });
  const existing = ws[addr];
  if (value === '') {
    if (existing) {
      existing.v = '';
      existing.t = 's';
      delete existing.w;
      delete existing.f;
    }
    return;
  }
  if (existing) {
    existing.v = value;
    existing.t = 's';
    delete existing.w;
    delete existing.f;
  } else {
    ws[addr] = { t: 's', v: value };
  }
};

/** The four cells that describe where one person sits. */
const place = (r, cols, seatId) => {
  if (!seatId) {
    cols.forEach((c) => write(r, c, ''));
    return false;
  }
  const s = seatById.get(seatId);
  if (!s) throw new Error(`seat ${seatId} is not in the layout`);
  write(r, cols[0], s.id);
  write(r, cols[1], s.row);
  write(r, cols[2], s.blockName);
  write(r, cols[3], s.gateRecommendation);
  return true;
};

// --------------------------------------------------------------- the sweep --
const report = { students: 0, guests: 0, cleared: 0, unmatched: [], vacantRows: 0 };
const freeStudentChairs = plan.seats
  .filter((s) => STUDENT_CATS.has(s.categoryId) && !plan.attendees.some((a) => a.seatId === s.id))
  .map((s) => s.id);
let nextFree = 0;

for (let r = range.s.r + 1; r <= range.e.r; r++) {
  const studentName = read(r, C.name);

  if (!studentName) {
    // A row that only ever listed a spare student chair. Show the chairs that
    // are genuinely spare now, and blank the rest.
    if (read(r, C.student[0])) {
      report.vacantRows++;
      place(r, C.student, freeStudentChairs[nextFree]);
      if (freeStudentChairs[nextFree]) nextFree++;
      C.g1.forEach((c) => write(r, c, ''));
      C.g2.forEach((c) => write(r, c, ''));
    }
    continue;
  }

  const student =
    studentsByName.get(key(studentName)) ?? studentsByPhone.get(digits(read(r, C.phone)).slice(-10));
  if (!student) {
    report.unmatched.push(`row ${r + 1}: ${studentName}`);
    continue;
  }
  if (place(r, C.student, student.seatId)) report.students++;

  const family = guestsByStudent.get(key(student.name)) ?? [];
  for (const [nameCol, cols] of [[C.guest1, C.g1], [C.guest2, C.g2]]) {
    const gName = read(r, nameCol);
    const seated = gName ? family.find((g) => key(g.name) === key(gName)) : undefined;
    if (place(r, cols, seated?.seatId)) report.guests++;
    else if (gName) report.cleared++;
  }
}

XLSX.writeFile(wb, FILE, { cellStyles: true });

console.log(`backup            : ${BACKUP}`);
console.log(`student seats set : ${report.students}`);
console.log(`guest seats set   : ${report.guests}`);
console.log(`guest cells cleared (named but not seated): ${report.cleared}`);
console.log(`spare-chair rows rewritten: ${report.vacantRows} (${freeStudentChairs.length} chair(s) actually spare)`);
console.log(`unmatched students: ${report.unmatched.length}`, report.unmatched);
