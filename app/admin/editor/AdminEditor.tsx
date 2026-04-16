'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DEFAULT_CONTENT,
  resetContent,
  saveContent,
  uid,
  useSiteContent,
  type Offer,
  type SiteContent
} from '@/lib/siteContent';
import { Lock, LogOut, Plus, Save, Trash2, RotateCcw, ExternalLink } from 'lucide-react';

const ADMIN_PASS = 'tressa2026'; // demo only — replace with real auth before production
const AUTH_KEY = 'tressa.admin.v1';

type Tab =
  | 'offers' | 'hero' | 'about' | 'spaces' | 'suites'
  | 'menu' | 'gallery' | 'marquee' | 'quote' | 'video'
  | 'slots' | 'hours' | 'faqs' | 'contact' | 'seo';

export default function AdminEditor() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => { setAuthed(sessionStorage.getItem(AUTH_KEY) === '1'); }, []);
  if (!authed) return <Gate onPass={() => setAuthed(true)} />;
  return <Editor onLogout={() => { sessionStorage.removeItem(AUTH_KEY); setAuthed(false); }} />;
}

// ---------- Auth gate ----------

function Gate({ onPass }: { onPass: () => void }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === ADMIN_PASS) {
      sessionStorage.setItem(AUTH_KEY, '1');
      onPass();
    } else setErr(true);
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdf8ea] px-6">
      <form onSubmit={submit} className="bg-white border border-maroon/15 p-8 w-full max-w-sm shadow-[0_30px_80px_rgba(94,20,30,0.1)]">
        <div className="flex items-center gap-3 text-maroon mb-6">
          <Lock size={18} />
          <p className="font-serif text-xl tracking-wider">Admin Access</p>
        </div>
        <input
          type="password"
          autoFocus
          placeholder="Password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setErr(false); }}
          className={`w-full bg-transparent border-b py-2 text-sm focus:outline-none transition-colors ${err ? 'border-red-500' : 'border-maroon/30 focus:border-gold'}`}
        />
        {err && <p className="text-xs text-red-600 mt-2">Incorrect password.</p>}
        <button type="submit" className="btn-primary w-full mt-6 inline-block text-center"><span>Enter</span></button>
        <p className="text-[10px] tracking-[0.3em] uppercase text-muted mt-5 text-center">Demo password: tressa2026</p>
      </form>
    </div>
  );
}

// ---------- Editor ----------

function Editor({ onLogout }: { onLogout: () => void }) {
  const [content, setContent] = useSiteContent();
  const [tab, setTab] = useState<Tab>('offers');
  const [saved, setSaved] = useState<string | null>(null);

  const flash = (msg: string) => { setSaved(msg); setTimeout(() => setSaved(null), 1800); };

  const update = (patch: Partial<SiteContent>) => {
    const next = { ...content, ...patch };
    setContent(next);
    flash('Saved');
  };

  const reset = () => {
    if (!confirm('Reset ALL content to defaults?')) return;
    resetContent();
    flash('Reset');
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'offers',  label: 'Offers & Banner' },
    { id: 'hero',    label: 'Hero' },
    { id: 'about',   label: 'About' },
    { id: 'spaces',  label: 'Spaces' },
    { id: 'suites',  label: 'Suites' },
    { id: 'menu',    label: 'Menu' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'marquee', label: 'Marquee' },
    { id: 'quote',   label: 'Quote' },
    { id: 'video',   label: 'Video Section' },
    { id: 'slots',   label: 'Time Slots' },
    { id: 'hours',   label: 'Footer Hours' },
    { id: 'faqs',    label: 'FAQ' },
    { id: 'contact', label: 'Contact' },
    { id: 'seo',     label: 'SEO' }
  ];

  return (
    <div className="min-h-screen bg-[#fdf8ea] text-ink">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-maroon/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-serif tracking-[0.4em] text-maroon">TRESSA · ADMIN</span>
          <a href="/" target="_blank" className="text-[10px] tracking-[0.3em] uppercase text-muted hover:text-gold flex items-center gap-1">
            View site <ExternalLink size={10} />
          </a>
        </div>
        <div className="flex items-center gap-3">
          {saved && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-green-700">✓ {saved}</motion.span>}
          <button onClick={reset} className="text-[10px] tracking-[0.3em] uppercase text-maroon hover:text-gold flex items-center gap-1">
            <RotateCcw size={12} /> Reset
          </button>
          <button onClick={onLogout} className="text-[10px] tracking-[0.3em] uppercase text-maroon hover:text-gold flex items-center gap-1">
            <LogOut size={12} /> Logout
          </button>
        </div>
      </header>

      <div className="grid md:grid-cols-[220px_1fr] min-h-[calc(100vh-60px)]">
        <aside className="border-r border-maroon/10 p-4 bg-white/50">
          <ul className="space-y-1">
            {TABS.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setTab(t.id)}
                  className={`w-full text-left px-3 py-2 text-[11px] tracking-[0.25em] uppercase transition-colors ${
                    tab === t.id ? 'bg-maroon text-cream' : 'text-muted hover:text-maroon hover:bg-maroon/5'
                  }`}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="p-6 md:p-10 max-w-4xl">
          {tab === 'offers'  && <OffersPane  content={content} update={update} />}
          {tab === 'faqs'    && <FaqPane     content={content} update={update} />}
          {tab === 'hero'    && <HeroPane    content={content} update={update} />}
          {tab === 'about'   && <AboutPane   content={content} update={update} />}
          {tab === 'spaces'  && <SpacesPane  content={content} update={update} />}
          {tab === 'suites'  && <SuitesPane  content={content} update={update} />}
          {tab === 'menu'    && <MenuPane    content={content} update={update} />}
          {tab === 'gallery' && <GalleryPane content={content} update={update} />}
          {tab === 'marquee' && <MarqueePane content={content} update={update} />}
          {tab === 'quote'   && <QuotePane   content={content} update={update} />}
          {tab === 'video'   && <VideoPane   content={content} update={update} />}
          {tab === 'slots'   && <SlotsPane   content={content} update={update} />}
          {tab === 'hours'   && <HoursPane   content={content} update={update} />}
          {tab === 'contact' && <ContactPane content={content} update={update} />}
          {tab === 'seo'     && <SeoPane     content={content} update={update} />}
        </main>
      </div>
    </div>
  );
}

// ---------- Field helpers ----------

type U = (p: Partial<SiteContent>) => void;
type PP = { content: SiteContent; update: U };

function Heading({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl text-maroon">{title}</h2>
      {desc && <p className="text-sm text-muted mt-1">{desc}</p>}
    </div>
  );
}

function Text({ label, value, onChange, type = 'text', multiline, rows = 3 }: any) {
  const Tag: any = multiline ? 'textarea' : 'input';
  return (
    <label className="block mb-4">
      <span className="block text-[10px] tracking-[0.3em] uppercase text-maroon mb-1">{label}</span>
      <Tag
        type={type}
        rows={multiline ? rows : undefined}
        value={value ?? ''}
        onChange={(e: any) => onChange(e.target.value)}
        className="w-full bg-white border border-maroon/15 px-3 py-2 text-sm focus:outline-none focus:border-gold"
      />
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 mb-4 cursor-pointer">
      <button type="button" onClick={() => onChange(!value)} className={`w-10 h-6 rounded-full p-0.5 transition-colors ${value ? 'bg-maroon' : 'bg-maroon/20'}`}>
        <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : ''}`} />
      </button>
      <span className="text-[11px] tracking-[0.2em] uppercase text-maroon">{label}</span>
    </label>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block mb-4">
      <span className="block text-[10px] tracking-[0.3em] uppercase text-maroon mb-1">{label}</span>
      <div className="flex gap-2 items-center">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 border border-maroon/15 cursor-pointer" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-white border border-maroon/15 px-3 py-2 text-sm font-mono focus:outline-none focus:border-gold" />
      </div>
    </label>
  );
}

function ImageInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const onFile = async (f: File | null) => {
    if (!f) return;
    const data = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.readAsDataURL(f);
    });
    onChange(data);
  };
  return (
    <div className="mb-4">
      <span className="block text-[10px] tracking-[0.3em] uppercase text-maroon mb-1">{label}</span>
      <div className="flex gap-4 items-start">
        <div className="w-28 h-20 border border-maroon/15 bg-white overflow-hidden flex-shrink-0">
          {value && <img src={value} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/images/rooftop-lounge.jpg"
            className="w-full bg-white border border-maroon/15 px-3 py-2 text-sm focus:outline-none focus:border-gold"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            className="text-xs"
          />
          <p className="text-[10px] text-muted">Paste a URL or upload to preview (stored as base64 locally).</p>
        </div>
      </div>
    </div>
  );
}

// ---------- Panes ----------

function OffersPane({ content, update }: PP) {
  const setOffers = (offers: Offer[]) => update({ offers });
  const add = () => {
    const n: Offer = {
      id: uid(),
      enabled: true,
      title: 'New Offer',
      subtitle: '',
      ctaLabel: 'Book',
      ctaHref: '/booking',
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
      bg: '#5E141E',
      color: '#FCF1D6',
      accent: '#E3AB32'
    };
    setOffers([n, ...content.offers]);
  };
  const remove = (id: string) => setOffers(content.offers.filter((o) => o.id !== id));
  const patch = (id: string, p: Partial<Offer>) => setOffers(content.offers.map((o) => (o.id === id ? { ...o, ...p } : o)));

  return (
    <>
      <Heading title="Offers & Top Banner" desc="Create a promotional banner that appears at the top of the site. Set an expiry — the banner disappears automatically." />

      <button onClick={add} className="btn-primary mb-6 inline-flex items-center gap-2"><Plus size={12} /><span>Add Offer</span></button>

      <div className="space-y-6">
        {content.offers.map((o) => {
          const expired = o.expiresAt && new Date(o.expiresAt).getTime() < Date.now();
          return (
            <div key={o.id} className="bg-white border border-maroon/10 p-5">
              <div className="flex items-start justify-between mb-3">
                <Toggle label={expired ? 'Enabled (EXPIRED)' : 'Enabled'} value={o.enabled && !expired} onChange={(v) => patch(o.id, { enabled: v })} />
                <button onClick={() => remove(o.id)} className="text-red-700 hover:text-red-900" aria-label="Remove"><Trash2 size={14} /></button>
              </div>

              {/* live preview */}
              <div className="mb-5 rounded-sm text-center py-2 px-4 text-xs" style={{ background: o.bg, color: o.color }}>
                <span style={{ color: o.accent }}>★</span>{' '}
                <strong>{o.title || 'Offer title'}</strong>
                {o.subtitle && <span className="opacity-80"> · {o.subtitle}</span>}
                {o.ctaLabel && <span style={{ color: o.accent }}>  · {o.ctaLabel} →</span>}
              </div>

              <Text label="Title"    value={o.title}    onChange={(v: string) => patch(o.id, { title: v })} />
              <Text label="Subtitle" value={o.subtitle} onChange={(v: string) => patch(o.id, { subtitle: v })} />
              <div className="grid md:grid-cols-2 gap-4">
                <Text label="CTA Label" value={o.ctaLabel} onChange={(v: string) => patch(o.id, { ctaLabel: v })} />
                <Text label="CTA Link"  value={o.ctaHref}  onChange={(v: string) => patch(o.id, { ctaHref: v })} />
              </div>
              <Text label="Expires At" type="datetime-local" value={o.expiresAt ? o.expiresAt.slice(0, 16) : ''} onChange={(v: string) => patch(o.id, { expiresAt: v ? new Date(v).toISOString() : undefined })} />
              <div className="grid md:grid-cols-3 gap-4">
                <Color label="Background" value={o.bg}     onChange={(v: string) => patch(o.id, { bg: v })} />
                <Color label="Text"       value={o.color}  onChange={(v: string) => patch(o.id, { color: v })} />
                <Color label="Accent"     value={o.accent} onChange={(v: string) => patch(o.id, { accent: v })} />
              </div>
            </div>
          );
        })}
        {content.offers.length === 0 && <p className="text-sm text-muted">No offers yet.</p>}
      </div>
    </>
  );
}

function FaqPane({ content, update }: PP) {
  const set = (faqs: typeof content.faqs) => update({ faqs });
  return (
    <>
      <Heading title="Frequently Asked Questions" desc="Displayed on the homepage and fed into FAQ SEO schema for Google." />
      <button onClick={() => set([{ id: uid(), q: 'New question', a: 'Answer here.' }, ...content.faqs])} className="btn-primary mb-6 inline-flex items-center gap-2">
        <Plus size={12} /><span>Add FAQ</span>
      </button>
      <div className="space-y-4">
        {content.faqs.map((f) => (
          <div key={f.id} className="bg-white border border-maroon/10 p-5">
            <div className="flex justify-end mb-2">
              <button onClick={() => set(content.faqs.filter((x) => x.id !== f.id))} className="text-red-700 hover:text-red-900"><Trash2 size={14} /></button>
            </div>
            <Text label="Question" value={f.q} onChange={(v: string) => set(content.faqs.map((x) => (x.id === f.id ? { ...x, q: v } : x)))} />
            <Text label="Answer" multiline rows={3} value={f.a} onChange={(v: string) => set(content.faqs.map((x) => (x.id === f.id ? { ...x, a: v } : x)))} />
          </div>
        ))}
      </div>
    </>
  );
}

function HeroPane({ content, update }: PP) {
  const h = content.hero;
  return (
    <>
      <Heading title="Hero Section" desc="The first thing visitors see." />
      <Text label="Tagline"  value={h.tagline}  onChange={(v: string) => update({ hero: { ...h, tagline: v } })} />
      <Text label="Title"    value={h.title}    onChange={(v: string) => update({ hero: { ...h, title: v } })} />
      <Text label="Subtitle" value={h.subtitle} onChange={(v: string) => update({ hero: { ...h, subtitle: v } })} />
    </>
  );
}

function AboutPane({ content, update }: PP) {
  const a = {
    ...content.about,
    mission: content.about.mission ?? DEFAULT_CONTENT.about.mission,
    vision: content.about.vision ?? DEFAULT_CONTENT.about.vision
  };
  return (
    <>
      <Heading title="About Section" />
      <Text label="Label"       value={a.label} onChange={(v: string) => update({ about: { ...a, label: v } })} />
      <Text label="Heading"     value={a.title} onChange={(v: string) => update({ about: { ...a, title: v } })} />
      <Text label="Paragraph 1" multiline rows={4} value={a.p1} onChange={(v: string) => update({ about: { ...a, p1: v } })} />
      <Text label="Paragraph 2" multiline rows={4} value={a.p2} onChange={(v: string) => update({ about: { ...a, p2: v } })} />

      <Heading title="Mission" />
      <Text label="Label"   value={a.mission.label} onChange={(v: string) => update({ about: { ...a, mission: { ...a.mission, label: v } } })} />
      <Text label="Heading" value={a.mission.title} onChange={(v: string) => update({ about: { ...a, mission: { ...a.mission, title: v } } })} />
      <Text label="Body"    multiline rows={4} value={a.mission.body} onChange={(v: string) => update({ about: { ...a, mission: { ...a.mission, body: v } } })} />

      <Heading title="Vision" />
      <Text label="Label"   value={a.vision.label} onChange={(v: string) => update({ about: { ...a, vision: { ...a.vision, label: v } } })} />
      <Text label="Heading" value={a.vision.title} onChange={(v: string) => update({ about: { ...a, vision: { ...a.vision, title: v } } })} />
      <Text label="Body"    multiline rows={4} value={a.vision.body} onChange={(v: string) => update({ about: { ...a, vision: { ...a.vision, body: v } } })} />
    </>
  );
}

function SpacesPane({ content, update }: PP) {
  const set = (spaces: typeof content.spaces) => update({ spaces });
  return (
    <>
      <Heading title="Spaces" desc="The four cards on the homepage." />
      <div className="space-y-6">
        {content.spaces.map((s) => (
          <div key={s.id} className="bg-white border border-maroon/10 p-5">
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-3">{s.id}</p>
            <div className="grid md:grid-cols-2 gap-4">
              <Text label="Name"    value={s.name}    onChange={(v: string) => set(content.spaces.map((x) => (x.id === s.id ? { ...x, name: v } : x)))} />
              <Text label="Tagline" value={s.tagline} onChange={(v: string) => set(content.spaces.map((x) => (x.id === s.id ? { ...x, tagline: v } : x)))} />
            </div>
            <Text label="Description" multiline value={s.desc} onChange={(v: string) => set(content.spaces.map((x) => (x.id === s.id ? { ...x, desc: v } : x)))} />
            <ImageInput label="Image" value={s.img} onChange={(v) => set(content.spaces.map((x) => (x.id === s.id ? { ...x, img: v } : x)))} />
          </div>
        ))}
      </div>
    </>
  );
}

function SuitesPane({ content, update }: PP) {
  const set = (suites: typeof content.suites) => update({ suites });
  const add = () => set([...content.suites, { id: uid(), tag: 'Classic', name: 'New Suite', desc: '', rate: '₹ 0', feat: [], img: '' }]);
  return (
    <>
      <Heading title="Suites" desc="Edit the suites shown on the homepage." />
      <button onClick={add} className="btn-primary mb-6 inline-flex items-center gap-2"><Plus size={12} /><span>Add Suite</span></button>
      <div className="space-y-6">
        {content.suites.map((s) => (
          <div key={s.id} className="bg-white border border-maroon/10 p-5">
            <div className="flex justify-end mb-2">
              <button onClick={() => set(content.suites.filter((x) => x.id !== s.id))} className="text-red-700 hover:text-red-900"><Trash2 size={14} /></button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Text label="Tag"  value={s.tag}  onChange={(v: string) => set(content.suites.map((x) => (x.id === s.id ? { ...x, tag: v } : x)))} />
              <Text label="Name" value={s.name} onChange={(v: string) => set(content.suites.map((x) => (x.id === s.id ? { ...x, name: v } : x)))} />
              <Text label="Rate" value={s.rate} onChange={(v: string) => set(content.suites.map((x) => (x.id === s.id ? { ...x, rate: v } : x)))} />
            </div>
            <Text label="Description" multiline value={s.desc} onChange={(v: string) => set(content.suites.map((x) => (x.id === s.id ? { ...x, desc: v } : x)))} />
            <Text label="Features (comma-separated)" value={s.feat.join(', ')} onChange={(v: string) => set(content.suites.map((x) => (x.id === s.id ? { ...x, feat: v.split(',').map((t) => t.trim()).filter(Boolean) } : x)))} />
            <ImageInput label="Image" value={s.img} onChange={(v) => set(content.suites.map((x) => (x.id === s.id ? { ...x, img: v } : x)))} />
          </div>
        ))}
      </div>
    </>
  );
}

function ContactPane({ content, update }: PP) {
  const c = content.contact;
  const s = (p: Partial<typeof c>) => update({ contact: { ...c, ...p } });
  return (
    <>
      <Heading title="Contact & Social" />
      <div className="grid md:grid-cols-2 gap-4">
        <Text label="Phone"   value={c.phone}   onChange={(v: string) => s({ phone: v })} />
        <Text label="Email"   value={c.email}   onChange={(v: string) => s({ email: v })} />
        <Text label="Address" value={c.address} onChange={(v: string) => s({ address: v })} />
        <Text label="City"    value={c.city}    onChange={(v: string) => s({ city: v })} />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Text label="Instagram URL" value={c.instagram} onChange={(v: string) => s({ instagram: v })} />
        <Text label="Facebook URL"  value={c.facebook}  onChange={(v: string) => s({ facebook: v })} />
        <Text label="Twitter URL"   value={c.twitter}   onChange={(v: string) => s({ twitter: v })} />
      </div>
    </>
  );
}

function SeoPane({ content, update }: PP) {
  return (
    <>
      <Heading title="SEO" desc="These override the defaults baked into the site." />
      <Text label="Site Title" value={content.seoTitle} onChange={(v: string) => update({ seoTitle: v })} />
      <Text label="Meta Description" multiline rows={3} value={content.seoDescription} onChange={(v: string) => update({ seoDescription: v })} />
      <p className="text-xs text-muted">Note: Next.js static metadata cannot be overridden at runtime — these fields drive client-side UI (share buttons, etc.) but the crawlable HTML still uses the values in app/layout.tsx.</p>
    </>
  );
}

// ---------- Menu pane ----------

function MenuPane({ content, update }: PP) {
  const set = (menu: typeof content.menu) => update({ menu });

  const addCategory = () => set([...content.menu, { id: uid(), name: 'New Category', items: [] }]);
  const removeCategory = (cid: string) => {
    if (!confirm('Remove this category and its items?')) return;
    set(content.menu.filter((c) => c.id !== cid));
  };

  const addItem = (cid: string) =>
    set(content.menu.map((c) => (c.id === cid ? { ...c, items: [{ id: uid(), name: 'New Item', desc: '', price: '₹ 0' }, ...c.items] } : c)));

  const removeItem = (cid: string, iid: string) =>
    set(content.menu.map((c) => (c.id === cid ? { ...c, items: c.items.filter((x) => x.id !== iid) } : c)));

  const patchItem = (cid: string, iid: string, p: any) =>
    set(content.menu.map((c) => (c.id === cid ? { ...c, items: c.items.map((x) => (x.id === iid ? { ...x, ...p } : x)) } : c)));

  return (
    <>
      <Heading title="Menu" desc="Categories and dishes shown in the menu section." />
      <button onClick={addCategory} className="btn-primary mb-6 inline-flex items-center gap-2"><Plus size={12} /><span>Add Category</span></button>

      <div className="space-y-8">
        {content.menu.map((cat) => (
          <div key={cat.id} className="bg-white border border-maroon/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <Text label="Category Name" value={cat.name} onChange={(v: string) => set(content.menu.map((c) => (c.id === cat.id ? { ...c, name: v } : c)))} />
              <button onClick={() => removeCategory(cat.id)} className="text-red-700 hover:text-red-900 ml-3 mb-3"><Trash2 size={14} /></button>
            </div>
            <button onClick={() => addItem(cat.id)} className="text-[11px] tracking-[0.2em] uppercase text-maroon hover:text-gold mb-3 inline-flex items-center gap-1">
              <Plus size={12} /> Add item
            </button>
            <div className="space-y-4">
              {cat.items.map((it) => (
                <div key={it.id} className="border border-maroon/10 p-4">
                  <div className="flex justify-end">
                    <button onClick={() => removeItem(cat.id, it.id)} className="text-red-700 hover:text-red-900"><Trash2 size={12} /></button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Text label="Name"  value={it.name}  onChange={(v: string) => patchItem(cat.id, it.id, { name: v })} />
                    <Text label="Price" value={it.price} onChange={(v: string) => patchItem(cat.id, it.id, { price: v })} />
                  </div>
                  <Text label="Description" multiline value={it.desc} onChange={(v: string) => patchItem(cat.id, it.id, { desc: v })} />
                  <ImageInput label="Image (optional)" value={it.img || ''} onChange={(v: string) => patchItem(cat.id, it.id, { img: v })} />
                </div>
              ))}
              {cat.items.length === 0 && <p className="text-xs text-muted">No items yet.</p>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- Gallery ----------

function GalleryPane({ content, update }: PP) {
  const set = (gallery: typeof content.gallery) => update({ gallery });
  const move = (id: string, dir: -1 | 1) => {
    const i = content.gallery.findIndex((g) => g.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= content.gallery.length) return;
    const copy = [...content.gallery];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    set(copy);
  };
  return (
    <>
      <Heading title="Gallery" desc="Photos shown in the scrolling gallery section. Use ↑/↓ to reorder." />
      <button onClick={() => set([{ id: uid(), src: '', alt: '' }, ...content.gallery])} className="btn-primary mb-6 inline-flex items-center gap-2">
        <Plus size={12} /><span>Add Image</span>
      </button>
      <div className="space-y-4">
        {content.gallery.map((g, i) => (
          <div key={g.id} className="bg-white border border-maroon/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] tracking-[0.3em] uppercase text-gold">#{i + 1}</span>
              <div className="flex gap-2">
                <button onClick={() => move(g.id, -1)} disabled={i === 0} className="text-maroon disabled:opacity-30">↑</button>
                <button onClick={() => move(g.id, 1)} disabled={i === content.gallery.length - 1} className="text-maroon disabled:opacity-30">↓</button>
                <button onClick={() => set(content.gallery.filter((x) => x.id !== g.id))} className="text-red-700"><Trash2 size={14} /></button>
              </div>
            </div>
            <ImageInput label="Image" value={g.src} onChange={(v) => set(content.gallery.map((x) => (x.id === g.id ? { ...x, src: v } : x)))} />
            <Text label="Alt text (SEO)" value={g.alt} onChange={(v: string) => set(content.gallery.map((x) => (x.id === g.id ? { ...x, alt: v } : x)))} />
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- Marquee ----------

function MarqueePane({ content, update }: PP) {
  return (
    <>
      <Heading title="Marquee Ticker" desc="The scrolling word list between the hero and about sections." />
      <Text
        label="Words (one per line)"
        multiline rows={8}
        value={content.marquee.join('\n')}
        onChange={(v: string) => update({ marquee: v.split('\n').map((s) => s.trim()).filter(Boolean) })}
      />
    </>
  );
}

// ---------- Quote ----------

function QuotePane({ content, update }: PP) {
  return (
    <>
      <Heading title="Parallax Quote" />
      <Text label="Quote" multiline rows={3} value={content.quote.text} onChange={(v: string) => update({ quote: { ...content.quote, text: v } })} />
      <Text label="Attribution" value={content.quote.attr} onChange={(v: string) => update({ quote: { ...content.quote, attr: v } })} />
    </>
  );
}

// ---------- Video Section ----------

function VideoPane({ content, update }: PP) {
  const v = content.video;
  const s = (p: Partial<typeof v>) => update({ video: { ...v, ...p } });
  return (
    <>
      <Heading title="Video / Experience Section" />
      <Text label="Kicker label" value={v.label}        onChange={(x: string) => s({ label: x })} />
      <Text label="Heading"      value={v.title}        onChange={(x: string) => s({ title: x })} />
      <Text label="Video URL"    value={v.videoSrc}     onChange={(x: string) => s({ videoSrc: x })} />
      <Text label="Caption kicker" value={v.captionLabel} onChange={(x: string) => s({ captionLabel: x })} />
      <Text label="Caption"      multiline value={v.captionTitle} onChange={(x: string) => s({ captionTitle: x })} />

      <div className="mt-6">
        <p className="text-[10px] tracking-[0.3em] uppercase text-maroon mb-3">Stats</p>
        <div className="grid grid-cols-2 gap-4">
          {v.stats.map((st, i) => (
            <div key={i} className="bg-white border border-maroon/10 p-4">
              <Text label="Number" value={st.n} onChange={(x: string) => s({ stats: v.stats.map((y, j) => (j === i ? { ...y, n: x } : y)) })} />
              <Text label="Label"  value={st.l} onChange={(x: string) => s({ stats: v.stats.map((y, j) => (j === i ? { ...y, l: x } : y)) })} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ---------- Time slots ----------

function SlotsPane({ content, update }: PP) {
  const set = (timeSlots: typeof content.timeSlots) => update({ timeSlots });
  return (
    <>
      <Heading title="Booking Time Slots" desc="Slots shown on the booking page for table reservations." />
      <button onClick={() => set([...content.timeSlots, { id: uid(), label: 'New slot', start: '00:00', end: '00:00' }])} className="btn-primary mb-6 inline-flex items-center gap-2">
        <Plus size={12} /><span>Add Slot</span>
      </button>
      <div className="space-y-4">
        {content.timeSlots.map((sl) => (
          <div key={sl.id} className="bg-white border border-maroon/10 p-5 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <Text label="Label" value={sl.label} onChange={(v: string) => set(content.timeSlots.map((x) => (x.id === sl.id ? { ...x, label: v } : x)))} />
            <Text label="Start" type="time" value={sl.start} onChange={(v: string) => set(content.timeSlots.map((x) => (x.id === sl.id ? { ...x, start: v } : x)))} />
            <Text label="End"   type="time" value={sl.end}   onChange={(v: string) => set(content.timeSlots.map((x) => (x.id === sl.id ? { ...x, end: v } : x)))} />
            <button onClick={() => set(content.timeSlots.filter((x) => x.id !== sl.id))} className="text-red-700 hover:text-red-900 mb-4"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- Footer Hours ----------

function HoursPane({ content, update }: PP) {
  const set = (footerHours: typeof content.footerHours) => update({ footerHours });
  return (
    <>
      <Heading title="Footer Opening Hours" />
      <button onClick={() => set([...content.footerHours, { id: uid(), label: 'Area', value: '00:00 – 00:00' }])} className="btn-primary mb-6 inline-flex items-center gap-2">
        <Plus size={12} /><span>Add Row</span>
      </button>
      <div className="space-y-3">
        {content.footerHours.map((h) => (
          <div key={h.id} className="bg-white border border-maroon/10 p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <Text label="Label" value={h.label} onChange={(v: string) => set(content.footerHours.map((x) => (x.id === h.id ? { ...x, label: v } : x)))} />
            <Text label="Value" value={h.value} onChange={(v: string) => set(content.footerHours.map((x) => (x.id === h.id ? { ...x, value: v } : x)))} />
            <button onClick={() => set(content.footerHours.filter((x) => x.id !== h.id))} className="text-red-700 hover:text-red-900 mb-4"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </>
  );
}
