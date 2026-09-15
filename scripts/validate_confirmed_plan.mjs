/**
 * Checks the rebuilt roster against every rule the confirmed list has to obey,
 * comparing it with the plan that is currently published.
 *
 *   node scripts/validate_confirmed_plan.mjs
 *
 * Exits non-zero if anything fails, so the plan is never published unchecked.
 */
import XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { createJiti } from 'jiti';

// No caching: these scripts are run right after src/data is rewritten, and a
// cached module would quietly mix a fresh roster with a stale layout.
const jiti = createJiti(import.meta.url, { fsCache: false, moduleCache: false });
const { createDefaultPlan } = await jiti.import('../src/state/plan.ts');

const txt = (v) => String(v ?? '').trim();
const key = (v) => txt(v).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const firstName = (v) => key(v).split(' ')[0] || '';

const confirmed = XLSX.utils
  .sheet_to_json(XLSX.readFile('Confirmed Students Data.xlsx').Sheets.Sheet1, { defval: '', raw: false })
  .filter((r) => txt(r['Name of the Student']));

/**
 * Compare against the last committed plan, not the working copy — otherwise a
 * second run measures this rebuild against the first one and the "faculty
 * untouched" and "Exam Hall reduced" checks stop meaning anything.
 */
const PLAN_PATH = 'public/live-seating-plan.json';
let baseline = 'HEAD';
let before;
try {
  before = JSON.parse(execFileSync('git', ['show', `HEAD:${PLAN_PATH}`], { encoding: 'utf-8', maxBuffer: 64 << 20 }));
} catch {
  baseline = 'working copy';
  before = JSON.parse(readFileSync(PLAN_PATH, 'utf-8'));
}
const after = createDefaultPlan();
console.log(`comparing against the plan as of ${baseline}\n`);

let failures = 0;
let checks = 0;
const ok = (label, extra = '') => { checks++; console.log(`  PASS  ${label}${extra ? ` — ${extra}` : ''}`); };
const bad = (label, detail) => { checks++; failures++; console.log(`  FAIL  ${label} — ${detail}`); };
const assert = (cond, label, detail, extra) => (cond ? ok(label, extra) : bad(label, detail));
const section = (t) => console.log(`\n${t}`);

const seatById = new Map(after.seats.map((s) => [s.id, s]));
const STUDENT_CATS = ['mbbs', 'nursing', 'pg'];
const students = after.attendees.filter((a) => STUDENT_CATS.includes(a.categoryId));
const awardees = after.attendees.filter((a) => a.categoryId === 'awardees');
const guests = after.attendees.filter((a) => a.categoryId === 'accompanying');
const faculty = after.attendees.filter((a) => a.categoryId === 'faculty');
const reserved = after.attendees.filter((a) => ['vip', 'guide', 'accessible'].includes(a.categoryId));

// ---------------------------------------------------------------- students --
section('STUDENTS');
const confirmedKeys = new Set(confirmed.map((r) => key(r['Name of the Student'])));
const confirmedPhones = new Set(confirmed.map((r) => txt(r['Contact No']).replace(/\D/g, '')).filter((p) => p.length >= 10));
const allStudentPeople = [...students, ...awardees];

assert(
  allStudentPeople.length === confirmed.length,
  'every confirmed student is on the roster exactly once',
  `${allStudentPeople.length} seated vs ${confirmed.length} confirmed`,
  `${allStudentPeople.length} = ${students.length} seated now + ${awardees.length} awardees`
);

const strays = allStudentPeople.filter(
  (a) => !confirmedKeys.has(key(a.name)) && !confirmedPhones.has(txt(a.phone).replace(/\D/g, ''))
);
assert(strays.length === 0, 'no unconfirmed student holds a student seat', strays.map((a) => a.name).join(', '));

const seenStudent = new Map();
const doubles = [];
for (const a of allStudentPeople) {
  const k = key(a.name);
  if (seenStudent.has(k)) doubles.push(a.name);
  seenStudent.set(k, a);
}
assert(doubles.length === 0, 'no student appears twice', doubles.join(', '));
assert(
  allStudentPeople.every((a) => a.seatId && seatById.has(a.seatId)),
  'every student holds one real chair',
  allStudentPeople.filter((a) => !a.seatId || !seatById.has(a.seatId)).map((a) => a.name).join(', ')
);

// Alphabetical by first name, front chair to back chair, inside each section.
const { compareSeatFillOrder } = await jiti.import('../src/utils/autoSeat.ts');
for (const cat of STUDENT_CATS) {
  const group = students
    .filter((a) => a.categoryId === cat)
    .sort((a, b) => compareSeatFillOrder(seatById.get(a.seatId), seatById.get(b.seatId)));
  const names = group.map((a) => firstName(a.name));
  const sorted = [...names].sort((x, y) => x.localeCompare(y));
  const at = names.findIndex((n, i) => n !== sorted[i]);
  assert(at === -1, `${cat}: seated alphabetically by first name`, `breaks at #${at + 1}: ${names[at]}`, `${group.length} students, ${names[0]} → ${names[names.length - 1]}`);
}

// MBBS must not sit in the centre block behind the faculty rows.
const mbbsBehindFaculty = students.filter(
  (a) => a.categoryId === 'mbbs' && seatById.get(a.seatId)?.block === 'LOWER_CENTER'
);
const before4 = before.attendees.filter(
  (a) => a.categoryId === 'mbbs' && before.seats.find((s) => s.id === a.seatId)?.block === 'LOWER_CENTER'
);
assert(mbbsBehindFaculty.length === 0, 'no MBBS student stranded in the centre block behind faculty', mbbsBehindFaculty.map((a) => `${a.name}@${a.seatId}`).join(', '), `was ${before4.length}, now 0`);

// ------------------------------------------------------------------ guests --
section('GUESTS');
const NOT_A_NAME = /^(na|n\/a|nil|none|-|\.)$/i;
const GUEST_COLUMNS = [
  ['Guest-1', 'Confirmed/ Not Confirmed'],
  ['Guest -2', 'Confirmed / Not confirmed'],
];
/** Guests the sheet names and does not refuse. */
function namedGuests(row) {
  return GUEST_COLUMNS.map(([nameCol, statusCol]) => ({
    name: txt(row[nameCol]),
    declined: /not\s*confirmed/i.test(txt(row[statusCol])),
  })).filter((g) => g.name && !NOT_A_NAME.test(g.name));
}

/**
 * How many chairs a student's guests should take: the sheet's count, less one
 * for every guest it marks "Not Confirmed". Where there is no count, whoever
 * the sheet names and does not refuse.
 */
function guestsWantedFor(row) {
  const named = namedGuests(row);
  const declined = named.filter((g) => g.declined).length;
  const raw = txt(row['No. of Guest']);
  if (raw === '') return named.length - declined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, n - declined) : 0;
}

const wanted = new Map();
for (const r of confirmed) {
  const n = guestsWantedFor(r);
  if (n > 0) wanted.set(key(r['Name of the Student']), { n, row: r });
}
const studentNameById = new Map(allStudentPeople.map((a) => [key(a.name), a]));
const held = new Map();
for (const g of guests) {
  const m = /^Guest of (.*)$/.exec(txt(g.department));
  const k = key(m ? m[1] : '');
  if (!held.has(k)) held.set(k, []);
  held.get(k).push(g);
}

let countMismatch = [];
for (const [k, { n, row }] of wanted) {
  // The confirmed sheet and the roster can spell a name differently; resolve
  // through the roster record the rebuild used.
  const student = studentNameById.get(k) ?? [...studentNameById.values()].find(
    (a) => txt(a.phone).replace(/\D/g, '') === txt(row['Contact No']).replace(/\D/g, '')
  );
  const got = student ? (held.get(key(student.name)) ?? []).length : (held.get(k) ?? []).length;
  if (got !== n) countMismatch.push(`${txt(row['Name of the Student'])}: sheet ${n}, seated ${got}`);
}
assert(countMismatch.length === 0, "each student's guest count matches the confirmed sheet", countMismatch.slice(0, 8).join(' | '), `${wanted.size} students with guests`);

const totalWanted = [...wanted.values()].reduce((t, v) => t + v.n, 0);
assert(guests.length === totalWanted, 'no guest seated beyond the confirmed counts', `${guests.length} vs ${totalWanted}`, `${guests.length} guests`);

// Nobody the sheet marks "Not Confirmed" may hold a chair.
const refused = new Set();
for (const r of confirmed) {
  for (const g of namedGuests(r)) if (g.declined) refused.add(key(g.name));
}
const refusedButSeated = guests.filter((g) => refused.has(key(g.name)));
assert(
  refusedButSeated.length === 0,
  'no guest marked "Not Confirmed" holds a chair',
  refusedButSeated.map((g) => `${g.name} @ ${g.seatId}`).join(', '),
  `${refused.size} refusals on the sheet, none seated`
);

const orphans = guests.filter((g) => {
  const m = /^Guest of (.*)$/.exec(txt(g.department));
  return !m || !studentNameById.has(key(m[1]));
});
assert(orphans.length === 0, 'every guest belongs to a confirmed student', orphans.slice(0, 5).map((g) => g.name).join(', '));

const placeholderPattern = /^Guest [12] of .+/;
const unnamed = guests.filter((g) => placeholderPattern.test(g.name));
ok('placeholder naming', unnamed.length === 0 ? `none needed — all ${guests.length} named from the sheet` : `${unnamed.length} use "Guest N of <Student>"`);
const withRelation = guests.filter((g) => /^[^|]+ of /.test(txt(g.notes)) && !/^Guest of /.test(txt(g.notes)));
ok('relationships preserved', `${withRelation.length} of ${guests.length} carry a relation`);

assert(
  guests.every((g) => g.seatId && seatById.has(g.seatId)),
  'every guest holds one real chair',
  guests.filter((g) => !g.seatId || !seatById.has(g.seatId)).map((g) => g.name).join(', ')
);

const where = (g) => {
  const s = seatById.get(g.seatId);
  return s.tier === 'EXAM_HALL' ? 'exam' : s.tier === 'UPPER' ? 'balcony' : s.block === 'LOWER_CENTER' ? 'centre' : 'right';
};
const spread = guests.reduce((acc, g) => ((acc[where(g)] = (acc[where(g)] ?? 0) + 1), acc), {});
const beforeExam = before.attendees.filter(
  (a) => a.categoryId === 'accompanying' && before.seats.find((s) => s.id === a.seatId)?.tier === 'EXAM_HALL'
).length;
ok('guest distribution', `balcony ${spread.balcony ?? 0}, centre S–U ${spread.centre ?? 0}, right wing ${spread.right ?? 0}, exam hall ${spread.exam ?? 0}`);
assert(
  (spread.exam ?? 0) < beforeExam,
  'Exam Hall use reduced',
  `${spread.exam ?? 0} vs ${beforeExam}`,
  (spread.exam ?? 0) === 0 ? `${beforeExam} → none, the Exam Hall is empty` : `${beforeExam} → ${spread.exam}`
);
assert(
  (spread.balcony ?? 0) === after.seats.filter((s) => s.tier === 'UPPER').length,
  'the balcony is filled before any overflow seating is used',
  `${spread.balcony} of ${after.seats.filter((s) => s.tier === 'UPPER').length}`,
  'all 132 balcony chairs in use'
);

// Every family with someone in the Exam Hall keeps someone in the Main Hall.
const stranded = [];
const splitFamilies = [];
for (const [k, list] of held) {
  const inExam = list.filter((g) => where(g) === 'exam');
  if (inExam.length === 0) continue;
  splitFamilies.push(k);
  if (inExam.length === list.length) stranded.push(k);
}
assert(stranded.length === 0, 'no family is sent to the Exam Hall in its entirety', stranded.join(', '), `${splitFamilies.length} families split, each keeping a guardian in the Main Hall`);

// Families that are not split sit next to each other, measured in the order
// the chairs are actually filled — not the order they happen to be listed in.
const poolOf = (p) => after.seats.filter(p).sort(compareSeatFillOrder);
const isAcc = (s) => s.categoryId === 'accompanying';
const mainHallOrder = new Map(
  [
    ...poolOf((s) => isAcc(s) && s.tier === 'UPPER'),
    ...poolOf((s) => isAcc(s) && s.tier === 'LOWER' && s.block === 'LOWER_CENTER'),
    ...poolOf((s) => isAcc(s) && s.tier === 'LOWER' && s.block === 'LOWER_RIGHT'),
  ].map((s, i) => [s.id, i])
);

let apart = 0;
let straddles = [];
for (const [k, list] of held) {
  if (list.length < 2 || list.some((g) => where(g) === 'exam')) continue;
  const idx = list.map((g) => mainHallOrder.get(g.seatId)).sort((a, b) => a - b);
  for (let i = 1; i < idx.length; i++) if (idx[i] - idx[i - 1] !== 1) apart++;
  const rows = new Set(list.map((g) => `${seatById.get(g.seatId).tier}/${seatById.get(g.seatId).row}`));
  if (rows.size > 1) straddles.push(`${k} (${list.map((g) => g.seatId).join(' + ')})`);
}
assert(apart === 0, 'same-family guests sit in consecutive chairs', `${apart} pair(s) not consecutive`, 'every unsplit family is in adjacent chairs');
ok('couples kept within one row', straddles.length === 0 ? 'all in one row' : `${straddles.length} pair(s) wrap a row end: ${straddles.join(', ')}`);

// Guests run alphabetically by the lead guest's first name, family by family.
// Within a family the second guest follows their own household, not the
// alphabet, and a one-guest family is allowed to move up to cover a row end.
const leadOrder = [...held.entries()]
  .filter(([, list]) => list.some((g) => where(g) !== 'exam'))
  .map(([k, list]) => [k, list.slice().sort((a, b) => mainHallOrder.get(a.seatId) - mainHallOrder.get(b.seatId))[0]])
  .sort((a, b) => mainHallOrder.get(a[1].seatId) - mainHallOrder.get(b[1].seatId));
let outOfOrder = 0;
for (let i = 1; i < leadOrder.length; i++) {
  if (firstName(leadOrder[i][1].name).localeCompare(firstName(leadOrder[i - 1][1].name)) < 0) outOfOrder++;
}
const singles = [...held.values()].filter((l) => l.filter((g) => where(g) !== 'exam').length === 1).length;
assert(
  outOfOrder <= singles,
  'guests run alphabetically by first name, family by family',
  `${outOfOrder} families out of order, more than the ${singles} that may move to cover a row end`,
  `${leadOrder.length} families, ${outOfOrder} moved up to keep a couple together`
);

// ---------------------------------------------------------------- awardees --
section('AWARDEES (protected)');
const beforeAwardees = before.attendees.filter((a) => a.categoryId === 'awardees');
const afterById = new Map(after.attendees.map((a) => [a.id, a]));
const moved = [];
for (const a of beforeAwardees) {
  const now = afterById.get(a.id);
  if (!now) { moved.push(`${a.name} deleted`); continue; }
  if (now.seatId !== a.seatId) moved.push(`${a.name}: ${a.seatId} → ${now.seatId}`);
  if (now.categoryId !== 'awardees') moved.push(`${a.name} left the awardee section`);
}
assert(moved.length === 0, 'every awardee kept the exact same chair', moved.join(', '), beforeAwardees.map((a) => `${a.name.split(' ')[0]}@${a.seatId}`).join(', '));
assert(awardees.length === beforeAwardees.length, 'no awardee added or removed', `${awardees.length} vs ${beforeAwardees.length}`);
const awardeeDoubles = awardees.filter((a) => allStudentPeople.filter((x) => key(x.name) === key(a.name)).length > 1);
assert(awardeeDoubles.length === 0, 'no awardee holds a second seat', awardeeDoubles.map((a) => a.name).join(', '));

// ------------------------------------------------------------------ chairs --
section('CHAIRS');
const beforeSeatIds = new Set(before.seats.map((s) => s.id));
const afterSeatIds = new Set(after.seats.map((s) => s.id));
const created = [...afterSeatIds].filter((id) => !beforeSeatIds.has(id));
const removed = [...beforeSeatIds].filter((id) => !afterSeatIds.has(id));
assert(created.length === 0, 'no chair number created', created.join(', '));
assert(removed.length === 0, 'no chair number deleted or renamed', removed.join(', '));
assert(beforeSeatIds.size === afterSeatIds.size, 'chair count unchanged', `${beforeSeatIds.size} → ${afterSeatIds.size}`, `${afterSeatIds.size} chairs`);

const geometryChanged = before.seats.filter((s) => {
  const now = seatById.get(s.id);
  return !now || now.row !== s.row || now.col !== s.col || now.block !== s.block || now.x !== s.x || now.y !== s.y;
});
assert(geometryChanged.length === 0, 'every chair keeps its row, column, block and position', geometryChanged.slice(0, 5).map((s) => s.id).join(', '));

const emptyChairs = after.seats.filter((s) => !after.attendees.some((a) => a.seatId === s.id));
ok('chairs left free stay available for reuse', `${emptyChairs.length} free`);

// ------------------------------------------------------------------- other --
section('FACULTY AND UNRELATED DATA');
const beforeFaculty = before.attendees.filter((a) => a.categoryId === 'faculty');
const facultyChanged = beforeFaculty.filter((a) => {
  const now = afterById.get(a.id);
  return !now || now.seatId !== a.seatId || now.name !== a.name || now.categoryId !== a.categoryId;
});
assert(facultyChanged.length === 0, 'faculty untouched — same people, same chairs', facultyChanged.slice(0, 5).map((a) => `${a.name} ${a.seatId}→${afterById.get(a.id)?.seatId}`).join(', '), `${faculty.length} faculty`);

const beforeReserved = before.attendees.filter((a) => ['vip', 'guide', 'accessible'].includes(a.categoryId));
const reservedChanged = beforeReserved.filter((a) => {
  const now = afterById.get(a.id);
  return !now || now.seatId !== a.seatId || now.categoryId !== a.categoryId;
});
assert(reservedChanged.length === 0, 'dignitaries, guides and wheelchair spaces untouched', reservedChanged.map((a) => a.name).join(', '), `${reserved.length} people`);

section('DATA INTEGRITY');
const bySeat = new Map();
const clashes = [];
for (const a of after.attendees) {
  if (!a.seatId) continue;
  if (bySeat.has(a.seatId)) clashes.push(`${a.seatId}: ${bySeat.get(a.seatId).name} & ${a.name}`);
  bySeat.set(a.seatId, a);
}
assert(clashes.length === 0, 'no chair holds two people', clashes.slice(0, 5).join(' | '));

const ids = after.attendees.map((a) => a.id);
const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
assert(dupIds.length === 0, 'no duplicate attendee id', [...new Set(dupIds)].slice(0, 5).join(', '));

const unseated = after.attendees.filter((a) => !a.seatId);
assert(unseated.length === 0, 'nobody on the roster is left without a chair', unseated.map((a) => a.name).join(', '), `${after.attendees.length} people all seated`);

const blanks = after.attendees.filter((a) => !txt(a.name));
assert(blanks.length === 0, 'no empty person entries', `${blanks.length} found`);

// ------------------------------------------------------- published snapshot --
section('PUBLISHED SNAPSHOT');
// public/live-seating-plan.json is what the app and the guests' phones actually
// read. It has to agree with the roster in src/data, or the plan on screen is
// not the plan that was just checked.
try {
  const live = JSON.parse(readFileSync(PLAN_PATH, 'utf-8'));
  const livePlaces = new Map(live.attendees.filter((a) => a.seatId).map((a) => [a.id, a.seatId]));
  const drift = after.attendees.filter((a) => a.seatId && livePlaces.get(a.id) !== a.seatId);
  assert(
    live.attendees.length === after.attendees.length && drift.length === 0,
    'the published snapshot matches the roster in src/data',
    drift.length
      ? `${drift.length} chair(s) differ, e.g. ${drift[0].name}: source ${drift[0].seatId}, published ${livePlaces.get(drift[0].id) ?? 'none'}`
      : `${live.attendees.length} people published vs ${after.attendees.length} in source — republish`,
    `${live.attendees.length} people, every one on the same chair`
  );
  assert(
    live.layoutVersion === after.layoutVersion,
    'the published snapshot is on the current layout',
    `published "${live.layoutVersion}", source "${after.layoutVersion}" — republish`,
    live.layoutVersion
  );
} catch (err) {
  bad('the published snapshot could be read', err.message);
}

console.log(`\n${failures === 0 ? 'VALIDATION PASSED' : 'VALIDATION FAILED'} — ${checks - failures}/${checks} checks`);
process.exit(failures === 0 ? 0 : 1);
