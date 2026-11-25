import { supabaseAdmin } from "@/lib/supabase/admin";

// T-18: GPS trackers send positions here in the OsmAnd format (GET or POST with id, lat, lon,
// timestamp), which most trackers and the Traccar client support. Only registered trackers are
// recorded (tracker_ping ignores the rest). Phase 4 adds the full ping history and checks.

function read(params: URLSearchParams) {
  const id = (params.get("id") ?? params.get("deviceid") ?? "").slice(0, 40);
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lon") ?? params.get("lng"));
  const ts = Number(params.get("timestamp"));
  const at = Number.isFinite(ts) && ts > 0 ? new Date(ts > 1e12 ? ts : ts * 1000).toISOString() : new Date().toISOString();
  return { id, lat, lng, at };
}

async function record(params: URLSearchParams) {
  const p = read(params);
  if (!p.id || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return new Response("bad request", { status: 400 });
  const { error } = await supabaseAdmin().rpc("tracker_ping", { p_device: p.id, p_lat: p.lat, p_lng: p.lng, p_at: p.at });
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
