import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Send, Archive, Eye } from "lucide-react";
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
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: "draft" | "scheduled" | "processing" | "sent" | "failed" | "cancelled";
  recipient_count: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  cost_sms: number;
  created_at: string;
}

export default function Campaigns() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    message: "",
    recipient_count: 0,
  });

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Create campaign
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name || !formData.message) throw new Error("Name and message required");
      const { error } = await supabase.from("campaigns").insert({
        user_id: user!.id,
        name: formData.name,
        message: formData.message,
        status: "draft",
        recipient_count: formData.recipient_count,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setFormData({ name: "", message: "", recipient_count: 0 });
      setDialogOpen(false);
      toast.success("Campaign created (draft)");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Delete campaign
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
    },
  });

  const getStatusColor = (status: Campaign["status"]) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage bulk SMS campaigns.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card-lg max-w-md">
            <DialogHeader>
              <DialogTitle>New Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Campaign Name</Label>
                <Input
                  placeholder="E.g., Monthly Newsletter"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  placeholder="Your SMS message (supports {{name}} for personalization)"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="mt-1 h-24"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.message.length} characters
                </p>
              </div>
              <div>
                <Label>Recipients</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.recipient_count}
                  onChange={(e) =>
                    setFormData({ ...formData, recipient_count: parseInt(e.target.value) || 0 })
                  }
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="flex-1 gradient-primary text-white"
                >
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Total</div>
          <div className="font-display text-2xl font-bold">{campaigns.length}</div>
        </Card>
        <Card className="glass-card p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Drafts</div>
          <div className="font-display text-2xl font-bold text-gray-600">
            {campaigns.filter((c) => c.status === "draft").length}
          </div>
        </Card>
        <Card className="glass-card p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Sent</div>
          <div className="font-display text-2xl font-bold text-green-600">
            {campaigns.filter((c) => c.status === "sent").length}
          </div>
        </Card>
        <Card className="glass-card p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Scheduled</div>
          <div className="font-display text-2xl font-bold text-blue-600">
            {campaigns.filter((c) => c.status === "scheduled").length}
          </div>
        </Card>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <Send className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-semibold mb-1">No campaigns yet</h3>
          <p className="text-sm text-muted-foreground">
            Create your first campaign to send bulk SMS.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="glass-card p-5 hover-lift flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{campaign.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(campaign.created_at), "MMM dd, yyyy")}
                  </p>
                </div>
                <Badge className={getStatusColor(campaign.status)}>
                  {campaign.status}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {campaign.message}
              </p>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipients:</span>
                  <span className="font-medium">{campaign.recipient_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sent:</span>
                  <span className="font-medium text-green-600">{campaign.sent_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="font-medium text-red-600">{campaign.failed_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-medium">{campaign.cost_sms} SMS</span>
                </div>
              </div>

              <div className="flex gap-2 mt-auto pt-3 border-t border-border/50">
                <Button size="sm" variant="outline" className="flex-1">
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteMutation.mutate(campaign.id)}
                  disabled={deleteMutation.isPending}
                  className="text-red-600 hover:text-red-700"
                >
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
