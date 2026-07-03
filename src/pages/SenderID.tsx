import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle2, Clock, XCircle, ShoppingCart, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PaymentPollingModal } from "@/components/buy-sms/PaymentPollingModal";

interface SenderID {
  id: string;
  sender_id: string;
  business_name: string;
  status: "pending" | "approved" | "rejected" | "active";
  category?: string;
  purpose: string;
  created_at: string;
  admin_notes?: string;
}

interface MarketplaceSenderID {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price_kes: number;
  rating: number | null;
  sales_count: number;
}


export default function SenderID() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [formData, setFormData] = useState({
    business_name: "",
    sender_id: "",
    purpose: "",
  });

  // Payment flow state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [pollingOpen, setPollingOpen] = useState(false);
  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [checkoutId, setCheckoutId] = useState("");
  const [phone, setPhone] = useState("");
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);

  // Fetch sender IDs
  const { data: senderIds = [] } = useQuery({
    queryKey: ["sender-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sender_ids")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user profile for phone
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Marketplace items from DB
  const { data: marketplaceItems = [] } = useQuery<MarketplaceSenderID[]>({
    queryKey: ["marketplace-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sender_id_marketplace")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as any;
    },
  });


  // Request sender ID
  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!formData.business_name || !formData.sender_id || !formData.purpose) {
        throw new Error("All fields required");
      }
      const { error } = await supabase.from("sender_ids").insert({
        user_id: user!.id,
        business_name: formData.business_name,
        sender_id: formData.sender_id.toUpperCase(),
        category: category || null,
        purpose: formData.purpose,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sender-ids"] });
      setFormData({ business_name: "", sender_id: "", purpose: "" });
      setCategory("");
      setDialogOpen(false);
      toast.success("Request submitted! Approval takes 1-2 business days.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Handle marketplace purchase - initiate payment
  const handleMarketplacePurchase = (sellerId: string) => {
    setSelectedMarketplaceId(sellerId);
    setPhone(profile?.phone || "");
    setPaymentDialogOpen(true);
  };

  // Initiate STK Push for marketplace sender ID
  const initiateMarketplacePayment = async (checkoutId: string, txId: string) => {
    setCheckoutId(checkoutId);
    setTransactionId(txId);
    setPaymentDialogOpen(false);
    setPollingOpen(true);
  };

  // Handle polling success - create sender ID purchase record
  const handlePaymentSuccess = async () => {
    if (!selectedMarketplaceId) return;
    
    const marketplace = marketplaceItems.find((s) => s.id === selectedMarketplaceId);
    if (!marketplace) return;

    try {
      // Create sender ID record with status pending (awaiting admin approval after payment confirmed)
      await supabase.from("sender_ids").insert({
        user_id: user!.id,
        sender_id: marketplace.name.split(" ")[0].toUpperCase(),
        business_name: marketplace.name,
        category: "marketplace",
        purpose: `Marketplace purchase: ${marketplace.name}`,
        status: "pending",
        admin_notes: `Payment confirmed via M-Pesa (${transactionId}). Awaiting admin approval.`,
      });

      toast.success(
        `Payment confirmed! ${marketplace.name} pending admin approval.`
      );
      setSelectedMarketplaceId(null);
      queryClient.invalidateQueries({ queryKey: ["sender-ids"] });
      setPollingOpen(false);
    } catch (error) {
      toast.error("Failed to create sender ID record");
      console.error(error);
    }
  };

  const getStatusIcon = (status: SenderID["status"]) => {
    switch (status) {
      case "approved":
      case "active":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusColor = (status: SenderID["status"]) => {
    switch (status) {
      case "approved":
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
    }
  };

  return (
    <Tabs defaultValue="my-ids" className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Sender IDs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Apply for branded sender IDs or purchase approved ones from our marketplace.
        </p>
      </div>

      <TabsList className="grid w-full max-w-md grid-cols-3 glass-panel">
        <TabsTrigger value="my-ids">My IDs</TabsTrigger>
        <TabsTrigger value="request">Request New</TabsTrigger>
        <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
      </TabsList>

      {/* My Sender IDs */}
      <TabsContent value="my-ids" className="space-y-4">
        {senderIds.length === 0 ? (
          <Card className="glass-card p-8 text-center">
            <p className="text-muted-foreground mb-4">No sender IDs yet.</p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Request Your First Sender ID
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card-lg max-w-md">
                <DialogHeader>
                  <DialogTitle>Request Sender ID</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Business Name *</Label>
                    <Input
                      placeholder="Your Company Ltd"
                      value={formData.business_name}
                      onChange={(e) =>
                        setFormData({ ...formData, business_name: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Sender ID (3-11 chars) *</Label>
                    <Input
                      placeholder="MYCOMPANY"
                      maxLength={11}
                      value={formData.sender_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sender_id: e.target.value.toUpperCase(),
                        })
                      }
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.sender_id.length}/11 characters
                    </p>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="banking">Banking</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="health">Health</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Purpose *</Label>
                    <Textarea
                      placeholder="Describe your use case..."
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      className="mt-1 h-24"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => requestMutation.mutate()}
                      disabled={requestMutation.isPending}
                      className="flex-1 gradient-primary text-white"
                    >
                      {requestMutation.isPending ? "Submitting..." : "Submit"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </Card>
        ) : (
          <div className="space-y-3">
            {senderIds.map((sid) => (
              <Card key={sid.id} className="glass-card p-4 hover-lift">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(sid.status)}
                      <h3 className="font-semibold">{sid.sender_id}</h3>
                      <Badge className={getStatusColor(sid.status)}>{sid.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{sid.business_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {sid.category && `Category: ${sid.category} • `}
                      Requested: {new Date(sid.created_at).toLocaleDateString()}
                    </p>
                    {sid.admin_notes && (
                      <p className="text-sm text-yellow-700 mt-2 p-2 bg-yellow-50 rounded">
                        Admin: {sid.admin_notes}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Request New */}
      <TabsContent value="request" className="space-y-4">
        <Card className="glass-card p-6">
          <h2 className="font-semibold mb-4">Request New Sender ID</h2>
          <div className="space-y-4">
            <div>
              <Label>Business Name *</Label>
              <Input
                placeholder="Your Company Ltd"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Desired Sender ID (3-11 chars) *</Label>
              <Input
                placeholder="MYCOMPANY"
                maxLength={11}
                value={formData.sender_id}
                onChange={(e) =>
                  setFormData({ ...formData, sender_id: e.target.value.toUpperCase() })
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.sender_id.length}/11 characters
              </p>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="banking">Banking</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Purpose *</Label>
              <Textarea
                placeholder="Describe how you'll use this sender ID..."
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="mt-1 h-32"
              />
            </div>
            <Button
              onClick={() => requestMutation.mutate()}
              disabled={requestMutation.isPending}
              className="w-full gradient-primary text-white"
            >
              {requestMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </Card>
      </TabsContent>

      {/* Marketplace */}
      <TabsContent value="marketplace" className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {marketplaceItems.map((sender) => (
            <Card key={sender.id} className="glass-card p-6 hover-lift flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{sender.name}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-medium">{(sender.rating ?? 5)}</span>
                    <span className="text-xs text-muted-foreground">({sender.sales_count} sales)</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Approved and verified sender ID for all Kenyan carriers
              </p>

              <div className="space-y-2 mb-6 text-sm flex-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider:</span>
                  <span className="font-medium">{sender.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approval:</span>
                  <span className="font-medium">After payment</span>
                </div>
              </div>

              <div className="border-t border-border/50 pt-4">
                <div className="mb-4">
                  <span className="text-sm text-muted-foreground">One-time fee:</span>
                  <div className="font-display text-2xl font-bold">
                    KES {sender.price_kes.toLocaleString()}
                  </div>
                </div>

                <Button
                  onClick={() => handleMarketplacePurchase(sender.id)}
                  className="w-full gradient-primary text-white"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Pay with M-Pesa
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <Card className="glass-card p-6 bg-blue-50">
          <h3 className="font-semibold text-blue-900 mb-2">Why use marketplace sender IDs?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✓ Pre-approved by Safaricom, Airtel, and Telkom</li>
            <li>✓ Activated after payment confirmation and admin approval</li>
            <li>✓ 100% delivery guarantee</li>
            <li>✓ Works across all carriers</li>
            <li>✓ Professional sender identity</li>
          </ul>
        </Card>
      </TabsContent>

      {/* Payment Dialog for Marketplace */}
      {selectedMarketplaceId && (
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="glass-card-lg max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Sender ID</p>
                <p className="font-semibold">
                  {marketplaceItems.find((s) => s.id === selectedMarketplaceId)?.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Amount</p>
                <p className="font-display text-2xl font-bold">
                  KES{" "}
                  {marketplaceItems.find((s) => s.id === selectedMarketplaceId)?.price_kes.toLocaleString()}
                </p>
              </div>
              <div>
                <Label>Phone Number *</Label>
                <Input
                  placeholder="0712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setPaymentDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!phone) {
                      toast.error("Phone number required");
                      return;
                    }
                    setIsInitiatingPayment(true);
                    try {
                      const marketplace = marketplaceItems.find(
                        (s) => s.id === selectedMarketplaceId
                      );
                      if (!marketplace) throw new Error("Marketplace ID not found");

                      // Get current session
                      const session = await supabase.auth.getSession();
                      if (!session.data.session?.access_token) {
                        throw new Error("Not authenticated");
                      }

                      // Note: Edge function needs to be updated to accept sender_id purchases
                      // For now, we'll create a temporary transaction record
                      const response = await fetch(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mpesa-stk-initiate`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${session.data.session.access_token}`,
                          },
                          body: JSON.stringify({
                            phone: phone,
                            amount: marketplace.price_kes,
                            type: "sender_id",
                            sender_id_market_id: selectedMarketplaceId,
                          }),
                        }
                      );

                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || "Failed to initiate payment");
                      }

                      const data = await response.json();
                      await initiateMarketplacePayment(data.checkout_id, data.transaction_id);
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "Failed to initiate payment"
                      );
                    } finally {
                      setIsInitiatingPayment(false);
                    }
                  }}
                  disabled={isInitiatingPayment}
                  className="flex-1 gradient-primary text-white"
                >
                  {isInitiatingPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Pay Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Polling Modal */}
      <PaymentPollingModal
        open={pollingOpen}
        onOpenChange={setPollingOpen}
        transaction_id={transactionId}
        checkout_id={checkoutId}
        onSuccess={handlePaymentSuccess}
      />
    </Tabs>
  );
}
