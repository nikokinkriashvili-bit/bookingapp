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

export type BusinessRole = "owner" | "staff";

type BusinessContextValue = {
  business: Business | null;
  role: BusinessRole;
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

    // Attach any pending staff invitations matching this user's email before
    // querying — RLS opens up once the staff row carries their user id.
    // Ignore errors so owners on a pre-009 database are unaffected.
    await supabase.rpc("claim_staff_membership").then(
      () => undefined,
      () => undefined
    );

    // RLS returns businesses the user owns or belongs to as staff.
    const { data, error } = await supabase.from("businesses").select("*");

    if (error) {
      console.error("Failed to fetch business:", error.message);
      setBusiness(null);
    } else {
      const businesses = (data ?? []) as Business[];
      // Prefer a business they own if they somehow belong to several.
      const owned = businesses.find((b) => b.owner_id === session.user.id);
      setBusiness(owned ?? businesses[0] ?? null);
    }
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  const role: BusinessRole =
    business && session && business.owner_id === session.user.id
      ? "owner"
      : "staff";

  return (
    <BusinessContext.Provider
      value={{ business, role, isLoading, refetch: fetchBusiness }}
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
