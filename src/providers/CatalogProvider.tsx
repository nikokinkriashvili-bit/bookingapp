import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { supabase } from "@/lib/supabase";
import type { BusinessTypeConfig, WorkingHours } from "@/lib/businessTypes";

type CatalogContextValue = {
  businessTypes: BusinessTypeConfig[];
  isLoading: boolean;
  error: string | null;
};

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

export function CatalogProvider({ children }: PropsWithChildren) {
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [typesResult, servicesResult] = await Promise.all([
        supabase
          .from("business_type_catalog")
          .select("value, label, default_working_hours, sort_order")
          .order("sort_order"),
        supabase
          .from("default_service_templates")
          .select("business_type, name, duration_minutes, sort_order")
          .order("sort_order"),
      ]);

      if (cancelled) return;

      if (typesResult.error || servicesResult.error) {
        setError(
          typesResult.error?.message ??
            servicesResult.error?.message ??
            "Failed to load catalog"
        );
        setIsLoading(false);
        return;
      }

      const configs: BusinessTypeConfig[] = typesResult.data.map((row) => ({
        value: row.value,
        label: row.label,
        defaultHours: row.default_working_hours as WorkingHours,
        defaultServices: servicesResult.data
          .filter((s) => s.business_type === row.value)
          .map((s) => ({ name: s.name, durationMinutes: s.duration_minutes })),
      }));

      setBusinessTypes(configs);
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CatalogContext.Provider value={{ businessTypes, isLoading, error }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
