import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Download, Upload, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  tags: string[];
}

interface ContactGroup {
  id: string;
  name: string;
  color: string;
}

export default function Contacts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", company: "" });

  // Fetch groups
  const { data: groups = [] } = useQuery({
    queryKey: ["contact-groups", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_groups")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", user?.id, search, selectedGroup],
    enabled: !!user?.id,
    queryFn: async () => {
      let query = supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user!.id);

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Add contact
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!formData.phone) throw new Error("Phone is required");
      const { error } = await supabase.from("contacts").insert({
        user_id: user!.id,
        name: formData.name || "Unnamed",
        phone: formData.phone,
        email: formData.email || null,
        company: formData.company || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setFormData({ name: "", phone: "", email: "", company: "" });
      setDialogOpen(false);
      toast.success("Contact added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Delete contact
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleAddGroup = async (name: string) => {
    const { error } = await supabase.from("contact_groups").insert({
      user_id: user!.id,
      name,
      color: ["#8b5cf6", "#ec4899", "#06b6d4"][Math.floor(Math.random() * 3)],
    });
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ["contact-groups"] });
      toast.success("Group created");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {/* Left Sidebar - Groups */}
      <div className="lg:col-span-1 space-y-4">
        <div className="glass-card p-4">
          <h2 className="font-semibold mb-3">Groups</h2>
          <div className="space-y-2 mb-4">
            <button
              onClick={() => setSelectedGroup(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                selectedGroup === null
                  ? "gradient-primary text-white"
                  : "hover:bg-white/50"
              }`}
            >
              All Contacts ({contacts.length})
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGroup(g.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
                  selectedGroup === g.id
                    ? "gradient-primary text-white"
                    : "hover:bg-white/50"
                }`}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                {g.name}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => {
              const name = prompt("Group name:");
              if (name) handleAddGroup(name);
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            New Group
          </Button>
        </div>
      </div>

      {/* Right - Contacts */}
      <div className="lg:col-span-3 space-y-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your address book and send campaigns to groups.</p>
        </div>

        {/* Controls */}
        <div className="glass-card p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card-lg">
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Phone *</Label>
                    <Input
                      placeholder="0712345678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input
                      placeholder="Acme Inc"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => addMutation.mutate()}
                      disabled={addMutation.isPending}
                      className="flex-1 gradient-primary text-white"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-1" />
              Import CSV
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card className="glass-card overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No contacts found. Start by adding one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="w-16">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id} className="hover:bg-white/50">
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell className="font-mono text-sm">{contact.phone}</TableCell>
                      <TableCell className="text-sm">{contact.email || "—"}</TableCell>
                      <TableCell className="text-sm">{contact.company || "—"}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => deleteMutation.mutate(contact.id)}
                          className="p-1.5 hover:bg-red-100 rounded text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
