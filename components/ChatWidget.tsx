'use client';

// TRESSA World — "Aria" AI concierge.
// A premium floating chat experience anchored to the bottom-right of every page.
// Streams replies from /api/chat (Grok / xAI) and is styled in the house palette
// (maroon · gold · cream, Playfair serif headings).

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
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
              className="hidden whitespace-nowrap rounded-xl rounded-br-sm bg-white px-3.5 py-2 text-left text-[13px] leading-snug text-ink shadow-[0_8px_30px_-12px_rgba(94,20,30,0.5)] ring-1 ring-gold/30 sm:block"
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
          className="group relative grid h-16 w-16 place-items-center overflow-hidden rounded-full text-cream shadow-[0_14px_40px_-8px_rgba(94,20,30,0.45)] ring-2 ring-gold"
        >
          {open ? (
            <>
              {/* close state — maroon circle + × */}
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-maroon to-maroon-dark" />
              <span className="relative">
                <IconClose />
              </span>
            </>
          ) : (
            /* TRESSA crest fills the button */
            <Image
              src="/brand/tressa-logo-mark.png"
              alt="TRESSA"
              fill
              sizes="64px"
              priority
              className="scale-[1.18] object-contain"
            />
          )}
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
            className="fixed bottom-24 right-4 z-[100] flex h-[70vh] max-h-[620px] w-[calc(100vw-2rem)] max-w-[390px] flex-col overflow-hidden rounded-[26px] bg-cream/60 shadow-[0_30px_80px_-20px_rgba(58,13,20,0.6)] ring-1 ring-white/40 backdrop-blur-2xl sm:right-6 sm:bottom-28"
          >
            {/* Header */}
            <div className="relative flex items-center gap-3 border-b border-white/10 bg-gradient-to-br from-maroon/85 to-maroon-dark/85 px-5 py-4 text-cream backdrop-blur-xl">
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
                    className="rounded-full border border-white/50 bg-white/50 px-3 py-1.5 text-[12px] text-maroon backdrop-blur-md transition hover:border-gold hover:bg-gold/20"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Composer */}
            <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-white/30 bg-white/40 px-3 py-3 backdrop-blur-xl">
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
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed backdrop-blur-md ${
          isUser
            ? 'rounded-br-md bg-maroon/85 text-cream ring-1 ring-white/15'
            : 'rounded-bl-md bg-white/60 text-ink ring-1 ring-white/50'
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
