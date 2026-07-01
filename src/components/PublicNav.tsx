import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function PublicNav() {
  const { session } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-4 z-40 mx-auto w-full max-w-6xl px-4">
      <nav className="glass-card flex items-center justify-between gap-4 rounded-full px-3 py-2.5 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 pl-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl gradient-primary shadow-primary">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="truncate font-display text-lg font-bold tracking-tight">
            Abancool <span className="text-muted-foreground font-medium">Tech</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/" className="rounded-full px-4 py-2 hover:bg-white/40 hover:text-foreground transition">Home</Link>
          <a href="#features" className="rounded-full px-4 py-2 hover:bg-white/40 hover:text-foreground transition">Features</a>
          <a href="#pricing" className="rounded-full px-4 py-2 hover:bg-white/40 hover:text-foreground transition">Pricing</a>
          <a href="#developers" className="rounded-full px-4 py-2 hover:bg-white/40 hover:text-foreground transition">Developers</a>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {session ? (
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-full gradient-primary px-5 py-2.5 text-sm font-semibold text-white shadow-primary hover:shadow-float transition"
            >
              Dashboard
            </button>
          ) : (
            <>
              <Link to="/login" className="hidden sm:inline rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition">
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-full gradient-primary px-5 py-2.5 text-sm font-semibold text-white shadow-primary hover:shadow-float transition"
              >
                Start free
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
