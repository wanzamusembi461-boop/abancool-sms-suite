// M-PESA CALLBACK HANDLER — Receives payment confirmation from Safaricom
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface StkCallback {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: {
    Item: Array<{
      Name: string;
      Value: string | number;
    }>;
  };
}

interface SafaricomWebhook {
  Body: {
    stkCallback: StkCallback;
  };
}

async function handler(req: Request) {
  try {
    const payload = (await req.json()) as SafaricomWebhook;
    const callback = payload.Body.stkCallback;

    console.log("Callback received:", {
      CheckoutRequestID: callback.CheckoutRequestID,
      ResultCode: callback.ResultCode,
      ResultDesc: callback.ResultDesc,
    });

    // Find transaction by CheckoutRequestID
    const { data: transaction, error: tx_error } = await supabase
      .from("transactions")
      .select("*")
      .eq("mpesa_checkout_id", callback.CheckoutRequestID)
      .maybeSingle();

    if (tx_error || !transaction) {
      console.error("Transaction not found:", callback.CheckoutRequestID);
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Extract metadata (receipt code, amount, etc.)
    let receipt = "";
    let amount = transaction.amount_kes;

    if (callback.CallbackMetadata?.Item) {
      callback.CallbackMetadata.Item.forEach((item) => {
        if (item.Name === "MpesaReceiptNumber") {
          receipt = String(item.Value);
        } else if (item.Name === "Amount") {
          amount = Number(item.Value);
        }
      });
    }

    // Handle success
    if (callback.ResultCode === 0) {
      // Update transaction: mark as completed, store receipt
      const { error: update_error } = await supabase
        .from("transactions")
        .update({
          status: "completed",
          mpesa_receipt: receipt,
          raw_callback: callback,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      if (update_error) {
        console.error("Update error:", update_error);
      }

      // Credit SMS balance (atomic via RPC)
      const { error: credit_error } = await supabase.rpc("credit_sms", {
        _user_id: transaction.user_id,
        _amount: transaction.sms_credited,
      });

      if (credit_error) {
        console.error("Credit SMS error:", credit_error);
      }

      // Create success notification
      await supabase.from("notifications").insert({
        user_id: transaction.user_id,
        title: "Payment Received",
        body: `${transaction.sms_credited} SMS credited to your account.`,
        kind: "success",
      });

      console.log("Payment completed:", {
        transaction_id: transaction.id,
        receipt,
        sms_credited: transaction.sms_credited,
      });
    } else {
      // Handle failure
      const { error: update_error } = await supabase
        .from("transactions")
        .update({
          status: "failed",
          raw_callback: callback,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      if (update_error) {
        console.error("Update error:", update_error);
      }

      // Create failure notification
      await supabase.from("notifications").insert({
        user_id: transaction.user_id,
        title: "Payment Failed",
        body: callback.ResultDesc || "Your M-Pesa payment was declined. Please try again.",
        kind: "error",
      });

      console.log("Payment failed:", {
        transaction_id: transaction.id,
        result_code: callback.ResultCode,
        result_desc: callback.ResultDesc,
      });
    }

    // Always respond with success (Safaricom expects 200 + ResultCode: 0)
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Callback handler error:", error);

    // Still respond with success so Safaricom doesn't retry endlessly
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}


Deno.serve(handler);
