import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle, Download, FileText, Loader2, AlertCircle } from "lucide-react";
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
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PaymentPollingModal } from "@/components/buy-sms/PaymentPollingModal";
import { generateInvoiceHTML, generateInvoiceNumber, InvoiceData } from "@/lib/invoice-generator";

interface SenderID {
  id: string;
  sender_id: string;
  business_name: string;
  status: "pending" | "approved" | "rejected" | "active";
  created_at: string;
  admin_notes?: string;
  network?: string;
  document_urls?: string[];
  invoice_number?: string;
}

const MARKETPLACE_OPTIONS = [
  { id: "alerts", name: "ALERTS5", network: "airtel", price: 0, description: "Send to Airtel numbers only" },
  { id: "info", name: "INFO5", network: "safaricom", price: 0, description: "Send to Safaricom numbers only" },
  { id: "promo", name: "PROMO5", network: "telkom", price: 0, description: "Send to Telkom numbers only" },
];

export default function SenderID() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [selectedMarketplace, setSelectedMarketplace] = useState<string | null>(null);
  const [customSenderID, setCustomSenderID] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Payment flow
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [checkoutId, setCheckoutId] = useState("");
  const [invoiceHTML, setInvoiceHTML] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);

  // Fetch user's sender IDs
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

  // Fetch profile
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

  // Submit request mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMarketplace) throw new Error("Select a network");
      if (!customSenderID) throw new Error("Enter custom sender ID");
      if (!businessName) throw new Error("Enter business name");
      if (!purpose) throw new Error("Enter purpose");
      if (uploadedDocs.length === 0) throw new Error("Upload documents");

      const marketplace = MARKETPLACE_OPTIONS.find((m) => m.id === selectedMarketplace);
      if (!marketplace) throw new Error("Invalid marketplace");

      // Generate invoice
      const invNum = generateInvoiceNumber();
      const invoiceData: InvoiceData = {
        invoiceNumber: invNum,
        date: new Date().toLocaleDateString("en-KE"),
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleDateString("en-KE"),
        amount: marketplace.price,
        network: marketplace.network,
        senderIdText: customSenderID.toUpperCase(),
        businessName,
        userEmail: profile?.email || "",
        userPhone: profile?.phone,
      };

      const html = generateInvoiceHTML(invoiceData);
      setInvoiceHTML(html);
      setInvoiceNumber(invNum);
      setShowInvoice(true);
      setPhone(profile?.phone || "");

      // Create sender ID record
      const { error } = await supabase.from("sender_ids").insert({
        user_id: user!.id,
        business_name: businessName,
        sender_id: customSenderID.toUpperCase(),
        purpose,
        network: marketplace.network,
        document_urls: uploadedDocs,
        invoice_number: invNum,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sender-ids"] });
      // Don't reset form yet - user needs to see invoice
      toast.success("Request submitted! Invoice generated.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Payment mutation
  const initiatePayment = async () => {
    if (!phone) {
      toast.error("Phone number required");
      return;
    }

    const marketplace = MARKETPLACE_OPTIONS.find((m) => m.id === selectedMarketplace);
    if (!marketplace) return;

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mpesa-stk-initiate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({
            phone,
            amount: marketplace.price || 0,
            type: "sender_id",
            sender_id_market_id: marketplace.network,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to initiate payment");
      }

      const data = await response.json();
      setCheckoutId(data.checkout_id);
      setTransactionId(data.transaction_id);
      setPaymentInitiated(true);
      setShowInvoice(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed");
    }
  };

  const handlePaymentSuccess = () => {
    toast.success("Payment confirmed! Sender ID awaiting admin approval.");
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["sender-ids"] });
    setPaymentInitiated(false);
  };

  const resetForm = () => {
    setSelectedMarketplace(null);
    setCustomSenderID("");
    setBusinessName("");
    setPurpose("");
    setUploadedDocs([]);
    setPhone("");
    setShowPaymentDialog(false);
    setInvoiceHTML("");
    setInvoiceNumber("");
  };

  const getStatusIcon = (status: string) => {
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

  const getStatusColor = (status: string) => {
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
          Get custom sender IDs for Airtel, Safaricom, or Telkom networks
        </p>
      </div>

      <TabsList className="grid w-full max-w-md grid-cols-2 glass-panel">
        <TabsTrigger value="my-ids">My Sender IDs</TabsTrigger>
        <TabsTrigger value="request">Request New</TabsTrigger>
      </TabsList>

      {/* My Sender IDs */}
      <TabsContent value="my-ids" className="space-y-4">
        {senderIds.length === 0 ? (
          <Card className="glass-card p-8 text-center">
            <p className="text-muted-foreground mb-4">No sender IDs yet.</p>
            <p className="text-xs text-muted-foreground mb-6">Start by requesting a new sender ID for your network</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {senderIds.map((sid) => (
              <Card key={sid.id} className="glass-card p-4 hover-lift">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(sid.status)}
                      <h3 className="font-semibold text-lg">{sid.sender_id}</h3>
                      <Badge className={getStatusColor(sid.status)}>{sid.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{sid.business_name}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Network: <strong className="capitalize">{sid.network}</strong></span>
                      <span>Requested: {new Date(sid.created_at).toLocaleDateString()}</span>
                    </div>
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
          <h2 className="font-semibold mb-6">Request Custom Sender ID</h2>

          {/* Step 1: Select Network */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-sm mb-4 text-primary">Step 1: Select Network</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose which network your sender ID will work with
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {MARKETPLACE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedMarketplace(option.id)}
                    className={`p-6 rounded-lg border-2 transition text-left ${
                      selectedMarketplace === option.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-display text-2xl font-bold">{option.name}</div>
                    <p className="text-sm text-muted-foreground mt-2">{option.description}</p>
                    {option.price === 0 ? (
                      <div className="mt-3 text-xs text-green-600 font-medium">✓ Free setup</div>
                    ) : (
                      <div className="mt-3 text-sm font-semibold">KES {option.price.toLocaleString()}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Customize Sender ID (shown when network selected) */}
            {selectedMarketplace && (
              <div className="pt-6 border-t border-border">
                <h3 className="font-semibold text-sm mb-4 text-primary">Step 2: Customize Your Sender ID</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Business Name *</Label>
                    <Input
                      placeholder="Your Company Ltd"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Custom Sender ID (3-11 characters) *</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="e.g., ALERTS or MYSHOP"
                        maxLength={11}
                        value={customSenderID}
                        onChange={(e) => setCustomSenderID(e.target.value.toUpperCase())}
                        className="uppercase flex-1"
                      />
                      <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-600 whitespace-nowrap">
                        {customSenderID.length}/11
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      This is how your business name will appear on recipient phones
                    </p>
                  </div>
                  <div>
                    <Label>Business Purpose *</Label>
                    <Textarea
                      placeholder="What will you use this sender ID for? (e.g., Marketing campaigns, OTP, Customer service)"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="mt-1 h-20"
                    />
                  </div>
                </div>

                {/* Step 3: Upload Documents */}
                <div className="pt-6 border-t border-border mt-6">
                  <h3 className="font-semibold text-sm mb-4 text-primary">Step 3: Upload Documents</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Required for verification: Business Registration, National ID, Tax Certificate
                  </p>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-gray-50 transition cursor-pointer">
                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium mb-1">Upload Documents</p>
                    <p className="text-xs text-muted-foreground mb-4">Drag and drop or click to browse (PDF/PNG/JPG, Max 5MB)</p>
                    <Button variant="outline" size="sm" className="mx-auto">
                      Select Files
                    </Button>
                    {uploadedDocs.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">✓ {uploadedDocs.length} document(s) uploaded</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Processing Info */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 text-sm">Processing Timeline</h4>
                      <p className="text-sm text-blue-800 mt-1">
                        After payment, your request will be reviewed within <strong>28-48 hours</strong>. You'll receive email confirmation.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={
                    submitMutation.isPending ||
                    !customSenderID ||
                    !businessName ||
                    !purpose ||
                    uploadedDocs.length === 0
                  }
                  className="w-full mt-6 gradient-primary text-white py-6"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Invoice...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Review & Generate Invoice
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </TabsContent>

      {/* Invoice Dialog */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="glass-card-lg max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice {invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {invoiceHTML && (
            <div className="space-y-4">
              <div
                className="bg-white rounded p-4 border border-border text-sm max-h-64 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: invoiceHTML }}
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowInvoice(false)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={() => {
                    const element = document.createElement("a");
                    const file = new Blob([invoiceHTML], { type: "text/html" });
                    element.href = URL.createObjectURL(file);
                    element.download = `Invoice-${invoiceNumber}.html`;
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                    toast.success("Invoice downloaded");
                  }}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={() => {
                    setShowInvoice(false);
                    setShowPaymentDialog(true);
                  }}
                  className="flex-1 gradient-primary text-white"
                >
                  Proceed to Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Phone Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="glass-card-lg max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Phone Number for M-Pesa *</Label>
              <Input
                placeholder="0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">M-Pesa prompt will be sent to this number</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={initiatePayment}
                className="flex-1 gradient-primary text-white"
              >
                <Loader2 className="h-4 w-4 mr-2" />
                Pay Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Polling Modal */}
      <PaymentPollingModal
        open={paymentInitiated}
        onOpenChange={setPaymentInitiated}
        transaction_id={transactionId}
        checkout_id={checkoutId}
        onSuccess={handlePaymentSuccess}
      />
    </Tabs>
  );
}
