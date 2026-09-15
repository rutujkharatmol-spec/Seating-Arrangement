/**
 * Rebuilds the student and guest roster in src/data/initialAttendees.ts from
 * "Confirmed Students Data.xlsx" — the authoritative confirmed list.
 *
 *   node scripts/rebuild_from_confirmed.mjs
 *
 * Authoritative from the confirmed sheet: who attends, how many guests each
 * student brings, and the guest names / relations. Faculty, dignitaries,
 * guides, wheelchair spaces and the seven awardees are never touched, and no
 * chair number is ever renamed or created — people only move between the
 * chairs the layout already defines.
 */
import XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { createJiti } from 'jiti';

// No caching: these scripts are run right after src/data is rewritten, and a
// cached module would quietly mix a fresh roster with a stale layout.
const jiti = createJiti(import.meta.url, { fsCache: false, moduleCache: false });
const { generateDefaultSeats } = await jiti.import('../src/data/defaultSeatingData.ts');
const { compareSeatFillOrder } = await jiti.import('../src/utils/autoSeat.ts');

const CONFIRMED_FILE = 'Confirmed Students Data.xlsx';
const FORMS_FILE = 'Form Responses of Students who will attend 2nd Convocation.xlsx';
const ROSTER_FILE = 'src/data/initialAttendees.ts';
const PREVIOUS_PLAN = 'public/live-seating-plan.json';

const txt = (v) => String(v ?? '').trim();
const key = (v) => txt(v).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const phoneOf = (v) => txt(v).replace(/\D/g, '');
const slug = (v) => txt(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const firstName = (v) => key(v).split(' ')[0] || '';

// ---------------------------------------------------------------------------
// 1. Sources
// ---------------------------------------------------------------------------
const confirmed = XLSX.utils
  .sheet_to_json(XLSX.readFile(CONFIRMED_FILE).Sheets.Sheet1, { defval: '', raw: false })
  .filter((r) => txt(r['Name of the Student']));

/**
 * The roster as last committed — the "old response data" this rebuild draws
 * details from. Read from git rather than the working copy so that running the
 * script twice reads the same thing both times instead of its own output.
 */
function committedPlan() {
  try {
    return JSON.parse(execFileSync('git', ['show', `HEAD:${PREVIOUS_PLAN}`], { encoding: 'utf-8', maxBuffer: 64 << 20 }));
  } catch {
    return JSON.parse(readFileSync(PREVIOUS_PLAN, 'utf-8'));
  }
}

const previous = committedPlan();
const previousStudents = previous.attendees.filter((a) =>
  ['mbbs', 'nursing', 'pg', 'awardees'].includes(a.categoryId)
);
const awardeeKeys = new Set(
  previous.attendees.filter((a) => a.categoryId === 'awardees').map((a) => key(a.name))
);

// Old form responses, kept only as a fallback for details the confirmed sheet
// does not carry (e-mail address).
const forms = new Map();
const formsByPhone = new Map();
const formsWb = XLSX.readFile(FORMS_FILE);
const FORM_SHEETS = ['Responses', 'Form responses 1', 'MBBS', 'Sheet5', 'MDMSMDS', 'B.Sc (Hons) Nursing', 'M.Sc. Nursing'];
for (const sheet of FORM_SHEETS) {
  for (const row of XLSX.utils.sheet_to_json(formsWb.Sheets[sheet], { defval: '', raw: false })) {
    const k = key(row['Full Name (in Block Letters)']);
    if (k && !forms.has(k)) forms.set(k, row);
    const p = phoneOf(row['Contact Number']);
    if (p.length >= 10 && !formsByPhone.has(p)) formsByPhone.set(p, row);
  }
}

// ---------------------------------------------------------------------------
// 2. Match each confirmed student to the record already on the roster.
//    Exact normalised name first; failing that, an exact full phone number
//    that is unique on both sides. Anything less is left unmatched rather
//    than guessed at.
// ---------------------------------------------------------------------------
const byName = new Map();
const byPhone = new Map();
for (const a of previousStudents) {
  const k = key(a.name);
  if (!byName.has(k)) byName.set(k, []);
  byName.get(k).push(a);
  const p = phoneOf(a.phone);
  if (p.length >= 10) {
    if (!byPhone.has(p)) byPhone.set(p, []);
    byPhone.get(p).push(a);
  }
}
const confirmedPhoneCount = new Map();
for (const r of confirmed) {
  const p = phoneOf(r['Contact No']);
  if (p.length >= 10) confirmedPhoneCount.set(p, (confirmedPhoneCount.get(p) ?? 0) + 1);
}

function matchPrevious(row) {
  const nameHits = byName.get(key(row['Name of the Student'])) ?? [];
  if (nameHits.length === 1) return { record: nameHits[0], how: 'name' };
  if (nameHits.length > 1) return { record: null, how: 'ambiguous-name' };

  const p = phoneOf(row['Contact No']);
  if (p.length < 10) return { record: null, how: 'new' };
  const phoneHits = byPhone.get(p) ?? [];
  if (phoneHits.length === 1 && confirmedPhoneCount.get(p) === 1 && phoneOf(phoneHits[0].phone) === p) {
    return { record: phoneHits[0], how: 'phone' };
  }
  if (phoneHits.length > 1) return { record: null, how: 'ambiguous-phone' };
  return { record: null, how: 'new' };
}

function sectionFor(row) {
  const course = txt(row.Course).toUpperCase();
  if (course.startsWith('MBBS')) return 'mbbs';
  if (course.includes('NURSING')) return 'nursing';
  return 'pg';
}

const DESIGNATION = {
  mbbs: 'MBBS Graduate',
  nursing: 'Nursing Graduate',
  pg: 'PG Resident (MD / MS / MDS)',
};

/** Keeps the enrolment number / home town / rank notes, drops stale seat text. */
function carryNotes(record) {
  if (!record || !record.notes) return [];
  return record.notes
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s && !/^Assigned Seat:/i.test(s) && !/^Added from updated form responses$/i.test(s));
}

const report = { matchedByName: 0, matchedByPhone: 0, brandNew: 0, unresolved: [] };
const students = [];
for (const row of confirmed) {
  const { record, how } = matchPrevious(row);
  if (how === 'ambiguous-name' || how === 'ambiguous-phone') {
    report.unresolved.push(`${txt(row['Name of the Student'])} — ${how}`);
    continue;
  }
  if (how === 'name') report.matchedByName++;
  else if (how === 'phone') report.matchedByPhone++;
  else report.brandNew++;

  const name = record ? record.name : txt(row['Name of the Student']);
  const section = awardeeKeys.has(key(name)) ? 'awardees' : sectionFor(row);
  const form = forms.get(key(name)) ?? formsByPhone.get(phoneOf(row['Contact No']));

  students.push({
    row,
    section,
    name,
    previous: record,
    attendee: {
      id: record ? record.id : `att-stu-${slug(name)}`,
      name,
      designation: (record && record.designation) || DESIGNATION[section],
      department: (record && record.department) || txt(row['Year/ Batch']) || txt(row.Course),
      institution: 'AIIMS Kalyani',
      email: (record && record.email) || txt(form && form.Email) || '',
      phone: txt(row['Contact No']) || (record && record.phone) || '',
      categoryId: section,
      notes: [...carryNotes(record), `Course: ${txt(row.Course)}`, 'Confirmed for the 2nd Convocation'].join(' | '),
    },
  });
}

// ---------------------------------------------------------------------------
// 3. Guests — the confirmed sheet decides how many, and names them.
// ---------------------------------------------------------------------------
const NOT_A_NAME = /^(na|n\/a|nil|none|-|\.)$/i;
const guestReport = { fromConfirmedSheet: 0, placeholders: 0, dropped: [], blankCount: [], declined: [] };
const families = [];

const GUEST_COLUMNS = [
  ['Guest-1', 'Relation ', 'Confirmed/ Not Confirmed'],
  ['Guest -2', 'Relation', 'Confirmed / Not confirmed'],
];

for (const s of students) {
  const named = [];
  for (const [nameCol, relCol, statusCol] of GUEST_COLUMNS) {
    const gName = txt(s.row[nameCol]);
    if (!gName || NOT_A_NAME.test(gName)) continue;
    if (named.some((c) => key(c.name) === key(gName))) continue;
    const status = txt(s.row[statusCol]);
    named.push({
      name: gName,
      relation: txt(s.row[relCol]),
      declined: /not\s*confirmed/i.test(status),
    });
  }

  // A guest the sheet marks "Not Confirmed" is not coming, so they take no
  // chair however many the count asks for. A blank status is not a refusal.
  const declined = named.filter((c) => c.declined);
  const candidates = named.filter((c) => !c.declined);
  declined.forEach((c) =>
    guestReport.declined.push(
      `${c.name}${c.relation ? ` (${c.relation})` : ''} — guest of ${s.name}`
    )
  );

  const raw = txt(s.row['No. of Guest']);
  let count;
  if (raw === '') {
    // No count on the sheet — seat whoever it names and does not refuse.
    count = candidates.length;
    guestReport.blankCount.push(`${s.name} → ${count} from the guest names`);
  } else {
    count = parseInt(raw, 10);
    if (!Number.isFinite(count)) continue;
    // Each refusal gives back one of the chairs the count asked for.
    count = Math.max(0, count - declined.length);
  }

  const taken = candidates.slice(0, count);
  if (candidates.length > count) {
    guestReport.dropped.push(
      `${s.name}: count ${count}, ${candidates.length} named — dropped ${candidates
        .slice(count)
        .map((c) => `${c.name}${c.relation ? ` (${c.relation})` : ''}`)
        .join(', ')}`
    );
  }
  if (count <= 0) continue;

  const members = [];
  for (let i = 0; i < count; i++) {
    const found = taken[i];
    if (found) {
      guestReport.fromConfirmedSheet++;
      members.push({ name: found.name, relation: found.relation, placeholder: false });
    } else {
      guestReport.placeholders++;
      members.push({ name: `Guest ${i + 1} of ${s.name}`, relation: '', placeholder: true });
    }
  }
  families.push({ student: s, members });
}

// ---------------------------------------------------------------------------
// 4. Seats. Every chair comes from the existing layout; none is invented.
// ---------------------------------------------------------------------------
const seats = generateDefaultSeats();
const awardeeSeats = new Set(
  previous.attendees.filter((a) => a.categoryId === 'awardees' && a.seatId).map((a) => a.seatId)
);

const poolFor = (predicate) => seats.filter(predicate).sort(compareSeatFillOrder);

const studentPools = {
  mbbs: poolFor((s) => s.categoryId === 'mbbs'),
  nursing: poolFor((s) => s.categoryId === 'nursing'),
  pg: poolFor((s) => s.categoryId === 'pg'),
};

const accompanying = (s) => s.categoryId === 'accompanying';
const balcony = poolFor((s) => accompanying(s) && s.tier === 'UPPER');
const centre = poolFor((s) => accompanying(s) && s.tier === 'LOWER' && s.block === 'LOWER_CENTER');
const rightWing = poolFor((s) => accompanying(s) && s.tier === 'LOWER' && s.block === 'LOWER_RIGHT');
const examHall = poolFor((s) => accompanying(s) && s.tier === 'EXAM_HALL');
const mainHall = [...balcony, ...centre, ...rightWing];

// --- Students: alphabetical by first name inside their own section ---------
const byFirstName = (a, b) =>
  firstName(a.name).localeCompare(firstName(b.name)) || key(a.name).localeCompare(key(b.name));

const seatedStudents = [];
for (const section of ['mbbs', 'nursing', 'pg']) {
  const group = students.filter((s) => s.section === section).sort(byFirstName);
  const pool = studentPools[section].filter((seat) => !awardeeSeats.has(seat.id));
  if (group.length > pool.length) {
    throw new Error(`${section}: ${group.length} students but only ${pool.length} chairs`);
  }
  group.forEach((s, i) => {
    seatedStudents.push({ ...s.attendee, seatId: pool[i].id, seatLock: true });
  });
}

// --- Guests: alphabetical by the first guest's first name, families kept
//     together, balcony first, then the centre rows, then the right wing.
//     Only the tail families are split, one guest each, so that every family
//     with someone in the Exam Hall still has someone in the Main Hall. ------
families.sort(
  (a, b) =>
    firstName(a.members[0].name).localeCompare(firstName(b.members[0].name)) ||
    key(a.members[0].name).localeCompare(key(b.members[0].name))
);

const totalGuests = families.reduce((n, f) => n + f.members.length, 0);
let overflow = Math.max(0, totalGuests - mainHall.length);
if (overflow > examHall.length) {
  throw new Error(`${overflow} guests overflow a ${examHall.length}-chair Exam Hall`);
}

const toExamHall = new Set();
for (let i = families.length - 1; i >= 0 && overflow > 0; i--) {
  if (families[i].members.length < 2) continue;
  toExamHall.add(families[i]);
  overflow--;
}
if (overflow > 0) throw new Error('cannot place the overflow without stranding a whole family');

// A row that ends with a single free chair would split the next couple across
// two rows, at opposite ends of the hall. Two ways out, in order of preference:
// seat a one-guest family in that chair, or — once there are chairs to spare —
// simply leave it empty and start the couple on the next row. Row ends are
// where the physical row changes, not the block, since chairs either side of an
// aisle in the same row are still next to each other.
const rowEndAt = new Set();
for (let i = 0; i < mainHall.length - 1; i++) {
  const here = mainHall[i];
  const next = mainHall[i + 1];
  if (here.tier !== next.tier || here.row !== next.row) rowEndAt.add(i);
}

const sizeInMainHall = (f) => (toExamHall.has(f) ? f.members.length - 1 : f.members.length);

const queue = [...families];
/** Families in seating order; a null means "leave this chair empty". */
const placement = [];
let cursor = 0;
let pulledForward = 0;
let gapsLeft = 0;
// Chairs the Main Hall has over and above the guests it must hold.
let spare = mainHall.length - Math.min(totalGuests, mainHall.length);
while (queue.length) {
  const size = sizeInMainHall(queue[0]);
  // Does this family straddle a row end that something smaller could cover?
  if (size === 2 && rowEndAt.has(cursor)) {
    const singleAt = queue.findIndex((f) => sizeInMainHall(f) === 1);
    if (singleAt > 0) {
      const [single] = queue.splice(singleAt, 1);
      placement.push(single);
      cursor += 1;
      pulledForward++;
      continue;
    }
    if (spare > 0) {
      placement.push(null); // chair deliberately left empty, to keep a couple together
      cursor += 1;
      spare--;
      gapsLeft++;
      continue;
    }
  }
  placement.push(queue.shift());
  cursor += size;
}

const seatedGuests = [];
let mainNext = 0;
let examNext = 0;
let counter = 0;
for (const family of placement) {
  if (family === null) {
    mainNext++; // the chair kept empty so the next couple sits together
    continue;
  }
  const splitOff = toExamHall.has(family) ? family.members.length - 1 : -1;
  family.members.forEach((m, i) => {
    const seat = i === splitOff ? examHall[examNext++] : mainHall[mainNext++];
    seatedGuests.push({
      id: `att-guest-${slug(m.name)}-${counter++}`,
      name: m.name,
      designation: 'Parent / Guardian',
      department: `Guest of ${family.student.name}`,
      institution: 'AIIMS Kalyani',
      email: '',
      phone: '',
      categoryId: 'accompanying',
      seatId: seat.id,
      seatLock: true,
      notes: [
        m.relation ? `${m.relation} of ${family.student.name}` : `Guest of ${family.student.name}`,
        `Guest ${i + 1} of ${family.members.length}`,
        m.placeholder ? 'Name not on record' : null,
      ]
        .filter(Boolean)
        .join(' | '),
    });
  });
}

// ---------------------------------------------------------------------------
// 5. Write the roster back, leaving faculty, dignitaries and awardees alone.
// ---------------------------------------------------------------------------
const render = (list) =>
  `[\n${list
    .map((a) => JSON.stringify(a, null, 2).split('\n').map((l) => `  ${l}`).join('\n'))
    .join(',\n')}\n]`;

let source = readFileSync(ROSTER_FILE, 'utf-8');
const replaceArray = (name, list) => {
  const marker = `export const ${name}: Attendee[] = [`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`${name} not found`);
  const open = start + marker.length - 1; // the "[" that opens the literal
  const end = source.indexOf('\n];', open);
  if (end === -1) throw new Error(`${name} has no terminator`);
  source = `${source.slice(0, open)}${render(list)};${source.slice(end + 3)}`;
};
replaceArray('STUDENT_ATTENDEES', seatedStudents);
replaceArray('GUEST_ATTENDEES', seatedGuests);
writeFileSync(ROSTER_FILE, source, 'utf-8');

// ---------------------------------------------------------------------------
const chairsFor = (section) => studentPools[section].filter((s) => !awardeeSeats.has(s.id)).length;
console.log(`confirmed students read : ${confirmed.length}`);
console.log(`  matched by name       : ${report.matchedByName}`);
console.log(`  matched by exact phone: ${report.matchedByPhone}`);
console.log(`  new to the roster     : ${report.brandNew}`);
console.log(`  unresolved (skipped)  : ${report.unresolved.length}`, report.unresolved);
console.log(`seated students         : ${seatedStudents.length} (+7 awardees left untouched)`);
for (const section of ['mbbs', 'nursing', 'pg']) {
  const n = seatedStudents.filter((s) => s.categoryId === section).length;
  console.log(`  ${section.padEnd(8)}: ${n} of ${chairsFor(section)} chairs`);
}
console.log(`guests seated           : ${seatedGuests.length}`);
console.log(`  named by the sheet    : ${guestReport.fromConfirmedSheet}`);
console.log(`  placeholders          : ${guestReport.placeholders}`);
console.log(`  balcony               : ${Math.min(mainNext, balcony.length)}`);
console.log(`  centre block          : ${Math.max(0, Math.min(mainNext - balcony.length, centre.length))}`);
console.log(`  right wing I–X        : ${Math.max(0, mainNext - balcony.length - centre.length)}`);
console.log(`  exam hall             : ${examNext} (from ${toExamHall.size} families, each keeping someone in the Main Hall)`);
console.log(`  couples kept together: ${pulledForward} one-guest families moved up, ${gapsLeft} chair(s) left empty at a row end`);
console.log(`guests dropped as "Not Confirmed" on the sheet: ${guestReport.declined.length}`);
guestReport.declined.forEach((d) => console.log(`  ${d}`));
console.log(`no count on the sheet — took the named guests: ${guestReport.blankCount.length}`);
guestReport.blankCount.forEach((b) => console.log(`  ${b}`));
console.log(`extra guest records dropped     : ${guestReport.dropped.length}`);
guestReport.dropped.forEach((d) => console.log(`  ${d}`));
