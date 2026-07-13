import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";
import { PlateChip } from "@/components/PlateChip";
import { FieldLabel } from "@/components/FieldLabel";
import { FetchError } from "@/components/FetchError";
import { formatGel, type StringKey } from "@/lib/i18n";
import { toDateKey } from "@/lib/calendarDate";
import { statusTone, type JobStatus } from "@/lib/jobStatus";
import { confirmAsync } from "@/lib/confirm";
import {
  captureVehiclePhoto,
  deleteVehiclePhoto,
  listVehiclePhotos,
  type PhotoKind,
  type VehiclePhoto,
} from "@/lib/vehiclePhotos";

type Vehicle = {
  id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  colour: string | null;
  fuel_type: string | null;
};

type Owner = { id: string; name: string; phone: string };

type Job = {
  id: string;
  status: JobStatus;
  service_ids: string[];
  scheduled_slot: string;
  price_total: number | null;
};

export default function VehicleProfile() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { business } = useBusiness();
  const t = useT();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [serviceNames, setServiceNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const [photos, setPhotos] = useState<(VehiclePhoto & { url: string | null })[]>([]);
  const [photosError, setPhotosError] = useState(false);
  const [addingKind, setAddingKind] = useState<PhotoKind | null>(null);
  const [busyKind, setBusyKind] = useState<PhotoKind | null>(null);
  const [photoActionError, setPhotoActionError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [colour, setColour] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !business) return;
    const [vehicleResult, ownersResult, jobsResult, servicesResult] =
      await Promise.all([
        supabase
          .from("vehicles")
          .select("id, plate_number, make, model, year, colour, fuel_type")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("customer_vehicles")
          .select("customers(id, name, phone)")
          .eq("vehicle_id", id),
        supabase
          .from("jobs")
          .select("id, status, service_ids, scheduled_slot, price_total")
          .eq("vehicle_id", id)
          .order("scheduled_slot", { ascending: false }),
        supabase.from("services").select("id, name").eq("business_id", business.id),
      ]);

    setVehicle(vehicleResult.data ?? null);
    setOwners(
      ((ownersResult.data ?? []) as any[])
        .map((row) => row.customers)
        .filter(Boolean)
    );
    setJobs((jobsResult.data ?? []) as Job[]);
    setServiceNames(new Map((servicesResult.data ?? []).map((s) => [s.id, s.name])));
    setLoading(false);
  }, [id, business]);

  useEffect(() => {
    load();
  }, [load]);

  const loadPhotos = useCallback(async () => {
    if (!id) return;
    setPhotosError(false);
    const { photos: rows, error: fetchError } = await listVehiclePhotos(id);
    if (fetchError) {
      setPhotosError(true);
      return;
    }
    setPhotos(rows);
  }, [id]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const onPickSource = async (source: "camera" | "library") => {
    if (!business || !id || !addingKind) return;
    const kind = addingKind;
    setAddingKind(null);
    setPhotoActionError(null);
    setBusyKind(kind);
    const { error: captureError } = await captureVehiclePhoto({
      source,
      businessId: business.id,
      vehicleId: id,
      kind,
    });
    setBusyKind(null);
    if (captureError) {
      setPhotoActionError(captureError);
      return;
    }
    loadPhotos();
  };

  const onDeletePhoto = async (photo: VehiclePhoto) => {
    const ok = await confirmAsync(
      t("vehicle.deletePhotoConfirm"),
      t("common.remove"),
      t("common.cancel")
    );
    if (!ok) return;
    setPhotoActionError(null);
    const deleteError = await deleteVehiclePhoto(photo.id, photo.storage_path);
    if (deleteError) {
      setPhotoActionError(deleteError);
      return;
    }
    loadPhotos();
  };

  const startEditing = () => {
    if (!vehicle) return;
    setMake(vehicle.make ?? "");
    setModel(vehicle.model ?? "");
    setYear(vehicle.year ? String(vehicle.year) : "");
    setColour(vehicle.colour ?? "");
    setFuelType(vehicle.fuel_type ?? "");
    setError(null);
    setEditing(true);
  };

  const onSave = async () => {
    if (!vehicle) return;
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("vehicles")
      .update({
        make: make.trim() || null,
        model: model.trim() || null,
        year: year.trim() ? Number(year) : null,
        colour: colour.trim() || null,
        fuel_type: fuelType.trim() || null,
      })
      .eq("id", vehicle.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setEditing(false);
    load();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={styles.centered}>
        <Text>{t("common.notFound")}</Text>
      </View>
    );
  }

  const finishedJobs = jobs.filter((j) => j.status === "complete" || j.status === "paid");
  const totalSpend = jobs
    .filter((j) => j.status === "paid")
    .reduce((sum, j) => sum + (j.price_total ?? 0), 0);

  const detailRows: { label: StringKey; value: string }[] = [
    { label: "vehicle.make", value: vehicle.make ?? "—" },
    { label: "vehicle.model", value: vehicle.model ?? "—" },
    { label: "vehicle.year", value: vehicle.year ? String(vehicle.year) : "—" },
    { label: "vehicle.colour", value: vehicle.colour ?? "—" },
    { label: "vehicle.fuelType", value: vehicle.fuel_type ?? "—" },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.plateWrap}>
        <PlateChip plate={vehicle.plate_number} size="large" />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{finishedJobs.length}</Text>
          <Text style={styles.statLabel}>{t("common.visits")}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatGel(totalSpend)}</Text>
          <Text style={styles.statLabel}>{t("common.totalSpend")}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{t("vehicle.details")}</Text>
          {!editing ? (
            <Pressable onPress={startEditing}>
              <Text style={styles.editLink}>{t("common.edit")}</Text>
            </Pressable>
          ) : null}
        </View>

        {editing ? (
          <View style={styles.editForm}>
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
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.editActions}>
              <Pressable style={styles.secondaryButton} onPress={() => setEditing(false)}>
                <Text style={styles.secondaryButtonText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={onSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{t("common.save")}</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          detailRows.map((row) => (
            <View key={row.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t(row.label)}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))
        )}
      </View>

      {owners.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("vehicle.owners")}</Text>
          {owners.map((owner) => (
            <Link key={owner.id} href={`/customers/${owner.id}`} asChild>
              <Pressable style={styles.linkRow}>
                <Text style={styles.linkRowText}>{owner.name}</Text>
                <Text style={styles.linkRowDetail}>{owner.phone}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("vehicle.photos")}</Text>
        {photosError ? (
          <FetchError onRetry={loadPhotos} />
        ) : (
          <>
            {(["before", "after"] as const).map((kind) => {
              const kindPhotos = photos.filter((p) => p.kind === kind);
              return (
                <View key={kind} style={styles.photoGroup}>
                  <Text style={styles.photoGroupLabel}>
                    {t(kind === "before" ? "vehicle.photosBefore" : "vehicle.photosAfter")}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.photoRow}>
                      {kindPhotos.map((photo) => (
                        <Pressable
                          key={photo.id}
                          style={styles.photoThumbWrap}
                          onLongPress={() => onDeletePhoto(photo)}
                        >
                          {photo.url ? (
                            <Image
                              source={{ uri: photo.url }}
                              style={styles.photoThumb}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={[styles.photoThumb, styles.photoThumbFallback]} />
                          )}
                        </Pressable>
                      ))}
                      <Pressable
                        style={styles.photoAddThumb}
                        disabled={busyKind !== null}
                        onPress={() => setAddingKind(kind)}
                      >
                        {busyKind === kind ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Text style={styles.photoAddThumbText}>
                            {t(kind === "before" ? "vehicle.addBeforePhoto" : "vehicle.addAfterPhoto")}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </ScrollView>
                </View>
              );
            })}
            {photos.length === 0 ? (
              <Text style={styles.empty}>{t("vehicle.noPhotos")}</Text>
            ) : null}
            {photoActionError ? <Text style={styles.error}>{photoActionError}</Text> : null}
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("vehicle.serviceHistory")}</Text>
        {jobs.length === 0 ? (
          <Text style={styles.empty}>{t("vehicle.noHistory")}</Text>
        ) : (
          jobs.map((job) => (
            <Pressable
              key={job.id}
              style={[styles.jobCard, { borderLeftColor: statusTone(colors, job.status).border }]}
              onPress={() => router.push(`/jobs/${job.id}/edit`)}
            >
              <View style={styles.jobCardTop}>
                <Text style={styles.jobDate}>{toDateKey(new Date(job.scheduled_slot))}</Text>
                <Text style={styles.jobPrice}>
                  {job.price_total != null ? formatGel(job.price_total) : ""}
                </Text>
              </View>
              <Text style={styles.jobServices}>
                {job.service_ids
                  .map((sid) => serviceNames.get(sid))
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </Text>
              <Text style={[styles.jobStatus, { color: statusTone(colors, job.status).border }]}>
                {t(`status.${job.status}` as StringKey)}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      <Link
        href={`/jobs?plate=${encodeURIComponent(vehicle.plate_number)}`}
        style={styles.newOrderButton}
      >
        {t("vehicle.newOrder")}
      </Link>

      <Modal
        visible={addingKind !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAddingKind(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAddingKind(null)}>
          <View style={styles.modalContent}>
            <Pressable style={styles.modalOption} onPress={() => onPickSource("camera")}>
              <Text style={styles.modalOptionText}>{t("vehicle.photoSourceCamera")}</Text>
            </Pressable>
            <Pressable style={styles.modalOption} onPress={() => onPickSource("library")}>
              <Text style={styles.modalOptionText}>{t("vehicle.photoSourceLibrary")}</Text>
            </Pressable>
            <Pressable style={styles.modalOption} onPress={() => setAddingKind(null)}>
              <Text style={[styles.modalOptionText, { color: colors.danger }]}>
                {t("common.cancel")}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    padding: 24,
    gap: 16,
  },
  plateWrap: {
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  statValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  editLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.faintLine,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  detailValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  editForm: {
    gap: 8,
  },
  input: {
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
  },
  linkRowText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
  },
  linkRowDetail: {
    fontSize: 13,
    color: colors.muted,
  },
  jobCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    gap: 4,
  },
  jobCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  jobDate: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  jobPrice: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  jobServices: {
    fontSize: 13,
    color: colors.inkSoft,
  },
  jobStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
  },
  newOrderButton: {
    backgroundColor: colors.primary,
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    padding: 14,
    borderRadius: 8,
    overflow: "hidden",
  },
  photoGroup: {
    gap: 6,
  },
  photoGroupLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  photoRow: {
    flexDirection: "row",
    gap: 8,
  },
  photoThumbWrap: {
    borderRadius: 8,
    overflow: "hidden",
  },
  photoThumb: {
    width: 84,
    height: 84,
    borderRadius: 8,
  },
  photoThumbFallback: {
    backgroundColor: colors.line,
  },
  photoAddThumb: {
    width: 84,
    height: 84,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  photoAddThumbText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 8,
    width: 260,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  modalOptionText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
});
}
