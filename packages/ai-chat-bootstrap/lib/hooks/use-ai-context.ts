import { useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAIContextStore } from "../stores";

export interface UseAIContextOptions {
  description: string;
  value: unknown;
  parentId?: string;
  categories?: string[];
  available?: "enabled" | "disabled";
  dump?: (description: string, value: unknown) => string;
  priority?: number;
}

function dumpJSON(description: string, value: unknown): string {
  const serialized =
    typeof value === "string"
      ? value
      : (() => {
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        })();
  return `${description}: ${serialized}`;
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
  dependencies?: ReadonlyArray<unknown>
): string | undefined {
  const setContextItem = useAIContextStore((s) => s.setContextItem);
  const removeContextItem = useAIContextStore((s) => s.removeContextItem);
  const idRef = useRef<string | undefined>(undefined);
  const dumpFn = dump ?? dumpJSON;
  const dumped = dumpFn(description, value);

  const previousDependenciesRef = useRef<ReadonlyArray<unknown> | undefined>(
    undefined
  );
  const dependencyVersionRef = useRef(0);

  if (dependencies) {
    const prev = previousDependenciesRef.current;
    const changed =
      !prev ||
      prev.length !== dependencies.length ||
      dependencies.some((dep, index) => dep !== prev[index]);
    if (changed) {
      previousDependenciesRef.current = [...dependencies];
      dependencyVersionRef.current += 1;
    }
  } else if (previousDependenciesRef.current) {
    previousDependenciesRef.current = undefined;
    dependencyVersionRef.current += 1;
  }

  const dependencyVersion = dependencyVersionRef.current;

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
    parentId,
    categories,
    setContextItem,
    removeContextItem,
    priority,
    dependencyVersion,
  ]);

  return idRef.current;
}
