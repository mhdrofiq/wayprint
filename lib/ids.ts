const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True if `id` looks like a Postgres UUID (every table's primary key). */
export function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}
