export const STATUS_TONE: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground",
  approved: "bg-primary/15 text-primary",
  completed: "bg-success/15 text-success",
  confirmed: "bg-success/15 text-success",
  declined: "bg-destructive/15 text-destructive",
};
export const STATUS_LT: Record<string, string> = {
  pending: "Laukia",
  approved: "Vykdoma",
  completed: "Užbaigta",
  confirmed: "Užbaigta",
  declined: "Atmesta",
};
export const ROLE_LT: Record<string, string> = {
  student: "Mokinys",
  organization: "Organizacija",
  school_admin: "Mokyklos admin",
  admin: "Super admin",
};

export type AdminProfile = {
  id: string;
  role: string;
  full_name: string | null;
  organization_name: string | null;
  email: string | null;
  hours_earned: number;
  hours_needed: number;
};
export type AdminReservation = {
  id: string;
  status: string;
  hours_to_earn: number;
  reservation_date: string;
  organization_id: string;
  student_id: string;
  created_at: string;
};
