const { loadEnvConfig } = require("@next/env");
const { createClient } = require("@supabase/supabase-js");

function verifiedPaths(id, paths) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !Array.isArray(paths)) throw new Error("Cleanup paths could not be verified; records were retained.");
  const pattern = new RegExp("^" + id + "/(?:[1-9]|10)\\.(?:jpg|png)$", "i");
  if (paths.some((path) => typeof path !== "string" || !pattern.test(path))) throw new Error("Cleanup paths could not be verified; records were retained.");
  return paths;
}

async function cleanupQuoteUploads(client, { execute = false, now = new Date(), log = console.log } = {}) {
  // Signed uploads last two hours; never touch an upload while its tokens work.
  const cutoff = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
  const pending = await client.from("quote_requests").select("id,photos")
    .is("submitted_at", null).lt("created_at", cutoff).order("created_at").limit(100);
  if (pending.error) throw new Error("Unable to read expired upload sessions.");
  const queued = await client.from("quote_photo_cleanup").select("request_id,paths")
    .lte("run_after", now.toISOString()).order("run_after").limit(100);
  if (queued.error) throw new Error("Unable to read final photo cleanup. Check that the review migration has been applied.");
  if (!execute) {
    log(`${pending.data.length} expired sessions and ${queued.data.length} final photo cleanups found. Run with --execute to remove them.`);
    return { pending: pending.data.length, queued: queued.data.length };
  }
  const removePhotos = async (paths) => {
    if (!paths.length) return;
    const result = await client.storage.from("quote-request-photos").remove(paths);
    if (result.error) throw new Error("Unable to remove stored photos; cleanup records were retained for retry.");
  };
  for (const request of pending.data) {
    await removePhotos(verifiedPaths(request.id, request.photos.map((photo) => photo.path)));
    const deleted = await client.from("quote_requests").delete().eq("id", request.id).is("submitted_at", null).lt("created_at", cutoff);
    if (deleted.error) throw new Error("Unable to remove an expired pending record.");
  }
  for (const cleanup of queued.data) {
    await removePhotos(verifiedPaths(cleanup.request_id, cleanup.paths));
    const deleted = await client.from("quote_photo_cleanup").delete().eq("request_id", cleanup.request_id).lte("run_after", now.toISOString());
    if (deleted.error) throw new Error("Unable to complete final photo cleanup; retry the command.");
  }
  log(`Removed ${pending.data.length} expired sessions and finished ${queued.data.length} final photo cleanups.`);
  return { pending: pending.data.length, queued: queued.data.length };
}

async function main() {
  loadEnvConfig(process.cwd());
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key) throw new Error("Configure the server-only Supabase key first.");
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  await cleanupQuoteUploads(client, { execute: process.argv.includes("--execute") });
}
module.exports = { cleanupQuoteUploads };
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
