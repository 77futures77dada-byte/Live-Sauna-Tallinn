// Populates a Supabase project with obviously-fake demo data — visits
// (finished, auto-closed, and one still open), occupancy/water reports,
// and before/after photos — so the product can be shown "with data".
//
// This is NOT a silent fake DB: the app shows a permanent
// "DEMO / TESTANDMED" banner whenever demo mode is on (?demo=1 or
// NEXT_PUBLIC_DEMO_MODE=1). Point this script at a dedicated preview
// Supabase project, never production.
//
//   ALLOW_DEMO_SEED=1 pnpm seed-demo           # seed
//   ALLOW_DEMO_SEED=1 pnpm seed-demo --clean   # remove exactly what was seeded
//
// Created IDs are recorded in scripts/.demo-seed.json (git-ignored) so
// --clean can undo precisely what it made.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Database } from "../lib/supabase/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const bookkeepingPath = path.join(__dirname, ".demo-seed.json");

const DEMO_EMAIL_DOMAIN = "sauna-demo.test";
const HARKU_SLUGS = ["harku-1", "harku-2", "harku-3"];
const LAKE = { latitude: 59.4140481, longitude: 24.632575 };
const DAY_MS = 24 * 60 * 60_000;

interface Bookkeeping {
  userIds: string[];
  visitIds: string[];
  occupancyIds: string[];
  waterIds: string[];
  photoPaths: string[];
}

async function loadEnvLocal() {
  try {
    const content = await readFile(path.join(repoRoot, ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const eq = trimmed.indexOf("=");
      const key = trimmed.slice(0, eq);
      const value = trimmed.slice(eq + 1);
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // No .env.local — fine if the caller already exported the vars.
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function jitterCoord(base: number): number {
  return base + (Math.random() - 0.5) * 0.0015;
}

async function readBookkeeping(): Promise<Bookkeeping | null> {
  try {
    return JSON.parse(await readFile(bookkeepingPath, "utf8")) as Bookkeeping;
  } catch {
    return null;
  }
}

async function clean(service: SupabaseClient<Database>) {
  const record = await readBookkeeping();
  if (!record) {
    console.log("No scripts/.demo-seed.json — nothing to clean.");
    return;
  }

  if (record.photoPaths.length > 0) {
    await service.storage.from("visit-photos").remove(record.photoPaths);
  }
  await service.from("photos").delete().in("visit_id", record.visitIds.length ? record.visitIds : ["none"]);
  await service.from("occupancy_reports").delete().in("id", record.occupancyIds.length ? record.occupancyIds : ["none"]);
  await service.from("water_reports").delete().in("id", record.waterIds.length ? record.waterIds : ["none"]);
  await service.from("visits").delete().in("id", record.visitIds.length ? record.visitIds : ["none"]);
  for (const userId of record.userIds) {
    await service.auth.admin.deleteUser(userId).catch(() => undefined);
  }

  await unlink(bookkeepingPath).catch(() => undefined);
  console.log(
    `Cleaned: ${record.visitIds.length} visits, ${record.photoPaths.length} photos, ` +
      `${record.occupancyIds.length + record.waterIds.length} reports, ${record.userIds.length} users.`,
  );
}

async function seed(service: SupabaseClient<Database>) {
  const existing = await readBookkeeping();
  if (existing) {
    console.error("scripts/.demo-seed.json already exists — run `--clean` first to avoid piling up demo data.");
    process.exit(1);
  }

  const { data: locations, error: locError } = await service
    .from("locations")
    .select("id, slug")
    .in("slug", HARKU_SLUGS);
  if (locError || !locations || locations.length === 0) {
    console.error("Could not load Harku locations:", locError?.message ?? "none found");
    process.exit(1);
  }
  const locationIds = locations.map((l) => l.id);

  const record: Bookkeeping = { userIds: [], visitIds: [], occupancyIds: [], waterIds: [], photoPaths: [] };

  // 3 demo users (email_confirm so no inbox needed; the on_auth_user_created
  // trigger makes the matching profiles row).
  for (let i = 1; i <= 3; i++) {
    const email = `demo+${i}@${DEMO_EMAIL_DOMAIN}`;
    const { data, error } = await service.auth.admin.createUser({
      email,
      password: `demo-${i}-${Math.random().toString(36).slice(2)}`,
      email_confirm: true,
    });
    if (error || !data.user) {
      console.error(`Failed to create ${email}:`, error?.message);
      process.exit(1);
    }
    record.userIds.push(data.user.id);
    console.log(`user  ${email}  ${data.user.id}`);
  }

  // Wait for the profile trigger to land for every user.
  for (let attempt = 0; attempt < 10; attempt++) {
    const { count } = await service
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("id", record.userIds);
    if ((count ?? 0) >= record.userIds.length) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const photoBytes = await readFile(path.join(repoRoot, "public/atmosphere/sauna.webp"));

  // ~15 visits spread over the last 30 days.
  const VISIT_COUNT = 15;
  for (let i = 0; i < VISIT_COUNT; i++) {
    const userId = pick(record.userIds);
    const locationId = pick(locationIds);
    const isMostRecent = i === VISIT_COUNT - 1;
    const startedAt = new Date(Date.now() - (isMostRecent ? randomInt(20, 90) * 60_000 : randomInt(1, 30) * DAY_MS));

    // Outcome mix: one open (the most recent), ~1 in 5 auto-closed, rest finished.
    let finishedAt: string | null = null;
    let autoClosed = false;
    let rating: number | null = null;
    let crowdLevel: Database["public"]["Tables"]["visits"]["Row"]["crowd_level"] = null;
    if (!isMostRecent) {
      if (Math.random() < 0.2) {
        autoClosed = true;
        finishedAt = new Date(startedAt.getTime() + 4 * 60 * 60_000).toISOString();
      } else {
        finishedAt = new Date(startedAt.getTime() + randomInt(30, 150) * 60_000).toISOString();
        rating = randomInt(3, 5);
        crowdLevel = pick(["low", "medium", "high"] as const);
      }
    }

    const { data: visit, error: visitError } = await service
      .from("visits")
      .insert({
        location_id: locationId,
        user_id: userId,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt,
        auto_closed: autoClosed,
        rating,
        crowd_level: crowdLevel,
        latitude: jitterCoord(LAKE.latitude),
        longitude: jitterCoord(LAKE.longitude),
      })
      .select("id")
      .single();
    if (visitError || !visit) {
      console.error("Failed to insert visit:", visitError?.message);
      process.exit(1);
    }
    record.visitIds.push(visit.id);

    // before photo always; after photo when the visit finished normally.
    const types: Array<"before" | "after"> = finishedAt && !autoClosed ? ["before", "after"] : ["before"];
    for (const type of types) {
      const storagePath = `${userId}/${visit.id}/${type}.webp`;
      const { error: uploadError } = await service.storage
        .from("visit-photos")
        .upload(storagePath, photoBytes, { contentType: "image/webp", upsert: true });
      if (uploadError) {
        console.error("Failed to upload photo:", uploadError.message);
        process.exit(1);
      }
      record.photoPaths.push(storagePath);
      await service.from("photos").insert({
        user_id: userId,
        location_id: locationId,
        visit_id: visit.id,
        type,
        storage_url: storagePath,
        moderated: true,
      });
    }
  }
  console.log(`visits  ${record.visitIds.length}`);

  // Occupancy + water reports over the same window.
  for (let i = 0; i < 24; i++) {
    const locationId = pick(locationIds);
    const userId = pick(record.userIds);
    const createdAt = new Date(Date.now() - randomInt(0, 30) * DAY_MS - randomInt(0, 23) * 60 * 60_000).toISOString();
    if (i % 2 === 0) {
      const { data } = await service
        .from("occupancy_reports")
        .insert({ location_id: locationId, user_id: userId, people_count: randomInt(0, 8), created_at: createdAt })
        .select("id")
        .single();
      if (data) record.occupancyIds.push(data.id);
    } else {
      const { data } = await service
        .from("water_reports")
        .insert({ location_id: locationId, user_id: userId, temperature: randomInt(2, 20), created_at: createdAt })
        .select("id")
        .single();
      if (data) record.waterIds.push(data.id);
    }
  }
  console.log(`reports  ${record.occupancyIds.length + record.waterIds.length}`);

  await writeFile(bookkeepingPath, JSON.stringify(record, null, 2));
  console.log(`\nDone. Bookkeeping written to scripts/.demo-seed.json — 'pnpm seed-demo --clean' to undo.`);
}

async function main() {
  await loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (checked .env.local).");
    process.exit(1);
  }

  if (process.env.ALLOW_DEMO_SEED !== "1") {
    console.error(
      "Refusing to run without ALLOW_DEMO_SEED=1.\n" +
        `  Target project: ${url}\n` +
        "  This writes demo users/visits/photos. Point it at a PREVIEW project, never production, then:\n" +
        "  ALLOW_DEMO_SEED=1 pnpm seed-demo",
    );
    process.exit(1);
  }

  console.log(`Target Supabase project: ${url}\n`);

  const service = createClient<Database>(url, serviceKey, { auth: { persistSession: false } });

  if (process.argv.includes("--clean")) {
    await clean(service);
  } else {
    await seed(service);
  }
}

main();
