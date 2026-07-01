import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  requireRoles?: AppRole[];
}

export function ProtectedRoute({ children, requireRoles }: Props) {
  const { session, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireRoles && requireRoles.length > 0) {
    const hasRole = requireRoles.some((r) => roles.includes(r));
    if (!hasRole) return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
