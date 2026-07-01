import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { BackgroundOrbs } from "@/components/BackgroundOrbs";

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <BackgroundOrbs />
      <div className="glass-card-lg p-10 text-center max-w-md">
        <div className="font-display text-7xl font-black gradient-text">404</div>
        <h1 className="mt-4 font-display text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-2xl gradient-primary px-6 py-3 text-sm font-semibold text-white shadow-primary hover:shadow-float transition">
          <Home className="h-4 w-4" /> Go home
        </Link>
      </div>
    </div>
  );
}
