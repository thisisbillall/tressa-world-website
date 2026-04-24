'use client';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Suite } from '@/lib/venueTypes';
import {
  artTexture,
  rugTexture,
  wallpaperTexture,
  windowViewTexture,
  woodTexture
} from './textures';

type Props = {
  suite: Suite;
  selected: boolean;
  available?: boolean;
  onSelect: (s: Suite) => void;
};

// Accents keyed by tag. Tag comes from the DB and is free text, so we fall
// back to sensible defaults instead of returning undefined.
const TAG_ACCENT: Record<string, string> = {
  Royal:     '#E3AB32',
  Signature: '#E3AB32',
  Premium:   '#a63a48',
  Classic:   '#2f7a6b',
};
const DEFAULT_ACCENT = '#E3AB32';

const TAG_WALL: Record<string, string> = {
  Royal:     '#f7ead0',
  Signature: '#f7ead0',
  Premium:   '#f2e5d4',
  Classic:   '#e8ebe0',
};
const DEFAULT_WALL = '#f7ead0';

const accentFor = (tag: string | undefined): string =>
  (tag && TAG_ACCENT[tag]) || DEFAULT_ACCENT;
const wallFor = (tag: string | undefined): string =>
  (tag && TAG_WALL[tag]) || DEFAULT_WALL;

// ---------- Bed ----------
function Bed({ position, accent, size = 'king' }: { position: [number, number, number]; accent: string; size?: 'king' | 'queen' }) {
  const w = size === 'king' ? 2.0 : 1.6;
  const l = 2.4;
  const wood = useMemo(() => woodTexture(), []);

  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.15, 0.3, l + 0.15]} />
        <meshStandardMaterial map={wood} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[w, 0.22, l]} />
        <meshStandardMaterial color="#ffffff" roughness={0.85} />
      </mesh>
      {/* duvet */}
      <mesh position={[0, 0.55, 0.35]} castShadow>
        <boxGeometry args={[w + 0.02, 0.05, l * 0.65]} />
        <meshStandardMaterial color="#f4ead3" roughness={0.9} />
      </mesh>
      {/* runner */}
      <mesh position={[0, 0.6, 0.4]}>
        <boxGeometry args={[w + 0.04, 0.03, 0.45]} />
        <meshStandardMaterial color={accent} roughness={0.6} />
      </mesh>
      {/* pillows */}
      <mesh position={[-w * 0.22, 0.58, -l * 0.35]} castShadow>
        <boxGeometry args={[w * 0.38, 0.15, 0.45]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      <mesh position={[w * 0.22, 0.58, -l * 0.35]} castShadow>
        <boxGeometry args={[w * 0.38, 0.15, 0.45]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      {/* accent pillow */}
      <mesh position={[0, 0.64, -l * 0.22]}>
        <boxGeometry args={[0.42, 0.12, 0.32]} />
        <meshStandardMaterial color={accent} roughness={0.7} />
      </mesh>
      {/* headboard */}
      <mesh position={[0, 1.0, -l * 0.5 - 0.06]} castShadow>
        <boxGeometry args={[w + 0.25, 1.2, 0.1]} />
        <meshStandardMaterial color="#3a2418" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ---------- Jacuzzi (cheap, no transmission) ----------
function Jacuzzi({ position, animate }: { position: [number, number, number]; animate: boolean }) {
  const water = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!animate || !water.current) return;
    water.current.position.y = 0.48 + Math.sin(state.clock.elapsedTime * 1.6) * 0.006;
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[2.2, 0.15, 2.2]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.95, 1.0, 0.55, 24]} />
        <meshStandardMaterial color="#1f5566" roughness={0.45} metalness={0.1} />
      </mesh>
      {/* gold rim */}
      <mesh position={[0, 0.63, 0]}>
        <torusGeometry args={[0.92, 0.035, 8, 24]} />
        <meshStandardMaterial color="#E3AB32" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.78, 0.82, 0.5, 24]} />
        <meshStandardMaterial color="#0f3b45" roughness={0.5} />
      </mesh>
      {/* water — plain standard */}
      <mesh ref={water} position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.76, 0.76, 0.02, 24]} />
        <meshStandardMaterial
          color="#7fcfdf"
          transparent
          opacity={0.9}
          roughness={0.2}
          metalness={0.3}
          emissive="#4fa7b8"
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* towels */}
      <mesh position={[0.9, 0.72, 0.4]} castShadow>
        <boxGeometry args={[0.5, 0.18, 0.35]} />
        <meshStandardMaterial color="#ffffff" roughness={0.95} />
      </mesh>
      <mesh position={[0.9, 0.82, 0.4]}>
        <boxGeometry args={[0.5, 0.05, 0.35]} />
        <meshStandardMaterial color="#E3AB32" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ---------- Nightstand ----------
function Nightstand({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[0.55, 0.65, 0.45]} />
        <meshStandardMaterial color="#6b4a2b" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.38, 0.23]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.15, 6]} />
        <meshStandardMaterial color="#E3AB32" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* lamp (no real light — just emissive) */}
      <mesh position={[0, 0.68, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.08, 12]} />
        <meshStandardMaterial color="#E3AB32" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <cylinderGeometry args={[0.17, 0.13, 0.22, 16, 1, true]} />
        <meshStandardMaterial
          color="#FCF1D6"
          emissive="#E3AB32"
          emissiveIntensity={0.8}
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ---------- Sofa ----------
function Sofa({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[1.6, 0.35, 0.6]} />
        <meshStandardMaterial color="#7a5a3c" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.55, -0.22]} castShadow>
        <boxGeometry args={[1.6, 0.55, 0.2]} />
        <meshStandardMaterial color="#8a6b4a" roughness={0.82} />
      </mesh>
      <mesh position={[0.3, 0.55, 0.1]}>
        <boxGeometry args={[0.3, 0.3, 0.12]} />
        <meshStandardMaterial color="#E3AB32" roughness={0.75} />
      </mesh>
    </group>
  );
}

// ---------- Window ----------
function Window({ position }: { position: [number, number, number] }) {
  const view = useMemo(() => windowViewTexture(), []);
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1.8, 1.5, 0.05]} />
        <meshStandardMaterial color="#2a1810" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[1.65, 1.35]} />
        <meshBasicMaterial map={view} />
      </mesh>
      {/* curtains */}
      <mesh position={[-1.0, 0, 0.1]}>
        <boxGeometry args={[0.22, 1.6, 0.1]} />
        <meshStandardMaterial color="#c8a878" roughness={0.9} />
      </mesh>
      <mesh position={[1.0, 0, 0.1]}>
        <boxGeometry args={[0.22, 1.6, 0.1]} />
        <meshStandardMaterial color="#c8a878" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ---------- Wall art ----------
function WallArt({ position, accent }: { position: [number, number, number]; accent: string }) {
  const art = useMemo(() => artTexture(accent), [accent]);
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1.0, 0.7, 0.04]} />
        <meshStandardMaterial color="#2a1810" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[0.88, 0.58]} />
        <meshBasicMaterial map={art} />
      </mesh>
    </group>
  );
}

// ---------- TV ----------
function TV({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={[1.4, 0.8, 0.06]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[1.32, 0.72]} />
        <meshBasicMaterial color="#1a3a5c" />
      </mesh>
    </group>
  );
}

// ---------- Plant (simple) ----------
function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.2, 0.16, 0.35, 10]} />
        <meshStandardMaterial color="#c8a878" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.32, 10, 8]} />
        <meshStandardMaterial color="#2f6b3a" roughness={0.92} />
      </mesh>
    </group>
  );
}

// ---------- Chandelier (one light, shared) ----------
function Chandelier({ position, selected }: { position: [number, number, number]; selected: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, -0.2, 0]}>
        <torusGeometry args={[0.3, 0.02, 6, 16]} />
        <meshStandardMaterial color="#E3AB32" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.2, 0]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color="#fff5c0" emissive="#ffd88a" emissiveIntensity={1.2} />
      </mesh>
      {selected && <pointLight intensity={0.7} distance={5} color="#ffd98a" />}
    </group>
  );
}

// ---------- Main ----------
export default function Suite3D({ suite, selected, available = true, onSelect }: Props) {
  const group = useRef<THREE.Group>(null);
  const dimRef = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);

  useLayoutEffect(() => {
    if (!dimRef.current) return;
    const opacity = available ? 1 : 0.32;
    dimRef.current.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m: any) => {
        if (!m) return;
        if (m.userData._origOpacity === undefined) m.userData._origOpacity = m.opacity ?? 1;
        m.transparent = !available || m.userData._origTransparent === true;
        m.opacity = (m.userData._origOpacity ?? 1) * opacity;
        m.depthWrite = available;
      });
    });
  }, [available]);

  const accent = accentFor(suite.tag);
  const wallBase = wallFor(suite.tag);

  const wood = useMemo(() => woodTexture(), []);
  const wallpaper = useMemo(() => wallpaperTexture(wallBase), [wallBase]);
  const rug = useMemo(() => rugTexture(accent), [accent]);

  useFrame((_, dt) => {
    if (!group.current) return;
    const targetY = hover || selected ? 0.1 : 0;
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, targetY, 5, dt);
  });

  const W = 5.6;
  const D = 4.6;
  const H = 2.4;

  return (
    <group
      ref={group}
      position={suite.position}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto'; }}
      onClick={(e) => { e.stopPropagation(); if (available) onSelect(suite); }}
    >
      <group ref={dimRef}>
      {/* WOOD FLOOR (no reflector) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={wood} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* WALLS */}
      <mesh position={[0, H / 2, -D / 2]} receiveShadow>
        <boxGeometry args={[W, H, 0.08]} />
        <meshStandardMaterial map={wallpaper} roughness={0.95} />
      </mesh>
      <mesh position={[-W / 2, H / 2, 0]} receiveShadow>
        <boxGeometry args={[0.08, H, D]} />
        <meshStandardMaterial map={wallpaper} roughness={0.95} />
      </mesh>
      <mesh position={[W / 2, H / 3, D / 4]} receiveShadow>
        <boxGeometry args={[0.08, H * 0.66, D / 2]} />
        <meshStandardMaterial map={wallpaper} roughness={0.95} />
      </mesh>

      {/* wainscot trim */}
      <mesh position={[0, 0.55, -D / 2 + 0.05]}>
        <boxGeometry args={[W - 0.4, 0.03, 0.01]} />
        <meshStandardMaterial color="#E3AB32" roughness={0.4} />
      </mesh>

      {/* Bedroom */}
      <Bed position={[-W * 0.25, 0, -0.6]} accent={accent} size={suite.beds > 1 ? 'queen' : 'king'} />
      <Nightstand position={[-W * 0.25 - 1.35, 0, -1.7]} />
      <Nightstand position={[-W * 0.25 + 1.35, 0, -1.7]} />
      <WallArt position={[-W * 0.25, 1.7, -D / 2 + 0.06]} accent={accent} />

      {/* rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-W * 0.25, 0.04, 0.9]} receiveShadow>
        <planeGeometry args={[2.6, 1.8]} />
        <meshStandardMaterial map={rug} roughness={0.95} />
      </mesh>

      {suite.beds > 1 && <Bed position={[W * 0.2, 0, -1.6]} accent={accent} size="queen" />}

      <Window position={[W * 0.25, 1.35, -D / 2 + 0.09]} />

      {/* Jacuzzi — only water ripples for selected suite */}
      {suite.beds === 1 && <Jacuzzi position={[W * 0.28, 0, 1.0]} animate={selected} />}

      <TV position={[-W / 2 + 0.1, 1.4, 0.8]} rotationY={Math.PI / 2} />
      <Sofa position={[0.4, 0, D / 2 - 0.7]} rotationY={Math.PI} />
      <Plant position={[W / 2 - 0.5, 0, -D / 2 + 0.5]} />

      {/* coffee table */}
      <mesh position={[0.4, 0.18, D / 2 - 1.5]} castShadow>
        <boxGeometry args={[0.9, 0.35, 0.55]} />
        <meshStandardMaterial color="#2a1810" roughness={0.4} />
      </mesh>

      <Chandelier position={[0, H - 0.2, 0]} selected={selected} />

      </group>

      {/* floor selection ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[Math.max(W, D) / 2 + 0.15, Math.max(W, D) / 2 + 0.4, 32]} />
        <meshBasicMaterial
          color={selected ? '#E3AB32' : available ? '#5E141E' : '#b03a3a'}
          transparent
          opacity={selected ? 0.7 : hover ? 0.4 : available ? 0.15 : 0.4}
        />
      </mesh>

      <Html position={[0, H + 0.7, 0]} center distanceFactor={10} zIndexRange={[20, 0]}>
        <div className="pointer-events-none select-none text-center">
          <div
            className={`inline-block px-3 py-1 text-[9px] tracking-[0.3em] uppercase border shadow-sm ${
              !available
                ? 'border-red-500/60 text-red-800 bg-red-50/95'
                : selected
                ? 'border-gold text-maroon bg-gold'
                : 'border-maroon/30 text-maroon bg-white/95'
            }`}
          >
            {suite.label} · {suite.tag} {!available && '· Booked'}
          </div>
          <div className="text-[10px] text-maroon mt-1 tracking-widest font-medium bg-white/90 inline-block px-2 rounded-sm">
            ₹ {suite.priceNight.toLocaleString()}/nt · {suite.beds} bed · {suite.sqft} sqft
          </div>
        </div>
      </Html>
    </group>
  );
}
