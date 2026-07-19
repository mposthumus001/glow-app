/**
 * Bounded repair: soft-delete failed upload-attempt Moments for one baby.
 * Default is dry-run. Pass --apply to write changes.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const OWNER_ID = "70ac6d56-233c-4ba8-b132-ff809390b78a";
const BABY_ID = "9efe05bc-95ca-47b8-b129-1de3eaaeecdc";
const KEEP_MOMENT_ID = "005037ba-6f28-4790-aae3-df2516bdeb73";

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

const { data: links } = await admin
  .from("moment_children")
  .select("moment_id")
  .eq("baby_id", BABY_ID);

const momentIds = (links ?? []).map((row) => row.moment_id);

const { data: moments } = await admin
  .from("moments")
  .select("id, created_at, deleted_at")
  .in("id", momentIds)
  .eq("owner_parent_id", OWNER_ID)
  .is("deleted_at", null);

const { data: media } = await admin
  .from("moment_media")
  .select("id, moment_id, processing_status, created_at")
  .in("moment_id", momentIds)
  .eq("owner_parent_id", OWNER_ID)
  .is("deleted_at", null);

const mediaByMoment = new Map();
for (const row of media ?? []) {
  const list = mediaByMoment.get(row.moment_id) ?? [];
  list.push(row);
  mediaByMoment.set(row.moment_id, list);
}

const toSoftDelete = [];
const toKeep = [];

for (const moment of moments ?? []) {
  const rows = mediaByMoment.get(moment.id) ?? [];
  const hasReady = rows.some((row) => row.processing_status === "ready");
  if (moment.id === KEEP_MOMENT_ID || hasReady) {
    toKeep.push({ momentId: moment.id, media: rows.map((r) => ({ id: r.id, processing_status: r.processing_status })) });
    continue;
  }
  if (rows.every((row) => row.processing_status === "failed")) {
    toSoftDelete.push({
      momentId: moment.id,
      created_at: moment.created_at,
      media: rows.map((r) => ({ id: r.id, processing_status: r.processing_status, created_at: r.created_at })),
    });
  }
}

const plan = {
  mode: APPLY ? "apply" : "dry_run",
  ownerId: OWNER_ID,
  babyId: BABY_ID,
  keep: toKeep,
  softDelete: toSoftDelete,
};

if (APPLY && toSoftDelete.length > 0) {
  const now = new Date().toISOString();
  for (const entry of toSoftDelete) {
    await admin
      .from("moment_media")
      .update({ deleted_at: now })
      .eq("owner_parent_id", OWNER_ID)
      .eq("moment_id", entry.momentId)
      .is("deleted_at", null);
    await admin
      .from("moments")
      .update({ deleted_at: now })
      .eq("owner_parent_id", OWNER_ID)
      .eq("id", entry.momentId)
      .is("deleted_at", null);
  }
}

console.log(JSON.stringify({ ok: true, plan }, null, 2));
