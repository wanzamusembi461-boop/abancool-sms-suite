import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function Settings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", business_name: "", phone: "", country: "KE" });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        business_name: profile.business_name ?? "",
        phone: profile.phone ?? "",
        country: profile.country ?? "KE",
      });
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(form).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Manage your account and business details.</p>
      </div>

      <div className="glass-card-lg p-6">
        <h2 className="font-display text-lg font-bold mb-5">Profile</h2>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <Field label="Email" value={user?.email ?? ""} disabled />
            <Field label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
            <Field label="Business name" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} />
            <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />

            <button
              type="submit"
              disabled={save.isPending}
              className="mt-2 inline-flex items-center gap-2 rounded-2xl gradient-primary px-6 py-3 text-sm font-semibold text-white shadow-primary hover:shadow-float transition disabled:opacity-60"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled }: { label: string; value: string; onChange?: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground/80 mb-1.5 block">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="glass-input focus:glass-input-focus w-full px-4 py-3 text-sm outline-none disabled:opacity-60"
      />
    </label>
  );
}
