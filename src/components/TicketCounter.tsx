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

  const circumference = 2 * Math.PI * 18;
  const dashOffset = circumference - progress * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 1.1 }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 20px",
        borderRadius: 100,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(20px)",
        position: "relative",
        zIndex: 2,
      }}
    >
      {/* Mini ring */}
      <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
        <svg width="40" height="40" style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="3"
          />
          <motion.circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke={pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#34d399"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 4px ${pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#34d399"}60)` }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            fontWeight: 500,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={pct}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {pct}%
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Text */}
      <div style={{ textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: remaining > 10 ? "#34d399" : remaining > 5 ? "#f59e0b" : "#ef4444",
              boxShadow: `0 0 8px ${remaining > 10 ? "#34d399" : remaining > 5 ? "#f59e0b" : "#ef4444"}`,
              animation: "glow-pulse 2s ease-in-out infinite",
            }}
          />
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
              fontWeight: 500,
            }}
          >
            Live Availability
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <AnimatePresence mode="wait">
            <motion.span
              key={remaining}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.25 }}
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "-0.02em",
              }}
            >
              {remaining}
            </motion.span>
          </AnimatePresence>
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.05em",
            }}
          >
            of {capacity} seats left
          </span>
        </div>
      </div>
    </motion.div>
  );
}
