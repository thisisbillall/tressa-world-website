'use client';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import type { Table } from '@/lib/venueTypes';
import { woodTexture, marbleTexture } from './textures';

type Props = {
  table: Table;
  available: boolean;
  selected: boolean;
  onSelect: (t: Table) => void;
};

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/* -------- Shared geometries (created once, reused across every table) -------- */

const R = 3; // segments for rounded edges (low = subtle, cheap)

const GEO = {
  // dining chair (rounded edges)
  chairSeatBase: new RoundedBoxGeometry(0.48, 0.06, 0.48, R, 0.015),
  chairCushion: new RoundedBoxGeometry(0.44, 0.06, 0.44, R, 0.02),
  chairBack: new RoundedBoxGeometry(0.48, 0.65, 0.06, R, 0.015),
  chairLeg: new RoundedBoxGeometry(0.04, 0.3, 0.04, R, 0.008),
  // sofa chair (more rounded — cushion feel)
  sofaSeat: new RoundedBoxGeometry(0.52, 0.16, 0.5, R, 0.05),
  sofaBack: new RoundedBoxGeometry(0.52, 0.5, 0.14, R, 0.05),
  sofaArmL: new RoundedBoxGeometry(0.08, 0.28, 0.5, R, 0.03),
  sofaArmR: new RoundedBoxGeometry(0.08, 0.28, 0.5, R, 0.03),
  sofaLeg: new THREE.CylinderGeometry(0.025, 0.025, 0.1, 8),
  // round table (already curved)
  roundTop: new THREE.CylinderGeometry(0.9, 0.9, 0.07, 32),
  roundPedestal: new THREE.CylinderGeometry(0.1, 0.18, 0.78, 16),
  roundBase: new THREE.CylinderGeometry(0.5, 0.55, 0.06, 24),
  // square / rect tables (rounded edges on top, wider)
  squareTop: new RoundedBoxGeometry(1.5, 0.07, 1.5, R, 0.02),
  squareCloth: new THREE.PlaneGeometry(1.5 + 0.25, 1.5 + 0.25),
  rectTop: new RoundedBoxGeometry(2.6, 0.07, 1.4, R, 0.02),
  rectCloth: new THREE.PlaneGeometry(2.6 + 0.25, 1.4 + 0.25),
  rectTopLg: new RoundedBoxGeometry(3.2, 0.07, 1.5, R, 0.02),   // 7-8 seats
  rectClothLg: new THREE.PlaneGeometry(3.2 + 0.25, 1.5 + 0.25),
  rectTopXl: new RoundedBoxGeometry(4.5, 0.07, 1.6, R, 0.02),   // 9-12 seats
  rectClothXl: new THREE.PlaneGeometry(4.5 + 0.25, 1.6 + 0.25),
  rectLeg: new RoundedBoxGeometry(0.06, 0.78, 0.06, R, 0.01),
  // place setting
  plate: (() => {
    const points: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.16, 0),
      new THREE.Vector2(0.19, 0.018),
      new THREE.Vector2(0.2, 0.025),
      new THREE.Vector2(0.164, 0.022),
      new THREE.Vector2(0, 0.008)
    ];
    return new THREE.LatheGeometry(points, 16);
  })(),
  plateRim: new THREE.TorusGeometry(0.198, 0.005, 5, 20),
  wineBowl: (() => {
    const points: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.05, 0.005),
      new THREE.Vector2(0.01, 0.02),
      new THREE.Vector2(0.01, 0.16),
      new THREE.Vector2(0.05, 0.22),
      new THREE.Vector2(0.045, 0.34)
    ];
    return new THREE.LatheGeometry(points, 12);
  })(),
  wineFill: new THREE.CylinderGeometry(0.04, 0.025, 0.07, 12),
  utensil: new THREE.BoxGeometry(0.015, 0.18, 0.004),
  utensilLong: new THREE.BoxGeometry(0.015, 0.2, 0.004),
  napkin: new THREE.PlaneGeometry(0.12, 0.14),
  // centerpiece
  candleBase: new THREE.CylinderGeometry(0.07, 0.09, 0.2, 10),
  candle: new THREE.CylinderGeometry(0.035, 0.04, 0.12, 10),
  flame: new THREE.ConeGeometry(0.025, 0.07, 6),
  // selection ring
  selectionRing: new THREE.RingGeometry(1.5, 1.7, 48) // placeholder; rebuilt per-table
};

/* -------- Food (only rendered when hover/selected, so cost is bounded) -------- */

type FoodKind = 'steak' | 'pasta' | 'curry' | 'salad' | 'sushi' | 'bread';
const DISH_ROTATION: FoodKind[] = ['steak', 'pasta', 'curry', 'salad', 'sushi', 'bread'];

const FOOD_GEO = {
  steak: new THREE.BoxGeometry(0.13, 0.025, 0.1),
  searLine: new THREE.PlaneGeometry(0.11, 0.015),
  fry: new THREE.BoxGeometry(0.06, 0.012, 0.012),
  sphereSm: new THREE.SphereGeometry(0.02, 8, 6),
  noodle: new THREE.TorusGeometry(0.05, 0.008, 6, 16),
  saucePuddle: new THREE.CylinderGeometry(0.09, 0.09, 0.003, 16),
  cheese: new THREE.SphereGeometry(0.015, 8, 6),
  riceDome: new THREE.SphereGeometry(0.06, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  curryPuddle: new THREE.CylinderGeometry(0.075, 0.07, 0.012, 16),
  curryChunk1: new THREE.SphereGeometry(0.018, 8, 6),
  curryChunk2: new THREE.SphereGeometry(0.016, 8, 6),
  saladSm: new THREE.SphereGeometry(0.022, 8, 6),
  saladMd: new THREE.SphereGeometry(0.028, 8, 6),
  sushiRice: new THREE.CylinderGeometry(0.025, 0.025, 0.025, 16),
  sushiFish: new THREE.BoxGeometry(0.05, 0.008, 0.036),
  bread: new THREE.SphereGeometry(0.08, 14, 10)
};

function Food({ kind, seed }: { kind: FoodKind; seed: number }) {
  switch (kind) {
    case 'steak':
      return (
        <>
          <mesh geometry={FOOD_GEO.steak} position={[-0.03, 0.015, 0]} rotation={[0, seed * 0.1, 0]}>
            <meshStandardMaterial color="#6b2a1a" roughness={0.6} />
          </mesh>
          <mesh geometry={FOOD_GEO.searLine} position={[-0.03, 0.03, 0.03]} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#3a1410" />
          </mesh>
          <mesh geometry={FOOD_GEO.searLine} position={[-0.03, 0.03, -0.03]} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#3a1410" />
          </mesh>
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh
              key={i}
              geometry={FOOD_GEO.fry}
              position={[0.08 + (i % 3) * 0.018, 0.02 + Math.floor(i / 3) * 0.01, -0.05 + (i * 0.02) % 0.08]}
              rotation={[0, seed + i, 0.4]}
              castShadow
            >
              <meshStandardMaterial color="#e4b35a" roughness={0.8} />
            </mesh>
          ))}
          <mesh geometry={FOOD_GEO.sphereSm} position={[-0.05, 0.03, -0.09]}>
            <meshStandardMaterial color="#3a7a4a" roughness={0.9} />
          </mesh>
        </>
      );

    case 'pasta':
      return (
        <>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh
              key={i}
              geometry={FOOD_GEO.noodle}
              position={[Math.cos(i + seed) * 0.03, 0.02 + (i % 2) * 0.008, Math.sin(i + seed) * 0.03]}
              rotation={[Math.PI / 2 + i, i, 0]}
              castShadow
            >
              <meshStandardMaterial color="#e8c974" roughness={0.75} />
            </mesh>
          ))}
          <mesh geometry={FOOD_GEO.saucePuddle} position={[0, 0.016, 0]}>
            <meshStandardMaterial color="#9c2a1a" roughness={0.55} />
          </mesh>
          <mesh geometry={FOOD_GEO.cheese} position={[0.01, 0.045, 0]}>
            <meshStandardMaterial color="#f4e8c8" />
          </mesh>
        </>
      );

    case 'curry':
      return (
        <>
          <mesh geometry={FOOD_GEO.riceDome} position={[-0.07, 0.025, 0]} castShadow>
            <meshStandardMaterial color="#f4efe0" roughness={0.85} />
          </mesh>
          <mesh geometry={FOOD_GEO.curryPuddle} position={[0.05, 0.02, 0]}>
            <meshStandardMaterial color="#d67b2e" roughness={0.55} />
          </mesh>
          <mesh geometry={FOOD_GEO.curryChunk1} position={[0.07, 0.03, 0.02]}>
            <meshStandardMaterial color="#9c4520" />
          </mesh>
          <mesh geometry={FOOD_GEO.curryChunk2} position={[0.04, 0.03, -0.02]}>
            <meshStandardMaterial color="#b85a30" />
          </mesh>
        </>
      );

    case 'salad':
      return (
        <>
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2 + seed;
            const r = 0.05 + (i % 3) * 0.01;
            return (
              <mesh
                key={i}
                geometry={i % 2 === 0 ? FOOD_GEO.saladSm : FOOD_GEO.saladMd}
                position={[Math.cos(a) * r, 0.025 + (i % 2) * 0.01, Math.sin(a) * r]}
                castShadow
              >
                <meshStandardMaterial color={i % 3 === 0 ? '#c9522a' : i % 3 === 1 ? '#3a8a4a' : '#ead88a'} roughness={0.9} />
              </mesh>
            );
          })}
        </>
      );

    case 'sushi':
      return (
        <>
          {[[-0.06, 0], [-0.02, 0], [0.02, 0], [0.06, 0]].map(([x, z], i) => (
            <group key={i} position={[x, 0.02, z]}>
              <mesh geometry={FOOD_GEO.sushiRice} castShadow>
                <meshStandardMaterial color="#f4efe0" roughness={0.85} />
              </mesh>
              <mesh geometry={FOOD_GEO.sushiFish} position={[0, 0.017, 0]}>
                <meshStandardMaterial color={i % 2 ? '#e9724a' : '#c4402a'} roughness={0.55} />
              </mesh>
            </group>
          ))}
        </>
      );

    case 'bread':
    default:
      return (
        <mesh geometry={FOOD_GEO.bread} position={[0, 0.03, 0]} castShadow>
          <meshStandardMaterial color="#d6a070" roughness={0.85} />
        </mesh>
      );
  }
}

/* -------- Place setting -------- */

function PlaceSetting({
  seed,
  position,
  rotationY,
  detailed
}: {
  seed: number;
  position: [number, number, number];
  rotationY: number;
  detailed: boolean;
}) {
  const dish = DISH_ROTATION[seed % DISH_ROTATION.length];

  if (!detailed) {
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        <mesh geometry={GEO.plate}>
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={GEO.plate} receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh geometry={GEO.plateRim} position={[0, 0.032, 0]}>
        <meshStandardMaterial color="#E3AB32" metalness={0.8} roughness={0.25} />
      </mesh>

      <Food kind={dish} seed={seed} />

      <mesh geometry={GEO.wineBowl} position={[0.24, 0, -0.18]}>
        <meshStandardMaterial color="#f0f0f0" transparent opacity={0.3} roughness={0.15} metalness={0.2} />
      </mesh>
      <mesh geometry={GEO.wineFill} position={[0.24, 0.26, -0.18]}>
        <meshStandardMaterial color="#5e1518" transparent opacity={0.85} roughness={0.2} emissive="#3a0a14" emissiveIntensity={0.1} />
      </mesh>

      <mesh geometry={GEO.utensil} position={[-0.24, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#d8d8d8" metalness={0.85} roughness={0.18} />
      </mesh>
      <mesh geometry={GEO.utensilLong} position={[0.24, 0.012, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#cfcfcf" metalness={0.85} roughness={0.2} />
      </mesh>

      <mesh geometry={GEO.napkin} position={[0, 0.028, -0.28]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#c9a878" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* -------- Centerpiece -------- */

function Centerpiece({ lit }: { lit: boolean }) {
  const flame = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!flame.current || !lit) return;
    flame.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 7) * 0.1;
  });
  return (
    <group position={[0, 0.04, 0]}>
      <mesh geometry={GEO.candleBase} position={[0, 0.1, 0]}>
        <meshStandardMaterial color="#E3AB32" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh geometry={GEO.candle} position={[0, 0.26, 0]}>
        <meshStandardMaterial color="#fbeec2" roughness={0.85} />
      </mesh>
      <mesh ref={flame} geometry={GEO.flame} position={[0, 0.36, 0]}>
        <meshStandardMaterial color="#ffd98a" emissive="#ff9340" emissiveIntensity={lit ? 1.5 : 0} transparent opacity={0.92} />
      </mesh>
      {lit && <pointLight position={[0, 0.38, 0]} intensity={0.4} distance={2.2} color="#ffb070" />}
    </group>
  );
}

/* -------- Chair -------- */

function Chair({ position, rotationY, woodMap, cushionColor, frameColor }: {
  position: [number, number, number];
  rotationY: number;
  woodMap: THREE.Texture;
  cushionColor?: string;
  frameColor?: string;
}) {
  const isSofa = !!cushionColor;
  const cushion = cushionColor ?? '#f1e4c4';
  const frame = frameColor ?? '#3a2418';

  if (isSofa) {
    // Sofa / armchair — padded seat, thick back, armrests, short legs
    return (
      <group position={position} rotation={[0, rotationY, 0]}>
        {/* Thick padded seat */}
        <mesh geometry={GEO.sofaSeat} position={[0, 0.25, 0.02]} castShadow>
          <meshStandardMaterial color={cushion} roughness={0.92} />
        </mesh>
        {/* Padded back — slightly reclined */}
        <mesh geometry={GEO.sofaBack} position={[0, 0.55, -0.22]} rotation={[0.12, 0, 0]} castShadow>
          <meshStandardMaterial color={cushion} roughness={0.92} />
        </mesh>
        {/* Left armrest */}
        <mesh geometry={GEO.sofaArmL} position={[-0.26, 0.38, 0.02]} castShadow>
          <meshStandardMaterial color={cushion} roughness={0.92} />
        </mesh>
        {/* Right armrest */}
        <mesh geometry={GEO.sofaArmR} position={[0.26, 0.38, 0.02]} castShadow>
          <meshStandardMaterial color={cushion} roughness={0.92} />
        </mesh>
        {/* Short stubby legs */}
        {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z], i) => (
          <mesh key={i} geometry={GEO.sofaLeg} position={[x, 0.05, z]} castShadow>
            <meshStandardMaterial color={frame} roughness={0.5} metalness={0.3} />
          </mesh>
        ))}
      </group>
    );
  }

  // Classic dining chair — wood frame + cushion
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={GEO.chairSeatBase} position={[0, 0.3, 0]} castShadow>
        <meshStandardMaterial map={woodMap} roughness={0.65} />
      </mesh>
      <mesh geometry={GEO.chairCushion} position={[0, 0.365, 0]} castShadow>
        <meshStandardMaterial color={cushion} roughness={0.85} />
      </mesh>
      <mesh geometry={GEO.chairBack} position={[0, 0.65, -0.21]} castShadow>
        <meshStandardMaterial map={woodMap} roughness={0.65} />
      </mesh>
      {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z], i) => (
        <mesh key={i} geometry={GEO.chairLeg} position={[x, 0.15, z]}>
          <meshStandardMaterial color={frame} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/* -------- Seat layout (shape-aware) --------
 *
 * round  → chairs distributed evenly around the perimeter, plates near the edge.
 * square → chairs evenly across all 4 sides.
 * rect   → chairs prioritised on LONG sides; spill to short ends only when needed.
 *
 * Each chair faces perpendicular to the table edge (proper restaurant seating),
 * not radially toward the centre — so a 6-person rect actually looks like a
 * dinner table with people sitting along the long sides.
 */
type Seat = { x: number; z: number; facing: number };
type SeatPair = { chair: Seat; setting: Seat };

function placeSeats(shape: Table['shape'], seats: number, tw: number, tl: number): SeatPair[] {
  if (shape === 'round') {
    const tableR = Math.max(tw, tl) / 2;
    const chairR = tableR + 0.05;         // chair seat centre — tucked against table
    const settingR = tableR - 0.25;        // plate centre, near the edge
    const out: SeatPair[] = [];
    for (let i = 0; i < seats; i++) {
      const a = (i / seats) * Math.PI * 2;
      const cosA = Math.cos(a), sinA = Math.sin(a);
      const facing = Math.atan2(-cosA, -sinA);
      out.push({
        chair:   { x: cosA * chairR,   z: sinA * chairR,   facing },
        setting: { x: cosA * settingR, z: sinA * settingR, facing }
      });
    }
    return out;
  }

  // Rectangular / square: chairs along the four sides
  const chairOffset  = 0.22;  // distance from table edge to chair centre
  const settingInset = 0.18;  // distance from table edge inward to plate centre
  const halfW = tw / 2;
  const halfL = tl / 2;

  let topN = 0, bottomN = 0, leftN = 0, rightN = 0;

  if (shape === 'square') {
    const base = Math.floor(seats / 4);
    let extra = seats % 4;
    topN = bottomN = leftN = rightN = base;
    if (extra-- > 0) topN++;
    if (extra-- > 0) bottomN++;
    if (extra-- > 0) leftN++;
    if (extra-- > 0) rightN++;
  } else {
    // rect: long sides first
    const longIsX = tw >= tl;
    const longLen = longIsX ? tw : tl;
    const capPerLong = Math.max(1, Math.floor(longLen / 0.55)); // ~0.55 units per chair
    const longTotal = Math.min(seats, capPerLong * 2);
    const longA = Math.ceil(longTotal / 2);
    const longB = longTotal - longA;
    const remaining = seats - longTotal;
    const shortA = remaining > 0 ? Math.ceil(remaining / 2) : 0;
    const shortB = remaining > 0 ? remaining - shortA : 0;

    if (longIsX) { topN = longA; bottomN = longB; leftN = shortA; rightN = shortB; }
    else         { leftN = longA; rightN = longB; topN = shortA; bottomN = shortB; }
  }

  // Even spread within 80% of the table side length
  const spread = (count: number, full: number): number[] => {
    if (count === 0) return [];
    if (count === 1) return [0];
    const usable = full * 0.78;
    const step = usable / (count - 1);
    return Array.from({ length: count }, (_, i) => -usable / 2 + i * step);
  };

  const out: SeatPair[] = [];

  // Top side (z<0) — chairs face +Z (toward table). rotationY = 0.
  for (const x of spread(topN, tw)) {
    out.push({
      chair:   { x, z: -halfL - chairOffset,  facing: 0 },
      setting: { x, z: -halfL + settingInset, facing: 0 }
    });
  }
  // Bottom side (z>0) — chairs face -Z. rotationY = π.
  for (const x of spread(bottomN, tw)) {
    out.push({
      chair:   { x, z:  halfL + chairOffset,  facing: Math.PI },
      setting: { x, z:  halfL - settingInset, facing: Math.PI }
    });
  }
  // Left side (x<0) — chairs face +X. rotationY = π/2.
  for (const z of spread(leftN, tl)) {
    out.push({
      chair:   { x: -halfW - chairOffset,  z, facing: Math.PI / 2 },
      setting: { x: -halfW + settingInset, z, facing: Math.PI / 2 }
    });
  }
  // Right side (x>0) — chairs face -X. rotationY = -π/2.
  for (const z of spread(rightN, tl)) {
    out.push({
      chair:   { x:  halfW + chairOffset,  z, facing: -Math.PI / 2 },
      setting: { x:  halfW - settingInset, z, facing: -Math.PI / 2 }
    });
  }

  return out;
}

/* -------- Main -------- */

const EPS = 0.001;

export default function Table3D({ table, available, selected, onSelect }: Props) {
  const group = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);

  const wood = useMemo(() => woodTexture(), []);
  const marble = useMemo(() => marbleTexture(), []);

  const targetY = hover || selected ? 0.12 : 0;
  const targetScale = selected ? 1.06 : 1;

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const dy = Math.abs(g.position.y - targetY);
    const ds = Math.abs(g.scale.x - targetScale);
    if (dy < EPS && ds < EPS) return; // idle — don't touch the transform
    g.position.y = THREE.MathUtils.damp(g.position.y, targetY, 6, dt);
    const s = THREE.MathUtils.damp(g.scale.x, targetScale, 6, dt);
    g.scale.x = s;
    g.scale.z = s;
  });

  // Pre-compute per-table geometry picks (shape-specific table top + footprint)
  const { topGeo, clothGeo, baseLayout, chairRadius, ringGeo, seatLayout } = useMemo(() => {
    const tw = table.shape === 'rect' ? (table.seats >= 9 ? 4.5 : table.seats >= 7 ? 3.2 : 2.6) : table.shape === 'round' ? 1.8 : 1.5;
    const tl = table.shape === 'rect' ? (table.seats >= 9 ? 1.6 : table.seats >= 7 ? 1.5 : 1.4) : table.shape === 'round' ? 1.8 : 1.5;
    const cr = table.shape === 'round' ? 0.98 : Math.max(tw, tl) / 2 + 0.28;
    const seats = placeSeats(table.shape, table.seats, tw, tl);
    return {
      topGeo: table.shape === 'round' ? GEO.roundTop
        : table.shape === 'rect' ? (table.seats >= 9 ? GEO.rectTopXl : table.seats >= 7 ? GEO.rectTopLg : GEO.rectTop)
        : GEO.squareTop,
      clothGeo: table.shape === 'round' ? null
        : table.shape === 'rect' ? (table.seats >= 9 ? GEO.rectClothXl : table.seats >= 7 ? GEO.rectClothLg : GEO.rectCloth)
        : GEO.squareCloth,
      baseLayout: table.shape === 'round'
        ? 'pedestal'
        : 'legs',
      chairRadius: cr,
      ringGeo: new THREE.RingGeometry(cr + 0.2, cr + 0.4, 48),
      seatLayout: seats
    } as const;
  }, [table.shape, table.seats]);

  const legPositions: [number, number][] = useMemo(() => {
    if (table.shape === 'round') return [];
    const tw = table.shape === 'rect' ? 2.2 : 1.5;
    const tl = table.shape === 'rect' ? 1.3 : 1.5;
    return [
      [-tw / 2 + 0.1, -tl / 2 + 0.1],
      [tw / 2 - 0.1, -tl / 2 + 0.1],
      [-tw / 2 + 0.1, tl / 2 - 0.1],
      [tw / 2 - 0.1, tl / 2 - 0.1]
    ];
  }, [table.shape]);

  const dimRef = useRef<THREE.Group>(null);
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

  return (
    <group
      ref={group}
      position={table.position}
      rotation={[0, table.rotation ?? 0, 0]}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto'; }}
      onClick={(e) => { e.stopPropagation(); if (available) onSelect(table); }}
    >
      <group ref={dimRef}>
        <mesh geometry={topGeo} castShadow receiveShadow position={[0, 0.78, 0]}>
          <meshStandardMaterial
            map={table.tableColor ? undefined : (table.shape === 'round' ? marble : wood)}
            color={selected ? '#f7e1a6' : (table.tableColor ?? '#ffffff')}
            roughness={table.tableColor ? 0.6 : 0.35}
            metalness={table.tableColor ? 0.08 : 0.15}
            emissive={selected ? '#E3AB32' : '#000000'}
            emissiveIntensity={selected ? 0.18 : 0}
          />
        </mesh>

        {clothGeo && !table.tableColor && (
          <mesh geometry={clothGeo} position={[0, 0.822, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#f8efd8" roughness={0.95} side={THREE.DoubleSide} />
          </mesh>
        )}

        {baseLayout === 'pedestal' ? (
          <>
            <mesh geometry={GEO.roundPedestal} position={[0, 0.38, 0]} castShadow>
              <meshStandardMaterial color={table.tableColor ?? '#3a2418'} metalness={0.4} roughness={0.5} />
            </mesh>
            <mesh geometry={GEO.roundBase} position={[0, 0.03, 0]}>
              <meshStandardMaterial color={table.tableColor ?? '#3a2418'} roughness={0.7} />
            </mesh>
          </>
        ) : (
          legPositions.map(([x, z], i) => (
            <mesh key={i} geometry={GEO.rectLeg} position={[x, 0.38, z]} castShadow>
              <meshStandardMaterial color={table.tableColor ?? '#3a2418'} roughness={0.65} />
            </mesh>
          ))
        )}

        {seatLayout.map((s, i) => (
          <Chair
            key={`c-${i}`}
            position={[s.chair.x, 0, s.chair.z]}
            rotationY={s.chair.facing}
            woodMap={wood}
            cushionColor={table.chairColor}
            frameColor={table.tableColor}
          />
        ))}

        {available && (
          <group position={[0, 0.828, 0]}>
            {seatLayout.map((s, i) => (
              <PlaceSetting
                key={`p-${i}`}
                seed={i + hashString(table.id)}
                position={[s.setting.x, 0, s.setting.z]}
                rotationY={s.setting.facing}
                detailed={selected || hover}
              />
            ))}
            {(selected || hover) && <Centerpiece lit={selected || hover} />}
          </group>
        )}
      </group>

      <mesh geometry={ringGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <meshBasicMaterial
          color={selected ? '#E3AB32' : available ? '#5E141E' : '#b03a3a'}
          transparent
          opacity={selected ? 0.6 : hover ? 0.35 : available ? 0.12 : 0.35}
        />
      </mesh>

      <Html position={[0, 1.6, 0]} center distanceFactor={10} zIndexRange={[20, 0]}>
        <div
          className={`px-2 py-1 text-[9px] tracking-[0.3em] uppercase rounded-sm border pointer-events-none select-none whitespace-nowrap transition-all shadow-sm ${
            !available
              ? 'border-red-500/60 text-red-800 bg-red-50/95'
              : selected
              ? 'border-gold text-maroon bg-gold'
              : 'border-maroon/30 text-maroon bg-white/95'
          }`}
        >
          {table.label} · {table.seats}p {!available && '· Reserved'}
        </div>
      </Html>
    </group>
  );
}
