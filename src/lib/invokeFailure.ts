function readBody(value: unknown): { message: string; code: string } {
  if (!value || typeof value !== "object") return { message: "", code: "" };
  const row = value as { error?: unknown; code?: unknown };
  return {
    message: typeof row.error === "string" ? row.error : "",
    code: typeof row.code === "string" ? row.code : "",
  };
}

/** Reads a function error from either the parsed data or the HTTP response body. */
export async function readInvokeFailure(data: unknown, error: unknown): Promise<{ message: string; code: string }> {
  let parsed = readBody(data);
  const context = error && typeof error === "object" && "context" in error
    ? (error as { context?: unknown }).context
    : undefined;
  if ((!parsed.code || !parsed.message) && context instanceof Response) {
    try {
      const body = readBody(await context.clone().json());
      parsed = {
        message: parsed.message || body.message,
        code: parsed.code || body.code,
      };
    } catch {
      // Non-JSON function errors keep the client message.
    }
  }
  if (!parsed.message && error && typeof error === "object" && "message" in error) {
    parsed.message = String((error as { message?: unknown }).message ?? "");
  }
  return parsed;
}
