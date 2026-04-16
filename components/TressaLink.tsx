'use client';
import { MouseEvent, AnchorHTMLAttributes, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTressaNav } from './TransitionProvider';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  mode?: 'enter' | 'leave';
};

const isInternal = (href: string) =>
  !!href && !href.startsWith('#') && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:');

// Eagerly load the Scene3D chunk when any booking-bound link mounts,
// so the doors aren't racing against three.js init.
let bookingChunkPreloaded = false;
function preloadBookingChunk() {
  if (bookingChunkPreloaded) return;
  bookingChunkPreloaded = true;
  import('@/components/booking/Scene3D').catch(() => { bookingChunkPreloaded = false; });
}

export default function TressaLink({ href, mode = 'enter', onClick, children, ...rest }: Props) {
  const { navigate, isTransitioning } = useTressaNav();
  const router = useRouter();

  useEffect(() => {
    if (!isInternal(href)) return;
    router.prefetch(href);
    if (href.startsWith('/booking')) {
      const idle = (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
      idle(preloadBookingChunk);
    }
  }, [href, router]);

  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (!isInternal(href)) return;

    e.preventDefault();
    if (isTransitioning) return;
    onClick?.(e);
    if (href.startsWith('/booking')) preloadBookingChunk();
    navigate(href, mode);
  };

  const handlePointerEnter = () => {
    if (!isInternal(href)) return;
    router.prefetch(href);
    if (href.startsWith('/booking')) preloadBookingChunk();
  };

  return (
    <a href={href} onClick={handle} onPointerEnter={handlePointerEnter} {...rest}>
      {children}
    </a>
  );
}
