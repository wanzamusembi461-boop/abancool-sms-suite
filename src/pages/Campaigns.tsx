import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Send, Archive, Zap } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function Campaigns() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    message: "",
    sender_id: "",
    audience: "all" as "all" | "group",
    group_id: "",
  });
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Quick send state
  const [quickMessage, setQuickMessage] = useState("");
  const [quickSender, setQuickSender] = useState("");
  const [quickManualPhones, setQuickManualPhones] = useState("");
  const [quickSelectedContacts, setQuickSelectedContacts] = useState<Set<string>>(new Set());
  const [quickContactSearch, setQuickContactSearch] = useState("");
  const [quickSending, setQuickSending] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["contact-groups-campaigns", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("contact_groups").select("id, name").eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const { data: senderIds = [] } = useQuery({
    queryKey: ["approved-sender-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("sender_ids")
        .select("sender_id")
        .eq("user_id", user!.id)
        .in("status", ["approved", "active"]);
      return data ?? [];
    },
  });

  const { data: balance } = useQuery({
    queryKey: ["sms-balance", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("sms_balances").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: myContacts = [] } = useQuery({
    queryKey: ["quick-contacts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, name, phone")
        .eq("user_id", user!.id)
        .order("name", { ascending: true });
      return data ?? [];
    },
  });

  const filteredContacts = useMemo(() => {
    const q = quickContactSearch.trim().toLowerCase();
    if (!q) return myContacts;
    return myContacts.filter((c: any) =>
      (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q)
    );
  }, [myContacts, quickContactSearch]);

  const quickPhoneList = useMemo(() => {
    const manual = quickManualPhones
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const fromContacts = myContacts
      .filter((c: any) => quickSelectedContacts.has(c.id))
      .map((c: any) => c.phone);
    return Array.from(new Set([...manual, ...fromContacts]));
  }, [quickManualPhones, quickSelectedContacts, myContacts]);

  const handleQuickSend = async () => {
    if (!quickMessage.trim()) return toast.error("Message required");
    if (quickPhoneList.length === 0) return toast.error("Add at least one phone number");
    const totalBalance = (balance?.paid_sms ?? 0) + (balance?.free_sms ?? 0);
    if (totalBalance < quickPhoneList.length) {
      return toast.error(`Insufficient balance. Need ${quickPhoneList.length}, have ${totalBalance}`);
    }
    if (!confirm(`Send SMS to ${quickPhoneList.length} recipient(s)?`)) return;
    setQuickSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-campaign", {
        body: {
          phones: quickPhoneList,
          message: quickMessage,
          sender_id: quickSender || undefined,
        },
      });
      if (error) throw error;
      toast.success(`Sent ${data.sent}/${data.total}${data.failed ? ` (${data.failed} refunded)` : ""}`);
      queryClient.invalidateQueries({ queryKey: ["sms-balance"] });
      setQuickOpen(false);
      setQuickMessage("");
      setQuickManualPhones("");
      setQuickSelectedContacts(new Set());
    } catch (e: any) {
      toast.error(e.message || "Send failed");
    } finally {
      setQuickSending(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name || !formData.message) throw new Error("Name and message required");
      // Resolve recipients
      let phones: string[] = [];
      if (formData.audience === "all") {
        const { data } = await supabase.from("contacts").select("phone").eq("user_id", user!.id);
        phones = (data ?? []).map((c) => c.phone);
      } else if (formData.group_id) {
        const { data } = await supabase
          .from("contact_group_members")
          .select("contact_id, contacts:contact_id(phone)")
          .eq("group_id", formData.group_id);
        phones = (data ?? []).map((r: any) => r.contacts?.phone).filter(Boolean);
      }
      const { error } = await supabase.from("campaigns").insert({
        user_id: user!.id,
        name: formData.name,
        message: formData.message,
        sender_id: formData.sender_id || null,
        status: "draft",
        recipient_count: phones.length,
        metadata: { phones, audience: formData.audience, group_id: formData.group_id || null },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setFormData({ name: "", message: "", sender_id: "", audience: "all", group_id: "" });
      setDialogOpen(false);
      toast.success("Campaign created — ready to send");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["campaigns"] }); toast.success("Deleted"); },
  });

  const handleSend = async (campaignId: string, count: number) => {
    const totalBalance = (balance?.paid_sms ?? 0) + (balance?.free_sms ?? 0);
    if (count === 0) return toast.error("No recipients");
    if (totalBalance < count) return toast.error(`Insufficient balance. Need ${count}, have ${totalBalance}`);
    if (!confirm(`Send this campaign to ${count} recipients?`)) return;
    setSendingId(campaignId);
    try {
      const { data, error } = await supabase.functions.invoke("send-campaign", {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      toast.success(`Sent ${data.sent}/${data.total} (${data.failed} failed & refunded)`);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["sms-balance"] });
    } catch (e: any) {
      toast.error(e.message || "Send failed");
    } finally {
      setSendingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "bg-green-100 text-green-800";
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "processing": return "bg-yellow-100 text-yellow-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and send bulk SMS campaigns. Balance: <span className="font-semibold">{((balance?.paid_sms ?? 0) + (balance?.free_sms ?? 0)).toLocaleString()} SMS</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="glass-panel" onClick={() => setQuickOpen(true)}>
            <Zap className="h-4 w-4 mr-2 text-primary" /> Quick Send
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white">
                <Plus className="h-4 w-4 mr-2" /> New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card-lg max-w-lg">
            <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Campaign Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="mt-1 h-24" />
                <p className="text-xs text-muted-foreground mt-1">{formData.message.length} characters</p>
              </div>
              <div>
                <Label>Sender ID (optional — uses default if empty)</Label>
                <Select value={formData.sender_id} onValueChange={(v) => setFormData({ ...formData, sender_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Default sender" /></SelectTrigger>
                  <SelectContent>
                    {senderIds.map((s: any) => <SelectItem key={s.sender_id} value={s.sender_id}>{s.sender_id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Audience</Label>
                <Select value={formData.audience} onValueChange={(v: any) => setFormData({ ...formData, audience: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All contacts</SelectItem>
                    <SelectItem value="group">Specific group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.audience === "group" && (
                <div>
                  <Label>Group</Label>
                  <Select value={formData.group_id} onValueChange={(v) => setFormData({ ...formData, group_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pick a group" /></SelectTrigger>
                    <SelectContent>
                      {groups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="flex-1 gradient-primary text-white">
                  {createMutation.isPending ? "Creating..." : "Create Draft"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card p-4"><div className="text-xs font-semibold uppercase text-muted-foreground">Total</div><div className="font-display text-2xl font-bold">{campaigns.length}</div></Card>
        <Card className="glass-card p-4"><div className="text-xs font-semibold uppercase text-muted-foreground">Drafts</div><div className="font-display text-2xl font-bold">{campaigns.filter((c) => c.status === "draft").length}</div></Card>
        <Card className="glass-card p-4"><div className="text-xs font-semibold uppercase text-muted-foreground">Sent</div><div className="font-display text-2xl font-bold text-green-600">{campaigns.filter((c) => c.status === "sent").length}</div></Card>
        <Card className="glass-card p-4"><div className="text-xs font-semibold uppercase text-muted-foreground">Failed</div><div className="font-display text-2xl font-bold text-red-600">{campaigns.filter((c) => c.status === "failed").length}</div></Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : campaigns.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <Send className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-semibold mb-1">No campaigns yet</h3>
          <p className="text-sm text-muted-foreground">Create your first campaign to send bulk SMS.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="glass-card p-5 hover-lift flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">{format(new Date(c.created_at), "MMM dd, yyyy")}</p>
                </div>
                <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{c.message}</p>
              <div className="space-y-1.5 mb-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Recipients</span><span className="font-medium">{c.recipient_count}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sent</span><span className="font-medium text-green-600">{c.sent_count}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Failed</span><span className="font-medium text-red-600">{c.failed_count}</span></div>
              </div>
              <div className="flex gap-2 mt-auto pt-3 border-t border-border/50">
                {c.status === "draft" && (
                  <Button size="sm" className="flex-1 gradient-primary text-white" disabled={sendingId === c.id} onClick={() => handleSend(c.id, c.recipient_count)}>
                    {sendingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Send className="h-3 w-3 mr-1" />Send Now</>}
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteMutation.mutate(c.id)} disabled={deleteMutation.isPending}>
                  <Archive className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
