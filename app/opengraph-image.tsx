import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/seo';

// Route-segment-aware OG image. Next.js auto-binds this at /opengraph-image
// and emits the right <meta property="og:image"> in every page that inherits
// the root layout. Replaces a missing /og.jpg with a dynamically rendered
// edge image so social shares (WhatsApp / X / LinkedIn / Slack) show a
// preview card.
//
// IMPORTANT: next/og uses Satori under the hood, which only accepts a tiny
// subset of CSS. Specifically: NO multi-layer background shorthand, NO
// radial-gradients with explicit pixel sizes (`1000px 600px at X Y`), and
// position-only gradients must use a shape keyword. We stack solid + simple
// gradient layers in separate <div>s instead.

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
          position: 'relative',
          backgroundColor: '#2a0810',
          color: '#FCF1D6',
        }}
      >
        {/* Layered backdrop — each gradient on its own div so Satori parses
            them individually rather than as a composite shorthand. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background: 'linear-gradient(135deg, #2a0810 0%, #5E141E 55%, #3a0d14 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: -200,
            right: -200,
            width: 900,
            height: 900,
            display: 'flex',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(227,171,50,0.22) 0%, rgba(227,171,50,0) 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -250,
            left: -200,
            width: 900,
            height: 900,
            display: 'flex',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(18,66,57,0.45) 0%, rgba(18,66,57,0) 70%)',
          }}
        />

        {/* Foreground content */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 72,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 14,
                height: 14,
                transform: 'rotate(45deg)',
                backgroundColor: '#E3AB32',
              }}
            />
            <div
              style={{
                fontSize: 22,
                letterSpacing: 14,
                textTransform: 'uppercase',
                color: '#E3AB32',
                fontWeight: 500,
              }}
            >
              {SITE.business.city} · Koregaon Park
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                marginTop: 24,
              }}
            >
              {SITE.tagline}
            </div>
            <div
              style={{
                marginTop: 24,
                fontSize: 26,
                maxWidth: 900,
                color: 'rgba(252,241,214,0.85)',
                fontWeight: 300,
                lineHeight: 1.4,
                display: 'flex',
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
              color: 'rgba(252,241,214,0.7)',
            }}
          >
            <div style={{ display: 'flex' }}>Book online · Instant confirmation</div>
            <div style={{ display: 'flex', color: '#E3AB32' }}>tressaworld.com</div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
