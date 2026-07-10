import { createContext, useContext, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { lightColors, darkColors, type ThemeColors } from "@/lib/theme";

const ThemeContext = createContext<ThemeColors>(lightColors);

// Follows the phone's system light/dark setting — no in-app toggle for MVP,
// per BookingApp_UXUI_Guidance_v1.md §3 ("system-follow is simpler, standard").
export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? darkColors : lightColors;
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}

export function useThemeColors(): ThemeColors {
  return useContext(ThemeContext);
}

export type { ThemeColors };
