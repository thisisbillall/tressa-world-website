import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/seo';

// Route-segment-aware OG image. Next.js auto-binds this at /opengraph-image
// and emits the right <meta property="og:image"> in every page that inherits
// the root layout. Replacing a missing /og.jpg with a dynamically rendered
// edge image, so social shares (WhatsApp / X / LinkedIn / Slack) finally
// show a preview card.

export const runtime = 'edge';
export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background:
            'radial-gradient(1000px 600px at 80% 20%, rgba(227,171,50,0.18), transparent 65%),' +
            'radial-gradient(900px 700px at 15% 90%, rgba(18,66,57,0.45), transparent 60%),' +
            'linear-gradient(135deg, #2a0810 0%, #5E141E 55%, #3a0d14 100%)',
          color: '#FCF1D6',
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 14,
              height: 14,
              transform: 'rotate(45deg)',
              background: '#E3AB32',
            }}
          />
          <div
            style={{
              fontSize: 22,
              letterSpacing: 14,
              textTransform: 'uppercase',
              color: '#E3AB32',
              fontFamily: 'sans-serif',
              fontWeight: 500,
            }}
          >
            {SITE.business.city} · Koregaon Park
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 156,
              lineHeight: 1,
              letterSpacing: -2,
              fontWeight: 300,
            }}
          >
            {SITE.name}
          </div>
          <div
            style={{
              fontSize: 36,
              color: '#E3AB32',
              fontStyle: 'italic',
              fontWeight: 400,
            }}
          >
            {SITE.tagline}
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 26,
              maxWidth: 900,
              color: 'rgba(252,241,214,0.85)',
              fontFamily: 'sans-serif',
              fontWeight: 300,
              lineHeight: 1.4,
            }}
          >
            {SITE.shortDescription}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 24,
            borderTop: '1px solid rgba(227,171,50,0.35)',
            fontSize: 22,
            letterSpacing: 4,
            textTransform: 'uppercase',
            fontFamily: 'sans-serif',
            color: 'rgba(252,241,214,0.7)',
          }}
        >
          <div>Book online · Instant confirmation</div>
          <div style={{ color: '#E3AB32' }}>tressaworld.com</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
