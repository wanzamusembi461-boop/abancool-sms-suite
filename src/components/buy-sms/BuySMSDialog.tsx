import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { validatePhoneNumber, normalizePhoneNumber } from "@/lib/mpesa";
import { toast } from "sonner";

interface BuySMSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  package_id: string;
  package_name: string;
  total_price: number;
  sms_count: number;
  prefillPhone?: string;
  onSuccess: (checkoutId: string, transactionId: string) => void;
}

export function BuySMSDialog({
  open,
  onOpenChange,
  package_id,
  package_name,
  total_price,
  sms_count,
  prefillPhone,
  onSuccess,
}: BuySMSDialogProps) {
  const { session } = useAuth();
  const [phone, setPhone] = useState(prefillPhone || "");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const stkMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Not authenticated");

      // Validate phone
      if (!validatePhoneNumber(phone)) {
        throw new Error("Invalid phone number. Use format 0712345678 or 254712345678");
      }

      const normalizedPhone = normalizePhoneNumber(phone);

      // Call edge function
      const { data, error } = await supabase.functions.invoke("mpesa-stk-initiate", {
        body: {
          package_id,
          phone: normalizedPhone,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("STK Push initiated. Check your phone!");
      onSuccess(data.checkout_id, data.transaction_id);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to initiate payment");
    },
  });

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    // Clear error on change
    if (phoneError) setPhoneError(null);
  };

  const handlePhoneBlur = () => {
    if (phone && !validatePhoneNumber(phone)) {
      setPhoneError("Invalid phone format");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhoneNumber(phone)) {
      setPhoneError("Invalid phone format");
      return;
    }
    stkMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card-lg">
        <DialogHeader>
          <DialogTitle>Pay with M-Pesa</DialogTitle>
          <DialogDescription>Enter your phone number to proceed with payment</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Package Summary */}
          <div className="glass-panel rounded-lg p-3 bg-white/50">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Package</div>
            <div className="font-semibold">{package_name}</div>
            <div className="text-sm text-muted-foreground mt-1">{sms_count.toLocaleString()} SMS</div>
            <div className="mt-2 pt-2 border-t border-border/50">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</div>
              <div className="font-display text-2xl font-bold gradient-text">KES {total_price.toLocaleString()}</div>
            </div>
          </div>

          {/* Phone Input */}
          <div>
            <Label htmlFor="phone">Your phone number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="0712345678 or 254712345678"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={handlePhoneBlur}
              disabled={stkMutation.isPending}
              aria-describedby={phoneError ? "phone-error" : "phone-help"}
              className="mt-2"
            />
            <p id="phone-help" className="text-xs text-muted-foreground mt-1">
              Format: Start with 0 or 254
            </p>
            {phoneError && (
              <p id="phone-error" className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {phoneError}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={stkMutation.isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={stkMutation.isPending || !phone || !!phoneError}
              className="flex-1 gradient-primary text-white"
            >
              {stkMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Pay with M-Pesa"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

