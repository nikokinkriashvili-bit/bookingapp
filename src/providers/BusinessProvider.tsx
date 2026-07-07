import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { supabase } from "@/lib/supabase";
import type { BusinessType, WorkingHours } from "@/lib/businessTypes";
import { useAuth } from "@/providers/AuthProvider";

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  business_type: BusinessType;
  working_hours: WorkingHours;
  whatsapp_number: string | null;
  created_at: string;
};

type BusinessContextValue = {
  business: Business | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
};

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

export function BusinessProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBusiness = useCallback(async () => {
    if (!session) {
      setBusiness(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch business:", error.message);
      setBusiness(null);
    } else {
      setBusiness(data as Business | null);
    }
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  return (
    <BusinessContext.Provider
      value={{ business, isLoading, refetch: fetchBusiness }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider");
  return ctx;
}
