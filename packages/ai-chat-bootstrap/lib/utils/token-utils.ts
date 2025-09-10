/**
 * Lightweight token estimation utilities (approximate) to avoid heavy deps.
 * Assumes ~4 characters per token average for mixed English text.
 * Provides hook points for future model-specific estimators.
 */
export interface TokenEstimatorOptions {
  avgCharsPerToken?: number; // default 4
}

export function estimateTokens(
  text: string,
  opts: TokenEstimatorOptions = {}
): number {
  const { avgCharsPerToken = 4 } = opts;
  if (!text) return 0;
  return Math.ceil(text.length / avgCharsPerToken);
}

export function estimateTokensForLines(
  lines: string[],
  opts?: TokenEstimatorOptions
): number {
  if (!lines.length) return 0;
  return estimateTokens(lines.join("\n"), opts);
}

export interface CompressSectionParams {
  lines: string[];
  keepHead?: number;
  keepTail?: number;
  placeholder?: string;
}

export function compressLines({
  lines,
  keepHead = 8,
  keepTail = 4,
  placeholder = "... [compressed] ...",
}: CompressSectionParams): string[] {
  if (lines.length <= keepHead + keepTail + 2) return lines; // nothing to compress
  return [...lines.slice(0, keepHead), placeholder, ...lines.slice(-keepTail)];
}
