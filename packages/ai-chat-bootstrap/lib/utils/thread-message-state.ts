import type { UIMessage } from "ai";
import isEqual from "fast-deep-equal";
import { computeMessagesSignature } from "./message-signature";

/**
 * Internal in-memory representation of a thread's messages.
 * Stores order separately from content to make it easier to reuse existing
 * message objects when the AI SDK replaces the `messages[]` array reference.
 */
export interface ThreadMessageState {
  signature: string;
  order: string[];
  byId: Map<string, UIMessage>;
  length: number;
  materialized: UIMessage[];
}

/**
 * Create or update a {@link ThreadMessageState} from an incoming list of messages.
 * When the signature is unchanged, the previous state reference is returned to
 * avoid unnecessary updates. Matching messages reuse the prior object instance
 * (based on id and deep equality) to minimize downstream renders.
 */
export function reconcileThreadMessageState(
  messages: UIMessage[],
  previous?: ThreadMessageState
): ThreadMessageState {
  const nextSignature = computeMessagesSignature(messages);

  if (previous && previous.signature === nextSignature) {
    return previous;
  }

  const order: string[] = [];
  const byId = new Map<string, UIMessage>();

  const previousById = previous?.byId ?? null;

  messages.forEach((message, index) => {
    const resolvedId = ensureMessageId(message, index);
    let value = message;
    if (previousById && previousById.has(resolvedId)) {
      const prior = previousById.get(resolvedId);
      if (prior === message || (prior && isEqual(prior, message))) {
        value = prior;
      }
    }
    byId.set(resolvedId, value);
    order.push(resolvedId);
  });

  const materialized: UIMessage[] = order
    .map((id) => byId.get(id))
    .filter((message): message is UIMessage => Boolean(message));

  return {
    signature: nextSignature,
    order,
    byId,
    length: order.length,
    materialized,
  };
}

/**
 * Materializes a message state back into an ordered array. Returns a new array
 * but preserves individual message object references that were retained during
 * reconciliation.
 */
export function materializeMessageState(state: ThreadMessageState): UIMessage[] {
  return state.materialized;
}

function ensureMessageId(message: UIMessage, index: number): string {
  const candidate = (message as { id?: unknown }).id;
  if (typeof candidate === "string" && candidate.length > 0) {
    return candidate;
  }
  const role =
    typeof message.role === "string" && message.role.length > 0
      ? message.role
      : "message";
  return `${role}-${index}`;
}
