"use client";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type ClayVariant = "hero" | "auth" | "cta";

const C = {
  leaf: "#1f5a2e",
  leafMid: "#2f7a3a",
  leafVein: "#174a24",
  lime: "#9ccc3c",
  mango: "#f4b62c",
  melon: "#f6c84e",
  rind: "#6f9a2c",
  guava: "#ef6a37",
  anor: "#c8323f",
  anorDeep: "#a3242f",
  gold: "#e9b949",
  paper: "#f8f0dc",
  charcoal: "#1b1a17",
  grapeA: "#a7c84a",
  grapeB: "#8db53a",
  stem: "#7a5530",
};

// Window-wide pointer, so the tableau tilts even while the cursor is over the HTML collage.
const pointer = new THREE.Vector2();

let grain: THREE.CanvasTexture | null = null;
/** Fine clay grain as a bump map, generated once on the client. */
function getGrain() {
  if (grain) return grain;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 80;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  grain = new THREE.CanvasTexture(canvas);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(3, 3);
  return grain;
}

function Clay({ color, roughness = 0.9 }: { color: string; roughness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={0} bumpMap={getGrain()} bumpScale={0.35} />;
}

/* ───────────── Objects ───────────── */

function Pomegranate() {
  const sepals = Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2);
  return (
    <group>
      <mesh castShadow scale={[1, 0.93, 1]}>
        <sphereGeometry args={[1, 64, 48]} />
        <Clay color={C.anor} roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0, 0.94, 0]}>
        <cylinderGeometry args={[0.2, 0.26, 0.2, 24]} />
        <Clay color={C.anorDeep} />
      </mesh>
      {sepals.map((a) => (
        <mesh key={a} castShadow position={[Math.cos(a) * 0.17, 1.1, Math.sin(a) * 0.17]} rotation={[Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55]}>
          <coneGeometry args={[0.07, 0.26, 10]} />
          <Clay color={C.anorDeep} />
        </mesh>
      ))}
    </group>
  );
}

function MelonSlice() {
  const seeds = [-0.55, -0.3, -0.05, 0.2, 0.45];
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[1, 1, 0.42, 48, 1, false, Math.PI / 2, Math.PI]} />
        <Clay color={C.melon} roughness={0.8} />
      </mesh>
      <mesh castShadow rotation={[Math.PI / 2, 0, Math.PI]}>
        <torusGeometry args={[1, 0.11, 16, 48, Math.PI]} />
        <Clay color={C.rind} />
      </mesh>
      {seeds.map((x) => (
        <mesh key={x} position={[x, -0.22, -0.4 - Math.abs(x) * 0.15]} scale={[1, 0.45, 1.6]}>
          <sphereGeometry args={[0.05, 12, 8]} />
          <Clay color={C.paper} />
        </mesh>
      ))}
    </group>
  );
}

function Grapes() {
  const grapes = useMemo(() => {
    const out: { p: [number, number, number]; c: string }[] = [];
    const rows = [4, 4, 3, 3, 2, 1];
    rows.forEach((n, r) => {
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * 0.36 + (r % 2) * 0.06;
        out.push({ p: [x, 0.7 - r * 0.3, ((i + r) % 2) * 0.12], c: (i + r) % 3 === 0 ? C.grapeB : C.grapeA });
      }
    });
    return out;
  }, []);
  return (
    <group>
      {grapes.map((g, i) => (
        <mesh key={i} castShadow position={g.p}>
          <sphereGeometry args={[0.2, 24, 18]} />
          <Clay color={g.c} roughness={0.7} />
        </mesh>
      ))}
      <mesh castShadow position={[0.05, 1.05, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.04, 0.05, 0.4, 8]} />
        <Clay color={C.stem} />
      </mesh>
    </group>
  );
}

/** Five-lobed grape leaf rolled out of clay, with pressed veins. */
function Leaf({ color = C.leafMid }: { color?: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const lobes = 0.72 + 0.28 * Math.abs(Math.cos(2.5 * t));
      const notch = 1 - 0.35 * Math.exp(-Math.pow((t - Math.PI * 1.5) / 0.18, 2));
      const r = lobes * notch;
      const x = Math.cos(t) * r;
      const y = Math.sin(t) * r * 0.95;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 4 });
    g.center();
    return g;
  }, []);
  const veins = [Math.PI / 2, Math.PI / 2 + 0.95, Math.PI / 2 - 0.95, Math.PI / 2 + 1.9, Math.PI / 2 - 1.9];
  return (
    <group>
      <mesh castShadow geometry={geometry}>
        <Clay color={color} roughness={0.85} />
      </mesh>
      {veins.map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.32, Math.sin(a) * 0.32 - 0.12, 0.09]} rotation={[0, 0, a - Math.PI / 2]}>
          <capsuleGeometry args={[0.018, 0.55, 4, 8]} />
          <Clay color={C.leafVein} />
        </mesh>
      ))}
    </group>
  );
}

function ChatBubble() {
  return (
    <group>
      <RoundedBox args={[1.7, 1.05, 0.42]} radius={0.3} smoothness={6} castShadow>
        <Clay color={C.lime} roughness={0.8} />
      </RoundedBox>
      <mesh castShadow position={[-0.5, -0.6, 0]} rotation={[0, 0, 0.6]}>
        <coneGeometry args={[0.2, 0.42, 16]} />
        <Clay color={C.lime} roughness={0.8} />
      </mesh>
      {[-0.42, 0, 0.42].map((x) => (
        <mesh key={x} position={[x, 0, 0.23]}>
          <sphereGeometry args={[0.11, 20, 14]} />
          <Clay color={C.charcoal} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Bag() {
  return (
    <group>
      <RoundedBox args={[1, 1.15, 0.55]} radius={0.12} smoothness={5} castShadow>
        <Clay color={C.guava} />
      </RoundedBox>
      <mesh castShadow position={[0, 0.56, 0]}>
        <torusGeometry args={[0.3, 0.06, 14, 32, Math.PI]} />
        <Clay color={C.charcoal} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.02, 0.29]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.05, 32]} />
        <Clay color={C.mango} />
      </mesh>
    </group>
  );
}

function PayCard() {
  return (
    <group>
      <RoundedBox args={[1.6, 1, 0.1]} radius={0.09} smoothness={5} castShadow>
        <Clay color={C.mango} roughness={0.75} />
      </RoundedBox>
      <RoundedBox args={[1.6, 0.18, 0.04]} radius={0.02} position={[0, 0.24, 0.05]}>
        <Clay color={C.charcoal} />
      </RoundedBox>
      <RoundedBox args={[0.32, 0.24, 0.05]} radius={0.04} position={[-0.5, -0.14, 0.06]}>
        <Clay color={C.paper} />
      </RoundedBox>
      <RoundedBox args={[0.5, 0.08, 0.04]} radius={0.03} position={[0.35, -0.3, 0.06]}>
        <Clay color={C.anorDeep} />
      </RoundedBox>
    </group>
  );
}

function Coins() {
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh key={i} castShadow position={[i * 0.04 - 0.04, i * 0.13, (i % 2) * 0.03]} rotation={[0.15, 0, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.12, 40]} />
          <Clay color={C.gold} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

const OBJECTS = {
  pomegranate: Pomegranate,
  melon: MelonSlice,
  grapes: Grapes,
  leaf: () => <Leaf />,
  leafDark: () => <Leaf color={C.leaf} />,
  bubble: ChatBubble,
  bag: Bag,
  card: PayCard,
  coins: Coins,
} as const;

type Piece = {
  kind: keyof typeof OBJECTS;
  /** x, y as fractions of the half-viewport (-1…1); z in world units */
  at: [number, number, number];
  scale: number;
  rot: [number, number, number];
};

const P = (kind: Piece["kind"], at: Piece["at"], scale: number, rot: Piece["rot"] = [0, 0, 0]): Piece => ({ kind, at, scale, rot });

// Deliberately mismatched scales: a giant pomegranate beside a pocket-sized bag.
const LAYOUTS: Record<ClayVariant, { wide: Piece[]; narrow: Piece[] }> = {
  hero: {
    // The chat cut-out covers x 0.2…0.8: pieces live in the gap beside it and on the edges.
    wide: [
      P("leaf", [0.16, 0.98, -2], 2.4, [0.2, 0.3, 0.5]),
      P("leafDark", [1.02, -0.2, -2.2], 3, [0.1, -0.4, -0.7]),
      P("leaf", [-1.05, -0.95, -1.6], 2, [0.3, 0.2, 2.4]),
      P("pomegranate", [0.95, -0.66, -0.6], 1.8, [0.15, 0.4, 0.12]),
      P("grapes", [0.97, 0.6, 0.4], 0.95, [0.1, -0.3, -0.25]),
      P("melon", [0.12, -0.84, 0.6], 0.95, [0.25, -0.35, 0.18]),
      P("bubble", [0.11, 0.6, 0.6], 0.62, [0.1, 0.3, 0.12]),
      P("card", [0.9, 0.06, 1.2], 0.7, [0.3, -0.6, 0.35]),
      P("bag", [0.1, -0.2, 0.8], 0.55, [0.1, 0.5, -0.12]),
      P("coins", [-0.06, -0.97, 0.4], 0.45, [0.3, 0, 0.1]),
    ],
    narrow: [
      P("leaf", [-0.85, 0.94, -2], 1.7, [0.2, 0.2, 0.9]),
      P("pomegranate", [0.62, 0.86, -0.8], 1.15, [0.1, 0.4, 0.1]),
      P("bubble", [0.82, -0.62, 0.4], 0.42, [0.1, 0.3, 0.1]),
      P("grapes", [-0.72, -0.9, 0.3], 0.62, [0, -0.2, -0.2]),
      P("melon", [0.72, -0.88, 0.5], 0.75, [0.25, -0.3, 0.15]),
    ],
  },
  auth: {
    wide: [
      P("leafDark", [0.85, 0.75, -2], 2.4, [0.2, -0.3, 0.6]),
      P("pomegranate", [0.55, -0.45, -0.6], 1.35, [0.1, 0.5, 0.15]),
      P("bubble", [-0.55, 0.75, 0.4], 0.62, [0.1, 0.4, -0.1]),
      P("card", [-0.7, -0.78, 0.8], 0.75, [0.4, 0.5, -0.3]),
      P("grapes", [0.92, -0.92, 0.6], 0.6, [0.1, -0.3, 0.2]),
    ],
    narrow: [P("pomegranate", [0.7, 0.6, -0.6], 1, [0.1, 0.5, 0.1]), P("bubble", [-0.6, 0.7, 0.3], 0.5, [0.1, 0.4, -0.1])],
  },
  cta: {
    // Camera framing is the band's own box, so pieces sit at its corners.
    wide: [
      P("leaf", [-0.95, 0.85, -2], 1.6, [0.2, 0.3, 2.1]),
      P("melon", [-0.78, -0.5, 0.3], 0.9, [0.3, 0.4, -0.2]),
      P("grapes", [0.82, 0.5, 0.2], 0.7, [0, -0.3, 0.25]),
      P("bag", [0.8, -0.55, 0.6], 0.7, [0.1, -0.5, 0.15]),
      P("coins", [-0.7, 0.55, 0.6], 0.4, [0.4, 0, -0.2]),
    ],
    narrow: [P("grapes", [0.8, 0.85, 0], 0.6, [0, -0.3, 0.25]), P("bag", [-0.8, -0.88, 0.4], 0.6, [0.1, 0.5, -0.1])],
  },
};

/** A clay cut-out: idles, tilts toward the pointer, lifts on hover, squashes on click. */
function Cutout({ piece, index, still }: { piece: Piece; index: number; still: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const squash = useRef(0);
  const { viewport, invalidate } = useThree();
  const base = useMemo(
    () => new THREE.Vector3((piece.at[0] * viewport.width) / 2, (piece.at[1] * viewport.height) / 2, piece.at[2]),
    [piece.at, viewport.width, viewport.height],
  );
  const Obj = OBJECTS[piece.kind];

  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const bob = still ? 0 : Math.sin(t * 0.9 + index * 1.7) * 0.07;
    const lifted = hover ? 0.32 : 0;
    g.position.x = THREE.MathUtils.damp(g.position.x, base.x, 6, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, base.y + bob + lifted, 6, dt);
    g.position.z = THREE.MathUtils.damp(g.position.z, base.z + (hover ? 0.5 : 0), 6, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, piece.rot[0] - pointer.y * 0.18, 4, dt);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, piece.rot[1] + pointer.x * 0.3 + (still ? 0 : Math.sin(t * 0.4 + index) * 0.06), 4, dt);
    g.rotation.z = piece.rot[2];
    squash.current = THREE.MathUtils.damp(squash.current, 0, 7, dt);
    const s = piece.scale * (hover ? 1.05 : 1);
    const q = squash.current;
    g.scale.set(s * (1 + q * 0.14), s * (1 - q * 0.2), s * (1 + q * 0.14));
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHover(true);
    document.body.style.cursor = "grab";
    invalidate();
  };
  const out = () => {
    setHover(false);
    document.body.style.cursor = "";
    invalidate();
  };
  const press = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    squash.current = 1;
    invalidate();
  };

  return (
    <group ref={ref} position={base} rotation={piece.rot} scale={piece.scale} onPointerOver={over} onPointerOut={out} onClick={press}>
      <Obj />
    </group>
  );
}

function Arrangement({ variant, still }: { variant: ClayVariant; still: boolean }) {
  const aspect = useThree((s) => s.viewport.aspect);
  const pieces = aspect < 0.95 ? LAYOUTS[variant].narrow : LAYOUTS[variant].wide;
  return (
    <>
      {pieces.map((p, i) => (
        <Cutout key={`${p.kind}-${i}`} piece={p} index={i} still={still} />
      ))}
    </>
  );
}

/** Invisible wall behind the cut-outs that only receives their paper shadows. */
function ShadowWall() {
  const { viewport } = useThree();
  return (
    <mesh position={[0, 0, -3]} receiveShadow>
      <planeGeometry args={[viewport.width * 2, viewport.height * 2]} />
      <shadowMaterial opacity={0.28} color="#0b2412" />
    </mesh>
  );
}

function PointerTracker() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      invalidate();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [invalidate]);
  return null;
}

export default function ClayScene({
  variant,
  active,
  still,
  onReady,
}: {
  variant: ClayVariant;
  active: boolean;
  still: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.6]}
      frameloop={!active ? "never" : still ? "demand" : "always"}
      camera={{ position: [0, 0, 12], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={() => onReady?.()}
    >
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#fff6e0", "#1f5a2e", 0.7]} />
      <directionalLight
        position={[-5, 7, 9]}
        intensity={2.1}
        color="#fff3dc"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0004}
      />
      <ShadowWall />
      <PointerTracker />
      <Arrangement variant={variant} still={still} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.4} color="#fff4dc" position={[-4, 5, 6]} scale={[8, 6, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#9ccc3c" position={[6, -3, 4]} scale={[6, 6, 1]} />
      </Environment>
    </Canvas>
  );
}
