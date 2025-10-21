import { Server } from "lucide-react";
import React, { useCallback, useState } from "react";
import { Button } from "../../components/ui/button";
import { McpServersDialog } from "./mcp-servers-dialog";
import { useAIMCPServersStore, useStableMCPServers } from "../../stores";
import { useShallow } from "zustand/react/shallow";
import { cn } from "../../utils";
import { fetchMCPServerTools } from "../../utils/mcp-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";

export interface McpServersButtonProps {
  className?: string;
}

export function McpServersButton({ className }: McpServersButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // MCP store subscriptions with stable selectors using useShallow
  const {
    mcpConfigurations,
    addOrUpdateMcpConfiguration,
    removeMcpConfiguration,
    defaultApi,
    setServerLoading,
    setServerError,
    setServerTools,
  } = useAIMCPServersStore(
    useShallow((state) => ({
      mcpConfigurations: state.configurations,
      addOrUpdateMcpConfiguration: state.addOrUpdateConfiguration,
      removeMcpConfiguration: state.removeConfiguration,
      defaultApi: state.defaultApi,
      setServerLoading: state.setServerLoading,
      setServerError: state.setServerError,
      setServerTools: state.setServerTools,
    }))
  );

  // Use stable MCP servers object to prevent re-renders
  const mcpServersMap = useStableMCPServers();

  // Handle refresh for a specific server
  const handleRefresh = useCallback(
    async (serverId: string) => {
      const config = mcpConfigurations.find((c) => c.id === serverId);
      if (!config) return;

      setServerLoading(serverId, true);
      setServerError(serverId, null);

      const result = await fetchMCPServerTools({
        serverId: config.id,
        name: config.name,
        transport: config.transport,
        api: defaultApi ?? "/api/mcp-discovery",
      });

      setServerTools(serverId, result.tools, result.error ?? undefined);
      if (result.error && result.tools.length === 0) {
        setServerError(serverId, result.error);
      }
    },
    [
      mcpConfigurations,
      defaultApi,
      setServerLoading,
      setServerError,
      setServerTools,
    ]
  );
  return (
    <>
      <TooltipProvider delayDuration={200} skipDelayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(true)}
              aria-label="Configure MCP servers"
              className={cn("h-8 w-8", className)}
            >
              <Server className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Configure MCP servers</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <McpServersDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        configs={mcpConfigurations}
        onSave={addOrUpdateMcpConfiguration}
        onRemove={removeMcpConfiguration}
        onRefresh={handleRefresh}
        serversMap={mcpServersMap}
      />
    </>
  );
}
