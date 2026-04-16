'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Table3D from './Table3D';
import Suite3D from './Suite3D';
import type { Suite, SlotId, Table, VenueData } from '@/lib/mockApi';

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
  const dist = Math.max(distForHeight, distForWidth) * 1.05;

  const pitch = aspect < 0.75 ? 0.95 : aspect < 1.3 ? 0.75 : 0.6;
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
      <fog attach="fog" args={['#fdf8ea', 22, 60]} />

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
          maxDistance={35}
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
