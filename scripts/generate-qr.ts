// Generates a printable QR code (PNG + SVG) per location, pointing at
// /location/[slug] — for physically posting at each sauna/beach.
// Run with: QR_BASE_URL=https://your-prod-domain pnpm generate-qr
//
// Deliberately a standalone script, not runtime app code: these are
// generated once (or whenever locations/domain change), not on every
// request.

import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

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

async function main() {
  await loadEnvLocal();

  const baseUrl = process.env.QR_BASE_URL;
  if (!baseUrl) {
    console.error(
      "QR_BASE_URL is not set.\n" +
        "  QR_BASE_URL=https://your-prod-domain.vercel.app pnpm generate-qr\n" +
        "Deliberately not defaulting to localhost — these codes get printed.",
    );
    process.exit(1);
  }
  if (/localhost|127\.0\.0\.1/.test(baseUrl)) {
    console.error(`QR_BASE_URL ("${baseUrl}") looks like a local address. Use the production domain.`);
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required (checked .env.local).");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: locations, error } = await supabase
    .from("locations")
    .select("slug, name")
    .order("name");

  if (error) {
    console.error("Failed to fetch locations:", error.message);
    process.exit(1);
  }
  if (!locations || locations.length === 0) {
    console.error("No locations found — nothing to generate.");
    process.exit(1);
  }

  const outDir = path.join(repoRoot, "qr-codes");
  await mkdir(outDir, { recursive: true });

  console.log(`Generating QR codes for ${locations.length} locations -> ${outDir}\n`);

  for (const location of locations) {
    const url = `${baseUrl.replace(/\/+$/, "")}/location/${location.slug}`;
    const pngPath = path.join(outDir, `${location.slug}.png`);
    const svgPath = path.join(outDir, `${location.slug}.svg`);

    await QRCode.toFile(pngPath, url, { type: "png", width: 512, margin: 2 });
    await QRCode.toFile(svgPath, url, { type: "svg", width: 512, margin: 2 });

    console.log(`${location.name.padEnd(24)} ${url}`);
  }

  console.log(`\nDone — PNG + SVG per location in ${path.relative(repoRoot, outDir)}/`);
}

main();
