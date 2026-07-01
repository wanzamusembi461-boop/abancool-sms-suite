import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BackgroundOrbs } from "@/components/BackgroundOrbs";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Reset link sent");
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 py-12">
      <BackgroundOrbs />

      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="grid h-10 w-10 place-items-center rounded-2xl gradient-primary shadow-primary">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold">Abancool Tech</span>
        </Link>

        <div className="glass-card-lg p-8">
          <h1 className="font-display text-3xl font-bold">Reset password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Enter your email and we'll send you a link.</p>

          {sent ? (
            <div className="mt-6 rounded-2xl glass-panel p-5 text-sm">
              Check <span className="font-semibold">{email}</span> for a reset link. It may take a minute to arrive.
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email" required autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  className="glass-input focus:glass-input-focus w-full pl-11 pr-4 py-3.5 text-sm outline-none"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary px-6 py-3.5 text-sm font-semibold text-white shadow-primary hover:shadow-float transition disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
              </button>
            </form>
          )}

          <Link to="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
