import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, DollarSign, Settings, FileText, AlertCircle, Activity, MessageSquare, Plus, Search, Edit, Trash2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Admin() {
  const queryClient = useQueryClient();
  const [selectedEnv, setSelectedEnv] = useState("sandbox");
  const [searchUser, setSearchUser] = useState("");
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [supportForm, setSupportForm] = useState({ subject: "", message: "", priority: "normal" });
  const [packagesDialogOpen, setPackagesDialogOpen] = useState(false);
  const [packageForm, setPackageForm] = useState({ name: "", sms_count: 0, total_price: 0 });

  // Fetch users from profiles table (not auth)
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users", searchUser],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*, user_roles(role)")
        .order("created_at", { ascending: false });

      if (searchUser) {
        query = query.or(`email.ilike.%${searchUser}%,full_name.ilike.%${searchUser}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch packages
  const { data: packages = [] } = useQuery({
    queryKey: ["admin-packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("packages").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch support tickets
  const { data: tickets = [] } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      // Mock data - would be from a tickets table
      return [
        { id: "1", user: "john@example.com", subject: "Payment issue", priority: "high", created_at: new Date() },
        { id: "2", user: "jane@example.com", subject: "API question", priority: "normal", created_at: new Date() },
      ];
    },
  });

  // Add credit mutation
  const addCreditMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId || !creditAmount) throw new Error("User and amount required");
      
      // Log to audit
      await supabase.from("notifications").insert({
        user_id: selectedUserId,
        title: "Admin Credit",
        body: `${creditAmount} SMS credited by admin. Reason: ${creditReason}`,
        kind: "info",
      });

      // Credit SMS
      await supabase.rpc("credit_sms", {
        _user_id: selectedUserId,
        _amount: parseInt(creditAmount),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setCreditAmount("");
      setCreditReason("");
      setSelectedUserId(null);
      setCreditDialogOpen(false);
      toast.success("SMS credited");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Update package
  const updatePackageMutation = useMutation({
    mutationFn: async (pkg: any) => {
      const { error } = await supabase
        .from("packages")
        .update({ is_active: !pkg.is_active })
        .eq("id", pkg.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      toast.success("Package updated");
    },
  });

  const stats = {
    totalUsers: users.length,
    totalTransactions: transactions.length,
    totalRevenue: transactions.reduce((sum, t) => sum + Number(t.amount_kes), 0),
    todayRevenue: transactions
      .filter((t) => {
        const today = new Date().toDateString();
        return new Date(t.created_at).toDateString() === today;
      })
      .reduce((sum, t) => sum + Number(t.amount_kes), 0),
    pendingTickets: tickets.filter((t) => t.priority === "high").length,
  };

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Admin Console</h1>
        <p className="text-sm text-muted-foreground mt-1">Complete platform management and oversight.</p>
      </div>

      <TabsList className="grid w-full max-w-4xl grid-cols-7 glass-panel">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="packages">Packages</TabsTrigger>
        <TabsTrigger value="support">Support</TabsTrigger>
        <TabsTrigger value="gateway">Gateway</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>

      {/* Overview */}
      <TabsContent value="overview" className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-5">
          <Card className="glass-card p-5">
            <Users className="h-5 w-5 text-primary mb-2" />
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Users</div>
            <div className="font-display text-3xl font-bold">{stats.totalUsers}</div>
          </Card>
          <Card className="glass-card p-5">
            <DollarSign className="h-5 w-5 text-primary mb-2" />
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Total Revenue</div>
            <div className="font-display text-2xl font-bold">
              KES {Math.round(stats.totalRevenue).toLocaleString()}
            </div>
          </Card>
          <Card className="glass-card p-5">
            <Activity className="h-5 w-5 text-primary mb-2" />
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Today</div>
            <div className="font-display text-2xl font-bold text-green-600">
              KES {Math.round(stats.todayRevenue).toLocaleString()}
            </div>
          </Card>
          <Card className="glass-card p-5">
            <AlertCircle className="h-5 w-5 text-primary mb-2" />
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Transactions</div>
            <div className="font-display text-3xl font-bold">{stats.totalTransactions}</div>
          </Card>
          <Card className="glass-card p-5">
            <MessageSquare className="h-5 w-5 text-primary mb-2" />
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Tickets</div>
            <div className="font-display text-3xl font-bold text-red-600">{stats.pendingTickets}</div>
          </Card>
        </div>
      </TabsContent>

      {/* Users */}
      <TabsContent value="users" className="space-y-4">
        <div className="flex gap-3">
          <Input
            placeholder="Search users..."
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            className="flex-1"
          />
        </div>

        <Card className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Email</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.slice(0, 20).map((user: any) => (
                <TableRow key={user.id} className="hover:bg-white/50">
                  <TableCell className="font-medium text-sm">{user.email}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <select className="px-2 py-1 rounded text-sm border border-border bg-white">
                      <option>{user.user_roles?.[0]?.role || "customer"}</option>
                      <option>Customer</option>
                      <option>Reseller</option>
                      <option>Developer</option>
                      <option>Admin</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <Dialog open={creditDialogOpen && selectedUserId === user.id} onOpenChange={(open) => {
                      setCreditDialogOpen(open);
                      if (open) setSelectedUserId(user.id);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => setSelectedUserId(user.id)}>
                          <CreditCard className="h-3 w-3 mr-1" />
                          Credit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="glass-card-lg">
                        <DialogHeader>
                          <DialogTitle>Add SMS Credit to {user.full_name || user.email}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Amount (SMS)</Label>
                            <Input
                              type="number"
                              placeholder="100"
                              value={creditAmount}
                              onChange={(e) => setCreditAmount(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Reason</Label>
                            <Textarea
                              placeholder="Admin credit reason..."
                              value={creditReason}
                              onChange={(e) => setCreditReason(e.target.value)}
                              className="mt-1 h-20"
                            />
                          </div>
                          <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setCreditDialogOpen(false)} className="flex-1">
                              Cancel
                            </Button>
                            <Button
                              onClick={() => addCreditMutation.mutate()}
                              disabled={addCreditMutation.isPending}
                              className="flex-1 gradient-primary text-white"
                            >
                              {addCreditMutation.isPending ? "Processing..." : "Credit"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      {/* Payments */}
      <TabsContent value="payments" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3 mb-4">
          <Card className="glass-card p-4">
            <div className="text-xs font-semibold text-muted-foreground mb-1">Total Payments</div>
            <div className="font-display text-2xl font-bold">
              KES {Math.round(stats.totalRevenue).toLocaleString()}
            </div>
          </Card>
          <Card className="glass-card p-4">
            <div className="text-xs font-semibold text-muted-foreground mb-1">Completed</div>
            <div className="font-display text-2xl font-bold text-green-600">
              {transactions.filter((t) => t.status === "completed").length}
            </div>
          </Card>
          <Card className="glass-card p-4">
            <div className="text-xs font-semibold text-muted-foreground mb-1">Failed</div>
            <div className="font-display text-2xl font-bold text-red-600">
              {transactions.filter((t) => t.status === "failed").length}
            </div>
          </Card>
        </div>

        <Card className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 20).map((tx) => (
                <TableRow key={tx.id} className="hover:bg-white/50">
                  <TableCell className="text-sm">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-semibold">
                    KES {Number(tx.amount_kes).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        tx.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : tx.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {tx.mpesa_receipt || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      {/* Packages */}
      <TabsContent value="packages" className="space-y-4">
        <div className="flex justify-end">
          <Dialog open={packagesDialogOpen} onOpenChange={setPackagesDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Package
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card-lg">
              <DialogHeader>
                <DialogTitle>Create Package</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Package Name</Label>
                  <Input
                    placeholder="E.g., Pro Plan"
                    value={packageForm.name}
                    onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>SMS Count</Label>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={packageForm.sms_count}
                    onChange={(e) =>
                      setPackageForm({ ...packageForm, sms_count: parseInt(e.target.value) || 0 })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Price (KES)</Label>
                  <Input
                    type="number"
                    placeholder="5000"
                    value={packageForm.total_price}
                    onChange={(e) =>
                      setPackageForm({ ...packageForm, total_price: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setPackagesDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button className="flex-1 gradient-primary text-white">Create</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>SMS</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id} className="hover:bg-white/50">
                  <TableCell className="font-medium">{pkg.name}</TableCell>
                  <TableCell>{pkg.sms_count.toLocaleString()}</TableCell>
                  <TableCell>KES {Number(pkg.total_price).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${pkg.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {pkg.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updatePackageMutation.mutate(pkg)}
                    >
                      {pkg.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      {/* Support Tickets */}
      <TabsContent value="support" className="space-y-4">
        <Card className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id} className="hover:bg-white/50">
                  <TableCell className="text-sm">{ticket.user}</TableCell>
                  <TableCell className="font-medium">{ticket.subject}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      ticket.priority === "high" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {ticket.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setSupportDialogOpen(true)}>
                      Reply
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      {/* Gateway */}
      <TabsContent value="gateway" className="space-y-4">
        <Card className="glass-card p-6 space-y-4">
          <h2 className="font-semibold mb-4">SMS Gateway Configuration</h2>
          <div className="space-y-4">
            <div>
              <Label>Environment</Label>
              <select
                value={selectedEnv}
                onChange={(e) => setSelectedEnv(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-white"
              >
                <option value="sandbox">Sandbox (Testing)</option>
                <option value="production">Production (Live)</option>
              </select>
            </div>
            <div>
              <Label>SMS Provider</Label>
              <select className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-white">
                <option>Africa's Talking</option>
                <option>Twilio</option>
                <option>Nexmo</option>
              </select>
            </div>
            <div>
              <Label>Daily SMS Limit</Label>
              <Input type="number" placeholder="100000" className="mt-1" />
            </div>
            <div>
              <Label>Minimum Package (KES) - Allow users with this balance to buy SMS</Label>
              <Input type="number" placeholder="50" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">
                Users with at least this KES balance can purchase SMS packages
              </p>
            </div>
            <Button className="w-full gradient-primary text-white">Update Settings</Button>
          </div>
        </Card>
      </TabsContent>

      {/* Reports */}
      <TabsContent value="reports" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Button variant="outline" className="h-24 flex flex-col">
            <FileText className="h-6 w-6 mb-2" />
            Export Users
          </Button>
          <Button variant="outline" className="h-24 flex flex-col">
            <FileText className="h-6 w-6 mb-2" />
            Export Transactions
          </Button>
          <Button variant="outline" className="h-24 flex flex-col">
            <FileText className="h-6 w-6 mb-2" />
            Export SMS Logs
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
