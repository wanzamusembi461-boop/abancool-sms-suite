import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Download, Filter, Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type TransactionStatus = "pending" | "completed" | "failed" | "cancelled";

interface Transaction {
  id: string;
  package_id?: string;
  amount_kes: number;
  sms_credited: number;
  mpesa_receipt?: string;
  status: TransactionStatus;
  created_at: string;
  packages?: { name: string; sms_count: number };
}

export default function Transactions() {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "all">("all");

  // Query transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", user?.id, fromDate, toDate, statusFilter],
    enabled: !!user?.id,
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*, packages(name, sms_count)")
        .eq("user_id", user!.id)
        .gte("created_at", `${fromDate}T00:00:00`)
        .lte("created_at", `${toDate}T23:59:59`)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate summary
  const summary = {
    total: transactions.reduce((sum, t) => sum + t.amount_kes, 0),
    completed: transactions.reduce(
      (sum, t) => sum + (t.status === "completed" ? t.amount_kes : 0),
      0
    ),
    pending: transactions.filter((t) => t.status === "pending").length,
    failed: transactions.filter((t) => t.status === "failed").length,
  };

  // CSV Export
  const handleExport = () => {
    const headers = ["Date", "Amount", "Status", "Receipt", "SMS Count"];
    const rows = transactions.map((t) => [
      format(new Date(t.created_at), "MMM dd, yyyy HH:mm"),
      `KES ${t.amount_kes}`,
      t.status,
      t.mpesa_receipt || "—",
      t.sms_credited,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        r
          .map((v) => (typeof v === "string" && v.includes(",") ? `"${v}"` : v))
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Status badge
  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Transactions</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">View all your M-Pesa payment history.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card p-5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Total Spent
          </div>
          <div className="font-display text-2xl font-bold">
            KES {summary.total.toLocaleString()}
          </div>
        </Card>
        <Card className="glass-card p-5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Completed
          </div>
          <div className="font-display text-2xl font-bold text-green-600">
            KES {summary.completed.toLocaleString()}
          </div>
        </Card>
        <Card className="glass-card p-5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Pending
          </div>
          <div className="font-display text-2xl font-bold text-yellow-600">
            {summary.pending}
          </div>
        </Card>
        <Card className="glass-card p-5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Failed
          </div>
          <div className="font-display text-2xl font-bold text-red-600">
            {summary.failed}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filters</span>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {/* From Date */}
          <div>
            <Label htmlFor="from-date" className="text-xs">
              From
            </Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1.5"
            />
          </div>

          {/* To Date */}
          <div>
            <Label htmlFor="to-date" className="text-xs">
              To
            </Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1.5"
            />
          </div>

          {/* Status Filter */}
          <div>
            <Label htmlFor="status-filter" className="text-xs">
              Status
            </Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger id="status-filter" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Button */}
          <div className="flex items-end">
            <Button
              onClick={handleExport}
              disabled={transactions.length === 0}
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">No transactions</h3>
            <p className="text-sm text-muted-foreground">
              You haven't made any purchases yet.{" "}
              <a href="/buy-sms" className="text-primary font-medium hover:underline">
                Buy SMS credits
              </a>{" "}
              to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-xs font-semibold uppercase">Date</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Amount</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">SMS Count</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-white/50 border-border/30">
                    <TableCell className="text-sm">
                      {format(new Date(tx.created_at), "MMM dd, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm font-semibold">
                      KES {tx.amount_kes.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell className="text-sm">{tx.sms_credited.toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {tx.mpesa_receipt || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

