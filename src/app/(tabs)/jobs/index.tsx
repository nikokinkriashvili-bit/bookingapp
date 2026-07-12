import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";
import { sendWhatsAppMessage } from "@/lib/integrations";
import { FieldLabel } from "@/components/FieldLabel";
import { addMinutesToDateTime, parseDateAndTime } from "@/lib/calendarDate";
import { parseDecimalOr, parseIntOr } from "@/lib/number";

type Vehicle = {
  id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  colour: string | null;
  fuel_type: string | null;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
};

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_gel: number | null;
};

type StaffOption = { id: string; name: string };

export default function NewJob() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { business } = useBusiness();
  const { date: dateParam, plate: plateParam } = useLocalSearchParams<{
    date?: string;
    plate?: string;
  }>();

  const [plate, setPlate] = useState(plateParam?.toUpperCase() ?? "");
  const [lookingUp, setLookingUp] = useState(false);
  const [hasLookedUp, setHasLookedUp] = useState(false);
  const [foundVehicle, setFoundVehicle] = useState<Vehicle | null>(null);
  const [linkedCustomers, setLinkedCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | "new" | null>(
    null
  );

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [colour, setColour] = useState("");
  const [fuelType, setFuelType] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [assignedStaffId, setAssignedStaffId] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState(dateParam ?? "");
  const [fromTime, setFromTime] = useState("");
  const [toDate, setToDate] = useState(dateParam ?? "");
  const [toTime, setToTime] = useState("");
  const [toManuallyEdited, setToManuallyEdited] = useState(false);

  const [price, setPrice] = useState("");
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!business) return;
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_gel")
      .eq("business_id", business.id)
      .then(({ data }) => setServices(data ?? []));
    supabase
      .from("staff")
      .select("id, name")
      .eq("business_id", business.id)
      .order("name")
      .then(({ data }) => setStaff(data ?? []));
  }, [business]);

  useEffect(() => {
    if (!business) return;
    const trimmed = plate.trim().toUpperCase();
    if (!trimmed) {
      setHasLookedUp(false);
      setFoundVehicle(null);
      setLinkedCustomers([]);
      setSelectedCustomerId(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setLookingUp(true);
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model, year, colour, fuel_type")
        .eq("business_id", business.id)
        .eq("plate_number", trimmed)
        .maybeSingle();

      if (vehicle) {
        setFoundVehicle(vehicle);
        const { data: links } = await supabase
          .from("customer_vehicles")
          .select("customers(id, name, phone, email)")
          .eq("vehicle_id", vehicle.id);
        const customers = (links ?? [])
          .map((l: any) => l.customers)
          .filter(Boolean) as Customer[];
        setLinkedCustomers(customers);
        setSelectedCustomerId(customers.length === 1 ? customers[0].id : null);
      } else {
        setFoundVehicle(null);
        setLinkedCustomers([]);
        setSelectedCustomerId("new");
      }
      setHasLookedUp(true);
      setLookingUp(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [plate, business]);

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalMinutes = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price_gel ?? 0), 0);

  useEffect(() => {
    if (toManuallyEdited || !fromDate || !fromTime) return;
    const suggested = addMinutesToDateTime(fromDate, fromTime, Math.max(totalMinutes, 60));
    if (suggested) {
      setToDate(suggested.date);
      setToTime(suggested.time);
    }
  }, [fromDate, fromTime, totalMinutes, toManuallyEdited]);

  const onToDateChange = (v: string) => {
    setToManuallyEdited(true);
    setToDate(v);
  };

  const onToTimeChange = (v: string) => {
    setToManuallyEdited(true);
    setToTime(v);
  };

  useEffect(() => {
    if (priceManuallyEdited) return;
    setPrice(totalPrice ? String(totalPrice) : "");
  }, [totalPrice, priceManuallyEdited]);

  const onPriceChange = (v: string) => {
    setPriceManuallyEdited(true);
    setPrice(v);
  };

  const onSubmit = async () => {
    if (!business) return;
    setError(null);

    const trimmedPlate = plate.trim().toUpperCase();
    if (!trimmedPlate) {
      setError(t("job.errorPlate"));
      return;
    }
    if (selectedServiceIds.length === 0) {
      setError(t("job.errorService"));
      return;
    }
    if (!fromDate || !fromTime || !toDate || !toTime) {
      setError(t("job.errorFromTo"));
      return;
    }
    const scheduledSlot = parseDateAndTime(fromDate, fromTime);
    const scheduledEnd = parseDateAndTime(toDate, toTime);
    if (isNaN(scheduledSlot.getTime()) || isNaN(scheduledEnd.getTime())) {
      setError(t("job.errorDateFormat"));
      return;
    }
    if (scheduledEnd <= scheduledSlot) {
      setError(t("job.errorEndAfterStart"));
      return;
    }
    if (selectedCustomerId === "new" && (!customerName.trim() || !customerPhone.trim())) {
      setError(t("job.errorCustomerDetails"));
      return;
    }
    if (!selectedCustomerId) {
      setError(t("job.errorSelectCustomer"));
      return;
    }

    setSubmitting(true);

    let vehicleId = foundVehicle?.id;
    if (!vehicleId) {
      const { data: vehicle, error: vehicleError } = await supabase
        .from("vehicles")
        .insert({
          business_id: business.id,
          plate_number: trimmedPlate,
          make: make.trim() || null,
          model: model.trim() || null,
          year: year.trim() ? parseIntOr(year, 0) || null : null,
          colour: colour.trim() || null,
          fuel_type: fuelType.trim() || null,
        })
        .select()
        .single();
      if (vehicleError || !vehicle) {
        setSubmitting(false);
        setError(vehicleError?.message ?? "Failed to save vehicle.");
        return;
      }
      vehicleId = vehicle.id;
    }

    let customerId: string;
    let needsLink = false;
    if (selectedCustomerId === "new") {
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          business_id: business.id,
          name: customerName.trim(),
          phone: customerPhone.trim(),
        })
        .select()
        .single();
      if (customerError || !customer) {
        setSubmitting(false);
        setError(customerError?.message ?? "Failed to save customer.");
        return;
      }
      customerId = customer.id;
      needsLink = true;
    } else {
      customerId = selectedCustomerId;
      needsLink = !linkedCustomers.some((c) => c.id === customerId);
    }

    if (needsLink) {
      const { error: linkError } = await supabase
        .from("customer_vehicles")
        .insert({ customer_id: customerId, vehicle_id: vehicleId });
      if (linkError) {
        setSubmitting(false);
        setError(linkError.message);
        return;
      }
    }

    const { data: createdJob, error: jobError } = await supabase
      .from("jobs")
      .insert({
        business_id: business.id,
        vehicle_id: vehicleId,
        customer_id: customerId,
        service_ids: selectedServiceIds,
        status: "booked",
        scheduled_slot: scheduledSlot.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        price_total: parseDecimalOr(price, 0),
        assigned_staff_id: assignedStaffId,
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (jobError) {
      setError(jobError.message);
      return;
    }

    if (createdJob) {
      // TODO(TRD §5.5): booking-confirmed WhatsApp fires here once step 9 lands.
      await sendWhatsAppMessage("booking_confirmed", createdJob.id);
    }

    router.replace("/");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("job.newOrderTitle")}</Text>

      <TextInput
        style={styles.plateInput}
        placeholder={t("job.platePlaceholder")}
        autoCapitalize="characters"
        value={plate}
        onChangeText={(v) => setPlate(v.toUpperCase())}
      />
      {lookingUp ? <ActivityIndicator /> : null}

      {hasLookedUp && foundVehicle ? (
        <View style={styles.section}>
          <Text style={styles.foundText}>
            {t("job.found")} {foundVehicle.make} {foundVehicle.model}
          </Text>
          <Text style={styles.sectionLabel}>{t("job.customer")}</Text>
          {linkedCustomers.map((c) => (
            <Pressable
              key={c.id}
              style={[
                styles.option,
                selectedCustomerId === c.id && styles.optionSelected,
              ]}
              onPress={() => setSelectedCustomerId(c.id)}
            >
              <Text
                style={
                  selectedCustomerId === c.id
                    ? styles.optionTextSelected
                    : styles.optionText
                }
              >
                {c.name} ({c.phone})
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[
              styles.option,
              selectedCustomerId === "new" && styles.optionSelected,
            ]}
            onPress={() => setSelectedCustomerId("new")}
          >
            <Text
              style={
                selectedCustomerId === "new"
                  ? styles.optionTextSelected
                  : styles.optionText
              }
            >
              {t("job.addNewCustomer")}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {hasLookedUp && !foundVehicle ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("job.vehicleDetails")}</Text>
          <FieldLabel>{t("vehicle.make")}</FieldLabel>
          <TextInput style={styles.input} value={make} onChangeText={setMake} />
          <FieldLabel>{t("vehicle.model")}</FieldLabel>
          <TextInput style={styles.input} value={model} onChangeText={setModel} />
          <FieldLabel>{t("vehicle.year")}</FieldLabel>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={year}
            onChangeText={setYear}
          />
          <FieldLabel>{t("vehicle.colour")}</FieldLabel>
          <TextInput style={styles.input} value={colour} onChangeText={setColour} />
          <FieldLabel>{t("vehicle.fuelType")}</FieldLabel>
          <TextInput
            style={styles.input}
            value={fuelType}
            onChangeText={setFuelType}
          />
        </View>
      ) : null}

      {hasLookedUp && selectedCustomerId === "new" ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("job.customerDetails")}</Text>
          <FieldLabel>{t("customer.name")}</FieldLabel>
          <TextInput
            style={styles.input}
            value={customerName}
            onChangeText={setCustomerName}
          />
          <FieldLabel>{t("customer.phone")}</FieldLabel>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            value={customerPhone}
            onChangeText={setCustomerPhone}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("job.services")}</Text>
        {services.map((s) => (
          <Pressable
            key={s.id}
            style={[
              styles.option,
              selectedServiceIds.includes(s.id) && styles.optionSelected,
            ]}
            onPress={() => toggleService(s.id)}
          >
            <Text
              style={
                selectedServiceIds.includes(s.id)
                  ? styles.optionTextSelected
                  : styles.optionText
              }
            >
              {s.name} · {s.duration_minutes}{t("common.minShort")}
              {s.price_gel ? ` · ${s.price_gel} ₾` : ""}
            </Text>
          </Pressable>
        ))}
        {selectedServiceIds.length > 0 ? (
          <Text style={styles.totalText}>
            {t("common.duration")}: {totalMinutes}{t("common.minShort")}
          </Text>
        ) : null}
      </View>

      {staff.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("job.assignee")}</Text>
          <Pressable
            style={[styles.option, assignedStaffId === null && styles.optionSelected]}
            onPress={() => setAssignedStaffId(null)}
          >
            <Text
              style={
                assignedStaffId === null ? styles.optionTextSelected : styles.optionText
              }
            >
              {t("job.unassigned")}
            </Text>
          </Pressable>
          {staff.map((member) => (
            <Pressable
              key={member.id}
              style={[
                styles.option,
                assignedStaffId === member.id && styles.optionSelected,
              ]}
              onPress={() => setAssignedStaffId(member.id)}
            >
              <Text
                style={
                  assignedStaffId === member.id
                    ? styles.optionTextSelected
                    : styles.optionText
                }
              >
                {member.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("job.priceGel")}</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          keyboardType="numeric"
          value={price}
          onChangeText={onPriceChange}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("job.schedule")}</Text>
        <Text style={styles.subLabel}>{t("job.from")}</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={fromDate}
          onChangeText={setFromDate}
        />
        <TextInput
          style={styles.input}
          placeholder="HH:MM"
          value={fromTime}
          onChangeText={setFromTime}
        />
        <Text style={styles.subLabel}>{t("job.to")}</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={toDate}
          onChangeText={onToDateChange}
        />
        <TextInput
          style={styles.input}
          placeholder="HH:MM"
          value={toTime}
          onChangeText={onToTimeChange}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t("job.createOrder")}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  plateInput: {
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 16,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 2,
  },
  section: {
    gap: 8,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  foundText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    marginTop: 6,
  },
  input: {
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  optionText: {
    color: colors.ink,
    fontSize: 15,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  totalText: {
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: 4,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: colors.danger,
  },
});
}
