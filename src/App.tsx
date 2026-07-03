import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Campaigns from "@/pages/Campaigns";
import Contacts from "@/pages/Contacts";
import BuySMS from "@/pages/BuySMS";
import Transactions from "@/pages/Transactions";
import SenderID from "@/pages/SenderID";
import Developer from "@/pages/Developer";
import Reseller from "@/pages/Reseller";
import Admin from "@/pages/Admin";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Authenticated */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/buy-sms" element={<BuySMS />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/sender-id" element={<SenderID />} />
        <Route path="/developer" element={<Developer />} />
        <Route path="/settings" element={<Settings />} />
        <Route
          path="/reseller"
          element={
            <ProtectedRoute requireRoles={["reseller", "admin"]}>
              <Reseller />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireRoles={["admin"]}>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
