'use client';

// TRESSA World — "Aria" AI concierge.
// A premium floating chat experience anchored to the bottom-right of every page.
// Streams replies from /api/chat (Grok / xAI) and is styled in the house palette
// (maroon · gold · cream, Playfair serif headings).

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CHATBOT_META } from '@/lib/chatbotKnowledge';

type Msg = { role: 'user' | 'assistant'; content: string };

const GREETING: Msg = { role: 'assistant', content: CHATBOT_META.greeting };
const TEASERS = CHATBOT_META.teasers;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [teased, setTeased] = useState(false); // whether a nudge is visible
  const [teaseIdx, setTeaseIdx] = useState(0); // which rotating nudge to show

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  // Focus the field when the panel opens.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  // Rotating attention nudges so guests notice the concierge. The bubble fades
  // in, holds, fades out, advances to the next message, and repeats — pausing
  // whenever the panel is open.
  useEffect(() => {
    if (open) {
      setTeased(false);
      return;
    }
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const cycle = () => {
      if (!alive) return;
      setTeased(true);
      timers.push(
        setTimeout(() => {
          if (!alive) return;
          setTeased(false); // fade out
          timers.push(
            setTimeout(() => {
              if (!alive) return;
              setTeaseIdx((i) => (i + 1) % TEASERS.length); // next message
              cycle();
            }, 600), // wait for exit animation
          );
        }, 5000), // hold visible
      );
    };

    const start = setTimeout(cycle, 5000); // first nudge after 5s
    timers.push(start);

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;

    const next: Msg[] = [...messages, { role: 'user', content }];
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const { error } = await res.json().catch(() => ({ error: '' }));
        throw new Error(error || 'unavailable');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', content: snapshot };
          return copy;
        });
      }

      if (!acc.trim()) throw new Error('empty');
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: 'assistant',
          content: `I'm so sorry — I'm having trouble right now. Please try again, or reach our team directly at ${CHATBOT_META.phone}.`,
        };
        return copy;
      });
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <>
      {/* Floating launcher */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-row items-center gap-3 sm:bottom-6 sm:right-6">
        <AnimatePresence mode="wait">
          {teased && !open && (
            <motion.button
              key={`tease-${teaseIdx}`}
              initial={{ opacity: 0, x: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              transition={{ duration: 0.35 }}
              onClick={() => setOpen(true)}
              className="whitespace-nowrap rounded-lg rounded-br-sm bg-white px-2.5 py-1 text-left text-[9px] leading-snug text-ink shadow-[0_6px_20px_-10px_rgba(94,20,30,0.5)] ring-1 ring-gold/30"
            >
              <span className="font-serif text-maroon">{TEASERS[teaseIdx].lead}</span>{' '}
              {TEASERS[teaseIdx].rest}
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          aria-label={open ? 'Close concierge chat' : 'Open concierge chat'}
          onClick={() => {
            setOpen((o) => !o);
            setTeased(false);
          }}
          whileTap={{ scale: 0.92 }}
          className="group relative grid h-16 w-16 place-items-center rounded-full text-maroon shadow-[0_14px_40px_-8px_rgba(94,20,30,0.45)]"
        >
          {/* button face */}
          <span className="absolute inset-0 rounded-full bg-white ring-2 ring-gold" />
          <span className="relative">
            {open ? <IconClose /> : <IconChat />}
          </span>
        </motion.button>
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed bottom-24 right-4 z-[100] flex h-[70vh] max-h-[620px] w-[calc(100vw-2rem)] max-w-[390px] flex-col overflow-hidden rounded-[26px] bg-cream shadow-[0_30px_80px_-20px_rgba(58,13,20,0.6)] sm:right-6 sm:bottom-28"
          >
            {/* Header */}
            <div className="relative flex items-center gap-3 bg-gradient-to-br from-maroon to-maroon-dark px-5 py-4 text-cream">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-gold/15 ring-1 ring-gold/40">
                <IconConcierge />
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <p className="font-serif text-base tracking-[0.18em] leading-none">TRESSA</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
                  Online
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="ml-auto grid h-8 w-8 place-items-center rounded-full text-cream/70 transition hover:bg-white/10 hover:text-cream"
              >
                <IconClose />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              data-lenis-prevent
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 overscroll-contain"
              style={{ scrollbarWidth: 'thin' }}
            >
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role} content={m.content} pending={busy && i === messages.length - 1 && !m.content} />
              ))}
            </div>

            {/* Quick suggestions (only before the guest has typed) */}
            {messages.length <= 1 && !busy && (
              <div className="flex flex-wrap gap-2 px-4 pb-2">
                {CHATBOT_META.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-maroon/20 bg-white px-3 py-1.5 text-[12px] text-maroon transition hover:border-gold hover:bg-gold/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Composer */}
            <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-maroon/10 bg-white px-3 py-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about tables, menu, hours…"
                className="min-w-0 flex-1 bg-transparent px-2 text-[14px] text-ink placeholder:text-muted/70 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-maroon text-cream transition disabled:opacity-40 enabled:hover:bg-maroon-light"
              >
                <IconSend />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({ role, content, pending }: { role: 'user' | 'assistant'; content: string; pending?: boolean }) {
  const isUser = role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
          isUser
            ? 'rounded-br-md bg-maroon text-cream'
            : 'rounded-bl-md bg-white text-ink ring-1 ring-maroon/10'
        }`}
      >
        {pending ? <Typing /> : <RichText text={content} isUser={isUser} />}
      </div>
    </motion.div>
  );
}

// Renders assistant/user text with clickable links. Supports markdown links
// [label](url) and bare http(s):// or /path URLs. Everything else is plain text.
function RichText({ text, isUser }: { text: string; isUser: boolean }) {
  const linkClass = isUser
    ? 'font-medium text-gold underline underline-offset-2'
    : 'font-medium text-maroon underline underline-offset-2 hover:text-maroon-light';

  // One regex, two alternatives: markdown links OR bare urls/paths.
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)|(https?:\/\/[^\s]+)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const label = m[1] ?? m[3];
    const href = m[2] ?? m[3];
    const external = /^https?:\/\//.test(href);
    parts.push(
      <a
        key={key++}
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={linkClass}
      >
        {label}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <>{parts}</>;
}

function Typing() {
  return (
    <span className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-maroon/50"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '1s' }}
        />
      ))}
    </span>
  );
}

/* ---------- icons (inline, no deps) ---------- */

// Font Awesome "circle-user" (regular) — the header avatar mark.
function IconConcierge() {
  return (
    <svg width="24" height="24" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M406.5 399.6C387.4 352.9 341.5 320 288 320l-64 0c-53.5 0-99.4 32.9-118.5 79.6C69.9 362.2 48 311.7 48 256C48 141.1 141.1 48 256 48s208 93.1 208 208c0 55.7-21.9 106.2-57.5 143.6zm-40.1 32.7C334.4 452.4 296.6 464 256 464s-78.4-11.6-110.5-31.7c7.3-36.7 39.7-64.3 78.5-64.3l64 0c38.8 0 71.2 27.6 78.5 64.3zM256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-272a40 40 0 1 1 0-80 40 40 0 1 1 0 80zm-88-40a88 88 0 1 0 176 0 88 88 0 1 0 -176 0z" />
    </svg>
  );
}

// Font Awesome "cotton-bureau" brand mark — the AI concierge launcher icon.
function IconChat() {
  return (
    <svg width="34" height="34" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M474.31 330.41c-23.66 91.85-94.23 144.59-201.9 148.35V429.6c0-48 26.41-74.39 74.39-74.39 62 0 99.2-37.2 99.2-99.21 0-61.37-36.53-98.28-97.38-99.06-33-69.32-146.5-64.65-177.24 0C110.52 157.72 74 194.63 74 256c0 62.13 37.27 99.41 99.4 99.41 48 0 74.55 26.23 74.55 74.39V479c-134.43-5-211.1-85.07-211.1-223 0-141.82 81.35-223.2 223.2-223.2 114.77 0 189.84 53.2 214.69 148.81H500C473.88 71.51 388.22 8 259.82 8 105 8 12 101.19 12 255.82 12 411.14 105.19 504.34 259.82 504c128.27 0 213.87-63.81 239.67-173.59zM357 182.33c41.37 3.45 64.2 29 64.2 73.67 0 48-26.43 74.41-74.4 74.41-28.61 0-49.33-9.59-61.59-27.33 83.06-16.55 75.59-99.67 71.79-120.75zm-81.68 97.36c-2.46-10.34-16.33-87 56.23-97 2.27 10.09 16.52 87.11-56.26 97zM260 132c28.61 0 49 9.67 61.44 27.61-28.36 5.48-49.36 20.59-61.59 43.45-12.23-22.86-33.23-38-61.6-43.45 12.41-17.69 33.27-27.35 61.57-27.35zm-71.52 50.72c73.17 10.57 58.91 86.81 56.49 97-72.41-9.84-59-86.95-56.25-97zM173.2 330.41c-48 0-74.4-26.4-74.4-74.41 0-44.36 22.86-70 64.22-73.67-6.75 37.2-1.38 106.53 71.65 120.75-12.14 17.63-32.84 27.3-61.14 27.3zm53.21 12.39A80.8 80.8 0 0 0 260 309.25c7.77 14.49 19.33 25.54 33.82 33.55a80.28 80.28 0 0 0-33.58 33.83c-8-14.5-19.07-26.23-33.56-33.83z" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </svg>
  );
}
