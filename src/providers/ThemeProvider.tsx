import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightColors, darkColors, type ThemeColors } from "@/lib/theme";

export type ThemeMode = "light" | "dark" | "system";

const THEME_MODE_STORAGE_KEY = "app_theme_mode";

type ThemeContextValue = {
  colors: ThemeColors;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  mode: "system",
  setMode: () => {},
});

// Defaults to following the OS setting, but the quick-settings drawer lets
// the user pin light or dark manually — preference persists across sessions.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(THEME_MODE_STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setModeState(stored);
      }
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, next);
  }, []);

  const resolvedScheme = mode === "system" ? scheme : mode;
  const colors = resolvedScheme === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ colors, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}

export function useThemeMode() {
  const { mode, setMode } = useContext(ThemeContext);
  return { mode, setMode };
}

export type { ThemeColors };
