import { z } from "zod";

// Zod v4 returns internal $ZodType instances from helpers like unwrap/removeDefault/element.
// This helper safely casts those to the public ZodTypeAny for our introspection utilities.
const asZod = (s: unknown): z.ZodTypeAny => s as unknown as z.ZodTypeAny;

/**
 * Check if a Zod schema has required parameters
 */
export function hasRequiredParameters(schema: z.ZodTypeAny): boolean {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    // At least one non-optional, non-defaulted param
    return Object.values(shape).some(
      (s) => !(s instanceof z.ZodOptional) && !(s instanceof z.ZodDefault)
    );
  }
  return false;
}

/**
 * Generate simple placeholder text from Zod schema (just parameter names)
 */
export function generatePlaceholder(schema: z.ZodTypeAny): string {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const params = Object.keys(shape).map((key) => {
      const value = shape[key] as z.ZodTypeAny;
      const isOptional =
        value instanceof z.ZodOptional || value instanceof z.ZodDefault;
      return isOptional ? `${key}?` : key;
    });
    return params.join(" ");
  }
  return "";
}

/**
 * Extract detailed parameter information from Zod schema
 */
export function getParameterInfo(schema: z.ZodTypeAny): Array<{
  name: string;
  type: string;
  description?: string;
  isOptional: boolean;
  defaultValue?: unknown;
}> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    return Object.entries(shape).map(([key, value]) => {
      const zodSchema = value as z.ZodTypeAny;
      const isOptional =
        zodSchema instanceof z.ZodOptional || zodSchema instanceof z.ZodDefault;
      // Zod doesn't expose description in public API; best-effort cast.
      const description = (zodSchema as { description?: string } | undefined)
        ?.description;
      const defaultValue: unknown = undefined;
      // Not reliably accessible in public API; leave undefined.

      return {
        name: key,
        type: getZodType(zodSchema),
        description,
        isOptional,
        defaultValue,
      };
    });
  }
  return [];
}

/**
 * Get current parameter index based on input text and cursor position
 */
export function getCurrentParameterIndex(
  input: string,
  cursorPosition: number,
  schema: z.ZodTypeAny
): number {
  if (!(schema instanceof z.ZodObject)) return 0;

  // Determine command name and argument text
  const trimmed = input.startsWith("/") ? input.slice(1) : input;
  const firstSpace = trimmed.indexOf(" ");
  if (firstSpace === -1) return 0;

  const argsText = trimmed.slice(firstSpace + 1);
  const indexAfterCmd = (input.startsWith("/") ? 1 : 0) + firstSpace + 1; // position after the space following the command name
  const cursorInArgs = Math.max(0, cursorPosition - indexAfterCmd);

  const tokens = tokenizeArgs(argsText);

  // If cursor is inside a token span, return that token's index
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    // treat token span as [start, end) exclusive of end
    if (cursorInArgs >= t.start && cursorInArgs < t.end) {
      return clampIndex(i, schema);
    }
  }

  // Cursor is in whitespace/comma gap. Determine the index by counting tokens starting before it
  const numTokensBefore = tokens.filter((t) => t.start < cursorInArgs).length;
  // If there's trailing whitespace after the last token and cursor is there, it's next param index
  return clampIndex(numTokensBefore, schema);
}

/**
 * Get human-readable type from Zod schema
 */
function getZodType(schema: z.ZodTypeAny): string {
  if (schema instanceof z.ZodString) return "string";
  if (schema instanceof z.ZodNumber) return "number";
  if (schema instanceof z.ZodBoolean) return "boolean";
  if (schema instanceof z.ZodEnum) {
    const values = schema.options;
    return values?.join("|") ?? "enum";
  }
  if (schema instanceof z.ZodOptional)
    return getZodType(asZod(schema.unwrap()));
  if (schema instanceof z.ZodDefault)
    return getZodType(asZod(schema.removeDefault()));
  if (schema instanceof z.ZodArray)
    return `${getZodType(asZod(schema.element))}[]`;
  return "any";
}

/**
 * Check if all required parameters are provided in the input
 */
export function hasAllRequiredParams(
  argsString: string,
  schema: z.ZodTypeAny
): boolean {
  if (!(schema instanceof z.ZodObject)) return true;

  const shape = schema.shape;
  const requiredParams = Object.entries(shape).filter(([, value]) => {
    const zodSchema = value as z.ZodTypeAny;
    return (
      !(zodSchema instanceof z.ZodOptional) &&
      !(zodSchema instanceof z.ZodDefault)
    );
  });

  if (requiredParams.length === 0) return true;

  if (!argsString.trim()) return false;

  // For single parameter commands, check if we have any input
  if (requiredParams.length === 1) {
    return argsString.trim().length > 0;
  }

  // For multiple parameters, count provided args using quote-aware tokenization
  const args = tokenizeArgs(argsString);
  return args.length >= requiredParams.length;
}

/**
 * Parse string arguments into parameters based on Zod schema
 */
export function parseArgsToParams(
  argsString: string,
  schema: z.ZodTypeAny
): unknown {
  if (!argsString.trim()) {
    // Return empty object for commands with no args
    return {};
  }

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const keys = Object.keys(shape);

    if (keys.length === 1) {
      // Single parameter - use the whole string
      const key = keys[0];
      const paramSchema = shape[key] as z.ZodTypeAny;
      return { [key]: parseValue(argsString.trim(), paramSchema) };
    } else {
      // Multiple parameters - use quote-aware tokenizer (spaces/commas outside quotes)
      const args = tokenizeArgs(argsString).map((t) => t.value);
      const result: Record<string, unknown> = {};

      keys.forEach((key, index) => {
        if (index < args.length) {
          const paramSchema = shape[key] as z.ZodTypeAny;
          result[key] = parseValue(args[index], paramSchema);
        }
      });

      return result;
    }
  }

  return {};
}

/**
 * Parse a single value based on its Zod schema type
 */
function parseValue(value: string, schema: z.ZodTypeAny): unknown {
  // Handle optional and default schemas
  if (schema instanceof z.ZodOptional) {
    return parseValue(value, asZod(schema.unwrap()));
  }
  if (schema instanceof z.ZodDefault) {
    return parseValue(value, asZod(schema.removeDefault()));
  }

  if (schema instanceof z.ZodNumber) {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }

  if (schema instanceof z.ZodBoolean) {
    const lower = value.toLowerCase();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;
    return value;
  }

  if (schema instanceof z.ZodEnum) {
    const values = schema.options;
    if (values && values.includes(value)) return value;
    // Return the value anyway and let Zod validation handle it
    return value;
  }

  // Default to string
  return value;
}

/**
 * Quote-aware tokenizer for argument strings.
 * Splits on whitespace or commas that are not inside single or double quotes.
 * Returns tokens with their unquoted/escaped value and start/end indices in the original args string.
 */
function tokenizeArgs(
  args: string
): Array<{ value: string; start: number; end: number }> {
  const tokens: Array<{ value: string; start: number; end: number }> = [];
  const n = args.length;
  let i = 0;

  const isDelimiter = (ch: string) =>
    ch === " " || ch === "\t" || ch === "\n" || ch === ",";

  while (i < n) {
    // Skip leading delimiters
    while (i < n && isDelimiter(args[i]!)) i++;
    if (i >= n) break;

    const tokenStart = i;
    let buf = "";
    let inQuote: '"' | "'" | null = null;

    while (i < n) {
      const ch = args[i]!;

      if (inQuote) {
        if (ch === "\\") {
          // Escape next char within quotes
          if (i + 1 < n) {
            buf += args[i + 1]!;
            i += 2;
            continue;
          } else {
            // trailing backslash; treat literally
            buf += ch;
            i++;
            continue;
          }
        }
        if (ch === inQuote) {
          // end quote
          inQuote = null;
          i++;
          continue;
        }
        buf += ch;
        i++;
        continue;
      }

      // Not inside quote
      if (ch === '"' || ch === "'") {
        inQuote = ch as '"' | "'";
        i++;
        continue;
      }
      if (ch === "\\") {
        // backslash escape outside quotes (e.g., a\ b)
        if (i + 1 < n) {
          buf += args[i + 1]!;
          i += 2;
          continue;
        } else {
          buf += ch;
          i++;
          continue;
        }
      }
      if (isDelimiter(ch)) {
        // token boundary
        break;
      }

      buf += ch;
      i++;
    }

    const tokenEndExclusive = i; // exclusive index where token ends
    tokens.push({ value: buf, start: tokenStart, end: tokenEndExclusive });
  }

  return tokens;
}

function clampIndex(index: number, schema: z.ZodTypeAny): number {
  if (!(schema instanceof z.ZodObject)) return 0;
  const max = Math.max(0, Object.keys(schema.shape).length - 1);
  return Math.min(Math.max(0, index), max);
}
