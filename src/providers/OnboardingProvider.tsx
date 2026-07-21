import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from "react";
import type { BusinessType, WorkingHours } from "@/lib/businessTypes";

export type DraftService = {
  name: string;
  durationMinutes: number;
  priceMin: string;
  priceMax: string;
};

type OnboardingContextValue = {
  businessName: string;
  setBusinessName: Dispatch<SetStateAction<string>>;
  businessType: BusinessType | null;
  setBusinessType: Dispatch<SetStateAction<BusinessType | null>>;
  workingHours: WorkingHours | null;
  setWorkingHours: Dispatch<SetStateAction<WorkingHours | null>>;
  services: DraftService[];
  setServices: Dispatch<SetStateAction<DraftService[]>>;
};

const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined
);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null);
  const [services, setServices] = useState<DraftService[]>([]);

  return (
    <OnboardingContext.Provider
      value={{
        businessName,
        setBusinessName,
        businessType,
        setBusinessType,
        workingHours,
        setWorkingHours,
        services,
        setServices,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
