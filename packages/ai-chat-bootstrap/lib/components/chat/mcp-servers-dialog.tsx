import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type {
  MCPServerTransport,
  MCPToolSummary,
  SerializedMCPServer,
} from "../../stores/mcp";
import { v4 as uuidv4 } from "uuid";

export interface McpServersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configs: SerializedMCPServer[];
  onSave: (server: SerializedMCPServer) => void;
  onRemove: (id: string) => void;
  serversMap: Map<string, unknown>;
}

const EMPTY_FORM = {
  name: "",
  url: "",
  transportType: "sse" as MCPServerTransport["type"],
  headers: "",
};

export function McpServersDialog({
  open,
  onOpenChange,
  configs,
  onSave,
  onRemove,
  serversMap,
}: McpServersDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setEditingId(null);
      setError(null);
      setShowForm(false);
    }
  }, [open]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
    setShowForm(false);
  };

  const createNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
    setShowForm(true);
  };

  const startEdit = (server: SerializedMCPServer) => {
    setEditingId(server.id);
    setForm({
      name: server.name ?? "",
      url: server.transport.url,
      transportType: server.transport.type,
      headers: server.transport.headers
        ? JSON.stringify(server.transport.headers, null, 2)
        : "",
    });
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = form.url.trim();
    if (!trimmedUrl) {
      setError("Server URL is required");
      return;
    }

    let headers: Record<string, string> | undefined;
    if (form.headers.trim()) {
      try {
        const parsed = JSON.parse(form.headers);
        if (
          parsed &&
          typeof parsed === "object" &&
          !Array.isArray(parsed)
        ) {
          headers = parsed as Record<string, string>;
        } else {
          throw new Error("Headers must be a JSON object");
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Headers must be a valid JSON object"
        );
        return;
      }
    }

    const id = editingId ?? (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : uuidv4());

    onSave({
      id,
      name: form.name.trim() ? form.name.trim() : undefined,
      transport: {
        type: form.transportType,
        url: trimmedUrl,
        headers,
      },
    });
    resetForm();
  };

  const handleRemove = (id: string) => {
    onRemove(id);
    if (editingId === id) {
      resetForm();
    }
  };

  const activeServerEntries = useMemo(() =>
    configs.map((cfg) => ({
      config: cfg,
      status: serversMap.get(cfg.id) as {
        tools?: MCPToolSummary[];
        isLoading?: boolean;
        error?: string | null;
        lastLoadedAt?: number;
      } | undefined,
    })),
  [configs, serversMap]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[800px] max-w-[90vw] sm:max-w-[800px]">
        <SheetHeader>
          <SheetTitle>MCP servers</SheetTitle>
          <SheetDescription>
            Manage Model Context Protocol servers available to this chat.
          </SheetDescription>
        </SheetHeader>
        <div className="grid flex-1 auto-rows-min gap-6 px-4 overflow-y-auto acb-scrollbar">
          <div className="space-y-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Configured servers</h3>
                <p className="text-sm text-muted-foreground">
                  {activeServerEntries.length === 0 
                    ? "No MCP servers configured yet. Click the button below to add your first server."
                    : "Edit, remove, or inspect existing MCP server connections."
                  }
                </p>
              </div>
              
              {activeServerEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No MCP servers configured yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeServerEntries.map(({ config, status }) => (
                    <Card key={config.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 text-sm">
                          <div className="font-medium">
                            {config.name ?? config.transport.url}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {config.transport.url}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Transport: {config.transport.type}
                          </div>
                          {status?.tools && status.tools.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Tools loaded: {status.tools.length}
                            </div>
                          )}
                          {status?.isLoading && (
                            <div className="text-xs text-muted-foreground">
                              Loading tools…
                            </div>
                          )}
                          {status?.error && (
                            <div className="text-xs text-destructive">
                              {String(status.error)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(config)}
                            aria-label="Edit server"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemove(config.id)}
                            aria-label="Remove server"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4">
              {!showForm && (
                <Button variant="outline" onClick={createNew} className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Add New Server
                </Button>
              )}

              {showForm && (
                <div className="space-y-6 p-6 rounded-lg border bg-background">
                  <form
                    id="mcp-server-form"
                    className="space-y-6"
                    onSubmit={handleSubmit}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="mcp-name-input">Display name</Label>
                      <Input
                        id="mcp-name-input"
                        value={form.name}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, name: event.target.value }))
                        }
                        placeholder="Optional name"
                      />
                    </div>

                    <div className="grid gap-6 sm:grid-cols-[1fr_180px]">
                      <div className="space-y-2">
                        <Label htmlFor="mcp-url-input">Server URL</Label>
                        <Input
                          id="mcp-url-input"
                          value={form.url}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, url: event.target.value }))
                          }
                          placeholder="https://example.com/mcp"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mcp-transport-input">Transport</Label>
                        <Select
                          value={form.transportType}
                          onValueChange={(value) =>
                            setForm((prev) => ({
                              ...prev,
                              transportType: value as MCPServerTransport["type"],
                            }))
                          }
                        >
                          <SelectTrigger id="mcp-transport-input">
                            <SelectValue placeholder="Select transport" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sse">Server-sent events</SelectItem>
                            <SelectItem value="streamable-http">
                              Streamable HTTP
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mcp-headers-input">Headers (JSON)</Label>
                      <Textarea
                        id="mcp-headers-input"
                        value={form.headers}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, headers: event.target.value }))
                        }
                        placeholder='{ "Authorization": "Bearer ..." }'
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        Optional JSON object of headers sent when connecting.
                      </p>
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {showForm && (
          <SheetFooter>
            <Button type="submit" form="mcp-server-form">
              {editingId ? "Save changes" : "Add server"}
            </Button>
            <SheetClose asChild>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </SheetClose>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
