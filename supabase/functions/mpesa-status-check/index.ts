// STATUS CHECK — Polls M-Pesa transaction status via Daraja
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const mpesaConsumerKey = Deno.env.get("MPESA_CONSUMER_KEY")!;
const mpesaConsumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET")!;
const mpesaShortcode = Deno.env.get("MPESA_SHORTCODE")!;
const mpesaPasskey = Deno.env.get("MPESA_PASSKEY")!;
const mpesaEnv = Deno.env.get("MPESA_ENV") || "sandbox";

const DARAJA_BASE_URL =
  mpesaEnv === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const bodySchema = z.object({
  transaction_id: z.string().uuid("Invalid transaction ID"),
});

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
  const response = await fetch(`${DARAJA_BASE_URL}/oauth/v1/generate`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get Daraja token");
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function handler(req: Request) {
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
    const { transaction_id } = bodySchema.parse(body);

    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract user ID from JWT
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

    // Fetch transaction, verify ownership
    const { data: transaction, error: tx_error } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transaction_id)
      .maybeSingle();

    if (tx_error || !transaction) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify user owns this transaction
    if (transaction.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // If transaction is already completed or failed, return immediately
    if (transaction.status !== "pending") {
      return new Response(
        JSON.stringify({
          status: transaction.status,
          message: transaction.status === "completed"
            ? "Payment successful"
            : "Payment failed",
          receipt: transaction.mpesa_receipt,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Query Daraja for status (only if pending)
    try {
      const token = await getDarajaToken();
      const timestamp = calculateTimestamp();
      const password = generatePassword(mpesaShortcode, mpesaPasskey, timestamp);

      const queryRequest = {
        BusinessShortCode: mpesaShortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: transaction.mpesa_checkout_id,
      };

      const queryResponse = await fetch(
        `${DARAJA_BASE_URL}/mpesa/stkpushquery/v1/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(queryRequest),
        }
      );

      const queryData = (await queryResponse.json()) as {
        ResponseCode: string;
        ResultCode: string;
        ResultDesc: string;
      };

      // Only update if status changed
      if (queryData.ResultCode === "0") {
        // Update to completed
        await supabase
          .from("transactions")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", transaction_id);

        return new Response(
          JSON.stringify({
            status: "completed",
            message: "Payment successful",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } else if (queryData.ResultCode === "1") {
        // Still pending
        return new Response(
          JSON.stringify({
            status: "pending",
            message: "Payment pending. Please complete on your phone.",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } else {
        // Failed
        await supabase
          .from("transactions")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", transaction_id);

        return new Response(
          JSON.stringify({
            status: "failed",
            message: queryData.ResultDesc || "Payment failed",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } catch (daraja_error) {
      console.error("Daraja query error:", daraja_error);

      // Return current status if query fails
      return new Response(
        JSON.stringify({
          status: transaction.status,
          message: "Unable to check status. Please try again.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Status check error:", error);

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


Deno.serve(handler);
