import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import type { JobStatus } from "@/lib/jobStatus";

type ServiceOption = { id: string; name: string };
type StaffOption = { id: string; name: string };

type FilterableJob = {
  status: JobStatus;
  service_ids: string[] | null;
  assigned_staff_id?: string | null;
};

type CalendarFilterContextValue = {
  services: ServiceOption[];
  staff: StaffOption[];
  excludedStatuses: Set<JobStatus>;
  excludedServiceIds: Set<string>;
  excludedStaffIds: Set<string>;
  toggleStatus: (status: JobStatus) => void;
  toggleService: (serviceId: string) => void;
  toggleStaff: (staffId: string) => void;
  isJobVisible: (job: FilterableJob) => boolean;
};

const CalendarFilterContext = createContext<CalendarFilterContextValue | undefined>(
  undefined
);

export function CalendarFilterProvider({ children }: PropsWithChildren) {
  const { business } = useBusiness();
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [excludedStatuses, setExcludedStatuses] = useState<Set<JobStatus>>(new Set());
  const [excludedServiceIds, setExcludedServiceIds] = useState<Set<string>>(new Set());
  const [excludedStaffIds, setExcludedStaffIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!business) return;
    supabase
      .from("services")
      .select("id, name")
      .eq("business_id", business.id)
      .then(({ data }) => setServices(data ?? []));
    supabase
      .from("staff")
      .select("id, name")
      .eq("business_id", business.id)
      .order("name")
      .then(({ data }) => setStaff(data ?? []));
  }, [business]);

  const toggleStatus = (status: JobStatus) => {
    setExcludedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const toggleService = (serviceId: string) => {
    setExcludedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const toggleStaff = (staffId: string) => {
    setExcludedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  };

  const isJobVisible = (job: FilterableJob) => {
    if (excludedStatuses.has(job.status)) return false;
    if (excludedServiceIds.size > 0) {
      const ids = job.service_ids ?? [];
      const hasVisibleService = ids.some((id) => !excludedServiceIds.has(id));
      if (!hasVisibleService) return false;
    }
    // Unassigned jobs always show; excluding a staff member hides their jobs.
    if (job.assigned_staff_id && excludedStaffIds.has(job.assigned_staff_id)) {
      return false;
    }
    return true;
  };

  return (
    <CalendarFilterContext.Provider
      value={{
        services,
        staff,
        excludedStatuses,
        excludedServiceIds,
        excludedStaffIds,
        toggleStatus,
        toggleService,
        toggleStaff,
        isJobVisible,
      }}
    >
      {children}
    </CalendarFilterContext.Provider>
  );
}

export function useCalendarFilters() {
  const ctx = useContext(CalendarFilterContext);
  if (!ctx) {
    throw new Error("useCalendarFilters must be used within CalendarFilterProvider");
  }
  return ctx;
}
