// TRESSA AI concierge ("Tria") — streaming proxy to an OpenAI-compatible chat API.
// The API key stays server-side; the browser only talks to this route.
// Currently configured (via .env) to use Groq Cloud, not xAI's Grok — the
// GROK_* env var names predate that switch. Groq periodically decommissions
// older models; if the bot stops responding, check server logs for a
// "model_not_found" error and pick a live model from GET {base}/models.
//
// Env:
//   GROK_API_KEY   (required)  — Groq Cloud key: https://console.groq.com
//   GROK_MODEL     (optional)  — defaults to "openai/gpt-oss-20b"
//   GROK_BASE_URL  (optional)  — defaults to Groq's OpenAI-compatible endpoint

import { NextRequest } from 'next/server';
import { buildSystemPrompt } from '@/lib/chatbotKnowledge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE_URL = process.env.GROK_BASE_URL || 'https://api.groq.com/openai/v1';
const MODEL = process.env.GROK_MODEL || 'openai/gpt-oss-20b';
const API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

type Msg = { role: 'user' | 'assistant'; content: string };

// Keep the context small & safe: last 12 turns, trimmed length.
function sanitize(messages: unknown): Msg[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(
      (m): m is Msg =>
        !!m &&
        typeof (m as Msg).content === 'string' &&
        ((m as Msg).role === 'user' || (m as Msg).role === 'assistant'),
    )
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return Response.json(
      { error: 'The concierge is not configured yet. Please set GROK_API_KEY.' },
      { status: 503 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const history = sanitize(body?.messages);
  if (!history.length || history[history.length - 1].role !== 'user') {
    return Response.json({ error: 'No message to answer.' }, { status: 400 });
  }

  const payload = {
    model: MODEL,
    stream: true,
    temperature: 0.4,
    messages: [{ role: 'system', content: buildSystemPrompt() }, ...history],
  };

  let upstream: Response;
  try {
    upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return Response.json(
      { error: 'Could not reach the concierge service. Please try again.' },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    console.error('[chat] xAI error', upstream.status, detail.slice(0, 500));
    return Response.json(
      { error: 'The concierge is momentarily unavailable. Please try again shortly.' },
      { status: 502 },
    );
  }

  // Re-emit the model's tokens as a clean text/event-stream of plain deltas.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(data);
              const delta = json?.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // partial JSON across chunks — ignore, next pass reassembles
            }
          }
        }
        controller.close();
      } catch (e) {
        console.error('[chat] stream error', e);
        controller.close();
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
