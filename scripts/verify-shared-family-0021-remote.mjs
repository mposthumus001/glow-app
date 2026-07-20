/**
 * Remote Sprint 9.3 foundation probe for configured non-production Supabase.
 * Complements supabase/ops/shared-family-verify-0021.sql when SQL Editor / DB URL
 * is unavailable from this machine.
 *
 * Uses service role + anon key from .env.local only.
 * Does not mutate data. Does not target production explicitly.
 */
import fs from "fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !service || !anon) {
  console.error("MISSING_ENV");
  process.exit(1);
}

const host = new URL(url).hostname;
const ref = host.split(".")[0];
console.log(`environment_host=${host}`);
console.log(`environment_ref=${ref}`);
console.log("scope=configured .env.local project only (non-production validation target)");

const results = [];

function record(check_name, ok, details, statusOverride) {
  results.push({
    check_name,
    status: statusOverride || (ok ? "PASS" : "FAIL"),
    details,
  });
}

async function rest(key, path, init = {}) {
  const res = await fetch(url + path, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { status: res.status, text, json, headers: res.headers };
}

async function rpc(key, name, body = {}) {
  return rest(key, `/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const openapi = await rest(service, "/rest/v1/");
const paths = openapi.json?.paths || {};

function hasTable(name) {
  return Boolean(paths[`/${name}`]);
}

function hasRpc(name) {
  return Boolean(paths[`/rpc/${name}`]);
}

function rpcParams(name) {
  const schema =
    paths[`/rpc/${name}`]?.post?.requestBody?.content?.["application/json"]
      ?.schema ||
    paths[`/rpc/${name}`]?.post?.parameters?.find((p) => p.name === "args")
      ?.schema;
  return schema?.properties ? Object.keys(schema.properties) : [];
}

function tableColumns(name) {
  // PostgREST OpenAPI often lists columns under definitions/components
  const def =
    openapi.json?.definitions?.[name] ||
    openapi.json?.components?.schemas?.[name];
  return def?.properties ? Object.keys(def.properties) : null;
}

// 1. Tables
for (const t of [
  "shared_families",
  "shared_family_members",
  "shared_family_invites",
  "shared_family_moments",
]) {
  const probe = await rest(service, `/rest/v1/${t}?select=*&limit=1`);
  record(
    `table_${t}`,
    probe.status === 200 && hasTable(t),
    `public.${t} REST reachable HTTP ${probe.status}`,
  );
}

// 2. public.families unchanged / present
{
  const probe = await rest(service, "/rest/v1/families?select=id&limit=1");
  record(
    "public_families_table_unchanged",
    probe.status === 200 && Array.isArray(probe.json),
    "public.families still readable via REST",
  );
}

// 3. zero automatic moment shares
{
  const probe = await rest(service, "/rest/v1/shared_family_moments?select=id", {
    headers: { Prefer: "count=exact", Range: "0-0" },
  });
  const range = probe.headers.get("content-range") || "";
  const total = Number((range.split("/")[1] || "").trim());
  record(
    "zero_automatic_moment_shares",
    probe.status === 200 && total === 0,
    `shared_family_moments count=${Number.isFinite(total) ? total : "unknown"} (${range})`,
  );
}

// 4. Invite token column surface (hashed only)
{
  const cols = tableColumns("shared_family_invites");
  if (cols) {
    const tokenCols = cols.filter((c) => c.toLowerCase().includes("token"));
    record(
      "no_raw_invite_token_column",
      tokenCols.length === 1 && tokenCols[0] === "invite_token_hash",
      `token-related columns: ${tokenCols.join(", ") || "(none)"}`,
    );
  } else {
    // Fallback: select * and inspect keys if empty row, or select known bad column
    const bad = await rest(
      service,
      "/rest/v1/shared_family_invites?select=invite_token&limit=1",
    );
    const good = await rest(
      service,
      "/rest/v1/shared_family_invites?select=invite_token_hash&limit=1",
    );
    record(
      "no_raw_invite_token_column",
      bad.status >= 400 && good.status === 200,
      `invite_token select HTTP ${bad.status}; invite_token_hash select HTTP ${good.status}`,
    );
  }
}

// 5. Core RPCs exist
const requiredRpcs = [
  "create_shared_family",
  "create_shared_family_invite",
  "accept_shared_family_invite",
  "revoke_shared_family_invite",
  "remove_shared_family_member",
  "leave_shared_family",
  "share_private_moment",
  "unshare_private_moment",
  "archive_shared_family",
  "rename_shared_family",
  "shared_family_can_access_moment_media",
];
for (const fn of requiredRpcs) {
  record(`rpc_${fn}`, hasRpc(fn), hasRpc(fn) ? `RPC ${fn} in OpenAPI` : `missing ${fn}`);
}

// 6. Owner membership atomicity signal — create_shared_family exists and returns auth gate (not missing)
{
  const r = await rpc(service, "create_shared_family", { p_name: "probe" });
  const ok =
    r.status === 200 &&
    r.json &&
    r.json.ok === false &&
    r.json.error === "not_authenticated";
  record(
    "rpc_create_shared_family_callable",
    ok,
    `create_shared_family => HTTP ${r.status} ${JSON.stringify(r.json).slice(0, 120)}`,
  );
}

// 7. anon execute revoked on protected RPCs
const anonDenied = [
  ["create_shared_family", { p_name: "x" }],
  ["accept_shared_family_invite", { p_raw_token: "abc" }],
  ["share_private_moment", {
    p_moment_id: "00000000-0000-0000-0000-000000000000",
    p_shared_family_id: "00000000-0000-0000-0000-000000000000",
  }],
  ["archive_shared_family", {
    p_shared_family_id: "00000000-0000-0000-0000-000000000000",
  }],
  ["create_shared_family_invite", {
    p_shared_family_id: "00000000-0000-0000-0000-000000000000",
    p_email: "a@b.com",
  }],
];
for (const [fn, body] of anonDenied) {
  const r = await rpc(anon, fn, body);
  const denied =
    r.status === 401 ||
    r.status === 403 ||
    (r.json && String(r.json.message || "").includes("permission denied"));
  record(`deny_anon_${fn}`, denied, `anon.${fn} => HTTP ${r.status}`);
}

// 8. Hash helper exists (token hashing)
record(
  "rpc_shared_family_hash_invite_token",
  hasRpc("shared_family_hash_invite_token"),
  "hash helper exposed in OpenAPI (revoked from public in migration; may 401)",
);

// 9. Catalog-only checks (cannot confirm via REST without DB URL / Management API)
for (const name of [
  "rls_enabled_shared_families",
  "rls_enabled_shared_family_members",
  "rls_enabled_shared_family_invites",
  "rls_enabled_shared_family_moments",
  "policy_catalog_checks",
  "index_and_constraint_catalog_checks",
  "security_definer_search_path_catalog_checks",
  "enum_catalog_checks",
]) {
  record(
    name,
    false,
    "PENDING_SQL_EDITOR: run supabase/ops/shared-family-verify-0021.sql",
    "PENDING",
  );
}

// Soft signal: anon selects return empty (consistent with RLS + no membership), not 500
for (const t of [
  "shared_families",
  "shared_family_members",
  "shared_family_invites",
  "shared_family_moments",
]) {
  const r = await rest(anon, `/rest/v1/${t}?select=id&limit=1`);
  record(
    `anon_select_empty_${t}`,
    r.status === 200 && Array.isArray(r.json) && r.json.length === 0,
    `anon select ${t} => HTTP ${r.status} rows=${Array.isArray(r.json) ? r.json.length : "n/a"}`,
  );
}

const pass = results.filter((r) => r.status === "PASS").length;
const fail = results.filter((r) => r.status === "FAIL").length;
const pending = results.filter((r) => r.status === "PENDING").length;

console.log("\ncheck_name\tstatus\tdetails");
for (const r of results) {
  console.log(`${r.check_name}\t${r.status}\t${r.details}`);
}
console.log(
  `\n__SUMMARY__\t${fail === 0 ? "REMOTE PROBES PASS" : "REMOTE PROBE FAILURES"}\t${pass} passed / ${fail} failed / ${pending} pending SQL Editor`,
);
console.log(`rpc_param_create_shared_family=${rpcParams("create_shared_family").join(",")}`);
console.log(
  `rpc_param_shared_family_can_access_moment_media=${rpcParams("shared_family_can_access_moment_media").join(",")}`,
);

process.exit(fail === 0 ? 0 : 1);
