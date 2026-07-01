import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function BuySMS() {
  const { data: packages, isLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("packages").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Buy SMS</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Pay with M-Pesa. SMS credited instantly after payment confirmation.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {packages?.map((p, i) => {
            const featured = i === 1;
            return (
              <div key={p.id} className={`relative glass-card-lg p-7 hover-lift ${featured ? "ring-2 ring-primary/40" : ""}`}>
                {featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-primary px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-primary">
                    Most popular
                  </div>
                )}
                <div className="text-sm font-medium text-muted-foreground">{p.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-black">{p.sms_count.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground ml-1">SMS</span>
                </div>
                <div className="mt-2 text-sm">
                  <span className="font-semibold gradient-text">KES {Number(p.price_per_sms).toFixed(2)}</span>
                  <span className="text-muted-foreground"> / SMS</span>
                </div>
                <div className="my-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                <div className="text-xs text-muted-foreground mb-2">Total</div>
                <div className="font-display text-2xl font-bold">KES {Number(p.total_price).toLocaleString()}</div>
                {p.description && <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>}
                <button
                  className={`mt-6 w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition ${
                    featured ? "gradient-primary text-white shadow-primary hover:shadow-float" : "glass-panel hover:bg-white/70"
                  }`}
                  disabled
                >
                  <Wallet className="h-4 w-4" /> Pay with M-Pesa
                </button>
                <p className="mt-3 text-[11px] text-center text-muted-foreground">M-Pesa STK Push coming in session 2</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="glass-card p-6">
        <h2 className="font-display text-lg font-bold mb-3">What you get</h2>
        <ul className="grid gap-2 sm:grid-cols-2 text-sm">
          {["All countries in Africa", "Real-time delivery reports", "REST API access", "24/7 support", "Custom sender IDs", "No monthly fees"].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <div className="grid h-5 w-5 place-items-center rounded-full gradient-primary">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </div>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
