export type TierType = 'UPPER' | 'LOWER';
export type BlockType = 'UPPER_LEFT' | 'UPPER_CENTER' | 'UPPER_RIGHT' | 'LOWER_LEFT' | 'LOWER_CENTER' | 'LOWER_RIGHT';

export type BuiltinCategoryId = 
  | 'vip'
  | 'reporters'
  | 'faculty'
  | 'senior_faculty'
  | 'mbbs'
  | 'nursing'
  | 'pg'
  | 'accompanying'
  | 'band_party'
  | 'admin_staff'
  | 'it_staff'
  | 'guide'
  | 'available';

export type CategoryId = string;

export interface CategoryInfo {
  id: string;
  name: string;
  shortName: string;
  color: string;           // Hex color
  textColor: string;
  borderColor: string;
  description: string;
  defaultCount?: number;
  priority?: number;
  recommendedGate?: string;
  isCustom?: boolean;
}

export interface Attendee {
  id: string;
  name: string;
  title?: string;
  designation?: string;
  department?: string;
  institution?: string;
  email?: string;
  phone?: string;
  categoryId: CategoryId;
  seatId?: string;
  notes?: string;
  isVip?: boolean;
}

export interface Seat {
  id: string;              // e.g. "L-A1", "C-H7", "R-P3", "UB-L-1-1"
  tier: TierType;
  block: BlockType;
  blockName: string;       // "Left Wing", "Center Block", "Right Wing", "Upper Left", etc.
  row: string;             // "A", "B", ... "X" or "UB-1"
  col: number;             // 1-indexed column in block
  seatNumber: string;      // Display number e.g. "A1", "H7"
  categoryId: CategoryId;
  attendeeId?: string;
  attendee?: Attendee;
  isBlocked?: boolean;
  notes?: string;
  gateRecommendation: 'Gate-1' | 'Gate-2' | 'Balcony Gate';
  customColor?: string;
  x?: number;              // Layout X coordinate
  y?: number;              // Layout Y coordinate
}

export interface Volunteer {
  id: string;
  name: string;
  role: string;
  location: string;
  phone?: string;
  x: number;
  y: number;
  gate?: string;
}

export interface QuestionnaireAnswers {
  eventTitle: string;
  departmentName: string;
  numVip: number;
  numSeniorFaculty: number;
  numFaculty: number;
  numAwardees: number;
  numReporters: number;
  numAccompanying: number;
  numBandParty: number;
  numConsole: number;
  numBlocked: number;
  numAudience: number;
  totalSeats: number;
  notes?: string;
}

export interface SeatingPreset {
  id: string;
  name: string;
  description: string;
  eventTitle: string;
  departmentName: string;
  answers: QuestionnaireAnswers;
}
