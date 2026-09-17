export type ClientStatus =
  | "Signed"
  | "In Pipeline"
  | "Not Interested"
  | "Prospect"
  | "On Hold"
  | "Interested in Trial";

export type ClientType = "Homecare" | "Retirement Home";

export type LeadTemperature = "Warm" | "Cold";

export const LEAD_SOURCES = [
  "Referral",
  "LinkedIn",
  "Cold Email",
  "Cold Call",
  "Conference/Event",
  "Inbound",
  "Existing Relationship",
  "Other",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export interface NoteEntry {
  timestamp: string; // ISO 8601
  text: string;
}

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  address: string;
  city: string;
  provinceState: string;
  country: string;
  contactName: string;
  contactEmail: string;
  phoneCell: string;
  phoneWork: string;
  status: ClientStatus;
  notes: string;
  lat: number;
  lng: number;
  createdAt: number;
  leadTemperature: LeadTemperature;
  leadSource: string;
  notesLog: NoteEntry[];
  lastContactedDate: string | null;
  nextFollowUpDate: string | null;
}

function startOfToday(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

// Strictly in the past (for the red overdue badge/dot).
export function isOverdue(nextFollowUpDate: string | null): boolean {
  if (!nextFollowUpDate) return false;
  const due = new Date(nextFollowUpDate + "T00:00:00");
  return due.getTime() < startOfToday();
}

// Today or in the past (for the "Follow up today" quick filter).
export function isDueTodayOrOverdue(nextFollowUpDate: string | null): boolean {
  if (!nextFollowUpDate) return false;
  const due = new Date(nextFollowUpDate + "T00:00:00");
  return due.getTime() <= startOfToday();
}

export const STATUS_COLORS: Record<ClientStatus, string> = {
  Signed: "#34D399",
  "In Pipeline": "#FBBF24",
  "Not Interested": "#FB7185",
  Prospect: "#38BDF8",
  "On Hold": "#94A3B8",
  "Interested in Trial": "#C084FC",
};

export const STATUS_BG: Record<ClientStatus, string> = {
  Signed: "bg-emerald-400",
  "In Pipeline": "bg-amber-400",
  "Not Interested": "bg-rose-400",
  Prospect: "bg-sky-400",
  "On Hold": "bg-slate-400",
  "Interested in Trial": "bg-purple-400",
};
