import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/seo';

export const runtime = 'edge';
export const alt = `${SITE.name} — Rooftop · Restaurant · Bar · Suites in ${SITE.business.city}`;
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
          padding: '80px',
          color: '#FCF1D6',
          fontFamily: 'serif',
          background:
            'radial-gradient(ellipse at 30% 40%, rgba(94,20,30,0.95), transparent 70%),' +
            'radial-gradient(ellipse at 75% 80%, rgba(227,171,50,0.35), transparent 60%),' +
            'linear-gradient(180deg, #1a0810 0%, #3a0d14 55%, #5E141E 100%)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{
              fontSize: 20,
              letterSpacing: 10,
              textTransform: 'uppercase',
              color: '#E3AB32',
              display: 'flex'
            }}
          >
            Est. {new Date(SITE.business.foundingDate).getFullYear()} · {SITE.business.city}
          </div>
          <div
            style={{
              fontSize: 18,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: 'rgba(252,241,214,0.7)',
              display: 'flex'
            }}
          >
            tressaworld.com
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 150,
              letterSpacing: 14,
              fontWeight: 300,
              color: '#FCF1D6',
              lineHeight: 1,
              display: 'flex'
            }}
          >
            TRESSA
          </div>
          <div
            style={{
              fontSize: 30,
              letterSpacing: 18,
              textTransform: 'uppercase',
              color: '#E3AB32',
              marginTop: 18,
              display: 'flex'
            }}
          >
            World
          </div>
          <div
            style={{
              width: 120,
              height: 2,
              background: '#E3AB32',
              marginTop: 40
            }}
          />
          <div
            style={{
              fontSize: 34,
              fontStyle: 'italic',
              color: 'rgba(252,241,214,0.85)',
              marginTop: 30,
              maxWidth: 900,
              lineHeight: 1.3,
              display: 'flex'
            }}
          >
            Rooftop Lounge · Family Restaurant · Signature Bar · Luxury Suites
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: 'rgba(252,241,214,0.6)',
              display: 'flex'
            }}
          >
            Book online · Instant confirmation
          </div>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: '#E3AB32',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}
          >
            ★ 4.8 · 1,240+ Reviews
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
