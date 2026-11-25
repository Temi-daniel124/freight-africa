import { supabaseAdmin } from "@/lib/supabase/admin";

// T-18: GPS trackers send positions here in the OsmAnd format (GET or POST with id, lat, lon,
// timestamp), which most trackers and the Traccar client support. Only a tracker with its key in the
// address is recorded (tracker_ping ignores the rest). Phase 4 adds the full ping history and checks.

function num(params: URLSearchParams, ...names: string[]) {
  for (const name of names) {
    const raw = params.get(name);
    // A missing or empty value is no value (never 0, 0 in the sea; review).
    if (raw !== null && raw.trim() !== "") {
      const value = Number(raw);
      if (Number.isFinite(value)) return value;
    }
  }
  return null;
}

function read(params: URLSearchParams) {
  // The tracker's key is in the server address the owner set (?key=…); the device ID is only for reference.
  const id = (params.get("key") ?? "").slice(0, 40);
  const lat = num(params, "lat");
  const lng = num(params, "lon", "lng");
  const ts = num(params, "timestamp");
  const when = ts !== null && ts > 0 ? new Date(ts > 1e12 ? ts : ts * 1000) : new Date();
  const at = (Number.isNaN(when.getTime()) ? new Date() : when).toISOString();
  return { id, lat, lng, at };
}

async function record(params: URLSearchParams) {
  const p = read(params);
  if (!p.id || p.lat === null || p.lng === null) return new Response("bad request", { status: 400 });
  const { error } = await supabaseAdmin().rpc("tracker_ping", { p_key: p.id, p_lat: p.lat, p_lng: p.lng, p_at: p.at });
  if (error) console.error("tracker_ping failed", error.code);
  // Always 200 for a well-formed ping, so a tracker doesn't learn which IDs are registered.
  return new Response("ok");
}

export async function GET(request: Request) {
  return record(new URL(request.url).searchParams);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.text().catch(() => "");
  const params = new URLSearchParams(body || url.search);
  for (const [k, v] of url.searchParams) if (!params.has(k)) params.set(k, v);
  return record(params);
}
