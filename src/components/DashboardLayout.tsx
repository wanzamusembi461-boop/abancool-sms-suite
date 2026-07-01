import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Send, Users, Wallet, Tag, Code2, Settings, LogOut,
  Sparkles, Shield, Store, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BackgroundOrbs } from "./BackgroundOrbs";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/campaigns", label: "Campaigns", icon: Send },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/buy-sms", label: "Buy SMS", icon: Wallet },
  { to: "/sender-id", label: "Sender IDs", icon: Tag },
  { to: "/developer", label: "Developer", icon: Code2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function DashboardLayout() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isReseller = roles.includes("reseller");
  const isAdmin = roles.includes("admin");

  const roleNav = [
    ...(isReseller ? [{ to: "/reseller", label: "Reseller", icon: Store }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="relative min-h-screen">
      <BackgroundOrbs />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/40 bg-white/40 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl gradient-primary shadow-primary">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-display font-bold">Abancool</span>
        </Link>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-xl glass-panel"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 transform p-4 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="glass-card-lg flex h-full flex-col p-5">
            <Link to="/dashboard" className="mb-8 flex items-center gap-3 px-2">
              <div className="grid h-11 w-11 place-items-center rounded-2xl gradient-primary shadow-primary">
                <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="font-display text-lg font-bold leading-tight">Abancool</div>
                <div className="text-xs text-muted-foreground">SMS Platform</div>
              </div>
            </Link>

            <nav className="flex-1 space-y-1">
              {[...nav, ...roleNav].map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "gradient-primary text-white shadow-primary"
                        : "text-foreground/70 hover:bg-white/50 hover:text-foreground"
                    }`
                  }
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </nav>

            {/* User card */}
            <div className="mt-4 glass-panel p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full gradient-primary text-sm font-bold text-white shadow-primary">
                  {(user?.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{user?.email}</div>
                  <div className="truncate text-xs text-muted-foreground capitalize">
                    {roles[0] ?? "customer"}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/60 py-2 text-sm font-medium text-foreground/80 hover:bg-white/80 transition"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          />
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 p-4 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
