import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, DollarSign, Settings as SettingsIcon, FileText, AlertCircle, Activity,
  MessageSquare, Plus, CreditCard, Store, Trash2, Edit,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface PackageForm {
  id?: string;
  name: string;
  slug: string;
  sms_count: number;
  total_price: number;
  price_per_sms: number;
  description: string;
  notes: string;
  sort_order: number;
  is_active: boolean;
}

interface MarketForm {
  id?: string;
  name: string;
  code: string;
  description: string;
  price_kes: number;
  sort_order: number;
  is_active: boolean;
}

const emptyPkg: PackageForm = {
  name: "", slug: "", sms_count: 0, total_price: 0, price_per_sms: 0.5,
  description: "", notes: "", sort_order: 0, is_active: true,
};

const emptyMarket: MarketForm = {
  name: "", code: "", description: "", price_kes: 5000, sort_order: 0, is_active: true,
};

export default function Admin() {
  const qc = useQueryClient();
  const [searchUser, setSearchUser] = useState("");
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [pkgDialogOpen, setPkgDialogOpen] = useState(false);
  const [pkgForm, setPkgForm] = useState<PackageForm>(emptyPkg);
  const [marketDialogOpen, setMarketDialogOpen] = useState(false);
  const [marketForm, setMarketForm] = useState<MarketForm>(emptyMarket);
  const [smsSearch, setSmsSearch] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users", searchUser],
    queryFn: async () => {
      let q = supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false });
      if (searchUser) q = q.or(`email.ilike.%${searchUser}%,full_name.ilike.%${searchUser}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["admin-packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("packages").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: marketplace = [] } = useQuery({
    queryKey: ["admin-marketplace"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sender_id_marketplace").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: smsLogs = [] } = useQuery({
    queryKey: ["admin-sms-logs", smsSearch],
    queryFn: async () => {
      let q = supabase.from("sms_logs").select("*").order("created_at", { ascending: false }).limit(200);
      if (smsSearch) q = q.ilike("phone", `%${smsSearch}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: senderIdReqs = [] } = useQuery({
    queryKey: ["admin-sender-reqs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sender_ids").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: talksasaBalance } = useQuery({
    queryKey: ["talksasa-balance"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("talksasa-balance", { method: "GET" });
      if (error) return null;
      return data?.upstream ?? null;
    },
    refetchInterval: 60_000,
  });

  const addCredit = useMutation({
    mutationFn: async () => {
      if (!selectedUserId || !creditAmount) throw new Error("User and amount required");
      const amt = parseInt(creditAmount);
      const { error } = await supabase.rpc("credit_sms", { _user_id: selectedUserId, _amount: amt });
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: selectedUserId,
        title: "Admin Credit",
        body: `${amt} SMS credited by admin.${creditReason ? ` Reason: ${creditReason}` : ""}`,
        kind: "info",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setCreditAmount(""); setCreditReason(""); setSelectedUserId(null); setCreditDialogOpen(false);
      toast.success("SMS credited");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const savePkg = useMutation({
    mutationFn: async () => {
      const payload = {
        name: pkgForm.name,
        slug: pkgForm.slug || pkgForm.name.toLowerCase().replace(/\s+/g, "-"),
        sms_count: pkgForm.sms_count,
        total_price: pkgForm.total_price,
        price_per_sms: pkgForm.price_per_sms,
        description: pkgForm.description || null,
        notes: pkgForm.notes || null,
        sort_order: pkgForm.sort_order,
        is_active: pkgForm.is_active,
      };
      if (pkgForm.id) {
        const { error } = await supabase.from("packages").update(payload).eq("id", pkgForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("packages").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-packages"] });
      qc.invalidateQueries({ queryKey: ["packages"] });
      setPkgDialogOpen(false); setPkgForm(emptyPkg);
      toast.success("Package saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePkg = useMutation({
    mutationFn: async (pkg: any) => {
      const { error } = await supabase.from("packages").update({ is_active: !pkg.is_active }).eq("id", pkg.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-packages"] }); toast.success("Updated"); },
  });

  const deletePkg = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-packages"] }); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMarket = useMutation({
    mutationFn: async () => {
      const payload = {
        name: marketForm.name,
        code: marketForm.code.toUpperCase(),
        description: marketForm.description || null,
        price_kes: marketForm.price_kes,
        sort_order: marketForm.sort_order,
        is_active: marketForm.is_active,
      };
      if (marketForm.id) {
        const { error } = await supabase.from("sender_id_marketplace").update(payload).eq("id", marketForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sender_id_marketplace").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-marketplace"] });
      qc.invalidateQueries({ queryKey: ["marketplace-public"] });
      setMarketDialogOpen(false); setMarketForm(emptyMarket);
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMarket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sender_id_marketplace").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-marketplace"] }); toast.success("Deleted"); },
  });

  const approveSenderId = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" | "active" | "pending" }) => {
      const { error } = await supabase.from("sender_ids").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-sender-reqs"] }); toast.success("Updated"); },
  });

  const stats = {
    totalUsers: users.length,
    totalTransactions: transactions.length,
    totalRevenue: transactions.filter((t) => t.status === "completed").reduce((s, t) => s + Number(t.amount_kes), 0),
    todayRevenue: transactions
      .filter((t) => t.status === "completed" && new Date(t.created_at).toDateString() === new Date().toDateString())
      .reduce((s, t) => s + Number(t.amount_kes), 0),
    totalSms: smsLogs.length,
  };

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Admin Console</h1>
        <p className="text-sm text-muted-foreground mt-1">Complete platform management and oversight.</p>
      </div>

      <TabsList className="grid w-full max-w-5xl grid-cols-7 glass-panel">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="packages">Packages</TabsTrigger>
        <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
        <TabsTrigger value="sender-ids">Sender IDs</TabsTrigger>
        <TabsTrigger value="sms-logs">SMS Logs</TabsTrigger>
      </TabsList>

      {/* OVERVIEW */}
      <TabsContent value="overview" className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-5">
          <Card className="glass-card p-5">
            <Users className="h-5 w-5 text-primary mb-2" />
            <div className="text-xs font-semibold uppercase text-muted-foreground">Users</div>
            <div className="font-display text-3xl font-bold">{stats.totalUsers}</div>
          </Card>
          <Card className="glass-card p-5">
            <DollarSign className="h-5 w-5 text-primary mb-2" />
            <div className="text-xs font-semibold uppercase text-muted-foreground">Revenue</div>
            <div className="font-display text-2xl font-bold">KES {Math.round(stats.totalRevenue).toLocaleString()}</div>
          </Card>
          <Card className="glass-card p-5">
            <Activity className="h-5 w-5 text-primary mb-2" />
            <div className="text-xs font-semibold uppercase text-muted-foreground">Today</div>
            <div className="font-display text-2xl font-bold text-green-600">KES {Math.round(stats.todayRevenue).toLocaleString()}</div>
          </Card>
          <Card className="glass-card p-5">
            <AlertCircle className="h-5 w-5 text-primary mb-2" />
            <div className="text-xs font-semibold uppercase text-muted-foreground">Transactions</div>
            <div className="font-display text-3xl font-bold">{stats.totalTransactions}</div>
          </Card>
          <Card className="glass-card p-5">
            <MessageSquare className="h-5 w-5 text-primary mb-2" />
            <div className="text-xs font-semibold uppercase text-muted-foreground">SMS Sent</div>
            <div className="font-display text-3xl font-bold">{stats.totalSms}</div>
          </Card>
        </div>
      </TabsContent>

      {/* USERS */}
      <TabsContent value="users" className="space-y-4">
        <Input placeholder="Search users..." value={searchUser} onChange={(e) => setSearchUser(e.target.value)} />
        <Card className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.slice(0, 50).map((u: any) => (
                <TableRow key={u.id} className="hover:bg-white/50">
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm capitalize">{u.user_roles?.[0]?.role ?? "customer"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedUserId(u.id); setCreditDialogOpen(true); }}>
                      <CreditCard className="h-3 w-3 mr-1" /> Credit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
          <DialogContent className="glass-card-lg">
            <DialogHeader><DialogTitle>Credit SMS to user</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Amount (SMS)</Label>
                <Input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Reason (optional)</Label>
                <Textarea value={creditReason} onChange={(e) => setCreditReason(e.target.value)} className="mt-1 h-20" />
              </div>
              <Button onClick={() => addCredit.mutate()} disabled={addCredit.isPending} className="w-full gradient-primary text-white">
                {addCredit.isPending ? "Processing..." : "Credit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </TabsContent>

      {/* PAYMENTS */}
      <TabsContent value="payments" className="space-y-4">
        <Card className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>SMS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 100).map((tx: any) => (
                <TableRow key={tx.id} className="hover:bg-white/50">
                  <TableCell className="text-xs">{new Date(tx.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{tx.phone}</TableCell>
                  <TableCell className="text-xs capitalize">{tx.type ?? "sms"}</TableCell>
                  <TableCell className="font-semibold">KES {Number(tx.amount_kes).toLocaleString()}</TableCell>
                  <TableCell>{tx.sms_credited}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      tx.status === "completed" ? "bg-green-100 text-green-800" :
                      tx.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>{tx.status}</span>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{tx.mpesa_receipt ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      {/* PACKAGES */}
      <TabsContent value="packages" className="space-y-4">
        <div className="flex justify-end">
          <Button className="gradient-primary text-white" onClick={() => { setPkgForm(emptyPkg); setPkgDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Package
          </Button>
        </div>
        <Card className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>SMS</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Per SMS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((p: any) => (
                <TableRow key={p.id} className="hover:bg-white/50">
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.sms_count.toLocaleString()}</TableCell>
                  <TableCell>KES {Number(p.total_price).toLocaleString()}</TableCell>
                  <TableCell>KES {Number(p.price_per_sms).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${p.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => { setPkgForm({
                      id: p.id, name: p.name, slug: p.slug, sms_count: p.sms_count,
                      total_price: Number(p.total_price), price_per_sms: Number(p.price_per_sms),
                      description: p.description ?? "", notes: p.notes ?? "",
                      sort_order: p.sort_order, is_active: p.is_active,
                    }); setPkgDialogOpen(true); }}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => togglePkg.mutate(p)}>
                      {p.is_active ? "Off" : "On"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => {
                      if (confirm(`Delete ${p.name}?`)) deletePkg.mutate(p.id);
                    }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={pkgDialogOpen} onOpenChange={setPkgDialogOpen}>
          <DialogContent className="glass-card-lg max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{pkgForm.id ? "Edit" : "New"} Package</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={pkgForm.slug} placeholder="auto-generated if empty" onChange={(e) => setPkgForm({ ...pkgForm, slug: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>SMS Count</Label><Input type="number" value={pkgForm.sms_count} onChange={(e) => setPkgForm({ ...pkgForm, sms_count: parseInt(e.target.value) || 0 })} /></div>
                <div><Label>Total Price (KES)</Label><Input type="number" value={pkgForm.total_price} onChange={(e) => setPkgForm({ ...pkgForm, total_price: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price per SMS</Label><Input type="number" step="0.01" value={pkgForm.price_per_sms} onChange={(e) => setPkgForm({ ...pkgForm, price_per_sms: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Sort Order</Label><Input type="number" value={pkgForm.sort_order} onChange={(e) => setPkgForm({ ...pkgForm, sort_order: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div><Label>Description</Label><Input value={pkgForm.description} onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })} /></div>
              <div><Label>Notes / Badge Text</Label><Input value={pkgForm.notes} onChange={(e) => setPkgForm({ ...pkgForm, notes: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={pkgForm.is_active} onCheckedChange={(v) => setPkgForm({ ...pkgForm, is_active: v })} /><Label>Active</Label></div>
              <Button onClick={() => savePkg.mutate()} disabled={savePkg.isPending} className="w-full gradient-primary text-white">
                {savePkg.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </TabsContent>

      {/* MARKETPLACE */}
      <TabsContent value="marketplace" className="space-y-4">
        <div className="flex justify-end">
          <Button className="gradient-primary text-white" onClick={() => { setMarketForm(emptyMarket); setMarketDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Sender ID
          </Button>
        </div>
        <Card className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marketplace.map((m: any) => (
                <TableRow key={m.id} className="hover:bg-white/50">
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="font-mono text-xs">{m.code}</TableCell>
                  <TableCell>KES {Number(m.price_kes).toLocaleString()}</TableCell>
                  <TableCell>{m.sales_count}</TableCell>
                  <TableCell>{m.is_active ? "Yes" : "No"}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => { setMarketForm({
                      id: m.id, name: m.name, code: m.code, description: m.description ?? "",
                      price_kes: Number(m.price_kes), sort_order: m.sort_order, is_active: m.is_active,
                    }); setMarketDialogOpen(true); }}><Edit className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => {
                      if (confirm(`Delete ${m.name}?`)) deleteMarket.mutate(m.id);
                    }}><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={marketDialogOpen} onOpenChange={setMarketDialogOpen}>
          <DialogContent className="glass-card-lg max-w-md">
            <DialogHeader><DialogTitle>{marketForm.id ? "Edit" : "New"} Marketplace Sender ID</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Display Name</Label><Input value={marketForm.name} onChange={(e) => setMarketForm({ ...marketForm, name: e.target.value })} /></div>
              <div><Label>Sender Code (3-11 chars, uppercase)</Label><Input maxLength={11} value={marketForm.code} onChange={(e) => setMarketForm({ ...marketForm, code: e.target.value.toUpperCase() })} /></div>
              <div><Label>Description</Label><Textarea value={marketForm.description} onChange={(e) => setMarketForm({ ...marketForm, description: e.target.value })} className="h-20" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price (KES)</Label><Input type="number" value={marketForm.price_kes} onChange={(e) => setMarketForm({ ...marketForm, price_kes: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Sort Order</Label><Input type="number" value={marketForm.sort_order} onChange={(e) => setMarketForm({ ...marketForm, sort_order: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={marketForm.is_active} onCheckedChange={(v) => setMarketForm({ ...marketForm, is_active: v })} /><Label>Active</Label></div>
              <Button onClick={() => saveMarket.mutate()} disabled={saveMarket.isPending} className="w-full gradient-primary text-white">
                {saveMarket.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </TabsContent>

      {/* SENDER ID REQUESTS */}
      <TabsContent value="sender-ids" className="space-y-4">
        <Card className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Sender ID</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {senderIdReqs.map((s: any) => (
                <TableRow key={s.id} className="hover:bg-white/50">
                  <TableCell className="font-mono font-semibold">{s.sender_id}</TableCell>
                  <TableCell className="text-sm">{s.business_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{s.purpose}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      s.status === "approved" || s.status === "active" ? "bg-green-100 text-green-800" :
                      s.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>{s.status}</span>
                  </TableCell>
                  <TableCell className="text-xs">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="flex gap-1">
                    {s.status === "pending" && (
                      <>
                        <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => approveSenderId.mutate({ id: s.id, status: "approved" })}>Approve</Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => approveSenderId.mutate({ id: s.id, status: "rejected" })}>Reject</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      {/* SMS LOGS — All users */}
      <TabsContent value="sms-logs" className="space-y-4">
        <Input placeholder="Search by phone..." value={smsSearch} onChange={(e) => setSmsSearch(e.target.value)} />
        <Card className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Sent At</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {smsLogs.map((log: any) => {
                const user = users.find((u: any) => u.id === log.user_id);
                return (
                  <TableRow key={log.id} className="hover:bg-white/50">
                    <TableCell className="text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{user?.email ?? log.user_id.slice(0, 8)}</TableCell>
                    <TableCell className="font-mono text-xs">{log.phone}</TableCell>
                    <TableCell className="text-xs max-w-md truncate">{log.message}</TableCell>
                    <TableCell className="text-xs font-mono">{log.sender_id ?? "—"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        log.status === "delivered" || log.status === "sent" ? "bg-green-100 text-green-800" :
                        log.status === "queued" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>{log.status}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
