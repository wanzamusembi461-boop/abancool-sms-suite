// SEND CAMPAIGN — Dispatches an SMS campaign via TalkSasa
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const talksasaKey = Deno.env.get("TALKSASA_API_KEY")!;
const defaultSender = Deno.env.get("TALKSASA_SENDER_ID") || "INFO";

const admin = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function normalizePhone(p: string): string {
  const t = p.trim().replace(/[^\d+]/g, "");
  if (t.startsWith("+")) return t.slice(1);
  if (t.startsWith("254")) return t;
  if (t.startsWith("0")) return "254" + t.slice(1);
  if (t.startsWith("7") || t.startsWith("1")) return "254" + t;
  return t;
}

async function sendOne(phone: string, message: string, senderId: string) {
  // TalkSasa v3 REST
  const res = await fetch("https://bulksms.talksasa.com/api/v3/sms/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${talksasaKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      recipient: phone,
      sender_id: senderId,
      type: "plain",
      message,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && (data?.status === "success" || data?.code === "ok"), data };
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const jwt = auth.replace("Bearer ", "");
    const { data: userRes } = await admin.auth.getUser(jwt);
    const userId = userRes.user?.id;
    if (!userId) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const { campaign_id, phones: rawPhones, message: adhocMessage, sender_id: adhocSender } = body ?? {};

    let message = adhocMessage as string | undefined;
    let senderId = (adhocSender as string | undefined) || defaultSender;
    let phones: string[] = Array.isArray(rawPhones) ? rawPhones : [];
    let campaign: any = null;

    if (campaign_id) {
      const { data: c, error } = await admin
        .from("campaigns")
        .select("*")
        .eq("id", campaign_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !c) {
        return new Response(JSON.stringify({ error: "Campaign not found" }), { status: 404, headers: corsHeaders });
      }
      campaign = c;
      message = c.message;
      if (c.sender_id) senderId = c.sender_id;

      // Load recipient phones: from campaign metadata OR all user contacts
      if (Array.isArray(c.metadata?.phones) && c.metadata.phones.length) {
        phones = c.metadata.phones;
      } else {
        const { data: contacts } = await admin
          .from("contacts")
          .select("phone")
          .eq("user_id", userId);
        phones = (contacts ?? []).map((x) => x.phone);
      }
    }

    if (!message || phones.length === 0) {
      return new Response(JSON.stringify({ error: "Message and phones required" }), { status: 400, headers: corsHeaders });
    }

    // Dedup + normalize
    const uniquePhones = Array.from(new Set(phones.map(normalizePhone))).filter((p) => p.length >= 10);
    const count = uniquePhones.length;

    // Check + deduct balance atomically
    const { data: hasEnough, error: dErr } = await admin.rpc("deduct_sms", {
      _user_id: userId,
      _amount: count,
    });
    if (dErr) throw dErr;
    if (!hasEnough) {
      return new Response(JSON.stringify({ error: "Insufficient SMS balance", required: count }), { status: 402, headers: corsHeaders });
    }

    if (campaign) {
      await admin.from("campaigns").update({ status: "processing", recipient_count: count }).eq("id", campaign.id);
    }

    let sent = 0;
    let failed = 0;
    const logs: any[] = [];

    for (const phone of uniquePhones) {
      const r = await sendOne(phone, message, senderId);
      if (r.ok) sent++; else failed++;
      logs.push({
        user_id: userId,
        campaign_id: campaign?.id ?? null,
        phone,
        message,
        sender_id: senderId,
        status: r.ok ? "sent" : "failed",
        provider_response: r.data,
        error: r.ok ? null : (r.data?.message || r.data?.error || "Provider error"),
        sent_at: r.ok ? new Date().toISOString() : null,
      });
    }

    if (logs.length) await admin.from("sms_logs").insert(logs);

    // Refund failed
    if (failed > 0) {
      await admin.rpc("credit_sms", { _user_id: userId, _amount: failed });
    }

    if (campaign) {
      await admin
        .from("campaigns")
        .update({
          status: failed === count ? "failed" : "sent",
          sent_count: sent,
          failed_count: failed,
          cost_sms: sent,
        })
        .eq("id", campaign.id);
    }

    await admin.from("notifications").insert({
      user_id: userId,
      title: "Campaign dispatched",
      body: `${sent}/${count} messages sent successfully.${failed > 0 ? ` ${failed} refunded.` : ""}`,
      kind: sent > 0 ? "success" : "error",
    });

    return new Response(
      JSON.stringify({ sent, failed, total: count }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-campaign error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
