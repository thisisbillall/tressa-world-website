'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import Table3D from './Table3D';
import Suite3D from './Suite3D';
import type { Suite, SlotId, Table, VenueData, VenueProp } from '@/lib/mockApi';

type Props = {
  venue: VenueData;
  slot: SlotId;
  selectedId: string | null;
  onSelectTable?: (t: Table) => void;
  onSelectSuite?: (s: Suite) => void;
};

type Vec3 = [number, number, number];

function computeOverview(venue: VenueData, aspect: number): { pos: Vec3; look: Vec3 } {
  const items = (venue.tables ?? venue.suites ?? []) as { position: Vec3 }[];
  if (!items.length) return { pos: [0, 9, 14], look: [0, 0, 0] };

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const it of items) {
    const [x, , z] = it.position;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const pad = venue.suites ? 4 : 3;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const width = maxX - minX + pad * 2;
  const depth = maxZ - minZ + pad * 2;

  const fovY = 45 * (Math.PI / 180);
  const fovX = 2 * Math.atan(Math.tan(fovY / 2) * aspect);
  const distForHeight = depth / 2 / Math.tan(fovY / 2);
  const distForWidth = width / 2 / Math.tan(fovX / 2);
  // On mobile the bottom UI covers ~40% of screen, so zoom out more to compensate
  const mobile = aspect < 0.75;
  const zoomFactor = mobile ? 1.35 : 1.05;
  const dist = Math.max(distForHeight, distForWidth) * zoomFactor;

  const pitch = mobile ? 0.95 : aspect < 1.3 ? 0.75 : 0.6;
  const y = Math.sin(pitch) * dist;
  const z = Math.cos(pitch) * dist;

  return { pos: [cx, y, cz + z], look: [cx, 0, cz] };
}

function CameraRig({
  target,
  lookAt,
  active,
  lookAtRef,
  onSettled
}: {
  target: Vec3;
  lookAt: Vec3;
  active: boolean;
  lookAtRef: React.MutableRefObject<THREE.Vector3>;
  onSettled?: () => void;
}) {
  const { camera } = useThree();
  const targetVec = useRef(new THREE.Vector3());
  const lookVec = useRef(new THREE.Vector3());
  const settledRef = useRef(false);

  useEffect(() => {
    targetVec.current.set(...target);
    lookVec.current.set(...lookAt);
    settledRef.current = false;
  }, [target, lookAt]);

  // While active the rig owns the camera fully — OrbitControls is unmounted, so
  // no fighting over camera.lookAt or residual damping.
  useFrame((_, dt) => {
    if (!active) return;
    const k = 1 - Math.pow(0.001, dt);
    camera.position.lerp(targetVec.current, k);
    lookAtRef.current.lerp(lookVec.current, k);
    camera.lookAt(lookAtRef.current);

    if (!settledRef.current && camera.position.distanceTo(targetVec.current) < 0.05) {
      settledRef.current = true;
      onSettled?.();
    }
  });
  return null;
}

function Ground({ color }: { color: string }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={color} roughness={0.9} metalness={0.05} />
      </mesh>
      <gridHelper args={[40, 40, '#d4c090', '#e8dcb4']} position={[0, 0.005, 0]} />
    </>
  );
}

const PROP_MATERIAL: Record<VenueProp['kind'], { color: string; roughness: number; metalness: number }> = {
  wall:      { color: '#f3e8cf', roughness: 0.85, metalness: 0.02 },
  counter:   { color: '#6b4a2b', roughness: 0.5,  metalness: 0.15 },
  projector: { color: '#1a0d0a', roughness: 0.6,  metalness: 0.1  },
  door:      { color: '#E3AB32', roughness: 0.35, metalness: 0.4  },
  rock:      { color: '#c9a07c', roughness: 0.95, metalness: 0.0  },
  glass:     { color: '#b8d4e8', roughness: 0.05, metalness: 0.3  },
  kitchen:   { color: '#1a1a1a', roughness: 0.4,  metalness: 0.2  }
};

function RockWall({ size, color }: { size: [number, number, number]; color: string }) {
  const [w, h, d] = size;

  // Simple pseudo-noise: deterministic, multi-octave
  const noise3 = (x: number, y: number, z: number) => {
    const f = (a: number, b: number, c: number) => {
      const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
      return (s - Math.floor(s)) * 2 - 1;
    };
    return f(x, y, z) * 0.6 + f(x * 2.3, y * 2.3, z * 2.3) * 0.25 + f(x * 5.7, y * 5.7, z * 5.7) * 0.15;
  };

  const geo = useMemo(() => {
    const segsX = Math.max(8, Math.round(w * 5));
    const segsY = Math.max(6, Math.round(h * 5));
    const segsZ = Math.max(4, Math.round(d * 4));
    const box = new THREE.BoxGeometry(w, h, d, segsX, segsY, segsZ);
    const pos = box.attributes.position;
    const hw = w / 2, hh = h / 2, hd = d / 2;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Only displace vertices on the outer surfaces
      const onX = Math.abs(Math.abs(x) - hw) < 0.01;
      const onY = Math.abs(Math.abs(y) - hh) < 0.01;
      const onZ = Math.abs(Math.abs(z) - hd) < 0.01;
      if (!onX && !onY && !onZ) continue;

      const n = noise3(x * 1.8, y * 2.4, z * 1.5);

      // Stronger displacement on the front/back (Z faces) and top (Y face) — visible surfaces
      const bumpXZ = 0.12;  // front/back/side bulge
      const bumpY  = 0.08;  // top unevenness

      if (onX) x += n * bumpXZ * Math.sign(x);
      if (onZ) z += n * bumpXZ * Math.sign(z);
      if (onY && y > 0) {
        // Top edge: more irregular (rounded rock top)
        y += n * bumpY + Math.abs(noise3(x * 3.1, z * 3.1, 0)) * 0.06;
      } else if (onY && y < 0) {
        // Bottom: slight only — sits on ground
        y += n * 0.02;
      }

      // Side faces also get minor cross-axis ripple
      if (onX) { y += noise3(x * 4, y * 3, z * 2) * 0.03; z += noise3(z * 4, x * 3, y * 2) * 0.03; }
      if (onZ) { y += noise3(z * 4, y * 3, x * 2) * 0.03; x += noise3(x * 4, z * 3, y * 2) * 0.03; }

      pos.setXYZ(i, x, y, z);
    }

    box.computeVertexNormals();
    return box;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, d]);

  // Bake per-vertex colour variation into geometry for natural stone grain
  useMemo(() => {
    const pos = geo.attributes.position;
    const arr = new Float32Array(pos.count * 3);
    const base = new THREE.Color(color);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const v = noise3(x * 2.5, y * 3.2, z * 1.8);
      const c = base.clone();
      c.offsetHSL(0, v * 0.04, v * 0.06);
      arr[i * 3]     = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  }, [geo, color]);

  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} flatShading />
    </mesh>
  );
}

function GlassWall({ size }: { size: [number, number, number] }) {
  const [w, h, d] = size;
  const wallLen = Math.max(w, d);
  const alongZ = d > w;
  const cols = Math.max(2, Math.round(wallLen / 2.5));
  const rows = Math.max(1, Math.round(h / 2.0));
  const bar = 0.06;

  return (
    <group>
      {/* Full glass slab — single transparent box */}
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color="#c8e6f5"
          transparent
          opacity={0.15}
          roughness={0.05}
          metalness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Horizontal mullions */}
      {Array.from({ length: rows + 1 }, (_, i) => {
        const y = -h / 2 + i * (h / rows);
        return (
          <mesh key={`h${i}`} position={[0, y, 0]}>
            <boxGeometry args={alongZ ? [bar * 2, bar, d] : [w, bar, bar * 2]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.35} metalness={0.75} />
          </mesh>
        );
      })}

      {/* Vertical mullions */}
      {Array.from({ length: cols + 1 }, (_, i) => {
        const pos = -wallLen / 2 + i * (wallLen / cols);
        return (
          <mesh key={`v${i}`} position={alongZ ? [0, 0, pos] : [pos, 0, 0]}>
            <boxGeometry args={alongZ ? [bar * 2, h, bar] : [bar, h, bar * 2]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.35} metalness={0.75} />
          </mesh>
        );
      })}
    </group>
  );
}

function OpenKitchen({ size }: { size: [number, number, number] }) {
  const [w, h, d] = size;
  const black = '#1a1a1a';
  const darkGray = '#2a2a2a';
  const steel = '#4a4a4a';

  const alongZ = d > w;
  const len = Math.max(w, d);
  const depth = Math.min(w, d);

  return (
    <group>
      {/* ===== MAIN BAR COUNTER ===== */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={black} roughness={0.4} metalness={0.15} />
      </mesh>
      {/* Polished granite counter top */}
      <mesh position={[0, h / 2 + 0.02, 0]} castShadow>
        <boxGeometry args={[w + 0.12, 0.04, d + 0.06]} />
        <meshStandardMaterial color={darkGray} roughness={0.12} metalness={0.55} />
      </mesh>

      {/* ===== DRINK ALMIRA — raised display on counter, visible from room ===== */}
      {/* Back panel (wall-side edge of counter, rises above) */}
      <mesh
        position={alongZ
          ? [-depth * 0.3, h / 2 + h * 0.85, 0]
          : [0, h / 2 + h * 0.85, -depth * 0.3]
        }
        castShadow
      >
        <boxGeometry args={alongZ ? [0.08, h * 1.7, len] : [len, h * 1.7, 0.08]} />
        <meshStandardMaterial color={black} roughness={0.45} metalness={0.1} />
      </mesh>

      {/* 4 glass shelves mounted on the back panel */}
      {[0.3, 0.65, 1.0, 1.35].map((frac, i) => (
        <mesh
          key={`shelf-${i}`}
          position={alongZ
            ? [-depth * 0.15, h / 2 + h * frac, 0]
            : [0, h / 2 + h * frac, -depth * 0.15]
          }
          castShadow
        >
          <boxGeometry args={alongZ ? [0.28, 0.018, len * 0.94] : [len * 0.94, 0.018, 0.28]} />
          <meshStandardMaterial color="#e0e0e0" transparent opacity={0.45} roughness={0.05} metalness={0.6} />
        </mesh>
      ))}

      {/* Gold LED accent strips under each shelf */}
      {[0.28, 0.63, 0.98, 1.33].map((frac, i) => (
        <mesh
          key={`light-${i}`}
          position={alongZ
            ? [-depth * 0.1, h / 2 + h * frac, 0]
            : [0, h / 2 + h * frac, -depth * 0.1]
          }
        >
          <boxGeometry args={alongZ ? [0.008, 0.008, len * 0.88] : [len * 0.88, 0.008, 0.008]} />
          <meshStandardMaterial color="#E3AB32" emissive="#E3AB32" emissiveIntensity={2.5} />
        </mesh>
      ))}

      {/* Bottles on almira shelves — dense display */}
      {Array.from({ length: Math.round(len * 3) }, (_, i) => {
        const t = (i + 0.5) / Math.round(len * 3);
        const pos = -len / 2 * 0.9 + t * len * 0.9;
        const shelfFracs = [0.32, 0.67, 1.02, 1.37];
        const shelfY = h / 2 + h * shelfFracs[i % 4];
        const bottleH = 0.1 + (i % 5) * 0.018;
        const bottleR = 0.018 + (i % 3) * 0.004;
        const colors = ['#2a0808', '#0a200a', '#3a280a', '#080a2a', '#E3AB32', '#8a3a1a', '#4a0a2a', '#0a3a3a'];
        const bottleColor = colors[i % colors.length];
        return (
          <group
            key={`bottle-${i}`}
            position={alongZ
              ? [-depth * 0.12, shelfY + bottleH / 2, pos]
              : [pos, shelfY + bottleH / 2, -depth * 0.12]
            }
          >
            <mesh>
              <cylinderGeometry args={[bottleR, bottleR, bottleH, 6]} />
              <meshStandardMaterial color={bottleColor} roughness={0.2} metalness={0.2} />
            </mesh>
            <mesh position={[0, bottleH / 2 + 0.018, 0]}>
              <cylinderGeometry args={[bottleR * 0.35, bottleR * 0.5, 0.035, 6]} />
              <meshStandardMaterial color={bottleColor} roughness={0.15} metalness={0.25} />
            </mesh>
          </group>
        );
      })}

      {/* ===== BEER / DRINK TAPS on counter top ===== */}
      {Array.from({ length: Math.max(2, Math.round(len * 0.4)) }, (_, i) => {
        const count = Math.max(2, Math.round(len * 0.4));
        const t = (i + 0.5) / count;
        const pos = -len / 2 * 0.6 + t * len * 0.6;
        const tapColors = ['#E3AB32', '#c0c0c0', '#2a2a2a', '#8b4513'];
        const tapColor = tapColors[i % tapColors.length];
        return (
          <group
            key={`tap-${i}`}
            position={alongZ ? [0, h / 2 + 0.04, pos] : [pos, h / 2 + 0.04, 0]}
          >
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.025, 0.03, 0.08, 8]} />
              <meshStandardMaterial color={steel} roughness={0.15} metalness={0.85} />
            </mesh>
            <mesh position={[0, 0.14, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
              <meshStandardMaterial color={steel} roughness={0.2} metalness={0.8} />
            </mesh>
            <mesh position={[0, 0.2, 0.02]} rotation={[0.35, 0, 0]}>
              <cylinderGeometry args={[0.01, 0.007, 0.07, 6]} />
              <meshStandardMaterial color={tapColor} roughness={0.3} metalness={0.4} />
            </mesh>
            <mesh position={[0, 0.22, 0.035]}>
              <sphereGeometry args={[0.015, 8, 6]} />
              <meshStandardMaterial color={tapColor} roughness={0.25} metalness={0.5} />
            </mesh>
          </group>
        );
      })}

      {/* ===== GLASSES on counter top ===== */}
      {Array.from({ length: Math.round(len * 1.0) }, (_, i) => {
        const t = (i + 0.5) / Math.round(len * 1.0);
        const pos = -len / 2 * 0.85 + t * len * 0.85;
        const glassH = 0.07 + (i % 3) * 0.015;
        return (
          <mesh
            key={`glass-${i}`}
            position={alongZ
              ? [depth * 0.2, h / 2 + 0.04 + glassH / 2, pos]
              : [pos, h / 2 + 0.04 + glassH / 2, depth * 0.2]
            }
          >
            <cylinderGeometry args={[0.022, 0.018, glassH, 8]} />
            <meshStandardMaterial color="#e8e8e8" transparent opacity={0.3} roughness={0.05} metalness={0.5} />
          </mesh>
        );
      })}

      {/* ===== FOOT RAIL along front ===== */}
      <mesh
        position={alongZ
          ? [depth / 2 + 0.03, h * 0.15, 0]
          : [0, h * 0.15, depth / 2 + 0.03]
        }
      >
        <boxGeometry args={alongZ ? [0.025, 0.025, len] : [len, 0.025, 0.025]} />
        <meshStandardMaterial color={steel} roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  );
}

function LayoutProp({ prop }: { prop: VenueProp }) {
  const mat = PROP_MATERIAL[prop.kind];
  const color = (prop as { color?: string }).color ?? mat.color;
  const label = prop.label;

  if (prop.kind === 'kitchen') {
    return (
      <group position={prop.position} rotation={[0, prop.rotation ?? 0, 0]}>
        <OpenKitchen size={prop.size} />
        {label && (
          <Html position={[0, prop.size[1] + 0.4, 0]} center distanceFactor={14} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
            <span className="px-2 py-0.5 text-[9px] tracking-[0.3em] uppercase text-cream bg-black/80 border border-gold/40 rounded-sm select-none whitespace-nowrap">{label}</span>
          </Html>
        )}
      </group>
    );
  }

  if (prop.kind === 'glass') {
    return (
      <group position={prop.position} rotation={[0, prop.rotation ?? 0, 0]}>
        <GlassWall size={prop.size} />
        {label && (
          <Html position={[0, prop.size[1] / 2 + 0.3, 0]} center distanceFactor={14} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
            <span className="px-2 py-0.5 text-[9px] tracking-[0.3em] uppercase text-maroon bg-white/85 border border-maroon/20 rounded-sm select-none whitespace-nowrap">{label}</span>
          </Html>
        )}
      </group>
    );
  }

  if (prop.kind === 'rock') {
    return (
      <group position={prop.position} rotation={[0, prop.rotation ?? 0, 0]}>
        <RockWall size={prop.size} color={color} />
        {label && (
          <Html position={[0, prop.size[1] / 2 + 0.35, 0]} center distanceFactor={14} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
            <span className="px-2 py-0.5 text-[9px] tracking-[0.3em] uppercase text-maroon bg-white/85 border border-maroon/20 rounded-sm select-none whitespace-nowrap">{label}</span>
          </Html>
        )}
      </group>
    );
  }

  // Counter with custom color → render as a table structure (top slab + legs)
  if (prop.kind === 'counter' && (prop as { color?: string }).color) {
    const [tw, th, td] = prop.size;
    const legR = 0.035;
    const topThick = 0.05;
    const legInsetW = tw / 2 - 0.08;
    const legInsetD = td / 2 - 0.08;
    const legH = th - topThick;
    return (
      <group position={prop.position} rotation={[0, prop.rotation ?? 0, 0]}>
        {/* Table top */}
        <mesh position={[0, th - topThick / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[tw + 0.08, topThick, td + 0.04]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.15} />
        </mesh>
        {/* Thin support frame under top */}
        <mesh position={[0, th - topThick - 0.02, 0]}>
          <boxGeometry args={[tw - 0.1, 0.04, td - 0.1]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
        </mesh>
        {/* 4 legs */}
        {[[-legInsetW, -legInsetD], [legInsetW, -legInsetD], [-legInsetW, legInsetD], [legInsetW, legInsetD]].map(([x, z], i) => (
          <mesh key={i} position={[x, legH / 2, z]} castShadow>
            <cylinderGeometry args={[legR, legR, legH, 8]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
          </mesh>
        ))}
        {/* Cross brace (lower) */}
        <mesh position={[0, legH * 0.15, 0]}>
          <boxGeometry args={[tw - 0.2, 0.025, 0.025]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
        </mesh>
        {label && (
          <Html position={[0, th + 0.25, 0]} center distanceFactor={14} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
            <span className="px-2 py-0.5 text-[9px] tracking-[0.3em] uppercase text-maroon bg-white/85 border border-maroon/20 rounded-sm select-none whitespace-nowrap">{label}</span>
          </Html>
        )}
      </group>
    );
  }

  return (
    <group position={prop.position} rotation={[0, prop.rotation ?? 0, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={prop.size} />
        <meshStandardMaterial color={color} roughness={mat.roughness} metalness={mat.metalness} />
      </mesh>
      {label && (
        <Html position={[0, prop.size[1] / 2 + 0.25, 0]} center distanceFactor={14} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
          <span className="px-2 py-0.5 text-[9px] tracking-[0.3em] uppercase text-maroon bg-white/85 border border-maroon/20 rounded-sm select-none whitespace-nowrap">{label}</span>
        </Html>
      )}
    </group>
  );
}

function SceneContent({ venue, slot, selectedId, onSelectTable, onSelectSuite }: Props) {
  const { size, camera } = useThree();
  const aspect = size.width / Math.max(size.height, 1);

  const overview = useMemo(() => computeOverview(venue, aspect), [venue, aspect]);

  const { target, lookAt } = useMemo<{ target: Vec3; lookAt: Vec3 }>(() => {
    // On narrow (portrait) viewports the bottom control rail covers ~30% of the
    // canvas. Lower the lookAt so the subject sits in the visible upper area
    // instead of being hidden behind the UI.
    const mobile = aspect < 0.75;
    if (selectedId) {
      if (venue.tables) {
        const t = venue.tables.find((x) => x.id === selectedId);
        if (t) {
          const [x, , z] = t.position;
          const close = mobile ? 5 : 3.5;
          const lookY = mobile ? 0.1 : 0.9;
          return { target: [x + close * 0.7, 2.6, z + close], lookAt: [x, lookY, z] };
        }
      }
      if (venue.suites) {
        const s = venue.suites.find((x) => x.id === selectedId);
        if (s) {
          const [x, , z] = s.position;
          const close = mobile ? 7 : 5;
          const lookY = mobile ? 0.4 : 1.3;
          return { target: [x + close * 0.6, 2.8, z + close], lookAt: [x, lookY, z] };
        }
      }
    }
    // Overview: same treatment so the grid sits above the bottom rail on mobile.
    if (mobile) {
      const [lx, , lz] = overview.look;
      return { target: overview.pos, lookAt: [lx, -1.5, lz] };
    }
    return { target: overview.pos, lookAt: overview.look };
  }, [selectedId, venue, aspect, overview]);



  const [rigActive, setRigActive] = useState(true);
  const controlsRef = useRef<any>(null);
  const didInitCamera = useRef(false);
  // Shared "current look point" — the rig lerps this; OrbitControls seeds from it
  // when it mounts so the two handoffs are always continuous.
  const lookAtRef = useRef(new THREE.Vector3());

  // Place camera + look at the initial overview on first mount — no lerp pop.
  if (!didInitCamera.current) {
    camera.position.set(...target);
    lookAtRef.current.set(...lookAt);
    camera.lookAt(lookAtRef.current);
    didInitCamera.current = true;
  }

  // When selection or venue changes, snapshot where we're currently looking
  // (from OrbitControls if it was in control), then activate the rig.
  useEffect(() => {
    if (controlsRef.current) {
      lookAtRef.current.copy(controlsRef.current.target);
    }
    setRigActive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, venue.id]);


  return (
    <>
      <color attach="background" args={['#fdf8ea']} />
      <fog attach="fog" args={['#fdf8ea', 30, 80]} />

      <ambientLight intensity={1.0} color={'#ffffff'} />
      <hemisphereLight args={['#ffffff', '#e8dcb4', 0.5]} />
      <directionalLight
        position={[6, 12, 6]}
        intensity={1.1}
        color="#fff6e0"
        castShadow={!venue.suites}
        shadow-mapSize={[512, 512]}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {!venue.suites && (
        <Suspense fallback={null}>
          <Environment preset="apartment" />
        </Suspense>
      )}

      <Ground color={venue.groundColor} />
      {!venue.suites && (
        <ContactShadows position={[0, 0.01, 0]} opacity={0.3} scale={40} blur={2} far={6} color="#5E141E" frames={1} />
      )}

      {venue.props?.map((p) => (
        <LayoutProp key={p.id} prop={p} />
      ))}

      {venue.tables?.map((t) => (
        <Table3D
          key={t.id}
          table={t}
          available={t.availability[slot]}
          selected={selectedId === t.id}
          onSelect={(tbl) => onSelectTable?.(tbl)}
        />
      ))}

      {venue.suites?.map((s) => (
        <Suite3D
          key={s.id}
          suite={s}
          selected={selectedId === s.id}
          available={s.availableDates.length > 0}
          onSelect={(su) => onSelectSuite?.(su)}
        />
      ))}

      <CameraRig
        target={target}
        lookAt={lookAt}
        active={rigActive}
        lookAtRef={lookAtRef}
        onSettled={() => setRigActive(false)}
      />

      {!rigActive && (
        <OrbitControls
          ref={(c) => {
            controlsRef.current = c;
            if (c) {
              c.target.copy(lookAtRef.current);
              c.update();
            }
          }}
          enablePan
          enableZoom
          enableRotate
          enableDamping
          dampingFactor={0.08}
          minDistance={3}
          maxDistance={55}
          minPolarAngle={Math.PI * 0.1}
          maxPolarAngle={Math.PI * 0.48}
          makeDefault
        />
      )}
    </>
  );
}

export default function Scene3D(props: Props) {
  return (
    <Canvas
      shadows={!props.venue.suites}
      dpr={[1, 1.5]}
      camera={{ position: [0, 14, 20], fov: 45, near: 0.5, far: 120 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <Suspense fallback={null}>
        <SceneContent {...props} />
      </Suspense>
    </Canvas>
  );
}
