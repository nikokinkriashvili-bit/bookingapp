import { supabase } from "@/lib/supabase";

// Vehicle condition check-in (roadmap 4.1b) -- one row per job, upserted on
// job_id so both intake (create) and the edit screen (update) use the same
// call without needing to know whether a row already exists.

export type JobCondition = {
  bodyDamage: boolean;
  glassDamage: boolean;
  wheelsDamage: boolean;
  interiorDamage: boolean;
  note: string;
};

export const EMPTY_JOB_CONDITION: JobCondition = {
  bodyDamage: false,
  glassDamage: false,
  wheelsDamage: false,
  interiorDamage: false,
  note: "",
};

export async function getJobCondition(
  jobId: string
): Promise<{ condition: JobCondition | null; error: string | null }> {
  const { data, error } = await supabase
    .from("job_conditions")
    .select("body_damage, glass_damage, wheels_damage, interior_damage, note")
    .eq("job_id", jobId)
    .maybeSingle();
  if (error) return { condition: null, error: error.message };
  if (!data) return { condition: null, error: null };
  return {
    condition: {
      bodyDamage: data.body_damage,
      glassDamage: data.glass_damage,
      wheelsDamage: data.wheels_damage,
      interiorDamage: data.interior_damage,
      note: data.note ?? "",
    },
    error: null,
  };
}

export async function saveJobCondition(
  businessId: string,
  jobId: string,
  condition: JobCondition
): Promise<string | null> {
  const { error } = await supabase.from("job_conditions").upsert(
    {
      business_id: businessId,
      job_id: jobId,
      body_damage: condition.bodyDamage,
      glass_damage: condition.glassDamage,
      wheels_damage: condition.wheelsDamage,
      interior_damage: condition.interiorDamage,
      note: condition.note.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "job_id" }
  );
  return error?.message ?? null;
}
