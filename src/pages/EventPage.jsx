import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from "framer-motion";

/* ══════════════════════════════════════════
   3D FLOATING GEOMETRY — Canvas Background
   ══════════════════════════════════════════ */
function FloatingGeometry() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: 0.5, y: 0.5 });
  const scrollY = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth * 1.5;
      canvas.height = window.innerHeight * 1.5;
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouse = (e) => {
      mouse.current.x = e.clientX / window.innerWidth;
      mouse.current.y = e.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", onMouse);

    const onScroll = () => { scrollY.current = window.scrollY; };
    window.addEventListener("scroll", onScroll);

    const shapes = [];
    for (let i = 0; i < 14; i++) {
      shapes.push({
        x: Math.random(), y: Math.random(),
        z: Math.random() * 0.6 + 0.4,
        size: Math.random() * 60 + 20,
        rotSpeed: (Math.random() - 0.5) * 0.008,
        rot: Math.random() * Math.PI * 2,
        type: Math.floor(Math.random() * 4),
        drift: { x: (Math.random() - 0.5) * 0.0003, y: (Math.random() - 0.5) * 0.0002 },
        hue: Math.random() * 40 + 200,
        alpha: Math.random() * 0.12 + 0.04,
      });
    }

    const particles = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 1.2 + 0.3,
        baseAlpha: Math.random() * 0.3 + 0.05,
        speed: Math.random() * 0.0004 + 0.0001,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const drawShape = (ctx, cx, cy, size, type, rot) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.beginPath();
      if (type === 0) {
        ctx.moveTo(0, -size); ctx.lineTo(size * 0.7, 0);
        ctx.lineTo(0, size); ctx.lineTo(-size * 0.7, 0); ctx.closePath();
      } else if (type === 1) {
        ctx.moveTo(0, -size); ctx.lineTo(size * 0.87, size * 0.5);
        ctx.lineTo(-size * 0.87, size * 0.5); ctx.closePath();
      } else if (type === 2) {
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * size, Math.sin(a) * size);
        }
        ctx.closePath();
      } else {
        ctx.arc(0, 0, size, 0, Math.PI * 2);
      }
      ctx.restore();
    };

    const draw = () => {
      t += 0.008;
      const w = canvas.width, h = canvas.height;
      const scrollFactor = scrollY.current / (document.body.scrollHeight - window.innerHeight || 1);
      ctx.fillStyle = "rgba(4, 4, 14, 0.15)";
      ctx.fillRect(0, 0, w, h);
      const mx = mouse.current.x, my = mouse.current.y;

      particles.forEach((p) => {
        const px = ((p.x + Math.sin(t + p.phase) * 0.01) % 1) * w;
        const py = ((p.y + p.speed * t * 60 + scrollFactor * 0.3) % 1) * h;
        const pulse = Math.sin(t * 2 + p.phase) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(px, py, p.r * (1 + pulse * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(140, 160, 255, ${p.baseAlpha * (0.5 + pulse * 0.5)})`;
        ctx.fill();
      });

      shapes.forEach((s) => {
        s.x += s.drift.x + (mx - 0.5) * 0.0002 * s.z;
        s.y += s.drift.y + (my - 0.5) * 0.0001 * s.z;
        s.rot += s.rotSpeed;
        if (s.x < -0.1) s.x = 1.1; if (s.x > 1.1) s.x = -0.1;
        if (s.y < -0.1) s.y = 1.1; if (s.y > 1.1) s.y = -0.1;
        const cx = s.x * w;
        const cy = ((s.y + scrollFactor * 0.15 * s.z) % 1.2) * h;
        const pulse = Math.sin(t + s.rot) * 0.3 + 0.7;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s.size * 2.5 * s.z);
        grad.addColorStop(0, `hsla(${s.hue}, 70%, 65%, ${s.alpha * pulse * 0.6})`);
        grad.addColorStop(1, `hsla(${s.hue}, 70%, 65%, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(cx - s.size * 3, cy - s.size * 3, s.size * 6, s.size * 6);
        drawShape(ctx, cx, cy, s.size * s.z, s.type, s.rot);
        ctx.strokeStyle = `hsla(${s.hue}, 60%, 70%, ${s.alpha * pulse * 1.8})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      for (let i = 0; i < shapes.length; i++) {
        for (let j = i + 1; j < shapes.length; j++) {
          const dx = (shapes[i].x - shapes[j].x) * w;
          const dy = (shapes[i].y - shapes[j].y) * h;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 300) {
            const alpha = (1 - dist / 300) * 0.06;
            ctx.beginPath();
            ctx.moveTo(shapes[i].x * w, ((shapes[i].y + scrollFactor * 0.15 * shapes[i].z) % 1.2) * h);
            ctx.lineTo(shapes[j].x * w, ((shapes[j].y + scrollFactor * 0.15 * shapes[j].z) % 1.2) * h);
            ctx.strokeStyle = `rgba(120, 140, 255, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    ctx.fillStyle = "#04040e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: "fixed", top: 0, left: 0,
      width: "100vw", height: "100vh",
      zIndex: 0, pointerEvents: "none",
    }} />
  );
}

/* ══════════════════════════════════════════
   MAGNETIC HOVER
   ══════════════════════════════════════════ */
function MagneticWrap({ children, strength = 0.3 }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 15 });
  const springY = useSpring(y, { stiffness: 200, damping: 15 });

  const handleMouse = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  };

  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      style={{ x: springX, y: springY, display: "inline-block" }}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   TEXT REVEAL
   ══════════════════════════════════════════ */
function TextReveal({ text, className = "", style = {}, delay = 0, tag = "span" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const Tag = tag;

  const words = text.split(" ");
  return (
    <Tag ref={ref} className={className} style={{ ...style, display: "inline" }}>
      {words.map((word, wi) => (
        <span key={wi} style={{ display: "inline-block", whiteSpace: "pre" }}>
          {word.split("").map((char, ci) => {
            const index = words.slice(0, wi).join(" ").length + ci + wi;
            return (
              <motion.span
                key={`${wi}-${ci}`}
                initial={{ opacity: 0, y: 40, rotateX: -60 }}
                animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
                transition={{
                  duration: 0.6,
                  delay: delay + index * 0.025,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{ display: "inline-block", transformOrigin: "bottom" }}
              >
                {char}
              </motion.span>
            );
          })}
          {wi < words.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </Tag>
  );
}

/* ══════════════════════════════════════════
   WATERMARK
   ══════════════════════════════════════════ */
function Watermark({ text, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "absolute",
        fontFamily: "'Instrument Serif', serif",
        fontStyle: "italic",
        fontSize: "clamp(80px, 18vw, 220px)",
        fontWeight: 400,
        color: "rgba(255,255,255,0.018)",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        userSelect: "none",
        lineHeight: 1,
        letterSpacing: "-0.04em",
        ...style,
      }}
    >
      {text}
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   REVEAL
   ══════════════════════════════════════════ */
function Reveal({ children, className = "", delay = 0, y = 50 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   GLASS PANEL
   ══════════════════════════════════════════ */
function Glass({ children, style = {}, hover = true, className = "" }) {
  return (
    <motion.div
      whileHover={hover ? { y: -8, scale: 1.02, boxShadow: "0 30px 80px -20px rgba(99,102,241,0.15)" } : {}}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      className={className}
      style={{
        background: "rgba(255,255,255,0.025)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 28,
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   TILT CARD
   ══════════════════════════════════════════ */
function TiltCard({ children, style = {}, className = "" }) {
  const ref = useRef(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 200, damping: 20 });
  const springRotateY = useSpring(rotateY, { stiffness: 200, damping: 20 });

  const handleMouse = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rotateX.set(y * -10);
    rotateY.set(x * 10);
  };

  const reset = () => { rotateX.set(0); rotateY.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      className={className}
      style={{
        ...style,
        rotateX: springRotateX,
        rotateY: springRotateY,
        transformPerspective: 800,
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   SCROLL UTILS
   ══════════════════════════════════════════ */
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return (
    <motion.div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, #6366f1, #06b6d4, #34d399)",
        transformOrigin: "0%", scaleX, zIndex: 200,
      }}
    />
  );
}

/* ══════════════════════════════════════════
   STAT COUNTER
   ══════════════════════════════════════════ */
function StatNumber({ value, suffix = "", label }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const end = parseInt(value);
    const dur = 1500;
    const step = (end / dur) * 16;
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <div ref={ref} style={{ textAlign: "center" }}>
      <div style={{
        fontFamily: "'Instrument Serif', serif", fontSize: "clamp(48px, 7vw, 72px)",
        fontWeight: 400, fontStyle: "italic",
        background: "linear-gradient(135deg, #c7d2fe, #6366f1)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundClip: "text", lineHeight: 1,
      }}>
        {count}{suffix}
      </div>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", marginTop: 10,
        fontFamily: "'Syne', sans-serif", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════
   NAV BAR
   ══════════════════════════════════════════ */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const navLinks = [
    { label: "Schedule", id: "schedule" },
    { label: "About", id: "about" },
    { label: "Venue & Contact", id: "venue" },
    { label: "Register", id: "register" },
  ];

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "16px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: scrolled ? "rgba(4,4,14,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(40px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.04)" : "none",
        transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <MagneticWrap strength={0.15}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "linear-gradient(135deg, #6366f1, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 11, color: "#fff",
            letterSpacing: "-0.02em",
          }}>BIT</div>
          <span style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
            color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em",
          }}>Blacks in Technology RDU</span>
        </div>
      </MagneticWrap>

      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "6px 8px", borderRadius: 100,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
      }}>
        {navLinks.map((link) => (
          <MagneticWrap key={link.id} strength={0.12}>
            <motion.button
              onClick={() => scrollToSection(link.id)}
              whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: "8px 20px", borderRadius: 100, border: "none",
                background: "transparent", color: "rgba(255,255,255,0.6)",
                fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 500,
                cursor: "pointer", letterSpacing: "0.01em",
                transition: "color 0.3s ease",
              }}
              onMouseEnter={(e) => e.target.style.color = "#fff"}
              onMouseLeave={(e) => e.target.style.color = "rgba(255,255,255,0.6)"}
            >{link.label}</motion.button>
          </MagneticWrap>
        ))}
      </div>

      <MagneticWrap strength={0.2}>
        <motion.a
          href="https://www.eventbrite.com/e/build-your-own-agent-workshop-with-aws-tickets-1986867145116?aff=oddtdtcreator"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.06, boxShadow: "0 0 30px rgba(99,102,241,0.3)" }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: "10px 28px", borderRadius: 100,
            background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.1))",
            border: "1px solid rgba(99,102,241,0.25)",
            color: "#fff", fontSize: 13,
            fontFamily: "'Syne', sans-serif", fontWeight: 600, cursor: "pointer",
            backdropFilter: "blur(12px)", letterSpacing: "0.01em",
            textDecoration: "none", display: "inline-block",
          }}
        >Reserve Your Spot</motion.a>
      </MagneticWrap>
    </motion.nav>
  );
}

/* ══════════════════════════════════════════
   TIMELINE ITEM — Event schedule component
   ══════════════════════════════════════════ */
function TimelineItem({ time, title, desc, accent, index, isLast }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -40 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: "flex", gap: 32, position: "relative" }}
    >
      {/* Timeline spine */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 24 }}>
        <motion.div
          animate={inView ? {
            boxShadow: [`0 0 0px ${accent}`, `0 0 20px ${accent}80`, `0 0 0px ${accent}`],
          } : {}}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: 14, height: 14, borderRadius: "50%",
            background: accent,
            border: `2px solid ${accent}`,
            flexShrink: 0, position: "relative", zIndex: 2,
          }}
        />
        {!isLast && (
          <motion.div
            initial={{ scaleY: 0 }}
            animate={inView ? { scaleY: 1 } : {}}
            transition={{ duration: 0.8, delay: index * 0.12 + 0.3 }}
            style={{
              width: 1, flex: 1,
              background: `linear-gradient(to bottom, ${accent}40, transparent)`,
              transformOrigin: "top",
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ paddingBottom: isLast ? 0 : 56, flex: 1 }}>
        <span className="mono" style={{
          fontSize: 14, color: accent, letterSpacing: "0.06em",
          fontWeight: 500, display: "block", marginBottom: 8,
        }}>{time}</span>
        <h3 style={{
          fontSize: 22, fontWeight: 700, marginBottom: 8,
          letterSpacing: "-0.02em", color: "rgba(255,255,255,0.95)",
          fontFamily: "'Syne', sans-serif",
        }}>{title}</h3>
        <p style={{
          fontSize: 17, color: "rgba(255,255,255,0.5)", lineHeight: 1.7,
          maxWidth: 440,
        }}>{desc}</p>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════
   EVENT INFO PILL — Compact info display
   ══════════════════════════════════════════ */
function InfoPill({ icon, label, value }) {
  return (
    <MagneticWrap strength={0.1}>
      <motion.div
        whileHover={{ y: -4, borderColor: "rgba(99,102,241,0.25)" }}
        className="glass-border"
        style={{
          display: "flex", alignItems: "center", gap: 16,
          padding: "20px 28px", borderRadius: 20,
          background: "rgba(255,255,255,0.025)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.06)",
          transition: "border-color 0.4s ease",
        }}
      >
        <div style={{
          fontSize: 24, width: 44, height: 44,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 14,
          background: "rgba(99,102,241,0.08)",
        }}>{icon}</div>
        <div>
          <p className="mono" style={{
            fontSize: 12, color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4,
          }}>{label}</p>
          <p style={{
            fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.9)",
            fontFamily: "'Syne', sans-serif",
          }}>{value}</p>
        </div>
      </motion.div>
    </MagneticWrap>
  );
}


/* ══════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════ */
export default function EventPage() {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.92]);
  const heroY = useTransform(scrollYProgress, [0, 0.15], [0, 80]);

  const schedule = [
    { time: "5:30 PM", title: "Doors Open & Check-in", desc: "Grab your badge, meet fellow attendees, and get set up with your AWS environment.", accent: "#818cf8" },
    { time: "6:00 PM", title: "Welcome & Keynote", desc: "Opening remarks from Blacks in Technology RDU. Why AI agents matter now.", accent: "#06b6d4" },
    { time: "6:20 PM", title: "Live Demo: AI Agent from Scratch", desc: "Watch an AI agent get built live using AWS Bedrock — from prompt to deployment.", accent: "#34d399" },
    { time: "6:45 PM", title: "Hands-On Workshop Begins", desc: "Your turn. Build your own AI agent step-by-step with guided instruction and AWS credits.", accent: "#f472b6" },
    { time: "8:00 PM", title: "Close", desc: "Thank you for joining us! Continue building and stay connected with the community.", accent: "#818cf8" },
  ];

  const audiences = [
    { icon: "◈", label: "College Students", sub: "Any major, any year" },
    { icon: "◇", label: "Beginner Coders", sub: "Just getting started" },
    { icon: "△", label: "Intermediate Devs", sub: "Ready to level up" },
    { icon: "○", label: "AI Curious", sub: "Anyone exploring AI" },
  ];

  return (
    <div style={{
      fontFamily: "'Syne', sans-serif",
      background: "#04040e",
      color: "rgba(255,255,255,0.92)",
      minHeight: "100vh",
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; background: #04040e; }
        ::selection { background: rgba(99,102,241,0.4); color: #fff; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(140px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(140px) rotate(-360deg); }
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes grain {
          0%, 100% { transform: translate(0,0); }
          10% { transform: translate(-5%,-10%); }
          30% { transform: translate(3%,-15%); }
          50% { transform: translate(12%,9%); }
          70% { transform: translate(9%,4%); }
          90% { transform: translate(-1%,7%); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes countdown-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }

        .grain-overlay::after {
          content: '';
          position: fixed;
          top: -50%; left: -50%;
          width: 200%; height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          animation: grain 6s steps(8) infinite;
          pointer-events: none;
          z-index: 1000;
          opacity: 0.5;
        }

        .serif { font-family: 'Instrument Serif', serif; }
        .mono { font-family: 'DM Mono', monospace; }

        .glass-border { position: relative; }
        .glass-border::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02), rgba(99,102,241,0.12));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .shimmer-line {
          background: linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        .cta-btn {
          position: relative;
          overflow: hidden;
        }
        .cta-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          background-size: 200% 100%;
          animation: shimmer 2.5s ease-in-out infinite;
          border-radius: inherit;
        }
        .cta-btn::after {
          content: '';
          position: absolute;
          top: 50%; left: 50%;
          width: 0; height: 0;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }
        .cta-btn:hover::after {
          width: 300px; height: 300px;
        }

        .section-divider {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,102,241,0.15), rgba(6,182,212,0.1), transparent);
          margin: 0 auto;
          max-width: 800px;
        }
      `}</style>

      <div className="grain-overlay" />
      <FloatingGeometry />
      <ScrollProgress />
      <Nav />

      {/* ═══════════════════════════════════
          HERO — Event-style with date & location prominent
         ═══════════════════════════════════ */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        id="hero"
      >
        <div style={{
          position: "relative", minHeight: "100vh",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "140px 32px 80px",
          textAlign: "center", zIndex: 2,
        }}>
          <Watermark text="Event" style={{ top: "15%", left: "-5%" }} />
          <Watermark text="2026" style={{ bottom: "20%", right: "-3%" }} />

          {/* Orbiting rings */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 320, height: 320,
            marginTop: -160, marginLeft: -160,
            borderRadius: "50%",
            border: "1px solid rgba(99,102,241,0.06)",
            animation: "orbit 30s linear infinite",
            pointerEvents: "none", zIndex: 0,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "#6366f1",
              boxShadow: "0 0 20px #6366f1, 0 0 40px rgba(99,102,241,0.3)",
              position: "absolute", top: -4, left: "50%", marginLeft: -4,
            }} />
          </div>
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 500, height: 500,
            marginTop: -250, marginLeft: -250,
            borderRadius: "50%",
            border: "1px solid rgba(6,182,212,0.04)",
            animation: "orbit 50s linear infinite reverse",
            pointerEvents: "none", zIndex: 0,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#06b6d4",
              boxShadow: "0 0 15px #06b6d4",
              position: "absolute", top: -3, left: "50%", marginLeft: -3,
            }} />
          </div>

          {/* Event type pill */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 12,
              padding: "10px 26px", borderRadius: 100,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              marginBottom: 40, position: "relative", zIndex: 2,
            }}
          >
            <div style={{
              width: 7, height: 7, borderRadius: "50%", background: "#34d399",
              boxShadow: "0 0 12px #34d399",
              animation: "glow-pulse 2s ease-in-out infinite",
            }} />
            <span className="mono" style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", letterSpacing: "0.05em" }}>
              FREE HANDS-ON WORKSHOP
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            style={{ position: "relative", zIndex: 2, marginBottom: 28 }}
          >
            <h1 className="serif" style={{
              fontSize: "clamp(48px, 10vw, 120px)",
              fontWeight: 400,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              color: "#fff",
            }}>
              <TextReveal text="Build" delay={0.5} style={{ color: "#fff" }} />
              {" "}
              <motion.em
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontStyle: "italic",
                  background: "linear-gradient(135deg, #818cf8, #06b6d4)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >AI Agents</motion.em>
              <br />
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.1 }}
                style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.5em" }}
              >with</motion.span>
              {" "}
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 1.3, type: "spring", stiffness: 200 }}
                style={{
                  background: "linear-gradient(90deg, #f59e0b, #f97316)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >AWS</motion.span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.2, delay: 1.0 }}
            style={{
              fontSize: "clamp(18px, 2.2vw, 22px)",
              color: "rgba(255,255,255,0.55)",
              maxWidth: 520, lineHeight: 1.7,
              marginBottom: 44, position: "relative", zIndex: 2,
              fontWeight: 400,
            }}
          >
            A hands-on workshop by Blacks In Technology RDU for students and aspiring developers.
            Build real AI agents using industry-grade tools — and launch your own landing page by the end of the session.
          </motion.p>

          {/* Event quick info row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            style={{
              display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center",
              marginBottom: 48, position: "relative", zIndex: 2,
            }}
          >
            {[
              { icon: "📅", text: "May 4, 2026" },
              { icon: "⏰", text: "6:00 – 8:00 PM" },
              { icon: "📍", text: "Raleigh-Durham, NC" },
              { icon: "🎟️", text: "Free Admission" },
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -2 }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  fontSize: 16, color: "rgba(255,255,255,0.6)",
                  fontWeight: 500,
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", position: "relative", zIndex: 2 }}
          >
            <MagneticWrap strength={0.15}>
              <motion.a
                href="https://www.eventbrite.com/e/build-your-own-agent-workshop-with-aws-tickets-1986867145116?aff=oddtdtcreator"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="cta-btn"
                style={{
                  padding: "20px 52px", borderRadius: 100, border: "none",
                  background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                  color: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Syne', sans-serif", letterSpacing: "-0.01em",
                  boxShadow: "0 0 40px rgba(99,102,241,0.3), 0 0 80px rgba(6,182,212,0.12)",
                  textDecoration: "none", display: "inline-block", position: "relative",
                }}
              >
                Reserve Your Spot →
              </motion.a>
            </MagneticWrap>
            <MagneticWrap strength={0.15}>
              <motion.button
                onClick={() => scrollToSection("schedule")}
                whileHover={{ scale: 1.04, borderColor: "rgba(255,255,255,0.2)" }}
                whileTap={{ scale: 0.96 }}
                style={{
                  padding: "20px 44px", borderRadius: 100,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.7)",
                  fontSize: 18, fontWeight: 500, cursor: "pointer",
                  fontFamily: "'Syne', sans-serif", backdropFilter: "blur(12px)",
                }}
              >
                View Schedule ↓
              </motion.button>
            </MagneticWrap>
          </motion.div>

          {/* Sponsors line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.7 }}
            className="mono"
            style={{
              marginTop: 56, fontSize: 13,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.12em", textTransform: "uppercase",
              position: "relative", zIndex: 2,
            }}
          >
            Powered by AWS & Northwestern Mutual
          </motion.p>

          {/* Scroll indicator */}
          <motion.div
            animate={{ y: [0, 14, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", bottom: 32, zIndex: 2 }}
          >
            <div style={{
              width: 1, height: 56,
              background: "linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)",
            }} />
          </motion.div>
        </div>
      </motion.section>


      {/* ═══════════════════════════════════
          EVENT SCHEDULE — Timeline layout
         ═══════════════════════════════════ */}
      <section id="schedule" style={{ position: "relative", padding: "140px 32px", zIndex: 2 }}>
        <Watermark text="Schedule" style={{ top: "5%", right: "-8%" }} />
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div className="shimmer-line" style={{ width: 40, height: 2 }} />
              <span className="mono" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Event Schedule
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="serif" style={{
              fontSize: "clamp(38px, 5.5vw, 64px)",
              fontWeight: 400, lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: 64,
            }}>
              How the <em style={{ fontStyle: "italic", color: "#818cf8" }}>evening</em> unfolds
            </h2>
          </Reveal>

          {/* Timeline */}
          <div style={{ paddingLeft: 8 }}>
            {schedule.map((item, i) => (
              <TimelineItem
                key={i}
                index={i}
                time={item.time}
                title={item.title}
                desc={item.desc}
                accent={item.accent}
                isLast={i === schedule.length - 1}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════════════════════
          WHAT YOU'LL BUILD
         ═══════════════════════════════════ */}
      <section style={{ position: "relative", padding: "140px 32px", zIndex: 2 }}>
        <Watermark text="Build" style={{ top: "5%", left: "-5%" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div className="shimmer-line" style={{ width: 40, height: 2 }} />
              <span className="mono" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                What You'll Build
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="serif" style={{
              fontSize: "clamp(36px, 5.5vw, 64px)",
              fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.03em",
              marginBottom: 20, maxWidth: 600,
            }}>
              Walk away with something <em style={{ fontStyle: "italic", color: "#06b6d4" }}>real</em>.
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.55)", maxWidth: 560, lineHeight: 1.8, marginBottom: 64 }}>
              By the end of this workshop, you'll have created and deployed a personalized landing page powered by an AI agent you built yourself.
            </p>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
            {[
              { icon: "🤖", title: "Build an AI Agent", desc: "Create a working AI-powered agent using AWS tools and services." },
              { icon: "✍️", title: "Generate Content", desc: "Use your agent to produce copy, structure ideas, and draft content." },
              { icon: "🚀", title: "Launch a Landing Page", desc: "Deploy a personal landing page live on the web before you leave." },
              { icon: "💼", title: "Portfolio-Ready Project", desc: "Walk away with something tangible to showcase your skills." },
            ].map((item, i) => (
              <Reveal key={i} delay={0.1 * i}>
                <TiltCard
                  className="glass-border"
                  style={{
                    padding: "36px 30px", borderRadius: 28,
                    background: "rgba(255,255,255,0.02)",
                    backdropFilter: "blur(16px)",
                    textAlign: "center", cursor: "default",
                    minHeight: 220,
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 20 }}>{item.icon}</div>
                  <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.01em" }}>{item.title}</h3>
                  <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{item.desc}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════════════════════
          HOW IT WORKS — 3-step flow
         ═══════════════════════════════════ */}
      <section style={{ position: "relative", padding: "140px 32px", zIndex: 2 }}>
        <Watermark text="Steps" style={{ top: "10%", right: "-6%" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div className="shimmer-line" style={{ width: 40, height: 2 }} />
              <span className="mono" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                How It Works
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="serif" style={{
              fontSize: "clamp(36px, 5.5vw, 64px)",
              fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.03em",
              marginBottom: 64, maxWidth: 550,
            }}>
              Three steps to <em style={{ fontStyle: "italic", color: "#f59e0b" }}>launch</em>.
            </h2>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, position: "relative" }}>
            {/* Connecting line */}
            <div style={{
              position: "absolute", top: 52, left: "16.67%", right: "16.67%",
              height: 2, background: "linear-gradient(90deg, rgba(99,102,241,0.3), rgba(6,182,212,0.3), rgba(52,211,153,0.3))",
              zIndex: 0,
            }} />
            {[
              { step: "01", title: "Log In", desc: "No complex setup. Sign in and you're ready to go.", color: "#6366f1" },
              { step: "02", title: "Build Your Agent", desc: "Follow guided instruction to create your AI agent with AWS.", color: "#06b6d4" },
              { step: "03", title: "Launch Your Page", desc: "Deploy your AI-generated landing page before the session ends.", color: "#34d399" },
            ].map((item, i) => (
              <Reveal key={i} delay={0.15 * i}>
                <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    style={{
                      width: 80, height: 80, borderRadius: "50%",
                      background: `rgba(${item.color === "#6366f1" ? "99,102,241" : item.color === "#06b6d4" ? "6,182,212" : "52,211,153"},0.1)`,
                      border: `2px solid ${item.color}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 28px",
                      boxShadow: `0 0 30px ${item.color}20`,
                    }}
                  >
                    <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.step}</span>
                  </motion.div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, letterSpacing: "-0.02em" }}>{item.title}</h3>
                  <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 260, margin: "0 auto" }}>{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════════════════════
          WHAT TO BRING
         ═══════════════════════════════════ */}
      <section style={{ position: "relative", padding: "140px 32px", zIndex: 2 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div className="shimmer-line" style={{ width: 40, height: 2 }} />
              <span className="mono" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                What to Bring
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="serif" style={{
              fontSize: "clamp(36px, 5.5vw, 64px)",
              fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.03em",
              marginBottom: 64, maxWidth: 500,
            }}>
              Come <em style={{ fontStyle: "italic", color: "#818cf8" }}>prepared</em>.
            </h2>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              { icon: "💻", title: "Laptop", desc: "Required for participation. Any OS works.", required: true },
              { icon: "📸", title: "Headshot Photo", desc: "For your landing page. A placeholder can be used if you don't have one.", required: false },
              { icon: "🔋", title: "Charger", desc: "Recommended — the session is 2 hours of hands-on building.", required: false },
            ].map((item, i) => (
              <Reveal key={i} delay={0.12 * i}>
                <Glass hover={true} className="glass-border" style={{
                  padding: "40px 32px", textAlign: "center",
                  position: "relative", overflow: "hidden",
                }}>
                  {item.required && (
                    <span className="mono" style={{
                      position: "absolute", top: 16, right: 16,
                      fontSize: 11, color: "#f59e0b", letterSpacing: "0.1em",
                      padding: "4px 12px", borderRadius: 100,
                      background: "rgba(245,158,11,0.1)",
                      border: "1px solid rgba(245,158,11,0.2)",
                    }}>REQUIRED</span>
                  )}
                  <div style={{ fontSize: 48, marginBottom: 20 }}>{item.icon}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{item.title}</h3>
                  <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{item.desc}</p>
                </Glass>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════════════════════
          AWS INTEGRATION — Partnership highlight
         ═══════════════════════════════════ */}
      <section style={{ position: "relative", padding: "140px 32px", zIndex: 2 }}>
        <Watermark text="AWS" style={{ top: "10%", right: "-6%" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div className="shimmer-line" style={{ width: 40, height: 2 }} />
              <span className="mono" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Powered by AWS
              </span>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
            <div>
              <Reveal delay={0.1}>
                <h2 className="serif" style={{
                  fontSize: "clamp(36px, 5.5vw, 58px)",
                  fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.03em",
                  marginBottom: 28,
                }}>
                  Built with{" "}
                  <em style={{
                    fontStyle: "italic",
                    background: "linear-gradient(90deg, #f59e0b, #f97316)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}>Amazon Web Services</em>
                </h2>
              </Reveal>
              <Reveal delay={0.2}>
                <p style={{
                  fontSize: 18, color: "rgba(255,255,255,0.55)",
                  lineHeight: 1.8, marginBottom: 36,
                }}>
                  This workshop is built in partnership with AWS. You'll get hands-on access to real cloud tools, guided instruction from experts, and the resources to keep building long after the session ends.
                </p>
              </Reveal>
              <Reveal delay={0.3}>
                <MagneticWrap strength={0.15}>
                  <motion.a
                    href="https://www.eventbrite.com/e/build-your-own-agent-workshop-with-aws-tickets-1986867145116?aff=oddtdtcreator"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 10,
                      padding: "16px 36px", borderRadius: 100,
                      background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.1))",
                      border: "1px solid rgba(245,158,11,0.3)",
                      color: "#fff", fontSize: 16,
                      fontFamily: "'Syne', sans-serif", fontWeight: 600,
                      textDecoration: "none", cursor: "pointer",
                    }}
                  >
                    Reserve Your Spot →
                  </motion.a>
                </MagneticWrap>
              </Reveal>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[
                { title: "Hands-On Guided Instruction", desc: "Step-by-step walkthrough from setup to deployment — no one gets left behind.", icon: "🎯" },
                { title: "Real AWS Tools & Resources", desc: "Work directly with AWS Bedrock, Lambda, and cloud infrastructure.", icon: "☁️" },
                { title: "Keep Building After", desc: "Take your project home with resources and credits to continue learning.", icon: "🔄" },
              ].map((item, i) => (
                <Reveal key={i} delay={0.15 * i + 0.1}>
                  <TiltCard
                    className="glass-border"
                    style={{
                      padding: "28px 24px", borderRadius: 24,
                      background: "rgba(255,255,255,0.02)",
                      backdropFilter: "blur(20px)",
                      cursor: "default",
                      display: "flex", gap: 18, alignItems: "flex-start",
                    }}
                  >
                    <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>{item.title}</h3>
                      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{item.desc}</p>
                    </div>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />
      <section id="about" style={{ position: "relative", padding: "140px 32px", zIndex: 2 }}>
        <Watermark text="Workshop" style={{ top: "5%", right: "-8%" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div className="shimmer-line" style={{ width: 40, height: 2 }} />
              <span className="mono" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                About the Event
              </span>
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
            <div>
              <Reveal delay={0.1}>
                <h2 className="serif" style={{
                  fontSize: "clamp(36px, 5.5vw, 58px)",
                  fontWeight: 400, lineHeight: 1.1,
                  letterSpacing: "-0.03em",
                  marginBottom: 28,
                }}>
                  Not a lecture.<br />
                  A <em style={{ fontStyle: "italic", color: "#818cf8" }}>launchpad</em>.
                </h2>
              </Reveal>

              <Reveal delay={0.2}>
                <p style={{
                  fontSize: 18, color: "rgba(255,255,255,0.55)",
                  lineHeight: 1.8, marginBottom: 36,
                }}>
                  Build functional AI agents from scratch using AWS tools — with real cloud
                  credits and expert guidance every step of the way. Leave with a working project
                  and the skills to keep building.
                </p>
              </Reveal>

              <Reveal delay={0.3}>
                <div style={{ display: "flex", gap: 36 }}>
                  <StatNumber value="2" suffix="hr" label="Workshop" />
                  <StatNumber value="100" suffix="%" label="Hands-On" />
                  <StatNumber value="0" suffix="$" label="Cost" />
                </div>
              </Reveal>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[
                { title: "Hands-On Workshop", desc: "Write real code. Build real agents. No passive learning.", icon: "⬡" },
                { title: "Real-World Applications", desc: "Learn patterns powering AI systems at scale.", icon: "◈" },
                { title: "Guided Experience", desc: "Step-by-step, from environment setup to deployment.", icon: "△" },
              ].map((item, i) => (
                <Reveal key={i} delay={0.15 * i + 0.1}>
                  <TiltCard
                    className="glass-border"
                    style={{
                      padding: "32px 28px",
                      borderRadius: 24,
                      background: "rgba(255,255,255,0.02)",
                      backdropFilter: "blur(20px)",
                      cursor: "default",
                      display: "flex", gap: 20, alignItems: "flex-start",
                    }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      style={{
                        fontSize: 28, color: "#818cf8",
                        fontFamily: "'Instrument Serif', serif", fontStyle: "italic",
                        flexShrink: 0, marginTop: 2,
                      }}
                    >{item.icon}</motion.div>
                    <div>
                      <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>{item.title}</h3>
                      <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{item.desc}</p>
                    </div>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════════════════════
          WHO SHOULD ATTEND
         ═══════════════════════════════════ */}
      <section style={{ position: "relative", padding: "140px 32px", zIndex: 2 }}>
        <Watermark text="For You" style={{ bottom: "10%", right: "-4%" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div className="shimmer-line" style={{ width: 40, height: 2 }} />
              <span className="mono" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Who It's For
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="serif" style={{
              fontSize: "clamp(36px, 5.5vw, 64px)",
              fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.03em",
              marginBottom: 20, maxWidth: 550,
            }}>
              This event is for <em style={{ fontStyle: "italic", color: "#34d399" }}>you</em>.
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.55)", maxWidth: 500, lineHeight: 1.8, marginBottom: 64 }}>
              Whether you've never written code or you're building side projects — there's a seat here.
            </p>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 18 }}>
            {audiences.map((a, i) => (
              <Reveal key={i} delay={0.1 * i}>
                <TiltCard
                  className="glass-border"
                  style={{
                    padding: "36px 30px", borderRadius: 28,
                    background: "rgba(255,255,255,0.02)",
                    backdropFilter: "blur(16px)",
                    textAlign: "center", cursor: "default",
                  }}
                >
                  <motion.div
                    className="serif"
                    whileHover={{ scale: 1.3, rotate: 15 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    style={{
                      fontSize: 36, color: "#34d399", marginBottom: 20,
                      fontStyle: "italic", opacity: 0.8, display: "inline-block",
                    }}
                  >{a.icon}</motion.div>
                  <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.01em" }}>{a.label}</h3>
                  <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)" }}>{a.sub}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════════════════════
          VENUE & CONTACT — Combined section
         ═══════════════════════════════════ */}
      <section id="venue" style={{ position: "relative", padding: "140px 32px", zIndex: 2 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div className="shimmer-line" style={{ width: 40, height: 2 }} />
              <span className="mono" style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Venue & Contact
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="serif" style={{
              fontSize: "clamp(36px, 5.5vw, 58px)",
              fontWeight: 400, lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: 64,
            }}>
              Where to <em style={{ fontStyle: "italic", color: "#818cf8" }}>find us</em>
            </h2>
          </Reveal>

          {/* Venue Info + Map */}
          <Reveal delay={0.15}>
            <Glass hover={false} className="glass-border" style={{ padding: "56px 52px", overflow: "hidden", marginBottom: 48 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "start" }}>
                <div>
                  <h3 className="serif" style={{
                    fontSize: "clamp(28px, 4vw, 42px)",
                    fontWeight: 400, fontStyle: "italic", marginBottom: 20,
                    lineHeight: 1.15,
                  }}>
                    Northwestern Mutual
                  </h3>
                  <p style={{
                    fontSize: 18, color: "rgba(255,255,255,0.7)",
                    lineHeight: 1.7, marginBottom: 8,
                  }}>
                    1201 Edwards Mill Road
                  </p>
                  <p style={{
                    fontSize: 18, color: "rgba(255,255,255,0.7)",
                    lineHeight: 1.7, marginBottom: 32,
                  }}>
                    Raleigh, NC 27607
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {[
                      { label: "WiFi", detail: "High-speed provided" },
                      { label: "Parking", detail: "Free on-site" },
                      { label: "Food", detail: "Light refreshments" },
                      { label: "Laptops", detail: "Bring your own" },
                    ].map((item, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between",
                        padding: "12px 0",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                      }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{item.label}</span>
                        <span style={{ fontSize: 16, color: "rgba(255,255,255,0.45)" }}>{item.detail}</span>
                      </div>
                    ))}
                  </div>

                  <MagneticWrap strength={0.15}>
                    <motion.a
                      href="https://maps.google.com/?q=1201+Edwards+Mill+Road+Raleigh+NC+27607"
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 10,
                        marginTop: 32, padding: "14px 32px", borderRadius: 100,
                        background: "rgba(99,102,241,0.12)",
                        border: "1px solid rgba(99,102,241,0.25)",
                        color: "#fff", fontSize: 15,
                        fontFamily: "'Syne', sans-serif", fontWeight: 600,
                        textDecoration: "none", cursor: "pointer",
                      }}
                    >
                      📍 Get Directions
                    </motion.a>
                  </MagneticWrap>
                </div>

                {/* Google Maps embed */}
                <div style={{
                  borderRadius: 20, overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.06)",
                  aspectRatio: "1", minHeight: 360,
                }}>
                  <iframe
                    title="Northwestern Mutual - Raleigh"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3237.1!2d-78.7146!3d35.8026!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTIwMSBFZHdhcmRzIE1pbGwgUmQsIFJhbGVpZ2gsIE5DIDI3NjA3!5e0!3m2!1sen!2sus!4v1"
                    width="100%"
                    height="100%"
                    style={{ border: 0, filter: "invert(0.9) hue-rotate(180deg) brightness(0.7) contrast(1.2)", minHeight: 360 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </Glass>
          </Reveal>

          {/* Contact */}
          <Reveal delay={0.25}>
            <Glass hover={false} className="glass-border" style={{ padding: "56px 52px", overflow: "hidden", textAlign: "center" }}>
              <h3 className="serif" style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 400, fontStyle: "italic", marginBottom: 20,
                lineHeight: 1.15,
              }}>
                Get in <em style={{ color: "#34d399" }}>touch</em>
              </h3>
              <p style={{
                fontSize: 18, color: "rgba(255,255,255,0.55)",
                lineHeight: 1.8, marginBottom: 32, maxWidth: 540, margin: "0 auto 32px",
              }}>
                Have questions about the workshop, sponsorship, or anything else? Reach out to us directly.
              </p>
              <motion.a
                href="mailto:marqueso@blacksintechnology.org?subject=BIT%20RDU%20Workshop%20Inquiry"
                whileHover={{ scale: 1.06, boxShadow: "0 0 40px rgba(52,211,153,0.35)" }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 12,
                  padding: "18px 48px", borderRadius: 999,
                  background: "linear-gradient(135deg, #34d399, #059669)",
                  color: "#000", fontWeight: 700, fontSize: 18,
                  fontFamily: "'Syne', sans-serif",
                  textDecoration: "none", letterSpacing: "0.02em",
                  cursor: "pointer", border: "none",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                Contact Us
              </motion.a>
              <p className="mono" style={{
                fontSize: 14, color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.06em", marginTop: 20,
              }}>
                marqueso@blacksintechnology.org
              </p>
            </Glass>
          </Reveal>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════════════════════
          SPONSORS
         ═══════════════════════════════════ */}
      <section style={{ position: "relative", padding: "100px 32px", zIndex: 2, textAlign: "center" }}>
        <Reveal>
          <span className="mono" style={{
            fontSize: 14, color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.12em", textTransform: "uppercase",
          }}>Proudly Sponsored By</span>
        </Reveal>

        <div style={{ display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap", marginTop: 40 }}>
          {[
            { name: "AWS", gradient: "linear-gradient(135deg, #ff9900, #ffb347)" },
            { name: "Northwestern Mutual", gradient: "linear-gradient(135deg, #3b82f6, #60a5fa)" },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <MagneticWrap strength={0.2}>
                <motion.div
                  whileHover={{ y: -6, boxShadow: "0 25px 50px -10px rgba(99,102,241,0.15)" }}
                  className="glass-border"
                  style={{
                    padding: "32px 56px", borderRadius: 24, cursor: "default",
                    background: "rgba(255,255,255,0.02)",
                    backdropFilter: "blur(16px)",
                  }}
                >
                  <span className="serif" style={{
                    fontSize: 28, fontWeight: 400, fontStyle: "italic",
                    background: s.gradient,
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}>{s.name}</span>
                </motion.div>
              </MagneticWrap>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════════════════════
          FINAL CTA — Register
         ═══════════════════════════════════ */}
      <section id="register" style={{
        position: "relative", padding: "180px 32px", zIndex: 2,
        textAlign: "center", overflow: "hidden",
      }}>
        <Watermark text="Register" style={{ top: "30%", left: "50%", transform: "translateX(-50%)" }} />

        {/* Background glow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 700, height: 700,
          marginTop: -350, marginLeft: -350,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
          animation: "drift 12s ease-in-out infinite",
          pointerEvents: "none",
        }} />

        {/* Pulse rings */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 200, height: 200,
          marginTop: -100, marginLeft: -100,
          borderRadius: "50%",
          border: "1px solid rgba(99,102,241,0.12)",
          animation: "pulse-ring 3s ease-out infinite",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 200, height: 200,
          marginTop: -100, marginLeft: -100,
          borderRadius: "50%",
          border: "1px solid rgba(6,182,212,0.08)",
          animation: "pulse-ring 3s ease-out 1.5s infinite",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: 700, margin: "0 auto" }}>
          <Reveal>
            <span className="mono" style={{
              fontSize: 14, color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.12em", textTransform: "uppercase",
              display: "block", marginBottom: 36,
            }}>Limited to 50 Attendees</span>

            <h2 className="serif" style={{
              fontSize: "clamp(44px, 8vw, 88px)",
              fontWeight: 400, fontStyle: "italic", lineHeight: 1,
              marginBottom: 28,
            }}>
              Ready to build<br />the future?
            </h2>

            <p style={{
              fontSize: 19, color: "rgba(255,255,255,0.55)",
              maxWidth: 460, margin: "0 auto 20px", lineHeight: 1.7,
            }}>
              Join us May 4th and build your first AI agent with AWS. Walk away with a portfolio-ready project.
            </p>

            <div style={{
              display: "flex", justifyContent: "center", gap: 24, marginBottom: 48,
              flexWrap: "wrap",
            }}>
              <span className="mono" style={{
                fontSize: 13, color: "#34d399", letterSpacing: "0.08em",
                padding: "6px 18px", borderRadius: 100,
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.2)",
              }}>FREE REGISTRATION</span>
              <span className="mono" style={{
                fontSize: 13, color: "#f59e0b", letterSpacing: "0.08em",
                padding: "6px 18px", borderRadius: 100,
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}>LIMITED TO 50 SEATS</span>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <MagneticWrap strength={0.2}>
              <motion.a
                href="https://www.eventbrite.com/e/build-your-own-agent-workshop-with-aws-tickets-1986867145116?aff=oddtdtcreator"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                className="cta-btn"
                style={{
                  padding: "22px 60px", borderRadius: 100, border: "none",
                  background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                  color: "#fff", fontSize: 20, fontWeight: 800, cursor: "pointer",
                  fontFamily: "'Syne', sans-serif", letterSpacing: "-0.01em",
                  boxShadow: "0 0 50px rgba(99,102,241,0.35), 0 0 100px rgba(6,182,212,0.15)",
                  position: "relative", textDecoration: "none", display: "inline-block",
                }}
              >
                Reserve Your Spot →
              </motion.a>
            </MagneticWrap>

            <p className="mono" style={{
              marginTop: 28, fontSize: 14,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.08em",
            }}>
              FREE TO ATTEND · AWS CREDITS INCLUDED
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════
          FOOTER
         ═══════════════════════════════════ */}
      <footer style={{
        padding: "56px 32px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        textAlign: "center", zIndex: 2, position: "relative",
      }}>
        <p className="mono" style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>
          Blacks in Technology RDU · May 4, 2026
        </p>
        <p className="mono" style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", marginTop: 10, letterSpacing: "0.06em" }}>
          Powered by AWS & Northwestern Mutual
        </p>
      </footer>
    </div>
  );
}
