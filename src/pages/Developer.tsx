import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Copy, Eye, EyeOff, Trash2, Code2, Book } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import apiDocsRaw from "@/content/api-docs.md?raw";

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const apiDocs = apiDocsRaw.replaceAll("{{API_BASE}}", API_BASE);

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at?: string;
  created_at: string;
}

export default function Developer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [showFullKey, setShowFullKey] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState("");

  // Fetch API keys
  const { data: keys = [] } = useQuery({
    queryKey: ["api-keys", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("user_id", user!.id)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Generate key
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!keyName) throw new Error("Key name required");
      const fullKey = `sk_live_${Math.random().toString(36).substring(2, 32)}`;
      const keyPrefix = fullKey.substring(0, 15) + "...";
      const keyHash = await hashKey(fullKey);

      const { error } = await supabase.from("api_keys").insert({
        user_id: user!.id,
        name: keyName,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        scopes: ["sms:send", "sms:read"],
      });

      if (error) throw error;
      return { fullKey };
    },
    onSuccess: (data) => {
      setNewKeyValue(data.fullKey);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key generated. Copy it now — you won't see it again!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Delete key
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key revoked");
    },
  });

  const handleGenerateKey = () => {
    generateMutation.mutate();
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Copied to clipboard");
  };

  return (
    <Tabs defaultValue="keys" className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Developer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage API keys and integrate with your applications.
        </p>
      </div>

      <TabsList className="grid w-full max-w-md grid-cols-3 glass-panel">
        <TabsTrigger value="keys">API Keys</TabsTrigger>
        <TabsTrigger value="docs">Docs</TabsTrigger>
        <TabsTrigger value="playground">Playground</TabsTrigger>
      </TabsList>

      {/* API Keys Tab */}
      <TabsContent value="keys" className="space-y-6">
        {newKeyValue && (
          <Card className="glass-card p-5 bg-green-50 border border-green-200">
            <h3 className="font-semibold mb-3 text-green-900">Your API Key</h3>
            <p className="text-sm text-green-800 mb-3">
              Copy this key now. You won't be able to see it again.
            </p>
            <div className="flex gap-2">
              <Input
                value={newKeyValue}
                readOnly
                className="font-mono text-xs bg-white"
              />
              <Button
                onClick={() => copyKey(newKeyValue)}
                size="sm"
                className="gradient-primary text-white"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => setNewKeyValue("")}
            >
              Done
            </Button>
          </Card>
        )}

        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Your Keys</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white">
                <Plus className="h-4 w-4 mr-2" />
                Generate Key
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card-lg">
              <DialogHeader>
                <DialogTitle>Generate API Key</DialogTitle>
                <DialogDescription>Give your key a name for easy identification</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Key Name</Label>
                  <Input
                    placeholder="E.g., Production Integration"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGenerateKey}
                    disabled={generateMutation.isPending || !keyName}
                    className="flex-1 gradient-primary text-white"
                  >
                    {generateMutation.isPending ? "Generating..." : "Generate"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {keys.length === 0 ? (
            <Card className="glass-card p-8 text-center">
              <Code2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No API keys yet. Generate one to get started.</p>
            </Card>
          ) : (
            keys.map((key) => (
              <Card key={key.id} className="glass-card p-4 hover-lift">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{key.name}</h3>
                    <p className="font-mono text-xs text-muted-foreground mt-1">
                      {key.key_prefix}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                      {key.last_used_at && (
                        <span>Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMutation.mutate(key.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </TabsContent>

      {/* Docs Tab */}
      <TabsContent value="docs" className="space-y-6">
        <Card className="glass-card p-6 prose prose-sm max-w-none dark:prose-invert prose-p:text-sm">
          <div className="prose-content overflow-x-auto">
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />,
                h2: ({node, ...props}) => <h3 className="text-xl font-bold mt-5 mb-2" {...props} />,
                h3: ({node, ...props}) => <h4 className="text-lg font-semibold mt-4 mb-2" {...props} />,
                p: ({node, ...props}) => <p className="text-sm mb-3" {...props} />,
                table: ({node, ...props}) => <div className="overflow-x-auto mb-4"><table className="w-full text-xs border-collapse" {...props} /></div>,
                th: ({node, ...props}) => <th className="border border-border p-2 bg-white/50 font-semibold text-left" {...props} />,
                td: ({node, ...props}) => <td className="border border-border p-2" {...props} />,
                code: ({node, inline, ...props}: any) => 
                  inline ? 
                    <code className="bg-black/5 px-2 py-1 rounded text-xs font-mono" {...props} /> :
                    <pre className="bg-black/5 p-3 rounded-lg overflow-x-auto text-xs mb-3 font-mono"><code {...props} /></pre>,
              }}
            >
              {apiDocs}
            </ReactMarkdown>
          </div>
        </Card>
      </TabsContent>

      {/* Playground Tab */}
      <TabsContent value="playground" className="space-y-6">
        <Card className="glass-card p-6 space-y-6">
          <div>
            <h3 className="font-semibold mb-4">API Playground</h3>
            <div className="space-y-4">
              <div>
                <Label>Select Key</Label>
                <select className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-white">
                  {keys.length === 0 ? (
                    <option>No keys available</option>
                  ) : (
                    keys.map((key) => (
                      <option key={key.id}>{key.name}</option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <Label>Endpoint</Label>
                <select className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-white">
                  <option>/api/v1/sms/send</option>
                  <option>/api/v1/balance</option>
                  <option>/api/v1/contacts</option>
                </select>
              </div>
              <div>
                <Label>Request Body (JSON)</Label>
                <textarea className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-white font-mono text-sm h-32">
                  {`{
  "to": "254712345678",
  "message": "Hello world"
}`}
                </textarea>
              </div>
              <Button className="w-full gradient-primary text-white">
                Send Request
              </Button>
            </div>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

// Simple hash function for frontend (use bcrypt on backend)
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
