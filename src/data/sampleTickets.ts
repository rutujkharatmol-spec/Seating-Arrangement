import { Seat, Attendee, CategoryId, TierType } from '../types/seating';
import { generateDefaultSeats } from './defaultSeatingData';
import { compareSeatDesirability } from '../utils/autoSeat';

export interface SampleTicketItem {
  id: string;
  categoryName: string;
  badgeLabel: string;
  seat: Seat;
}

/**
 * One specimen pass per section, for showing an usher what each ticket looks
 * like before the real ones are printed.
 *
 * The chairs are taken from the actual auditorium layout rather than written
 * out by hand, so a sample always carries a real chair number in the house's
 * own numbering — F14, G5, UB2-12 — and never an invented one. Each sample
 * claims a different chair, so no two specimens show the same seat.
 */

const LAYOUT = generateDefaultSeats();
const claimed = new Set<string>();

/**
 * A chair matching the spec, claimed so no other sample reuses it. Specimens
 * take the best chair of their section; the blank pass takes the furthest
 * back, so it never looks like it is offering a front-row seat.
 */
function claimChair(match: (seat: Seat) => boolean, fromBack = false): Seat | undefined {
  const ordered = LAYOUT.filter((s) => !claimed.has(s.id) && match(s)).sort(compareSeatDesirability);
  const chair = fromBack ? ordered[ordered.length - 1] : ordered[0];
  if (chair) claimed.add(chair.id);
  return chair;
}

const inSection = (categoryId: CategoryId, tier?: TierType) => (seat: Seat) =>
  seat.categoryId === categoryId && (tier === undefined || seat.tier === tier);

interface SampleSpec {
  id: string;
  categoryName: string;
  badgeLabel: string;
  /** Which chair the specimen should sit on. */
  chair: (seat: Seat) => boolean;
  /** Take the chair furthest from the stage rather than the best one. */
  fromBack?: boolean;
  person?: Omit<Attendee, 'id' | 'seatId' | 'categoryId'> & { categoryId: CategoryId };
}

const SPECS: SampleSpec[] = [
  {
    id: 'sample-faculty',
    categoryName: 'Faculty & Academic Staff',
    badgeLabel: 'Faculty',
    chair: inSection('faculty'),
    person: {
      name: 'Prof. (Dr.) Debabrata Bhattacharya',
      designation: 'Professor & Head',
      department: 'Department of General Medicine',
      institution: 'AIIMS Kalyani',
      categoryId: 'faculty',
    },
  },
  {
    id: 'sample-admin',
    categoryName: 'Administrative Staff',
    badgeLabel: 'Admin Staff',
    chair: inSection('admin_staff'),
    person: {
      name: 'Sri Alok Kumar Mukherjee',
      designation: 'Administrative Officer',
      department: 'General Administration & Estate',
      institution: 'AIIMS Kalyani',
      categoryId: 'admin_staff',
    },
  },
  {
    id: 'sample-vip',
    categoryName: 'VIP & Dignitaries',
    badgeLabel: 'VIP',
    chair: inSection('vip'),
    person: {
      name: 'Dr. Ramachandra V. Rao',
      designation: 'President & Chief Guest',
      department: 'Institute Body, AIIMS Kalyani',
      institution: 'AIIMS Kalyani',
      categoryId: 'vip',
      isVip: true,
    },
  },
  {
    id: 'sample-awardees',
    categoryName: 'Rank Holders & Awardees',
    badgeLabel: 'Awardee',
    chair: inSection('awardees'),
    person: {
      name: 'Dr. Sneha Roy',
      designation: 'Gold Medalist · Best Outgoing MBBS Scholar',
      department: 'Academic Excellence Honors',
      institution: 'AIIMS Kalyani',
      categoryId: 'awardees',
    },
  },
  {
    id: 'sample-mbbs',
    categoryName: 'MBBS Graduates',
    badgeLabel: 'MBBS Graduate',
    chair: inSection('mbbs'),
    person: {
      name: 'Dr. Arka Banerjee',
      designation: 'MBBS Graduate (Class of 2020)',
      department: 'Faculty of Medicine',
      institution: 'AIIMS Kalyani',
      categoryId: 'mbbs',
    },
  },
  {
    id: 'sample-nursing',
    categoryName: 'Nursing Graduates',
    badgeLabel: 'Nursing Graduate',
    chair: inSection('nursing'),
    person: {
      name: 'Sister Priya Chakraborty',
      designation: 'B.Sc (Hons) Nursing Graduate',
      department: 'College of Nursing',
      institution: 'AIIMS Kalyani',
      categoryId: 'nursing',
    },
  },
  {
    id: 'sample-pg',
    categoryName: 'PG Residents (MD/MS)',
    badgeLabel: 'PG Resident',
    chair: inSection('pg'),
    person: {
      name: 'Dr. Tanmoy Ghosh',
      designation: 'Junior Resident (MD Anaesthesiology)',
      department: 'Department of Anaesthesiology',
      institution: 'AIIMS Kalyani',
      categoryId: 'pg',
    },
  },
  {
    id: 'sample-reporters',
    categoryName: 'Media & Press Reporters',
    badgeLabel: 'Press / Media',
    chair: inSection('reporters'),
    person: {
      name: 'Ms. Rupa Sen',
      designation: 'Senior Medical Bureau Chief',
      department: 'The Statesman / Medical Press',
      institution: 'AIIMS Kalyani',
      categoryId: 'reporters',
    },
  },
  {
    id: 'sample-parent-balcony',
    categoryName: 'Parents & Guardians (Balcony)',
    badgeLabel: 'Parent / Guardian',
    chair: inSection('accompanying', 'UPPER'),
    person: {
      name: 'Mr. Pradeep Chakraborty',
      designation: 'Honoured Parent / Guardian',
      department: 'Guardian of Sister Priya Chakraborty',
      institution: 'AIIMS Kalyani',
      categoryId: 'accompanying',
    },
  },
  {
    id: 'sample-it-staff',
    categoryName: 'IT Dept Staff',
    badgeLabel: 'IT Staff',
    chair: inSection('it_staff'),
    person: {
      name: 'Mr. Bikramjit Das',
      designation: 'Senior Systems & AV Engineer',
      department: 'IT & Telemedicine Centre',
      institution: 'AIIMS Kalyani',
      categoryId: 'it_staff',
    },
  },
  {
    id: 'sample-guide',
    categoryName: 'Event Guides & Ushers',
    badgeLabel: 'Guide / Usher',
    chair: inSection('guide'),
    person: {
      name: 'Mr. Siddharth Roy',
      designation: 'Lead Usher Coordinator',
      department: 'Convocation Secretariat',
      institution: 'AIIMS Kalyani',
      categoryId: 'guide',
    },
  },
  {
    id: 'sample-accessible',
    categoryName: 'Accessible / Wheelchair',
    badgeLabel: 'Assisted Access',
    chair: inSection('accessible'),
    person: {
      name: 'Dr. Suniti Kumar Mukherjee',
      designation: 'Senior Emeritus Guest (Assisted Access)',
      department: 'Department of Community Medicine',
      institution: 'AIIMS Kalyani',
      categoryId: 'accessible',
    },
  },
  {
    id: 'sample-examhall',
    categoryName: 'Parents (Exam Hall Overflow)',
    badgeLabel: 'Exam Hall Parent',
    chair: inSection('accompanying', 'EXAM_HALL'),
    person: {
      name: 'Mrs. Jayanti Roy',
      designation: 'Honoured Family Member',
      department: 'Guardian of Dr. Arka Banerjee',
      institution: 'AIIMS Kalyani',
      categoryId: 'accompanying',
    },
  },
  {
    id: 'sample-open-seat',
    categoryName: 'Standard Auditorium Pass (Unassigned)',
    badgeLabel: 'Open Pass',
    // A chair with no section of its own, or failing that the back of the
    // centre block — printed blank, for a name written in at the door.
    chair: (seat) =>
      seat.categoryId === 'available' || (seat.tier === 'LOWER' && seat.block === 'LOWER_CENTER'),
    fromBack: true,
  },
];

export const SAMPLE_TICKETS: SampleTicketItem[] = SPECS.flatMap((spec) => {
  const chair = claimChair(spec.chair, spec.fromBack);
  if (!chair) return []; // A section with no chairs has no specimen to show.

  const attendee: Attendee | undefined = spec.person
    ? { ...spec.person, id: `att-${spec.id}`, seatId: chair.id }
    : undefined;

  return [
    {
      id: spec.id,
      categoryName: spec.categoryName,
      badgeLabel: spec.badgeLabel,
      seat: { ...chair, attendee, attendeeId: attendee?.id },
    },
  ];
});

/** Quick list of all sample seats */
export const ALL_SAMPLE_SEATS: Seat[] = SAMPLE_TICKETS.map((item) => item.seat);

/** Quick list of sample attendees */
export const ALL_SAMPLE_ATTENDEES: Attendee[] = SAMPLE_TICKETS.map((item) => item.seat.attendee).filter(
  (att): att is Attendee => Boolean(att)
);
