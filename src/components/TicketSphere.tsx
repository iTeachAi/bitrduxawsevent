import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, OrbitControls } from "@react-three/drei";
import { supabase } from "@/integrations/supabase/client";
import * as THREE from "three";

function FillSphere({ progress }: { progress: number }) {
  const inner = useRef<THREE.Mesh>(null);
  const outer = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (inner.current) {
      inner.current.rotation.y = t * 0.3;
      inner.current.rotation.x = Math.sin(t * 0.4) * 0.2;
    }
    if (outer.current) {
      outer.current.rotation.y = -t * 0.15;
    }
  });

  // progress 0..1 → scale of inner glowing core
  const coreScale = 0.4 + progress * 1.05;
  // hue shift: green when empty, amber when filling, red when nearly full
  const color = progress < 0.5
    ? new THREE.Color().lerpColors(new THREE.Color("#06b6d4"), new THREE.Color("#34d399"), progress * 2)
    : new THREE.Color().lerpColors(new THREE.Color("#f59e0b"), new THREE.Color("#ef4444"), (progress - 0.5) * 2);

  return (
    <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.6}>
      {/* Outer glass shell */}
      <mesh ref={outer}>
        <sphereGeometry args={[1.6, 64, 64]} />
        <meshPhysicalMaterial
          color="#6366f1"
          transmission={0.9}
          thickness={0.5}
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={0.25}
          envMapIntensity={1}
        />
      </mesh>
      {/* Wireframe overlay */}
      <mesh>
        <icosahedronGeometry args={[1.62, 1]} />
        <meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.25} />
      </mesh>
      {/* Inner glowing core grows with sales */}
      <mesh ref={inner} scale={coreScale}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>
    </Float>
  );
}

export default function TicketSphere() {
  const [capacity, setCapacity] = useState(50);
  const [sold, setSold] = useState(0);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("event_stats")
        .select("capacity, tickets_sold")
        .limit(1)
        .maybeSingle();
      if (mounted && data) {
        setCapacity(data.capacity);
        setSold(data.tickets_sold);
      }
    };
    load();

    const channel = supabase
      .channel("event_stats_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_stats" },
        (payload) => {
          const row = payload.new as { capacity: number; tickets_sold: number };
          if (row) {
            setCapacity(row.capacity);
            setSold(row.tickets_sold);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const remaining = Math.max(capacity - sold, 0);
  const progress = capacity > 0 ? Math.min(sold / capacity, 1) : 0;
  const pct = Math.round(progress * 100);

  return (
    <div style={{ width: "100%", maxWidth: 520, margin: "0 auto 40px", position: "relative" }}>
      <div style={{ height: 360, position: "relative" }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={1.2} color="#6366f1" />
          <pointLight position={[-5, -5, 3]} intensity={0.8} color="#06b6d4" />
          <FillSphere progress={progress} />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.6} />
        </Canvas>

        {/* Center number overlay */}
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div className="serif" style={{
            fontSize: 72, fontWeight: 400, fontStyle: "italic",
            lineHeight: 1, color: "#fff",
            textShadow: "0 0 30px rgba(99,102,241,0.6)",
          }}>{remaining}</div>
          <div className="mono" style={{
            fontSize: 12, letterSpacing: "0.18em",
            color: "rgba(255,255,255,0.55)", marginTop: 6,
            textTransform: "uppercase",
          }}>seats left</div>
        </div>
      </div>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <div className="mono" style={{
          fontSize: 12, letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.4)", textTransform: "uppercase",
        }}>
          {sold} / {capacity} reserved · {pct}% full
        </div>
        <div style={{
          marginTop: 10, height: 4, width: "100%",
          background: "rgba(255,255,255,0.06)", borderRadius: 100, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: "linear-gradient(90deg, #06b6d4, #6366f1, #f59e0b)",
            transition: "width 0.8s ease",
            boxShadow: "0 0 20px rgba(99,102,241,0.6)",
          }} />
        </div>
      </div>
    </div>
  );
}
