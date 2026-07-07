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

function everyDay(open: string, close: string): WorkingHours {
  return {
    mon: { open, close },
    tue: { open, close },
    wed: { open, close },
    thu: { open, close },
    fri: { open, close },
    sat: { open, close },
    sun: { open, close },
  };
}

function weekdaysOnly(open: string, close: string): WorkingHours {
  return {
    mon: { open, close },
    tue: { open, close },
    wed: { open, close },
    thu: { open, close },
    fri: { open, close },
    sat: null,
    sun: null,
  };
}

function mondayToSaturday(open: string, close: string): WorkingHours {
  return {
    mon: { open, close },
    tue: { open, close },
    wed: { open, close },
    thu: { open, close },
    fri: { open, close },
    sat: { open, close },
    sun: null,
  };
}

function noDefaultHours(): WorkingHours {
  return {
    mon: null,
    tue: null,
    wed: null,
    thu: null,
    fri: null,
    sat: null,
    sun: null,
  };
}

export const BUSINESS_TYPES: BusinessTypeConfig[] = [
  {
    value: "auto_detailing",
    label: "Auto Detailing",
    defaultHours: everyDay("09:00", "19:00"),
    defaultServices: [
      { name: "Full detail", durationMinutes: 180 },
      { name: "Ceramic coat", durationMinutes: 360 },
      { name: "Engine clean", durationMinutes: 60 },
    ],
  },
  {
    value: "barbershop_salon",
    label: "Barbershop / Salon",
    defaultHours: mondayToSaturday("10:00", "20:00"),
    defaultServices: [
      { name: "Haircut", durationMinutes: 30 },
      { name: "Colour", durationMinutes: 90 },
      { name: "Beard trim", durationMinutes: 20 },
    ],
  },
  {
    value: "clinic_dentist",
    label: "Clinic / Dentist",
    defaultHours: weekdaysOnly("09:00", "18:00"),
    defaultServices: [
      { name: "Checkup", durationMinutes: 30 },
      { name: "Cleaning", durationMinutes: 45 },
      { name: "Consultation", durationMinutes: 20 },
    ],
  },
  {
    value: "personal_trainer",
    label: "Personal Trainer",
    defaultHours: weekdaysOnly("07:00", "21:00"),
    defaultServices: [
      { name: "PT session", durationMinutes: 60 },
      { name: "Group class", durationMinutes: 45 },
      { name: "Assessment", durationMinutes: 30 },
    ],
  },
  {
    value: "photographer",
    label: "Photographer",
    defaultHours: noDefaultHours(),
    defaultServices: [
      { name: "Portrait", durationMinutes: 90 },
      { name: "Event (full day)", durationMinutes: 480 },
      { name: "Editing session", durationMinutes: 120 },
    ],
  },
  {
    value: "lawyer_consultant",
    label: "Lawyer / Consultant",
    defaultHours: weekdaysOnly("10:00", "19:00"),
    defaultServices: [
      { name: "Initial consult", durationMinutes: 30 },
      { name: "Full session", durationMinutes: 60 },
      { name: "Document review", durationMinutes: 45 },
    ],
  },
  {
    value: "importer_wholesaler",
    label: "Importer / Wholesaler",
    defaultHours: weekdaysOnly("09:00", "18:00"),
    defaultServices: [{ name: "Warehouse visit", durationMinutes: 60 }],
  },
  {
    value: "personal_use",
    label: "Personal Use",
    defaultHours: noDefaultHours(),
    defaultServices: [],
  },
];

export function getBusinessTypeConfig(value: BusinessType): BusinessTypeConfig {
  const config = BUSINESS_TYPES.find((t) => t.value === value);
  if (!config) {
    throw new Error(`Unknown business type: ${value}`);
  }
  return config;
}
