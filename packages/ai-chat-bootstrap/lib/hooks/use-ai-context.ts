import { useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAIContextStore } from "../stores";

export interface UseAIContextOptions {
  description: string;
  value: any;
  parentId?: string;
  categories?: string[];
  available?: "enabled" | "disabled";
  dump?: (description: string, value: any) => string;
  priority?: number;
}

function dumpJSON(description: string, value: any): string {
  return `${description}: ${
    typeof value === "string" ? value : JSON.stringify(value)
  }`;
}

export function useAIContext(
  {
    description,
    value,
    parentId,
    categories,
    dump,
    available = "enabled",
    priority,
  }: UseAIContextOptions,
  dependencies?: any[]
): string | undefined {
  const setContextItem = useAIContextStore((s) => s.setContextItem);
  const removeContextItem = useAIContextStore((s) => s.removeContextItem);
  const idRef = useRef<string | undefined>(undefined);
  dump = dump || dumpJSON;

  const dumped = dump(description, value);

  useEffect(() => {
    if (available === "disabled") return;

    // Generate a new id for this registration (cleanup removes previous)
    const id = uuidv4();

    // Store a single text line with optional metadata
    setContextItem({
      id,
      text: dumped,
      description,
      priority,
      categories,
      parentId,
    });
    idRef.current = id;

    return () => {
      removeContextItem(id);
    };
  }, [
    available,
    dumped,
    description,
    value,
    parentId,
    categories,
    setContextItem,
    removeContextItem,
    priority,
    ...(dependencies || []),
  ]);

  return idRef.current;
}
