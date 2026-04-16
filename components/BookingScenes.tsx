'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Instances, Instance } from '@react-three/drei';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

type Scene = 'bar' | 'restaurant' | 'rooftop' | 'suite';

export default function BookingScene3D({ scene }: { scene: Scene }) {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 1.2, 6], fov: 45 }}
    >
      <fog attach="fog" args={[sceneFog(scene), 8, 22]} />
      {scene === 'bar' && <BarScene />}
      {scene === 'restaurant' && <RestaurantScene />}
      {scene === 'rooftop' && <RooftopScene />}
      {scene === 'suite' && <SuiteScene />}
    </Canvas>
  );
}

function sceneFog(s: Scene) {
  if (s === 'bar') return '#1a0a0a';
  if (s === 'restaurant') return '#2a0d14';
  if (s === 'rooftop') return '#0a1628';
  return '#1a0f08';
}

/* ───────── BAR ───────── */
function BarScene() {
  const flicker = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (flicker.current) {
      flicker.current.intensity = 2 + Math.sin(clock.elapsedTime * 4) * 0.2;
    }
  });

  return (
    <group>
      <ambientLight intensity={0.15} color="#5a2a1a" />
      <pointLight ref={flicker} position={[0, 2.5, 1]} intensity={2} color="#E3AB32" distance={12} />
      <pointLight position={[-4, 1, 2]} intensity={0.8} color="#ff6b3d" distance={6} />
      <pointLight position={[4, 1, 2]} intensity={0.8} color="#ff6b3d" distance={6} />

      {/* Back wall */}
      <mesh position={[0, 1, -3]} receiveShadow>
        <planeGeometry args={[20, 8]} />
        <meshStandardMaterial color="#1a0a08" roughness={0.9} />
      </mesh>

      {/* Bar counter */}
      <group position={[0, -0.3, 1]}>
        {/* countertop */}
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[14, 0.15, 2]} />
          <meshStandardMaterial color="#2a1810" roughness={0.2} metalness={0.3} />
        </mesh>
        {/* front panel */}
        <mesh position={[0, -0.3, 0.9]}>
          <boxGeometry args={[14, 1.6, 0.1]} />
          <meshStandardMaterial color="#1a0f08" roughness={0.8} />
        </mesh>
        {/* gold trim */}
        <mesh position={[0, 0.5, 1]}>
          <boxGeometry args={[14, 0.04, 0.04]} />
          <meshStandardMaterial color="#E3AB32" emissive="#E3AB32" emissiveIntensity={0.5} metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Drinks on counter */}
        <Cocktail position={[-3.5, 0.62, 0]} color="#ff4d6d" />
        <Cocktail position={[-1.5, 0.62, 0.2]} color="#d4a574" tall />
        <Cocktail position={[0.5, 0.62, -0.1]} color="#8b2635" />
        <Cocktail position={[2.5, 0.62, 0.1]} color="#f4a261" />
        <Cocktail position={[4.2, 0.62, -0.2]} color="#264653" tall />
      </group>

      {/* Back-bar shelves with bottles */}
      <BottleShelf y={1.2} count={16} />
      <BottleShelf y={2.0} count={14} scale={0.85} />
      <BottleShelf y={2.7} count={12} scale={0.75} />

      {/* shelf backlight plane */}
      <mesh position={[0, 1.9, -2.85]}>
        <planeGeometry args={[12, 2.5]} />
        <meshBasicMaterial color="#E3AB32" transparent opacity={0.12} />
      </mesh>

      <Environment preset="night" />
    </group>
  );
}

function Cocktail({ position, color, tall = false }: { position: [number, number, number]; color: string; tall?: boolean }) {
  const h = tall ? 0.5 : 0.35;
  return (
    <Float speed={1.5} floatIntensity={0.1} rotationIntensity={0.05}>
      <group position={position}>
        {tall ? (
          <mesh position={[0, h / 2, 0]}>
            <cylinderGeometry args={[0.09, 0.07, h, 16]} />
            <meshPhysicalMaterial
              color={color}
              transmission={0.6}
              thickness={0.2}
              roughness={0.05}
              ior={1.4}
              transparent
              opacity={0.85}
            />
          </mesh>
        ) : (
          <mesh position={[0, h / 2, 0]}>
            <coneGeometry args={[0.18, h, 20]} />
            <meshPhysicalMaterial
              color={color}
              transmission={0.55}
              thickness={0.2}
              roughness={0.05}
              ior={1.4}
              transparent
              opacity={0.85}
            />
          </mesh>
        )}
        {/* stem */}
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.5} />
        </mesh>
        {/* base */}
        <mesh position={[0, -0.13, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.015, 16]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.5} />
        </mesh>
      </group>
    </Float>
  );
}

function BottleShelf({ y, count, scale = 1 }: { y: number; count: number; scale?: number }) {
  const bottles = useMemo(() => {
    const colors = ['#4a2512', '#1a3d2a', '#3d1a1a', '#2a2040', '#5a3a1a', '#1a2a3d'];
    return Array.from({ length: count }, (_, i) => ({
      x: (i - (count - 1) / 2) * 0.7,
      color: colors[i % colors.length],
      h: 0.5 + ((i * 37) % 20) / 100,
    }));
  }, [count]);

  return (
    <group position={[0, y, -2.6]}>
      {/* shelf plank */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[count * 0.7 + 0.4, 0.04, 0.35]} />
        <meshStandardMaterial color="#2a1810" roughness={0.3} metalness={0.2} />
      </mesh>
      {bottles.map((b, i) => (
        <group key={i} position={[b.x, b.h * scale * 0.5, 0]} scale={scale}>
          {/* body */}
          <mesh>
            <cylinderGeometry args={[0.1, 0.1, b.h, 16]} />
            <meshPhysicalMaterial color={b.color} roughness={0.1} metalness={0.1} transmission={0.3} thickness={0.3} />
          </mesh>
          {/* shoulder */}
          <mesh position={[0, b.h * 0.5 + 0.05, 0]}>
            <coneGeometry args={[0.1, 0.1, 16]} />
            <meshPhysicalMaterial color={b.color} roughness={0.1} transmission={0.3} thickness={0.3} />
          </mesh>
          {/* neck */}
          <mesh position={[0, b.h * 0.5 + 0.15, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.12, 12]} />
            <meshStandardMaterial color={b.color} />
          </mesh>
          {/* label */}
          <mesh position={[0, 0, 0.101]}>
            <planeGeometry args={[0.15, 0.18]} />
            <meshStandardMaterial color="#E3AB32" emissive="#E3AB32" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ───────── RESTAURANT ───────── */
function RestaurantScene() {
  return (
    <group>
      <ambientLight intensity={0.25} color="#5a3a20" />
      <pointLight position={[0, 4, 2]} intensity={2} color="#FFD27A" distance={14} />
      <pointLight position={[-5, 2, 3]} intensity={0.6} color="#E3AB32" distance={8} />
      <pointLight position={[5, 2, 3]} intensity={0.6} color="#E3AB32" distance={8} />
      <spotLight position={[0, 5, 0]} angle={0.6} intensity={1.5} color="#FFD27A" penumbra={0.8} />

      {/* Chandelier */}
      <Chandelier position={[0, 3.5, 0]} />

      {/* Floor */}
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#1a0a08" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Plants */}
      <PottedPlant position={[-4.5, -1, 0]} scale={1.4} />
      <PottedPlant position={[4.5, -1, 0]} scale={1.2} variant="palm" />
      <PottedPlant position={[-6.5, -1, -1.5]} scale={0.9} variant="palm" />
      <PottedPlant position={[6.5, -1, -1.5]} scale={0.9} />
      <PottedPlant position={[-2, -1, -3]} scale={0.7} variant="palm" />
      <PottedPlant position={[2, -1, -3]} scale={0.7} />

      <Environment preset="sunset" />
    </group>
  );
}

function Chandelier({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.5) * 0.02;
  });
  return (
    <group position={position} ref={ref}>
      {/* cord */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 2, 8]} />
        <meshStandardMaterial color="#1a0a08" />
      </mesh>
      {/* center */}
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#E3AB32" metalness={0.9} roughness={0.2} emissive="#E3AB32" emissiveIntensity={0.3} />
      </mesh>
      {/* arms + bulbs */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        const x = Math.cos(a) * 0.8;
        const z = Math.sin(a) * 0.8;
        return (
          <group key={i}>
            <mesh position={[x / 2, -0.2, z / 2]} rotation={[0, -a, -0.4]}>
              <cylinderGeometry args={[0.02, 0.02, 0.9, 8]} />
              <meshStandardMaterial color="#E3AB32" metalness={0.8} />
            </mesh>
            <mesh position={[x, -0.5, z]}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshStandardMaterial color="#FFD27A" emissive="#FFD27A" emissiveIntensity={2} toneMapped={false} />
            </mesh>
            <pointLight position={[x, -0.5, z]} intensity={0.3} color="#FFD27A" distance={3} />
          </group>
        );
      })}
    </group>
  );
}

function PottedPlant({
  position,
  scale = 1,
  variant = 'monstera',
}: {
  position: [number, number, number];
  scale?: number;
  variant?: 'monstera' | 'palm';
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.8 + position[0]) * 0.03;
    }
  });

  return (
    <group position={position} scale={scale}>
      {/* Pot */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.35, 0.5, 20]} />
        <meshStandardMaterial color="#5a3a1f" roughness={0.7} metalness={0.1} />
      </mesh>
      {/* pot rim */}
      <mesh position={[0, 0.5, 0]}>
        <torusGeometry args={[0.45, 0.04, 12, 24]} />
        <meshStandardMaterial color="#6b4726" roughness={0.5} />
      </mesh>
      {/* soil */}
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.05, 20]} />
        <meshStandardMaterial color="#2a1810" roughness={1} />
      </mesh>

      <group ref={ref} position={[0, 0.5, 0]}>
        {variant === 'monstera' ? <MonsteraLeaves /> : <PalmLeaves />}
      </group>
    </group>
  );
}

function MonsteraLeaves() {
  return (
    <>
      {/* stem */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 1.2, 8]} />
        <meshStandardMaterial color="#3d2818" />
      </mesh>
      {[
        { p: [0, 1.3, 0.2], r: [0.2, 0, 0], s: 1.2 },
        { p: [0.4, 1.1, 0], r: [0.3, 0.7, 0.3], s: 1.1 },
        { p: [-0.4, 1.1, 0], r: [0.3, -0.7, -0.3], s: 1.1 },
        { p: [0.2, 0.9, -0.3], r: [-0.2, 2.5, 0], s: 0.9 },
        { p: [-0.3, 0.9, -0.2], r: [-0.2, -2.5, 0], s: 0.9 },
        { p: [0, 1.5, -0.1], r: [-0.3, 0, 0], s: 1 },
      ].map((l, i) => (
        <mesh key={i} position={l.p as any} rotation={l.r as any} scale={l.s}>
          <sphereGeometry args={[0.35, 16, 12]} />
          <meshStandardMaterial color={i % 2 ? '#2d6a3e' : '#1f5530'} roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

function PalmLeaves() {
  return (
    <>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 1.6, 8]} />
        <meshStandardMaterial color="#3d2818" />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.5, 1.6, Math.sin(a) * 0.5]}
            rotation={[0.4, -a, 0.3]}
          >
            <coneGeometry args={[0.12, 1.4, 6]} />
            <meshStandardMaterial color={i % 2 ? '#2d6a3e' : '#1f5530'} roughness={0.7} />
          </mesh>
        );
      })}
    </>
  );
}

/* ───────── ROOFTOP ───────── */
function RooftopScene() {
  return (
    <group>
      <ambientLight intensity={0.1} color="#2a2050" />
      <pointLight position={[0, 8, 0]} intensity={0.5} color="#8080ff" distance={20} />
      <pointLight position={[0, 0.5, 2]} intensity={1.2} color="#FFA04D" distance={4} />

      {/* Moon */}
      <Moon position={[5, 4, -6]} />

      {/* Stars */}
      <Stars count={200} />

      {/* City skyline */}
      <Skyline />

      {/* Table with candle */}
      <group position={[0, -0.8, 2]}>
        {/* table top */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.9, 0.9, 0.08, 32]} />
          <meshStandardMaterial color="#2a1810" roughness={0.3} metalness={0.2} />
        </mesh>
        {/* stem */}
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.06, 0.1, 0.7, 12]} />
          <meshStandardMaterial color="#1a0a08" metalness={0.5} />
        </mesh>
        {/* base */}
        <mesh position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.05, 20]} />
          <meshStandardMaterial color="#1a0a08" metalness={0.5} />
        </mesh>

        {/* Candle */}
        <Candle3D position={[-0.3, 0.54, 0.2]} />
        {/* Wine glasses */}
        <WineGlass position={[0.35, 0.54, -0.15]} />
        <WineGlass position={[0.1, 0.54, 0.3]} />
        {/* Rose petals */}
        {[...Array(6)].map((_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.6, 0.545, Math.sin(a) * 0.6]} rotation={[-Math.PI / 2, 0, a]}>
              <circleGeometry args={[0.05, 8]} />
              <meshStandardMaterial color="#8b1a2b" side={THREE.DoubleSide} />
            </mesh>
          );
        })}
      </group>

      {/* Ground */}
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0a0a15" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Fairy lights strung across */}
      <FairyLights />

      <Environment preset="night" />
    </group>
  );
}

function Moon({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="#f4e8c8" emissive="#f4e8c8" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      {/* halo */}
      <mesh>
        <sphereGeometry args={[1.3, 32, 32]} />
        <meshBasicMaterial color="#f4e8c8" transparent opacity={0.15} />
      </mesh>
      <pointLight intensity={1} color="#f4e8c8" distance={20} />
    </group>
  );
}

function Stars({ count }: { count: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.children.forEach((c, i) => {
        const m = c as THREE.Mesh;
        (m.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.abs(Math.sin(clock.elapsedTime + i)) * 0.7;
      });
    }
  });
  const stars = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 30,
        y: Math.random() * 10 + 2,
        z: -8 - Math.random() * 8,
        s: 0.02 + Math.random() * 0.04,
      })),
    [count]
  );
  return (
    <group ref={ref}>
      {stars.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <sphereGeometry args={[s.s, 6, 6]} />
          <meshBasicMaterial color="#ffffff" transparent toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Skyline() {
  const buildings = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        x: (i - 14) * 1.1 + (Math.random() - 0.5) * 0.3,
        h: 1 + Math.random() * 3,
        w: 0.7 + Math.random() * 0.3,
        d: 0.5 + Math.random() * 0.4,
      })),
    []
  );
  return (
    <group position={[0, -1, -9]}>
      {buildings.map((b, i) => (
        <group key={i} position={[b.x, b.h / 2, 0]}>
          <mesh>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color="#0a0a1a" roughness={0.9} />
          </mesh>
          {/* windows */}
          {Array.from({ length: Math.floor(b.h * 5) }).map((_, j) => {
            const lit = Math.random() > 0.4;
            return (
              <mesh
                key={j}
                position={[(j % 2 ? 0.15 : -0.15), (j * 0.18) - b.h / 2 + 0.2, b.d / 2 + 0.001]}
              >
                <planeGeometry args={[0.08, 0.1]} />
                <meshBasicMaterial
                  color={lit ? '#E3AB32' : '#1a1a2a'}
                  toneMapped={false}
                  transparent
                  opacity={lit ? 0.9 : 0.3}
                />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

function Candle3D({ position }: { position: [number, number, number] }) {
  const flame = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (flame.current) {
      flame.current.scale.y = 1 + Math.sin(t * 8) * 0.12;
      flame.current.scale.x = 1 + Math.cos(t * 6) * 0.08;
      flame.current.rotation.z = Math.sin(t * 3) * 0.08;
    }
    if (light.current) {
      light.current.intensity = 1.5 + Math.sin(t * 10) * 0.3 + Math.sin(t * 3) * 0.2;
    }
  });
  return (
    <group position={position}>
      {/* holder */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.09, 0.11, 0.08, 16]} />
        <meshStandardMaterial color="#E3AB32" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* candle */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.28, 16]} />
        <meshStandardMaterial color="#f4e8c8" roughness={0.3} emissive="#E3AB32" emissiveIntensity={0.1} />
      </mesh>
      {/* flame */}
      <mesh ref={flame} position={[0, 0.42, 0]}>
        <coneGeometry args={[0.03, 0.12, 8]} />
        <meshBasicMaterial color="#FFD27A" toneMapped={false} transparent opacity={0.95} />
      </mesh>
      {/* inner bright flame */}
      <mesh position={[0, 0.41, 0]}>
        <coneGeometry args={[0.015, 0.07, 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.45, 0]} intensity={1.5} color="#FFA04D" distance={5} />
    </group>
  );
}

function WineGlass({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* base */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.01, 16]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0.9} thickness={0.1} roughness={0.05} />
      </mesh>
      {/* stem */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.2, 8]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0.9} thickness={0.1} roughness={0.05} />
      </mesh>
      {/* bowl */}
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.08, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0.95} thickness={0.05} roughness={0.02} side={THREE.DoubleSide} />
      </mesh>
      {/* wine */}
      <mesh position={[0, 0.24, 0]}>
        <sphereGeometry args={[0.07, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshPhysicalMaterial color="#6b0a1a" transmission={0.4} thickness={0.3} roughness={0.1} />
      </mesh>
    </group>
  );
}

function FairyLights() {
  const lights = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => {
        const t = i / 19;
        const x = (t - 0.5) * 16;
        const y = 3 + Math.sin(t * Math.PI) * -0.8;
        return { x, y, z: -3, delay: i * 0.2 };
      }),
    []
  );
  return (
    <group>
      {lights.map((l, i) => (
        <Bulb key={i} position={[l.x, l.y, l.z]} delay={l.delay} />
      ))}
    </group>
  );
}

function Bulb({ position, delay }: { position: [number, number, number]; delay: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const m = ref.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.6 + Math.sin(clock.elapsedTime * 2 + delay) * 0.4;
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshBasicMaterial color="#E3AB32" toneMapped={false} transparent />
    </mesh>
  );
}

/* ───────── SUITE ───────── */
function SuiteScene() {
  return (
    <group>
      <ambientLight intensity={0.2} color="#4a2a1a" />
      <pointLight position={[0, 3, 3]} intensity={1.2} color="#FFD27A" distance={12} />

      {/* Building facade */}
      <mesh position={[0, 1, -4]} receiveShadow>
        <planeGeometry args={[16, 8]} />
        <meshStandardMaterial color="#2a1810" roughness={0.9} />
      </mesh>

      {/* Windows grid — 3 floors */}
      {[0, 1, 2].map((floor) =>
        [0, 1, 2, 3, 4, 5].map((col) => (
          <Window
            key={`${floor}-${col}`}
            position={[(col - 2.5) * 2.3, 0.5 + floor * 1.8, -3.9]}
            delay={(floor * 6 + col) * 0.3}
          />
        ))
      )}

      {/* Ground */}
      <mesh position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0a0505" roughness={0.6} />
      </mesh>

      <Environment preset="night" />
    </group>
  );
}

function Window({ position, delay }: { position: [number, number, number]; delay: number }) {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.opacity = 0.4 + Math.abs(Math.sin(clock.elapsedTime * 0.6 + delay)) * 0.5;
    }
  });
  return (
    <group position={position}>
      {/* frame */}
      <mesh>
        <planeGeometry args={[1.2, 1.4]} />
        <meshStandardMaterial color="#1a0a05" />
      </mesh>
      {/* lit interior */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[1.05, 1.25]} />
        <meshBasicMaterial ref={ref} color="#E3AB32" toneMapped={false} transparent />
      </mesh>
      {/* muntin */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[1.05, 0.04, 0.01]} />
        <meshStandardMaterial color="#1a0a05" />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.04, 1.25, 0.01]} />
        <meshStandardMaterial color="#1a0a05" />
      </mesh>
    </group>
  );
}
