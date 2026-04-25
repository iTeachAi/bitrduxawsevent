import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

export default function TicketCounter() {
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

  const ringRadius = 36;
  const circumference = 2 * Math.PI * ringRadius;
  const dashOffset = circumference - progress * circumference;

  const statusColor =
    pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#34d399";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, delay: 1.1 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: "24px 36px",
        borderRadius: 24,
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        position: "relative",
        zIndex: 2,
        maxWidth: 280,
        width: "100%",
        margin: "0 auto",
      }}
    >
      {/* Ring */}
      <div
        style={{
          position: "relative",
          width: ringRadius * 2 + 8,
          height: ringRadius * 2 + 8,
          flexShrink: 0,
        }}
      >
        <svg
          width={ringRadius * 2 + 8}
          height={ringRadius * 2 + 8}
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={ringRadius + 4}
            cy={ringRadius + 4}
            r={ringRadius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="4"
          />
          <motion.circle
            cx={ringRadius + 4}
            cy={ringRadius + 4}
            r={ringRadius}
            fill="none"
            stroke={statusColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              filter: `drop-shadow(0 0 6px ${statusColor}70)`,
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={remaining}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 28,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {remaining}
            </motion.span>
          </AnimatePresence>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              fontWeight: 500,
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            left
          </span>
        </div>
      </div>

      {/* Text block */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: statusColor,
              boxShadow: `0 0 10px ${statusColor}80`,
              animation: "glow-pulse 2.5s ease-in-out infinite",
            }}
          />
          <span
            className="mono"
            style={{
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
              fontWeight: 600,
            }}
          >
            Live Availability
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6 }}>
          <span
            className="mono"
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.04em",
            }}
          >
            {sold} / {capacity} claimed
          </span>
        </div>
        <div
          style={{
            marginTop: 8,
            height: 3,
            borderRadius: 100,
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
            width: "100%",
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              height: "100%",
              borderRadius: 100,
              background: `linear-gradient(90deg, ${statusColor}90, ${statusColor})`,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
