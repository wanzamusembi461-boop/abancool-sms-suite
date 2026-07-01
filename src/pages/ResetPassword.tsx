import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BackgroundOrbs } from "@/components/BackgroundOrbs";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 py-12">
      <BackgroundOrbs />

      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="grid h-10 w-10 place-items-center rounded-2xl gradient-primary shadow-primary">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold">Abancool Tech</span>
        </div>

        <div className="glass-card-lg p-8">
          <h1 className="font-display text-3xl font-bold">Set new password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Pick something strong.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password" required autoComplete="new-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                className="glass-input focus:glass-input-focus w-full pl-11 pr-4 py-3.5 text-sm outline-none"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary px-6 py-3.5 text-sm font-semibold text-white shadow-primary hover:shadow-float transition disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
