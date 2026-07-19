/** Supabase nested relation (object or array depending on query). */
export function relationName(
  rel: { name: string } | { name: string }[] | null | undefined,
): string | undefined {
  if (!rel) return undefined;
  if (Array.isArray(rel)) return rel[0]?.name;
  return rel.name;
}
