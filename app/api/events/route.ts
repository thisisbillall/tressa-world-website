import { NextRequest } from 'next/server';
import { Client } from 'pg';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Long-lived SSE stream. Opens a dedicated pg client, LISTEN db_changes,
// and pipes each NOTIFY into the stream. Matches tressa-production-webapp.
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let client: Client | null = null;
      let heartbeat: NodeJS.Timeout | null = null;
      let closed = false;

      const send = (chunk: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(chunk)); }
        catch { cleanup(); }
      };

      const cleanup = async () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        if (client) {
          try { await client.query('UNLISTEN db_changes'); } catch {}
          try { await client.end(); } catch {}
        }
        try { controller.close(); } catch {}
      };

      try {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
          send(`data: ${JSON.stringify({ type: 'error', message: 'DATABASE_URL not set' })}\n\n`);
          await cleanup();
          return;
        }

        client = new Client({
          connectionString,
          ssl: /amazonaws\.com|sslmode=require|render\.com|supabase\.co|neon\.tech/i.test(connectionString)
            ? { rejectUnauthorized: false }
            : undefined,
        });
        await client.connect();
        await client.query('LISTEN db_changes');

        send(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

        heartbeat = setInterval(() => send(`: heartbeat\n\n`), 25000);

        client.on('notification', (msg) => {
          try {
            const payload = JSON.parse(msg.payload || '{}');
            send(`data: ${JSON.stringify({ type: 'change', ...payload })}\n\n`);
          } catch {}
        });

        client.on('error', async () => { await cleanup(); });

        req.signal.addEventListener('abort', cleanup);
      } catch (err: any) {
        send(`data: ${JSON.stringify({ type: 'error', message: err?.message || 'sse_failed' })}\n\n`);
        await cleanup();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
