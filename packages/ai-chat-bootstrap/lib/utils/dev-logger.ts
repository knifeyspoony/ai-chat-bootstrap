const isDevEnvironment = () => {
  if (typeof process === "undefined") {
    return false;
  }
  const env = process.env?.NODE_ENV;
  return env !== "production";
};

/**
 * Logs detailed errors during development without impacting production bundles.
 */
export function logDevError(context: string, error: unknown) {
  if (!isDevEnvironment()) {
    return;
  }

  const prefix = context && context.trim().length > 0 ? context : "[acb]";

  if (error instanceof Error) {
    console.error(`${prefix}: ${error.message}`, error);
    return;
  }

  console.error(`${prefix}:`, error);
}

export { isDevEnvironment };
