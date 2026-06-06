export type ClientStatus =
  | "Signed"
  | "In Pipeline"
  | "Not Interested"
  | "Prospect"
  | "On Hold"
  | "Interested in Trial";

export type ClientType = "Homecare" | "Retirement Home";

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
