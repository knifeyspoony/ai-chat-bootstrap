/**
 * Logs detailed errors when enabled via devTools configuration.
 * No longer relies on NODE_ENV - respects explicit devTools.showErrorMessages flag.
 */
export function logDevError(
  context: string,
  error: unknown,
  show: boolean = false
) {
  // If show is true, log the error
  if (!show) {
    return;
  }

  const prefix = context && context.trim().length > 0 ? context : "[acb]";

  if (error instanceof Error) {
    console.error(`${prefix}: ${error.message}`, error);
    return;
  }

  console.error(`${prefix}:`, error);
}
