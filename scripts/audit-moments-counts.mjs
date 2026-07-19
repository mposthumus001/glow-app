/**
 * Privacy-safe Moments data audit for current owner/baby.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[line.slice(0, i).trim()] = value;
  }
  return env;
}

const env = loadEnvLocal();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Find owner with recent moment_media activity
const { data: recentMedia } = await admin
  .from("moment_media")
  .select("owner_parent_id, moment_id, id, processing_status, created_at")
  .is("deleted_at", null)
  .order("created_at", { ascending: false })
  .limit(20);

const ownerId = recentMedia?.[0]?.owner_parent_id;
if (!ownerId) {
  console.log(JSON.stringify({ ok: false, error: "no_media" }));
  process.exit(0);
}

const { data: childLinks } = await admin
  .from("moment_children")
  .select("baby_id, moment_id")
  .in("moment_id", [...new Set((recentMedia ?? []).map((r) => r.moment_id))]);

const babyCounts = new Map();
for (const link of childLinks ?? []) {
  babyCounts.set(link.baby_id, (babyCounts.get(link.baby_id) ?? 0) + 1);
}
const babyId = [...babyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

const { data: links } = await admin
  .from("moment_children")
  .select("moment_id")
  .eq("baby_id", babyId);

const linkedMomentIds = (links ?? []).map((l) => l.moment_id);

const { data: activeMoments } = await admin
  .from("moments")
  .select("id, created_at, deleted_at")
  .in("id", linkedMomentIds)
  .eq("owner_parent_id", ownerId);

const activeMomentIds = (activeMoments ?? [])
  .filter((m) => !m.deleted_at)
  .map((m) => m.id);

const { data: deletedMoments } = await admin
  .from("moments")
  .select("id, created_at, deleted_at")
  .in("id", linkedMomentIds)
  .eq("owner_parent_id", ownerId)
  .not("deleted_at", "is", null);

const { data: activeMedia } = await admin
  .from("moment_media")
  .select("id, moment_id, processing_status, processing_error_code, created_at, deleted_at")
  .in("moment_id", activeMomentIds)
  .eq("owner_parent_id", ownerId)
  .is("deleted_at", null);

const { data: deletedMedia } = await admin
  .from("moment_media")
  .select("id, moment_id, processing_status, created_at, deleted_at")
  .in("moment_id", linkedMomentIds)
  .eq("owner_parent_id", ownerId)
  .not("deleted_at", "is", null);

const statusCounts = { pending: 0, processing: 0, ready: 0, failed: 0, other: 0 };
for (const row of activeMedia ?? []) {
  const s = row.processing_status;
  if (s in statusCounts) statusCounts[s]++;
  else statusCounts.other++;
}

const mediaByMoment = new Map();
for (const row of activeMedia ?? []) {
  const list = mediaByMoment.get(row.moment_id) ?? [];
  list.push({
    id: row.id,
    processing_status: row.processing_status,
    processing_error_code: row.processing_error_code,
    created_at: row.created_at,
  });
  mediaByMoment.set(row.moment_id, list);
}

const momentsWithMultipleMedia = [...mediaByMoment.entries()]
  .filter(([, media]) => media.length > 1)
  .map(([momentId, media]) => ({ momentId, mediaCount: media.length, media }));

const readyMoments = activeMomentIds.filter((momentId) =>
  (mediaByMoment.get(momentId) ?? []).some((m) => m.processing_status === "ready"),
);

console.log(
  JSON.stringify(
    {
      ok: true,
      ownerId,
      babyId,
      activeMomentCount: activeMomentIds.length,
      activeMediaCount: activeMedia?.length ?? 0,
      statusCounts,
      softDeletedMomentCount: deletedMoments?.length ?? 0,
      softDeletedMediaCount: deletedMedia?.length ?? 0,
      readyMomentCount: readyMoments.length,
      momentsWithMultipleMedia,
      activeMoments: (activeMoments ?? [])
        .filter((m) => !m.deleted_at)
        .map((m) => ({
          id: m.id,
          created_at: m.created_at,
          media: mediaByMoment.get(m.id) ?? [],
        })),
      softDeletedMoments: (deletedMoments ?? []).map((m) => ({
        id: m.id,
        created_at: m.created_at,
        deleted_at: m.deleted_at,
      })),
    },
    null,
    2,
  ),
);
