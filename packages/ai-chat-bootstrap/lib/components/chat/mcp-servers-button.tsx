import { Settings2 } from "lucide-react";
import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import { McpServersDialog } from "./mcp-servers-dialog";
import { useAIMCPServersStore, useStableMCPServers } from "../../stores";
import { useShallow } from "zustand/react/shallow";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";

export function McpServersButton() {
  const [isOpen, setIsOpen] = useState(false);

  // MCP store subscriptions with stable selectors using useShallow
  const {
    mcpConfigurations,
    addOrUpdateMcpConfiguration,
    removeMcpConfiguration,
  } = useAIMCPServersStore(
    useShallow((state) => ({
      mcpConfigurations: state.configurations,
      addOrUpdateMcpConfiguration: state.addOrUpdateConfiguration,
      removeMcpConfiguration: state.removeConfiguration,
    }))
  );

  // Use stable MCP servers object to prevent re-renders
  const mcpServersMap = useStableMCPServers();


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
            >
              <Settings2 className="h-4 w-4" />
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
        serversMap={mcpServersMap}
      />
    </>
  );
}
