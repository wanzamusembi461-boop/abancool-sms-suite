import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Wallet, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BuySMSDialog } from "@/components/buy-sms/BuySMSDialog";
import { PaymentPollingModal } from "@/components/buy-sms/PaymentPollingModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function BuySMS() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pollingOpen, setPollingOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<{
    id: string;
    name: string;
    total_price: number;
    sms_count: number;
  } | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [checkoutId, setCheckoutId] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customAmountDialogOpen, setCustomAmountDialogOpen] = useState(false);

  const { data: packages, isLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const handleBuyClick = (pkg: any) => {
    setSelectedPackage({
      id: pkg.id,
      name: pkg.name,
      total_price: Number(pkg.total_price),
      sms_count: pkg.sms_count,
    });
    setDialogOpen(true);
  };

  const handleCustomAmountSubmit = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount < 10) {
      alert("Minimum amount is KES 10");
      return;
    }
    // Calculation: 0.5 KES per SMS (based on starter package)
    const smsCount = Math.floor(amount / 0.5);
    setSelectedPackage({
      id: "custom",
      name: `Custom - KES ${amount}`,
      total_price: amount,
      sms_count: smsCount,
    });
    setCustomAmountDialogOpen(false);
    setDialogOpen(true);
  };

  const handleDialogSuccess = (checkoutId: string, transactionId: string) => {
    setCheckoutId(checkoutId);
    setTransactionId(transactionId);
    setDialogOpen(false);
    setPollingOpen(true);
  };

  const handlePollingSuccess = () => {
    // Polling modal will auto-close on success
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Buy SMS</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Pay with M-Pesa. SMS credited instantly after payment confirmation.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
          {packages?.map((p) => {
            const featured = p.slug === "popular";
            return (
              <div
                key={p.id}
                className={`relative glass-card-lg p-7 hover-lift ${
                  featured ? "ring-2 ring-primary/40" : ""
                }`}
              >
                {featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-primary px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-primary">
                    Popular
                  </div>
                )}
                <div className="text-sm font-medium text-muted-foreground">{p.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-black">
                    {p.sms_count.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">SMS</span>
                </div>
                <div className="mt-2 text-sm">
                  <span className="font-semibold gradient-text">
                    KES {Number(p.price_per_sms).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground"> / SMS</span>
                </div>
                <div className="my-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                <div className="text-xs text-muted-foreground mb-2">Total</div>
                <div className="font-display text-2xl font-bold">
                  KES {Number(p.total_price).toLocaleString()}
                </div>
                {p.description && (
                  <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>
                )}
                {p.notes && (
                  <p className="mt-2 text-xs text-primary/80">{p.notes}</p>
                )}
                <button
                  onClick={() => handleBuyClick(p)}
                  className={`mt-6 w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition ${
                    featured
                      ? "gradient-primary text-white shadow-primary hover:shadow-float"
                      : "glass-panel hover:bg-white/70"
                  }`}
                >
                  <Wallet className="h-4 w-4" /> Pay with M-Pesa
                </button>
              </div>
            );
          })}

          {/* Custom Amount Card */}
          <Dialog open={customAmountDialogOpen} onOpenChange={setCustomAmountDialogOpen}>
            <DialogTrigger asChild>
              <div className="glass-card-lg p-7 hover-lift cursor-pointer flex flex-col items-center justify-center min-h-96 border-2 border-dashed border-border/50">
                <Plus className="h-8 w-8 text-muted-foreground mb-3" />
                <div className="text-sm font-medium text-muted-foreground">Custom Amount</div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Start with any amount (min. KES 50)
                </p>
              </div>
            </DialogTrigger>
            <DialogContent className="glass-card-lg">
              <DialogHeader>
                <DialogTitle>Custom SMS Purchase</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Amount (KES)</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    min="10"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum: KES 10 (~20 SMS)
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setCustomAmountDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCustomAmountSubmit}
                    className="flex-1 gradient-primary text-white"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="glass-card p-6">
        <h2 className="font-display text-lg font-bold mb-3">What you get</h2>
        <ul className="grid gap-2 sm:grid-cols-3 text-sm">
          {[
            "All countries in Africa",
            "Real-time delivery reports",
            "REST API access",
            "24/7 customer support",
            "Custom sender IDs",
            "No monthly fees",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <div className="grid h-5 w-5 place-items-center rounded-full gradient-primary">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </div>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Buy SMS Dialog */}
      {selectedPackage && (
        <BuySMSDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          package_id={selectedPackage.id}
          package_name={selectedPackage.name}
          total_price={selectedPackage.total_price}
          sms_count={selectedPackage.sms_count}
          prefillPhone={profile?.phone ?? undefined}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* Payment Polling Modal */}
      <PaymentPollingModal
        open={pollingOpen}
        onOpenChange={setPollingOpen}
        transaction_id={transactionId}
        checkout_id={checkoutId}
        onSuccess={handlePollingSuccess}
      />
    </div>
  );
}
