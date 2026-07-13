import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";

// Photo capture + before/after gallery (roadmap 4.1). Every storage/upload
// call is isolated to this one file -- the documented R2 migration seam
// (audits/cost-scaling.md): swapping the backend later means changing the
// upload/signed-URL functions here, not every screen that shows a photo.

export type PhotoKind = "before" | "after" | "other";

export type VehiclePhoto = {
  id: string;
  storage_path: string;
  kind: PhotoKind;
  created_at: string;
};

const BUCKET = "vehicle-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour -- generous for a single screen visit
const MAX_DIMENSION = 1600; // px, long edge
const JPEG_QUALITY = 0.7; // targets the cost-scaling audit's ~300KB/photo budget

// Resizes and compresses client-side BEFORE upload. Uncompressed phone
// photos run 2-4MB each -- at that size, Supabase Storage's free-tier 1GB
// cap is a few hundred photos, i.e. weeks for an active shop. Resizing the
// long edge to 1600px and re-encoding at 0.7 quality keeps most photos in
// the 100-300KB range regardless of the source camera's resolution.
async function compressForUpload(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  const rendered = await context.resize({ width: MAX_DIMENSION }).renderAsync();
  const saved = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return saved.uri;
}

async function pickAndCompress(source: "camera" | "library"): Promise<string | null> {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  if (result.canceled || !result.assets[0]) return null;

  return compressForUpload(result.assets[0].uri);
}

// Full capture flow for one photo: permission -> pick -> compress -> upload
// -> DB row. Returns { error: null } on a user cancel or denied permission
// (not a failure worth surfacing as an error banner) as well as on success;
// only a real upload/DB failure returns a message.
export async function captureVehiclePhoto(opts: {
  source: "camera" | "library";
  businessId: string;
  vehicleId: string;
  jobId?: string | null;
  kind: PhotoKind;
}): Promise<{ error: string | null }> {
  const localUri = await pickAndCompress(opts.source);
  if (!localUri) return { error: null };

  const storagePath = `${opts.businessId}/${opts.vehicleId}/${Date.now()}.jpg`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, { contentType: "image/jpeg" });
  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("vehicle_photos").insert({
    business_id: opts.businessId,
    vehicle_id: opts.vehicleId,
    job_id: opts.jobId ?? null,
    storage_path: storagePath,
    kind: opts.kind,
  });
  if (insertError) {
    // Don't leave an orphaned file in storage if the DB row failed.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { error: insertError.message };
  }

  return { error: null };
}

// The bucket is private -- photos are only ever read via short-lived signed
// URLs, never a public path.
export async function listVehiclePhotos(
  vehicleId: string
): Promise<{ photos: (VehiclePhoto & { url: string | null })[]; error: string | null }> {
  const { data, error } = await supabase
    .from("vehicle_photos")
    .select("id, storage_path, kind, created_at")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });
  if (error) return { photos: [], error: error.message };

  const rows = (data ?? []) as VehiclePhoto[];
  const withUrls = await Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
      return { ...row, url: signed?.signedUrl ?? null };
    })
  );
  return { photos: withUrls, error: null };
}

export async function deleteVehiclePhoto(
  photoId: string,
  storagePath: string
): Promise<string | null> {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (storageError) return storageError.message;
  const { error: dbError } = await supabase.from("vehicle_photos").delete().eq("id", photoId);
  return dbError?.message ?? null;
}
