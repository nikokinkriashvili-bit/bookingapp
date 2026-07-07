import { useEffect, useState } from "react";
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
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { addMinutesToDateTime, parseDateAndTime } from "@/lib/calendarDate";

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

export default function NewJob() {
  const { business } = useBusiness();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();

  const [plate, setPlate] = useState("");
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

  const [fromDate, setFromDate] = useState(dateParam ?? "");
  const [fromTime, setFromTime] = useState("");
  const [toDate, setToDate] = useState(dateParam ?? "");
  const [toTime, setToTime] = useState("");
  const [toManuallyEdited, setToManuallyEdited] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!business) return;
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_gel")
      .eq("business_id", business.id)
      .then(({ data }) => setServices(data ?? []));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, fromTime, totalMinutes, toManuallyEdited]);

  const onToDateChange = (v: string) => {
    setToManuallyEdited(true);
    setToDate(v);
  };

  const onToTimeChange = (v: string) => {
    setToManuallyEdited(true);
    setToTime(v);
  };

  const onSubmit = async () => {
    if (!business) return;
    setError(null);

    const trimmedPlate = plate.trim().toUpperCase();
    if (!trimmedPlate) {
      setError("Enter a plate number.");
      return;
    }
    if (selectedServiceIds.length === 0) {
      setError("Select at least one service.");
      return;
    }
    if (!fromDate || !fromTime || !toDate || !toTime) {
      setError("Enter a from and to date/time.");
      return;
    }
    const scheduledSlot = parseDateAndTime(fromDate, fromTime);
    const scheduledEnd = parseDateAndTime(toDate, toTime);
    if (isNaN(scheduledSlot.getTime()) || isNaN(scheduledEnd.getTime())) {
      setError("Date/time format is invalid. Use YYYY-MM-DD and HH:MM.");
      return;
    }
    if (scheduledEnd <= scheduledSlot) {
      setError("The end time must be after the start time.");
      return;
    }
    if (selectedCustomerId === "new" && (!customerName.trim() || !customerPhone.trim())) {
      setError("Enter the customer's name and phone.");
      return;
    }
    if (!selectedCustomerId) {
      setError("Select or add a customer.");
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
          year: year.trim() ? Number(year) : null,
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

    const { error: jobError } = await supabase.from("jobs").insert({
      business_id: business.id,
      vehicle_id: vehicleId,
      customer_id: customerId,
      service_ids: selectedServiceIds,
      status: "booked",
      scheduled_slot: scheduledSlot.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
      price_total: totalPrice,
    });

    setSubmitting(false);

    if (jobError) {
      setError(jobError.message);
      return;
    }

    router.replace("/");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>New order</Text>

      <TextInput
        style={styles.plateInput}
        placeholder="PLATE NUMBER"
        autoCapitalize="characters"
        value={plate}
        onChangeText={(v) => setPlate(v.toUpperCase())}
      />
      {lookingUp ? <ActivityIndicator /> : null}

      {hasLookedUp && foundVehicle ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Found: {foundVehicle.make} {foundVehicle.model}
          </Text>
          <Text style={styles.sectionLabel}>Customer</Text>
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
              + Add new customer
            </Text>
          </Pressable>
        </View>
      ) : null}

      {hasLookedUp && !foundVehicle ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Vehicle details</Text>
          <TextInput style={styles.input} placeholder="Make" value={make} onChangeText={setMake} />
          <TextInput style={styles.input} placeholder="Model" value={model} onChangeText={setModel} />
          <TextInput
            style={styles.input}
            placeholder="Year"
            keyboardType="numeric"
            value={year}
            onChangeText={setYear}
          />
          <TextInput style={styles.input} placeholder="Colour" value={colour} onChangeText={setColour} />
          <TextInput
            style={styles.input}
            placeholder="Fuel type"
            value={fuelType}
            onChangeText={setFuelType}
          />
        </View>
      ) : null}

      {hasLookedUp && selectedCustomerId === "new" ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Customer details</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={customerName}
            onChangeText={setCustomerName}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            keyboardType="phone-pad"
            value={customerPhone}
            onChangeText={setCustomerPhone}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Services</Text>
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
              {s.name} · {s.duration_minutes}min
              {s.price_gel ? ` · ${s.price_gel} GEL` : ""}
            </Text>
          </Pressable>
        ))}
        {selectedServiceIds.length > 0 ? (
          <Text style={styles.totalText}>
            Total: {totalMinutes}min · {totalPrice} GEL
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Schedule</Text>
        <Text style={styles.subLabel}>From</Text>
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
        <Text style={styles.subLabel}>To</Text>
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
          <Text style={styles.buttonText}>Create order</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  plateInput: {
    borderWidth: 1,
    borderColor: "#ccc",
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
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  option: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
  },
  optionSelected: {
    borderColor: "#208AEF",
    backgroundColor: "#e8f2fd",
  },
  optionText: {
    fontSize: 15,
  },
  optionTextSelected: {
    color: "#208AEF",
    fontWeight: "600",
  },
  totalText: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  button: {
    backgroundColor: "#208AEF",
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
    color: "#d33",
  },
});
