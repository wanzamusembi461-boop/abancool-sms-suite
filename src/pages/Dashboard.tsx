import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Gift, Send, TrendingUp, ArrowUpRight, Wallet, Users, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: bal } = useQuery({
    queryKey: ["sms-balance", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("sms_balances").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const totalBalance = (bal?.paid_sms ?? 0) + (bal?.free_sms ?? 0);
  const deliveryRate = bal && bal.total_sent > 0
    ? Math.round((bal.total_delivered / bal.total_sent) * 100)
    : 0;

  const stats = [
    { label: "SMS Balance", value: totalBalance.toLocaleString(), sub: `${bal?.paid_sms ?? 0} paid · ${bal?.free_sms ?? 0} free`, icon: MessageSquare, gradient: "linear-gradient(135deg, oklch(0.78 0.16 305), oklch(0.62 0.19 288))" },
    { label: "Free SMS", value: `${bal?.free_sms ?? 0}`, sub: bal?.free_sms_granted ? "Signup bonus" : "—", icon: Gift, gradient: "linear-gradient(135deg, oklch(0.85 0.11 45), oklch(0.78 0.14 25))" },
    { label: "Messages Sent", value: (bal?.total_sent ?? 0).toLocaleString(), sub: "All time", icon: Send, gradient: "linear-gradient(135deg, oklch(0.82 0.09 220), oklch(0.65 0.14 235))" },
    { label: "Delivery Rate", value: `${deliveryRate}%`, sub: `${(bal?.total_delivered ?? 0).toLocaleString()} delivered`, icon: TrendingUp, gradient: "linear-gradient(135deg, oklch(0.72 0.14 155), oklch(0.62 0.16 170))" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="glass-card-lg p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-40 animate-float"
             style={{ background: "radial-gradient(circle, oklch(0.78 0.16 305 / 0.5), transparent 70%)" }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full glass-panel px-3 py-1 text-xs font-medium mb-3">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Welcome back
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold truncate">
              {profile?.full_name ?? "Hello"} 👋
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {profile?.business_name || "Your SMS command center."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-panel px-4 py-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Wallet</div>
                  <div className="font-display font-bold text-sm">KES {Number(wallet?.balance_kes ?? 0).toLocaleString()}</div>
                </div>
              </div>
            </div>
            <Link to="/buy-sms" className="rounded-2xl gradient-primary px-5 py-3 text-sm font-semibold text-white shadow-primary hover:shadow-float transition inline-flex items-center gap-2">
              Buy SMS <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-5 hover-lift">
            <div className="flex items-start justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-2xl shadow-primary" style={{ background: s.gradient }}>
                <s.icon className="h-5 w-5 text-white" strokeWidth={2.2} />
              </div>
            </div>
            <div className="mt-4 font-display text-3xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            <div className="text-[11px] text-muted-foreground/70 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <QuickAction to="/campaigns" title="New Campaign" desc="Compose and send bulk SMS to your contacts" icon={Send} />
        <QuickAction to="/contacts" title="Add Contacts" desc="Import CSV or add contacts manually" icon={Users} />
        <QuickAction to="/sender-id" title="Get a Sender ID" desc="Apply for your branded sender ID" icon={Sparkles} />
      </div>

      <div className="glass-card p-6">
        <h2 className="font-display text-lg font-bold">Recent activity</h2>
        <div className="mt-4 text-sm text-muted-foreground">
          No campaigns yet. <Link to="/campaigns" className="text-primary font-medium hover:underline">Send your first one</Link>.
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, title, desc, icon: Icon }: { to: string; title: string; desc: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Link to={to} className="glass-card p-5 hover-lift group">
      <div className="flex items-center justify-between mb-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl gradient-primary shadow-primary">
          <Icon className="h-4.5 w-4.5 text-white" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
      </div>
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
    </Link>
  );
}
