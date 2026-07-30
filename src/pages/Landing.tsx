import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Send, Users, BarChart3, Shield, Zap, Globe, Check, Wallet, MessageSquare, Code2, Tag, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicNav } from "@/components/PublicNav";
import { BackgroundOrbs } from "@/components/BackgroundOrbs";

export default function Landing() {
  // Fetch active packages
  const { data: packages = [] } = useQuery({
    queryKey: ["landing-packages"],
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
  return (
    <div className="relative min-h-screen overflow-hidden">
      <BackgroundOrbs />
      <PublicNav />

      {/* HERO */}
      <section className="relative mx-auto max-w-7xl px-4 pt-16 pb-24 sm:pt-24 lg:pt-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-8">
          {/* Left copy */}
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-2 text-xs font-medium text-foreground/80">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-70 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full gradient-primary" />
              </span>
              5 free SMS on signup. No card needed.
            </div>

            <h1 className="mt-6 font-display text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Powerful SMS<br />
              for modern <span className="gradient-text">businesses</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Send bulk SMS, run campaigns, manage contacts and grow your business with a premium
              communication platform built for Africa.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 rounded-full gradient-primary px-7 py-4 text-sm font-semibold text-white shadow-primary transition hover:shadow-float hover:-translate-y-0.5"
              >
                Start free
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/buy-sms"
                className="inline-flex items-center gap-2 rounded-full glass-panel px-7 py-4 text-sm font-semibold text-foreground hover-lift"
              >
                Buy SMS
              </Link>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[
                { k: "7,000+", v: "Businesses" },
                { k: "99.9%", v: "Delivery" },
                { k: "24/7", v: "Support" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="font-display text-2xl font-bold sm:text-3xl gradient-text">{s.k}</dt>
                  <dd className="text-xs text-muted-foreground mt-1">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Right — floating 3D dashboard mock */}
          <div className="relative h-[560px] lg:h-[640px]">
            {/* Big gradient orb behind */}
            <div
              className="absolute right-4 top-8 h-[420px] w-[420px] rounded-[80px] rotate-6 animate-float"
              style={{
                background: "linear-gradient(135deg, oklch(0.82 0.11 45), oklch(0.78 0.16 305), oklch(0.72 0.14 240))",
                boxShadow: "inset -40px -40px 100px oklch(0.4 0.15 285 / 0.4), inset 30px 30px 80px oklch(1 0 0 / 0.4), 0 40px 100px -20px oklch(0.4 0.15 285 / 0.5)",
                filter: "blur(1px)",
              }}
            />
            {/* Main dashboard card */}
            <div className="absolute left-0 top-16 w-[380px] glass-card-lg p-6 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-muted-foreground font-medium">SMS Balance</div>
                  <div className="font-display text-3xl font-bold mt-1">24,850</div>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-primary shadow-primary">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="h-24 mb-3 rounded-2xl relative overflow-hidden" style={{ background: "linear-gradient(180deg, oklch(0.72 0.16 285 / 0.1), transparent)" }}>
                <svg viewBox="0 0 300 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.72 0.16 285)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="oklch(0.72 0.16 285)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,70 C40,60 60,40 100,45 C140,50 160,25 200,20 C240,15 260,35 300,30 L300,100 L0,100 Z" fill="url(#grad)" />
                  <path d="M0,70 C40,60 60,40 100,45 C140,50 160,25 200,20 C240,15 260,35 300,30" stroke="oklch(0.62 0.19 288)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </svg>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ l: "Sent", v: "18.2K" }, { l: "Delivered", v: "99.2%" }, { l: "Failed", v: "142" }].map((s) => (
                  <div key={s.l} className="rounded-xl bg-white/50 p-2.5">
                    <div className="text-[10px] text-muted-foreground">{s.l}</div>
                    <div className="font-semibold text-sm mt-0.5">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating campaign card */}
            <div className="absolute right-0 top-0 w-[240px] glass-card p-4 animate-float" style={{ animationDelay: "0.3s" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "linear-gradient(135deg, oklch(0.85 0.11 45), oklch(0.78 0.14 25))" }}>
                  <Send className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">Weekend Promo</div>
                  <div className="text-[10px] text-muted-foreground">Sent 2.4k · 98% delivered</div>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-white/50 overflow-hidden">
                <div className="h-full w-[92%] rounded-full gradient-primary" />
              </div>
            </div>

            {/* Floating orb */}
            <div className="orb-3d absolute right-16 top-[360px] h-32 w-32 animate-float-slow" />

            {/* Notification card */}
            <div className="absolute right-8 bottom-8 w-[280px] glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.45s" }}>
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: "linear-gradient(135deg, oklch(0.72 0.14 155), oklch(0.65 0.16 165))" }}>
                  <Check className="h-4 w-4 text-white" strokeWidth={3} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Payment received</div>
                  <div className="text-xs text-muted-foreground mt-0.5">KES 5,000 · 10,000 SMS credited</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full glass-panel px-3 py-1.5 text-xs font-medium">
            Everything you need
          </div>
          <h2 className="font-display text-4xl font-bold mt-4 sm:text-5xl">
            Built for teams that <span className="gradient-text">move fast</span>
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            { i: Send, t: "Bulk campaigns", d: "Send to thousands with schedule, templates, and personalization variables.", g: "linear-gradient(135deg, oklch(0.78 0.16 305), oklch(0.62 0.19 288))" },
            { i: Users, t: "Contact manager", d: "Import CSV, tag, group, and search. Duplicate detection built-in.", g: "linear-gradient(135deg, oklch(0.85 0.11 45), oklch(0.78 0.14 25))" },
            { i: Tag, t: "Custom Sender IDs", d: "Apply for branded sender IDs. Approval workflow with status tracking.", g: "linear-gradient(135deg, oklch(0.82 0.09 220), oklch(0.65 0.14 235))" },
            { i: BarChart3, t: "Delivery reports", d: "Real-time analytics on delivery, opens, and campaign performance.", g: "linear-gradient(135deg, oklch(0.72 0.14 155), oklch(0.62 0.16 170))" },
            { i: Code2, t: "Developer API", d: "REST API with keys, scopes, rate limits, and full documentation.", g: "linear-gradient(135deg, oklch(0.72 0.16 285), oklch(0.62 0.19 250))" },
            { i: Wallet, t: "M-Pesa top-ups", d: "Buy SMS credits with M-Pesa STK Push. Balance updates instantly.", g: "linear-gradient(135deg, oklch(0.72 0.14 155), oklch(0.82 0.11 90))" },
          ].map(({ i: Icon, t, d, g }) => (
            <div key={t} className="glass-card p-6 hover-lift">
              <div className="grid h-12 w-12 place-items-center rounded-2xl shadow-primary mb-4" style={{ background: g }}>
                <Icon className="h-5 w-5 text-white" strokeWidth={2.2} />
              </div>
              <h3 className="font-display text-lg font-bold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">
            Pay only for what you <span className="gradient-text">send</span>
          </h2>
          <p className="mt-4 text-muted-foreground">Volume pricing. Pay with M-Pesa. No monthly fees.</p>
        </div>

        {packages.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
            {packages.map((pkg) => {
              const featured = pkg.slug === "popular";
              return (
                <div key={pkg.id} className={`relative glass-card-lg p-7 hover-lift ${featured ? "ring-2 ring-primary/40" : ""}`}>
                  {featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-primary px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-primary">
                      {pkg.name === "Popular" ? "Popular" : "Most popular"}
                    </div>
                  )}
                  <div className="text-sm font-medium text-muted-foreground">{pkg.name}</div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-display text-5xl font-black">{pkg.sms_count.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground ml-1">SMS</span>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-semibold gradient-text">KES {Number(pkg.price_per_sms).toFixed(2)}</span>
                    <span className="text-muted-foreground"> / SMS</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Total: KES {Number(pkg.total_price).toLocaleString()}
                  </div>
                  <div className="my-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                  <ul className="space-y-2.5 text-sm">
                    {["All countries in Africa", "Delivery reports", "API access", "24/7 support"].map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <div className="grid h-5 w-5 place-items-center rounded-full gradient-primary">
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </div>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className={`mt-6 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition ${
                      featured ? "gradient-primary text-white shadow-primary hover:shadow-float" : "glass-panel hover:bg-white/70"
                    }`}
                  >
                    Get started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* DEV BAND */}
      <section id="developers" className="mx-auto max-w-7xl px-4 py-20">
        <div className="glass-card-lg p-8 md:p-14 grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full glass-panel px-3 py-1.5 text-xs font-medium">
              <Code2 className="h-3.5 w-3.5" /> Developers
            </div>
            <h3 className="mt-5 font-display text-3xl sm:text-4xl font-bold">
              A REST API you'll actually <span className="gradient-text">enjoy using</span>
            </h3>
            <p className="mt-4 text-muted-foreground max-w-lg">
              Generate scoped API keys, send SMS, check balance, poll delivery reports.
              Rate-limited, versioned, documented.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {[Zap, Shield, Globe].map((I, i) => (
                <div key={i} className="flex items-center gap-2 rounded-full glass-panel px-4 py-2 text-xs font-medium">
                  <I className="h-3.5 w-3.5 text-primary" />
                  {["Rate limited", "HMAC signed", "Global"][i]}
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel p-5 font-mono text-xs leading-relaxed overflow-hidden">
            <div className="flex gap-1.5 mb-4">
              <div className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-success/70" />
            </div>
            <pre className="text-foreground/90 whitespace-pre-wrap">
{`curl https://api.abancooltech.com/v1/sms \\
  -H "Authorization: Bearer $ABCL_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": ["+254700000000"],
    "from": "ABANCOOL",
    "message": "Hello from Abancool Tech!"
  }'`}
            </pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <div className="glass-card-lg relative overflow-hidden p-10 md:p-16 text-center">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-60 animate-float"
               style={{ background: "radial-gradient(circle, oklch(0.78 0.16 305 / 0.7), transparent 70%)" }} />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full opacity-50 animate-float-slow"
               style={{ background: "radial-gradient(circle, oklch(0.82 0.11 45 / 0.6), transparent 70%)" }} />
          <div className="relative">
            <Sparkles className="h-8 w-8 mx-auto text-primary" />
            <h2 className="mt-4 font-display text-3xl sm:text-5xl font-bold">
              Ready to send your first <span className="gradient-text">campaign?</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Create an account in 30 seconds. Get 5 free SMS to test the platform.
            </p>
            <Link
              to="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-full gradient-primary px-8 py-4 text-sm font-semibold text-white shadow-primary hover:shadow-float transition hover:-translate-y-0.5"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-4 py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Abancool Tech. Built for African businesses.
      </footer>
    </div>
  );
}
