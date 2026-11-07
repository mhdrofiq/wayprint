type Result = { data?: unknown; error?: unknown; count?: number | null };
type Call = { table: string; chain: [string, unknown[]][] };

/** A stand-in Supabase client. Each `from(table)` chain resolves to the next
 *  scripted result for that table and is recorded so tests can read the writes. */
export const db = {
  script: {} as Record<string, Result[]>,
  calls: [] as Call[],
  user: null as { id: string } | null,
  reset() {
    this.script = {};
    this.calls = [];
    this.user = null;
  },
  /** The recorded chains against `table` that called `method`, with its arguments. */
  ops(table: string, method: string) {
    return this.calls
      .filter((c) => c.table === table)
      .flatMap((c) => c.chain.filter(([m]) => m === method).map(([, args]) => args));
  },
};

function chain(table: string) {
  const call: Call = { table, chain: [] };
  db.calls.push(call);
  const builder: object = new Proxy({}, {
    get(_, prop) {
      if (prop === 'then') {
        const result = db.script[table]?.shift() ?? {};
        return (resolve: (v: unknown) => void) => resolve({ data: null, error: null, count: null, ...result });
      }
      return (...args: unknown[]) => {
        call.chain.push([String(prop), args]);
        return builder;
      };
    },
  });
  return builder;
}

export const fakeClient = {
  from: chain,
  rpc: (name: string) => chain(`rpc:${name}`),
  auth: {
    getUser: async (token: string) =>
      token === 'good-token' && db.user
        ? { data: { user: db.user }, error: null }
        : { data: { user: null }, error: { message: 'invalid' } },
  },
};

export const r2Sent: { name: string; input: Record<string, unknown> }[] = [];
export const r2Pages: { Contents?: { Key?: string }[]; IsTruncated?: boolean; NextContinuationToken?: string }[] = [];

class Command {
  constructor(public input: Record<string, unknown>) {}
}
export class PutObjectCommand extends Command {}
export class DeleteObjectCommand extends Command {}
export class ListObjectsV2Command extends Command {}
export class S3Client {
  async send(cmd: Command) {
    r2Sent.push({ name: cmd.constructor.name, input: cmd.input });
    return cmd instanceof ListObjectsV2Command ? (r2Pages.shift() ?? {}) : {};
  }
}
