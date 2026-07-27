// STK PUSH INITIATION — Initiates M-Pesa payment popup on user's phone
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ===== ENVIRONMENT & CONFIG =====
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const mpesaConsumerKey = Deno.env.get("MPESA_CONSUMER_KEY")!;
const mpesaConsumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET")!;
const mpesaShortcode = Deno.env.get("MPESA_SHORTCODE")!;
const mpesaPasskey = Deno.env.get("MPESA_PASSKEY")!;
const mpesaEnv = Deno.env.get("MPESA_ENV") || "sandbox";

// Daraja endpoints
const DARAJA_BASE_URL =
  mpesaEnv === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

// ===== SUPABASE CLIENT =====
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ===== ZOD SCHEMA =====
const bodySchema = z.object({
  package_id: z.string().uuid("Invalid package ID").optional().nullable(),
  phone: z
    .string()
    .regex(
      /^(0(7|1)\d{8}|254(7|1)\d{8})$/,
      "Invalid phone format. Use 07/01XXXXXXXX or 2547/2541XXXXXXXX."
    ),
  amount: z.number().optional(),
  type: z.enum(["sms", "sender_id"]).optional().default("sms"),
  sender_id_market_id: z.string().optional(),
});

type RequestBody = z.infer<typeof bodySchema>;

// ===== UTILITY FUNCTIONS =====
function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("254")) return trimmed;
  if (trimmed.startsWith("0")) return "254" + trimmed.slice(1);
  return trimmed;
}

function calculateTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

function generatePassword(
  shortcode: string,
  passkey: string,
  timestamp: string
): string {
  const raw = shortcode + passkey + timestamp;
  return btoa(raw);
}

async function getDarajaToken(): Promise<string> {
  const auth = btoa(`${mpesaConsumerKey}:${mpesaConsumerSecret}`);
  const response = await fetch(
    `${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Failed to get Daraja token: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

// ===== MAIN HANDLER =====
export default async function handler(req: Request) {
  // Allow CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    // Parse body
    const body = await req.json();
    const { package_id, phone, amount, type = "sms", sender_id_market_id } = bodySchema.parse(body);

    // Normalize phone
    const normalizedPhone = normalizePhone(phone);

    // Verify user authentication via JWT (Supabase auto-checks via verify_jwt)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Determine amount and description based on type
    let finalAmount: number;
    let description: string;
    let smsCount: number = 0;

    if (type === "sender_id") {
      // Sender ID marketplace purchase
      if (!amount || !sender_id_market_id) {
        return new Response(
          JSON.stringify({ error: "Amount and sender_id_market_id required for sender_id purchase" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      finalAmount = Math.ceil(amount);
      description = `Sender ID: ${sender_id_market_id}`;
      smsCount = 0; // No SMS for sender ID purchase
    } else {
      // SMS package purchase
      if (!package_id) {
        return new Response(
          JSON.stringify({ error: "Package ID required for SMS purchase" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Fetch package (server-side, don't trust client price)
      const { data: package_data, error: pkg_error } = await supabase
        .from("packages")
        .select("*")
        .eq("id", package_id)
        .eq("is_active", true)
        .maybeSingle();

      if (pkg_error || !package_data) {
        return new Response(
          JSON.stringify({ error: "Package not found or inactive" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      finalAmount = Math.ceil(Number(package_data.total_price));
      description = "SMS Credit";
      smsCount = package_data.sms_count;
    }

    // Get Daraja token
    const token = await getDarajaToken();

    // Prepare STK request
    const timestamp = calculateTimestamp();
    const password = generatePassword(mpesaShortcode, mpesaPasskey, timestamp);

    const stkRequest = {
      BusinessShortCode: mpesaShortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: finalAmount,
      PartyA: normalizedPhone,
      PartyB: mpesaShortcode,
      PhoneNumber: normalizedPhone,
      CallBackURL: Deno.env.get("MPESA_CALLBACK_URL") ||
        `${supabaseUrl}/functions/v1/mpesa-callback`,
      AccountReference: "ABANCOOL",
      TransactionDesc: description,
    };

    // Send to Daraja
    const stkResponse = await fetch(`${DARAJA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stkRequest),
    });

    const stkData = (await stkResponse.json()) as {
      CheckoutRequestID: string;
      ResponseCode: string;
      ResponseDescription: string;
      MerchantRequestID: string;
      errorMessage?: string;
    };

    // Handle Daraja errors
    if (stkData.ResponseCode !== "0") {
      return new Response(
        JSON.stringify({
          error: stkData.ResponseDescription || stkData.errorMessage || "STK request failed",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Extract user ID from JWT (Supabase auth)
    const token_parts = authHeader.replace("Bearer ", "").split(".");
    let userId: string | null = null;

    try {
      const payload = JSON.parse(atob(token_parts[1]));
      userId = payload.sub;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Insert transaction record
    const { data: tx_data, error: tx_error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        package_id: type === "sms" ? package_id : null,
        phone: normalizedPhone,
        amount_kes: finalAmount,
        sms_credited: smsCount,
        mpesa_checkout_id: stkData.CheckoutRequestID,
        status: "pending",
        type: type, // Track whether this is SMS or sender_id purchase
        sender_id_market_id: sender_id_market_id || null,
      })
      .select()
      .single();

    if (tx_error) {
      console.error("Transaction insert error:", tx_error);
      return new Response(
        JSON.stringify({
          error: "Failed to create transaction record",
          details: tx_error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({
        checkout_id: stkData.CheckoutRequestID,
        transaction_id: tx_data.id,
        message: "STK push initiated. Check your phone for payment prompt.",
        merchant_request_id: stkData.MerchantRequestID,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "Invalid input",
          details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

