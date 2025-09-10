import { jsonSchema } from "@ai-sdk/provider-utils";
import { tool } from "ai";
import type { SerializedTool } from "../stores/tools";

export type BackendTool = ReturnType<typeof tool>;

/**
 * Deserialize an array of SerializedTool objects (sent from frontend) into a
 * map of backend tool definitions usable by the AI SDK.
 */
export function deserializeFrontendTools(serialized?: SerializedTool[] | null) {
  if (!serialized || serialized.length === 0)
    return {} as Record<string, BackendTool>;
  return serialized.reduce((acc, t) => {
    acc[t.name] = tool({
      description: t.description,
      inputSchema: jsonSchema(t.inputSchema as Record<string, unknown>),
      // Backend doesn't execute; frontend handles tool execution results.
    });
    return acc;
  }, {} as Record<string, BackendTool>);
}
