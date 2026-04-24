'use client';

// Cross-tab fallback for DB-change events. Mirrors the SSE channel format
// so useRealtime can listen to both sources with the same handlers.

const CHANNEL = 'tressa:db_changes';
const EVENT = 'tressa:db_changes';

export function broadcastTables(tables: string[]): void {
  if (typeof window === 'undefined' || !tables?.length) return;

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const ch = new BroadcastChannel(CHANNEL);
      ch.postMessage({ tables, at: Date.now() });
      ch.close();
    } catch {}
  }

  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { tables } }));
  } catch {}
}

export function subscribeTables(
  tables: string[],
  handler: (changedTable: string) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};

  const watch = new Set(tables);
  const disposers: Array<() => void> = [];

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const ch = new BroadcastChannel(CHANNEL);
      ch.onmessage = (ev: MessageEvent<{ tables?: string[] }>) => {
        for (const t of ev.data?.tables ?? []) {
          if (watch.has(t)) { handler(t); return; }
        }
      };
      disposers.push(() => ch.close());
    } catch {}
  }

  const dom = (ev: Event) => {
    const detail = (ev as CustomEvent<{ tables?: string[] }>).detail;
    for (const t of detail?.tables ?? []) {
      if (watch.has(t)) { handler(t); return; }
    }
  };
  window.addEventListener(EVENT, dom);
  disposers.push(() => window.removeEventListener(EVENT, dom));

  return () => disposers.forEach((d) => d());
}
