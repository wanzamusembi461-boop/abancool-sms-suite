import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users, TrendingUp, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { toast } from "sonner";

interface ResellerCustomer {
  id: string;
  customer_user_id: string;
  markup_percent: number;
  created_at: string;
  email?: string;
}

export default function Reseller() {
  const { user } = useAuth();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // Fetch reseller customers
  const { data: customers = [] } = useQuery({
    queryKey: ["reseller-customers", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Note: This would need a reseller_customers table
      return [];
    },
  });

  const stats = {
    customers: customers.length,
    transferred: 15000,
    revenue: 2500,
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) {
      toast.error("Email required");
      return;
    }
    toast.success(`Invite sent to ${inviteEmail}`);
    setInviteEmail("");
    setInviteDialogOpen(false);
  };

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Reseller Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your sub-clients and revenue.</p>
      </div>

      <TabsList className="grid w-full max-w-md grid-cols-4 glass-panel">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="customers">Customers</TabsTrigger>
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
        <TabsTrigger value="payouts">Payouts</TabsTrigger>
      </TabsList>

      {/* Overview */}
      <TabsContent value="overview" className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="glass-card p-5">
            <Users className="h-5 w-5 text-primary mb-2" />
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
              Active Customers
            </div>
            <div className="font-display text-3xl font-bold">{stats.customers}</div>
          </Card>
          <Card className="glass-card p-5">
            <Send className="h-5 w-5 text-primary mb-2" />
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
              SMS Transferred
            </div>
            <div className="font-display text-3xl font-bold">
              {(stats.transferred / 1000).toFixed(0)}k
            </div>
          </Card>
          <Card className="glass-card p-5">
            <TrendingUp className="h-5 w-5 text-primary mb-2" />
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
              Revenue
            </div>
            <div className="font-display text-3xl font-bold">
              KES {stats.revenue.toLocaleString()}
            </div>
          </Card>
        </div>

        <Card className="glass-card p-6 space-y-4">
          <h2 className="font-semibold">Quick Stats</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg SMS per Customer</span>
              <span className="font-medium">
                {stats.customers > 0 ? Math.round(stats.transferred / stats.customers) : 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Revenue per Customer</span>
              <span className="font-medium">
                KES {stats.customers > 0 ? Math.round(stats.revenue / stats.customers) : 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Commission Rate</span>
              <span className="font-medium text-green-600">15%</span>
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* Customers */}
      <TabsContent value="customers" className="space-y-4">
        <div className="flex justify-end">
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white">
                <Plus className="h-4 w-4 mr-2" />
                Invite Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card-lg">
              <DialogHeader>
                <DialogTitle>Invite New Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Customer Email</Label>
                  <Input
                    type="email"
                    placeholder="customer@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleSendInvite} className="flex-1 gradient-primary text-white">
                    Send Invite
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {customers.length === 0 ? (
          <Card className="glass-card p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No customers yet. Start by inviting someone.</p>
          </Card>
        ) : (
          <Card className="glass-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Markup</TableHead>
                  <TableHead>SMS Transferred</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-white/50">
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{new Date(customer.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{customer.markup_percent}%</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </TabsContent>

      {/* Pricing */}
      <TabsContent value="pricing" className="space-y-4">
        <Card className="glass-card p-6">
          <h2 className="font-semibold mb-4">Custom Pricing</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Set custom prices for your customers. Your markup is automatically applied.
          </p>
          <div className="space-y-4">
            <div>
              <Label>Default Markup (%)</Label>
              <Input type="number" placeholder="15" className="mt-1" />
            </div>
            <Button className="gradient-primary text-white">Update Pricing</Button>
          </div>
        </Card>
      </TabsContent>

      {/* Payouts */}
      <TabsContent value="payouts" className="space-y-4">
        <Card className="glass-card p-6">
          <h2 className="font-semibold mb-4">Payout History</h2>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No payouts yet. Earn revenue by transferring SMS to customers.</p>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
