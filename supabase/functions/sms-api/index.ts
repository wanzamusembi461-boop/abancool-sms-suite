// PUBLIC SMS API — customers send SMS from their own systems using an API key.
// Auth: Authorization: Bearer <sk_live_...>  (or  x-api-key: <sk_live_...>)
// Body: { "to": "0712345678" | ["0712...","0711..."], "message": "text", "sender_id": "ABAN_COOL" }
// Every accepted message deducts from the key owner's SMS balance and updates their stats.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const talksasaKey = Deno.env.get("TALKSASA_API_KEY")!;
const defaultSender = Deno.env.get("TALKSASA_SENDER_ID") || "ABAN_COOL";

const admin = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, apikey",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function normalizePhone(p: string): string {
  const t = String(p).trim().replace(/[^\d+]/g, "");
  if (t.startsWith("+")) return t.slice(1);
  if (t.startsWith("254")) return t;
  if (t.startsWith("0")) return "254" + t.slice(1);
  if (t.startsWith("7") || t.startsWith("1")) return "254" + t;
  return t;
}

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendOne(phone: string, message: string, senderId: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch("https://bulksms.talksasa.com/api/v3/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${talksasaKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ recipient: phone, sender_id: senderId, type: "plain", message }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    const ok = res.ok && (data?.status === "success" || data?.code === "ok");
    if (!ok) console.error("TalkSasa send failed", res.status, data);
    return { ok, data };
  } catch (e) {
    return { ok: false, data: { error: e instanceof Error ? e.message : String(e) } };
  } finally {
    clearTimeout(timer);
  }
}

async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const rawKey =
      req.headers.get("x-api-key") ||
      (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!rawKey || !rawKey.startsWith("sk_")) {
      return json({ error: "Missing or invalid API key" }, 401);
    }

    const keyHash = await sha256Hex(rawKey);
    const { data: userId, error: keyErr } = await admin.rpc("resolve_api_key", { _key_hash: keyHash });
    if (keyErr) console.error("resolve_api_key error", keyErr);
    if (!userId) return json({ error: "Invalid or revoked API key" }, 401);

    const body = await req.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const toRaw = body?.to ?? body?.phone ?? body?.recipients;
    const list = Array.isArray(toRaw) ? toRaw : toRaw ? [toRaw] : [];

    if (!message) return json({ error: "message is required" }, 400);
    if (message.length > 1600) return json({ error: "message too long (max 1600 chars)" }, 400);
    if (!list.length) return json({ error: "to is required" }, 400);
    if (list.length > 1000) return json({ error: "max 1000 recipients per request" }, 400);

    const phones = Array.from(new Set(list.map(normalizePhone))).filter((p) => /^254\d{9}$/.test(p));
    if (!phones.length) return json({ error: "No valid recipient numbers" }, 400);

    // Resolve sender ID — must belong to the key owner (or fall back to the platform default)
    let senderId = typeof body?.sender_id === "string" ? body.sender_id.trim() : "";
    if (senderId) {
      const { data: owned } = await admin
        .from("sender_ids")
        .select("sender_id")
        .eq("user_id", userId)
        .eq("sender_id", senderId)
        .in("status", ["approved", "active"])
        .maybeSingle();
      if (!owned) return json({ error: `sender_id '${senderId}' is not approved for this account` }, 403);
    } else {
      senderId = defaultSender;
    }

    const count = phones.length;

    // Deduct balance up-front (atomic)
    const { data: hasEnough, error: dErr } = await admin.rpc("deduct_sms", {
      _user_id: userId,
      _amount: count,
    });
    if (dErr) throw dErr;
    if (!hasEnough) return json({ error: "Insufficient SMS balance", required: count }, 402);

    let sent = 0;
    let failed = 0;
    const results: Array<{ to: string; status: string; error?: string }> = [];
    const logs: Record<string, unknown>[] = [];

    for (const phone of phones) {
      const r = await sendOne(phone, message, senderId);
      if (r.ok) sent++; else failed++;
      const err = r.ok ? null : ((r.data as any)?.message || (r.data as any)?.error || "Provider error");
      results.push({ to: phone, status: r.ok ? "delivered" : "failed", ...(err ? { error: String(err) } : {}) });
      logs.push({
        user_id: userId,
        phone,
        message,
        sender_id: senderId,
        status: r.ok ? "delivered" : "failed",
        provider_response: r.data,
        error: err,
        sent_at: r.ok ? new Date().toISOString() : null,
        delivered_at: r.ok ? new Date().toISOString() : null,
      });
    }

    if (logs.length) await admin.from("sms_logs").insert(logs);

    // Refund failures so customers are only charged for accepted messages
    if (failed > 0) await admin.rpc("credit_sms", { _user_id: userId, _amount: failed });

    const { error: usageErr } = await admin.rpc("record_sms_usage", {
      _user_id: userId,
      _sent: sent,
      _delivered: sent,
      _failed: failed,
    });
    if (usageErr) console.error("record_sms_usage error", usageErr);

    // Return the live remaining balance so customer systems can track credit
    const { data: bal } = await admin
      .from("sms_balances")
      .select("paid_sms, free_sms")
      .eq("user_id", userId)
      .maybeSingle();

    return json({
      success: sent > 0,
      sent,
      failed,
      total: count,
      charged: sent,
      balance: (bal?.paid_sms ?? 0) + (bal?.free_sms ?? 0),
      results,
    });
  } catch (error) {
    console.error("sms-api error", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
}

Deno.serve(handler);
