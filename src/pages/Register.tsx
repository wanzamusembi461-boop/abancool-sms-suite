import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, User, Building2, Phone, ArrowRight, Sparkles, Gift } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { BackgroundOrbs } from "@/components/BackgroundOrbs";

const schema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  businessName: z.string().trim().max(150).optional(),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(7, "Phone number required").max(20),
  password: z.string().min(8, "At least 8 characters").max(72),
});

export default function Register() {
  const [form, setForm] = useState({ fullName: "", businessName: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: parsed.data.fullName,
          business_name: parsed.data.businessName ?? "",
          phone: parsed.data.phone,
          country: "KE",
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome to Abancool Tech! You received 5 free SMS.");
    navigate("/dashboard", { replace: true });
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
          <div className="inline-flex items-center gap-2 rounded-full glass-panel px-3 py-1.5 text-xs font-medium mb-4">
            <Gift className="h-3.5 w-3.5 text-primary" />
            5 free SMS on signup
          </div>
          <h1 className="font-display text-3xl font-bold">Create account</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Start sending in under a minute.</p>

          <form onSubmit={submit} className="mt-6 space-y-3.5">
            <InputField icon={User} type="text" placeholder="Full name" value={form.fullName} onChange={set("fullName")} required autoComplete="name" />
            <InputField icon={Building2} type="text" placeholder="Business name (optional)" value={form.businessName} onChange={set("businessName")} autoComplete="organization" />
            <InputField icon={Mail} type="email" placeholder="Email" value={form.email} onChange={set("email")} required autoComplete="email" />
            <InputField icon={Phone} type="tel" placeholder="Phone (e.g. +254712345678)" value={form.phone} onChange={set("phone")} required autoComplete="tel" />
            <InputField icon={Lock} type="password" placeholder="Password (min 8 chars)" value={form.password} onChange={set("password")} required autoComplete="new-password" />

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary px-6 py-3.5 text-sm font-semibold text-white shadow-primary hover:shadow-float transition disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Create account <ArrowRight className="h-4 w-4" /></>)}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have one?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function InputField({
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input {...props} className="glass-input focus:glass-input-focus w-full pl-11 pr-4 py-3.5 text-sm outline-none" />
    </div>
  );
}
