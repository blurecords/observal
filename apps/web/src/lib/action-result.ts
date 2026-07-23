export type ActionResult = { ok: true } | { error: string };

export function getActionError(result: unknown): string | null {
  if (result == null || typeof result !== "object") {
    return "Respuesta inesperada del servidor";
  }
  if ("error" in result && typeof (result as { error?: unknown }).error === "string") {
    return (result as { error: string }).error;
  }
  return null;
}

export function isActionSuccess(result: unknown): result is { ok: true } {
  return result != null && typeof result === "object" && "ok" in result;
}
