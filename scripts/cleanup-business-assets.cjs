const { loadEnvConfig } = require("@next/env");
const { createClient } = require("@supabase/supabase-js");

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const validPath = new RegExp("^" + uuid + "/" + uuid + "/(?:(?:logo|signature)\\.(?:jpg|png)|billing-format\\.(?:pdf|jpg|png))$", "i");

async function cleanupBusinessAssets(client, { execute = false, now = new Date(), log = console.log } = {}) {
  const queued = await client.from("business_asset_cleanup").select("path,run_after").lte("run_after", now.toISOString()).order("run_after").limit(100);
  if (queued.error) throw new Error("Unable to read business file cleanup. Apply the business migrations first.");
  if (!execute) { log(`${queued.data.length} due business files found. Use --execute to remove unused files.`); return { queued: queued.data.length, removed: 0 }; }
  let removed = 0;
  for (const entry of queued.data) {
    if (!validPath.test(entry.path)) throw new Error("An invalid business file path was retained for investigation.");
    const active = await client.rpc("business_asset_in_use", { p_path: entry.path });
    if (active.error || typeof active.data !== "boolean") throw new Error("Unable to verify active business/quotation files; no file was removed. Apply the quotation migration first.");
    if (active.data) {
      const retired = await client.from("business_asset_cleanup").delete().eq("path", entry.path).eq("run_after", entry.run_after);
      if (retired.error) throw new Error("Unable to retire a retained file's cleanup job; no file was removed.");
      continue;
    }
    const result = await client.storage.from("business-assets").remove([entry.path]);
    if (result.error) throw new Error("Unable to remove an unused business file; its cleanup record was retained.");
    const deleted = await client.from("business_asset_cleanup").delete().eq("path", entry.path).eq("run_after", entry.run_after);
    if (deleted.error) throw new Error("Unable to finish business file cleanup; retry the command.");
    removed += 1;
  }
  log(`Removed ${removed} unused business files.`);
  return { queued: queued.data.length, removed };
}

async function main() {
  loadEnvConfig(process.cwd());
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key) throw new Error("Configure the server-only Supabase key first.");
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  await cleanupBusinessAssets(client, { execute: process.argv.includes("--execute") });
}
module.exports = { cleanupBusinessAssets };
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
