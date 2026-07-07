export type BusinessType =
  | "auto_detailing"
  | "barbershop_salon"
  | "clinic_dentist"
  | "personal_trainer"
  | "photographer"
  | "lawyer_consultant"
  | "importer_wholesaler"
  | "personal_use";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export type DayHours = { open: string; close: string } | null;

export type WorkingHours = Record<Weekday, DayHours>;

export type DefaultService = {
  name: string;
  durationMinutes: number;
};

export type BusinessTypeConfig = {
  value: BusinessType;
  label: string;
  defaultHours: WorkingHours;
  defaultServices: DefaultService[];
};
