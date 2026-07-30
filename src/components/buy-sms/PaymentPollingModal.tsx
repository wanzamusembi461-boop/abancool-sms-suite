import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface PaymentPollingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction_id: string;
  checkout_id: string;
  timeout?: number; // seconds, default 60
  onSuccess: () => void;
  onError?: (message: string) => void;
}

export function PaymentPollingModal({
  open,
  onOpenChange,
  transaction_id,
  checkout_id,
  timeout = 60,
  onSuccess,
  onError,
}: PaymentPollingModalProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeout);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Poll status every 3 seconds
  const { data: status, isLoading, error, refetch } = useQuery({
    queryKey: ["transaction-status", transaction_id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("mpesa-status-check", {
          body: { transaction_id },
        });

        if (error) throw error;
        return data;
      } catch (err) {
        // If the function call fails, return a pending status to avoid UI crash
        console.error("Status check failed:", err);
        return { status: "pending", message: "Checking payment status..." };
      }
    },
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      // Stop polling if completed or failed
      if (s === "completed" || s === "failed") {
        return false;
      }
      // Stop polling after timeout
      if (hasTimedOut) {
        return false;
      }
      // Poll every 3 seconds otherwise
      return 3000;
    },
    enabled: open && !hasTimedOut,
    retry: 1,
    retryDelay: 1000,
  });

  // Handle timeout countdown
  useEffect(() => {
    if (!open || hasTimedOut) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setHasTimedOut(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, hasTimedOut]);

  // Handle success
  useEffect(() => {
    if (status?.status === "completed") {
      toast.success("Payment successful! SMS credited to your account.");
      onSuccess();
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    }
  }, [status?.status, onSuccess, onOpenChange]);

  // Handle failure
  useEffect(() => {
    if (status?.status === "failed") {
      toast.error(status.message || "Payment declined. Please try again.");
      onError?.(status.message);
      onOpenChange(false);
    }
  }, [status?.status, onError, onOpenChange]);

  const isCompleted = status?.status === "completed";
  const isFailed = status?.status === "failed";

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await refetch();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card-lg border-0">
        {/* Success State */}
        {isCompleted && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center py-8 px-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mb-4"
            >
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </motion.div>
            <h3 className="font-semibold text-lg text-center mb-2">Payment Successful!</h3>
            <p className="text-sm text-muted-foreground text-center">Your SMS credit has been added to your account.</p>
            <Button onClick={() => onOpenChange(false)} className="mt-6 w-full gradient-primary text-white">
              Close
            </Button>
          </motion.div>
        )}

        {/* Failed State */}
        {isFailed && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center py-8 px-6"
          >
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <h3 className="font-semibold text-lg text-center mb-2">Payment Failed</h3>
            <p className="text-sm text-muted-foreground text-center">{status?.message || "Your payment was not processed."}</p>
            <Button onClick={() => onOpenChange(false)} variant="outline" className="mt-6 w-full">
              Try Again
            </Button>
          </motion.div>
        )}

        {/* Loading/Pending State */}
        {!isCompleted && !isFailed && (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            {/* Animated Spinner */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mb-6"
            >
              <Loader2 className="h-12 w-12 text-primary" strokeWidth={1.5} />
            </motion.div>

            <h3 className="font-semibold text-lg text-center mb-2">Waiting for Payment…</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Check your phone for the M-Pesa payment prompt and enter your PIN.
            </p>

            {/* Countdown Timer */}
            <div className="mb-6">
              <div className="text-4xl font-display font-bold gradient-text text-center mb-2">{timeRemaining}s</div>
              <div className="text-xs text-muted-foreground text-center">
                {hasTimedOut ? "Timeout reached" : "Time remaining"}
              </div>
            </div>

            {/* Timeout Message */}
            {hasTimedOut && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 w-full flex gap-2"
              >
                <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-800">
                  Payment timeout. Please check your phone to complete the transaction, then retry below.
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 w-full flex gap-2"
              >
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-800">
                  {error instanceof Error ? error.message : "Error checking payment status"}
                </div>
              </motion.div>
            )}

            {/* Retry Button (always visible on timeout) */}
            {hasTimedOut && (
              <div className="flex gap-3 w-full mt-4">
                <Button 
                  onClick={handleRetry} 
                  disabled={isRetrying}
                  className="flex-1 gradient-primary text-white"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                  Retry
                </Button>
                <Button 
                  onClick={() => onOpenChange(false)} 
                  variant="outline" 
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

