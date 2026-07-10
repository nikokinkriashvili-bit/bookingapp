import { Stack } from "expo-router";
import { CalendarFilterProvider } from "@/providers/CalendarFilterProvider";

export default function CalendarLayout() {
  return (
    <CalendarFilterProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </CalendarFilterProvider>
  );
}
