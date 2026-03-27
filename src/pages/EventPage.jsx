import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
   MAGNETIC HOVER — PeachWeb-style magnetic button
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
   TEXT REVEAL — Character-by-character stagger
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
   WATERMARK — PeachWeb-style oversized bg text
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
   REVEAL — Scroll-triggered animations
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
   GLASS PANEL — Frosted glass component
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
   SCROLL-TO UTIL
   ══════════════════════════════════════════ */
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ══════════════════════════════════════════
   ANIMATED PROGRESS LINE
   ══════════════════════════════════════════ */
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
   NAV BAR — PeachWeb pill-style nav
   ══════════════════════════════════════════ */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const navLinks = [
    { label: "About", id: "about" },
    { label: "Experience", id: "experience" },
    { label: "Details", id: "details" },
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
      {/* Logo */}
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

      {/* Center pill nav */}
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

      {/* Register CTA */}
      <MagneticWrap strength={0.2}>
        <motion.a
          href="https://www.eventbrite.com"
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
        >Register</motion.a>
      </MagneticWrap>
    </motion.nav>
  );
}

/* ══════════════════════════════════════════
   ANIMATED COUNTER / STAT
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
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", marginTop: 10,
        fontFamily: "'Syne', sans-serif", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════
   HOVER CARD — PeachWeb-style tilt card
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
   MAIN PAGE
   ══════════════════════════════════════════ */
export default function EventPage() {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.92]);
  const heroY = useTransform(scrollYProgress, [0, 0.15], [0, 80]);

  const experienceItems = [
    { num: "01", title: "Live Demos", desc: "Watch AI agents built in real-time before your eyes.", accent: "#818cf8" },
    { num: "02", title: "Build Your Agent", desc: "Go from zero to a working AI agent in one session.", accent: "#06b6d4" },
    { num: "03", title: "AWS Credits", desc: "Free credits and accounts to experiment without limits.", accent: "#34d399" },
    { num: "04", title: "Industry Skills", desc: "Learn the exact tools professional AI engineers use.", accent: "#f472b6" },
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
        @keyframes borderRotate {
          from { --angle: 0deg; }
          to { --angle: 360deg; }
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
        @keyframes line-draw {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
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

        .glass-border {
          position: relative;
        }
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

        .hover-lift {
          transition: transform 0.6s cubic-bezier(0.16,1,0.3,1), box-shadow 0.6s ease;
        }
        .hover-lift:hover {
          transform: translateY(-10px);
          box-shadow: 0 40px 80px -15px rgba(99,102,241,0.18), 0 20px 40px -20px rgba(0,0,0,0.4);
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
          SECTION 1 — HERO
         ═══════════════════════════════════ */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        id="hero"
      >
        <div style={{
          position: "relative", minHeight: "100vh",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "140px 32px 100px",
          textAlign: "center", zIndex: 2,
        }}>
          {/* PeachWeb-style watermark */}
          <Watermark text="Build" style={{ top: "15%", left: "-5%" }} />
          <Watermark text="AI" style={{ bottom: "20%", right: "-3%" }} />

          {/* Orbiting ring */}
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

          {/* Second orbiting ring — counter-direction */}
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

          {/* Date pill */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 12,
              padding: "10px 26px", borderRadius: 100,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              marginBottom: 48, position: "relative", zIndex: 2,
            }}
          >
            <div style={{
              width: 7, height: 7, borderRadius: "50%", background: "#34d399",
              boxShadow: "0 0 12px #34d399",
              animation: "glow-pulse 2s ease-in-out infinite",
            }} />
            <span className="mono" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", letterSpacing: "0.05em" }}>
              MAY 4, 2026 — 6:00 PM
            </span>
          </motion.div>

          {/* Main headline with character-by-character reveal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            style={{ position: "relative", zIndex: 2, marginBottom: 32 }}
          >
            <h1 className="serif" style={{
              fontSize: "clamp(52px, 11vw, 130px)",
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
              fontSize: "clamp(17px, 2.2vw, 21px)",
              color: "rgba(255,255,255,0.55)",
              maxWidth: 520, lineHeight: 1.7,
              marginBottom: 52, position: "relative", zIndex: 2,
              fontWeight: 400,
            }}
          >
            A hands-on workshop for students and aspiring developers.
            Build real AI agents using industry-grade tools.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.3 }}
            style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", position: "relative", zIndex: 2 }}
          >
            <MagneticWrap strength={0.15}>
              <motion.a
                href="https://www.eventbrite.com"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="cta-btn"
                style={{
                  padding: "18px 44px", borderRadius: 100, border: "none",
                  background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                  color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
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
                onClick={() => scrollToSection("about")}
                whileHover={{ scale: 1.04, borderColor: "rgba(255,255,255,0.2)" }}
                whileTap={{ scale: 0.96 }}
                style={{
                  padding: "18px 44px", borderRadius: 100,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.7)",
                  fontSize: 16, fontWeight: 500, cursor: "pointer",
                  fontFamily: "'Syne', sans-serif", backdropFilter: "blur(12px)",
                }}
              >
                Learn More ↓
              </motion.button>
            </MagneticWrap>
          </motion.div>

          {/* Sponsors line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.6 }}
            className="mono"
            style={{
              marginTop: 64, fontSize: 13,
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
            style={{ position: "absolute", bottom: 40, zIndex: 2 }}
          >
            <div style={{
              width: 1, height: 56,
              background: "linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)",
            }} />
          </motion.div>
        </div>
      </motion.section>

      {/* Divider */}
      <div className="section-divider" />

      {/* ═══════════════════════════════════
          SECTION 2 — WHAT THIS IS
         ═══════════════════════════════════ */}
      <section id="about" style={{ position: "relative", padding: "160px 32px 120px", zIndex: 2 }}>
        <Watermark text="Workshop" style={{ top: "5%", right: "-8%" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div className="shimmer-line" style={{ width: 40, height: 2 }} />
              <span className="mono" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                What This Is
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="serif" style={{
              fontSize: "clamp(36px, 5.5vw, 64px)",
              fontWeight: 400, lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: 24, maxWidth: 700,
            }}>
              Not a lecture.<br />
              A <em style={{ fontStyle: "italic", color: "#818cf8" }}>launchpad</em>.
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <p style={{
              fontSize: 18, color: "rgba(255,255,255,0.5)",
              maxWidth: 540, lineHeight: 1.8, marginBottom: 72,
            }}>
              Build functional AI agents from scratch using AWS tools — with real cloud
              credits and expert guidance every step of the way.
            </p>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {[
              { title: "Hands-On Workshop", desc: "Write real code. Build real agents. No passive learning.", icon: "⬡" },
              { title: "Real-World Applications", desc: "Learn patterns powering AI systems at scale.", icon: "◈" },
              { title: "Guided Experience", desc: "Step-by-step, from environment setup to deployment.", icon: "△" },
            ].map((item, i) => (
              <Reveal key={i} delay={0.15 * i}>
                <TiltCard
                  className="glass-border"
                  style={{
                    padding: "40px 34px",
                    borderRadius: 28,
                    background: "rgba(255,255,255,0.02)",
                    backdropFilter: "blur(20px)",
                    cursor: "default",
                    height: "100%",
                  }}
                >
                  <motion.div
                    initial={{ scale: 1 }}
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    style={{
                      fontSize: 32, marginBottom: 24, color: "#818cf8",
                      fontFamily: "'Instrument Serif', serif", fontStyle: "italic",
                      display: "inline-block",
                    }}
                  >{item.icon}</motion.div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: "-0.02em" }}>{item.title}</h3>
                  <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{item.desc}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════════════════════
          SECTION 3 — WHAT YOU'LL EXPERIENCE
         ═══════════════════════════════════ */}
      <section id="experience" style={{ position: "relative", padding: "160px 32px", zIndex: 2 }}>
        <Watermark text="Experience" style={{ top: "8%", left: "-6%" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div className="shimmer-line" style={{ width: 40, height: 2 }} />
              <span className="mono" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                The Experience
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="serif" style={{
              fontSize: "clamp(36px, 5.5vw, 64px)",
              fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.03em",
              marginBottom: 72, maxWidth: 600,
            }}>
              What you'll <em style={{ fontStyle: "italic", color: "#06b6d4" }}>walk away</em> with
            </h2>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 18 }}>
            {experienceItems.map((item, i) => (
              <Reveal key={i} delay={0.12 * i}>
                <TiltCard
                  className="glass-border"
                  style={{
                    padding: "40px 30px",
                    borderRadius: 28,
                    background: "rgba(255,255,255,0.02)",
                    backdropFilter: "blur(16px)",
                    position: "relative",
                    overflow: "hidden",
                    cursor: "default",
                    height: "100%",
                  }}
                >
                  {/* Large faded number */}
                  <span className="serif" style={{
                    position: "absolute", top: 14, right: 18,
                    fontSize: 80, fontWeight: 400, fontStyle: "italic",
                    color: "rgba(255,255,255,0.025)", lineHeight: 1,
                  }}>{item.num}</span>

                  {/* Accent dot with glow */}
                  <motion.div
                    animate={{ boxShadow: [`0 0 16px ${item.accent}40`, `0 0 28px ${item.accent}70`, `0 0 16px ${item.accent}40`] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: item.accent,
                      marginBottom: 28,
                    }}
                  />

                  <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 12, letterSpacing: "-0.01em" }}>{item.title}</h3>
                  <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{item.desc}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════════════════════
          SECTION 4 — WHO SHOULD ATTEND
         ═══════════════════════════════════ */}
      <section style={{ position: "relative", padding: "160px 32px", zIndex: 2 }}>
        <Watermark text="For You" style={{ bottom: "10%", right: "-4%" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div className="shimmer-line" style={{ width: 40, height: 2 }} />
              <span className="mono" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
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
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", maxWidth: 500, lineHeight: 1.8, marginBottom: 64 }}>
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
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.01em" }}>{a.label}</h3>
                  <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)" }}>{a.sub}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════════════════════
          SECTION 5 — EVENT DETAILS
         ═══════════════════════════════════ */}
      <section id="details" style={{ position: "relative", padding: "160px 32px", zIndex: 2 }}>
        <div style={{ maxWidth: 850, margin: "0 auto" }}>
          <Reveal>
            <Glass hover={false} className="glass-border" style={{ padding: "64px 52px", textAlign: "center" }}>
              <span className="mono" style={{
                fontSize: 13, color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.12em", textTransform: "uppercase",
                display: "block", marginBottom: 28,
              }}>
                Event Details
              </span>

              <h2 className="serif" style={{
                fontSize: "clamp(36px, 5.5vw, 56px)",
                fontWeight: 400, fontStyle: "italic", marginBottom: 48,
                lineHeight: 1.1,
              }}>
                Mark your calendar.
              </h2>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 36,
              }}>
                {[
                  { label: "Date", value: "May 4, 2026" },
                  { label: "Doors Open", value: "5:30 PM" },
                  { label: "Workshop", value: "6 – 8 PM" },
                  { label: "Format", value: "Hands-On" },
                ].map((d, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30, filter: "blur(6px)" }}
                    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.12 * i, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p className="mono" style={{
                      fontSize: 12, color: "rgba(255,255,255,0.35)",
                      letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10,
                    }}>{d.label}</p>
                    <p className="serif" style={{
                      fontSize: 28, fontStyle: "italic", color: "#fff",
                    }}>{d.value}</p>
                  </motion.div>
                ))}
              </div>
            </Glass>
          </Reveal>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════════════════════
          SECTION 6 — SPONSORS
         ═══════════════════════════════════ */}
      <section style={{ position: "relative", padding: "100px 32px 140px", zIndex: 2, textAlign: "center" }}>
        <Reveal>
          <span className="mono" style={{
            fontSize: 13, color: "rgba(255,255,255,0.35)",
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
          SECTION 7 — WHY THIS MATTERS
         ═══════════════════════════════════ */}
      <section style={{ position: "relative", padding: "160px 32px", zIndex: 2 }}>
        <Watermark text="Matters" style={{ top: "12%", left: "-5%" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div className="shimmer-line" style={{ width: 40, height: 2 }} />
              <span className="mono" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Why It Matters
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="serif" style={{
              fontSize: "clamp(36px, 5.5vw, 64px)",
              fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.03em",
              marginBottom: 64, maxWidth: 650,
            }}>
              The gap between learning AI and{" "}
              <em style={{ fontStyle: "italic", color: "#f472b6" }}>doing AI</em>{" "}
              is closing.
            </h2>
          </Reveal>

          {/* Stats row */}
          <Reveal delay={0.15}>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 36, marginBottom: 64,
            }}>
              <StatNumber value="2" suffix="hr" label="Workshop" />
              <StatNumber value="100" suffix="%" label="Hands-On" />
              <StatNumber value="0" suffix="$" label="Cost" />
            </div>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
            {[
              { title: "Real-World Exposure", desc: "Work with the same AWS services powering Fortune 500 AI.", color: "#818cf8" },
              { title: "Education ↔ Industry", desc: "Bridge the gap between classroom knowledge and professional tools.", color: "#06b6d4" },
              { title: "Hands-On > Theory", desc: "Building is the fastest way to learn. Theory follows practice.", color: "#34d399" },
            ].map((item, i) => (
              <Reveal key={i} delay={0.12 * i}>
                <TiltCard
                  className="glass-border"
                  style={{
                    padding: "40px 32px", borderRadius: 28,
                    background: "rgba(255,255,255,0.02)",
                    backdropFilter: "blur(16px)", cursor: "default",
                  }}
                >
                  <motion.div
                    animate={{ boxShadow: [`0 0 16px ${item.color}40`, `0 0 28px ${item.color}70`, `0 0 16px ${item.color}40`] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                    style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: item.color,
                      marginBottom: 28,
                    }}
                  />
                  <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 12, letterSpacing: "-0.01em" }}>{item.title}</h3>
                  <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{item.desc}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══════════════════════════════════
          SECTION 8 — FINAL CTA
         ═══════════════════════════════════ */}
      <section id="register" style={{
        position: "relative", padding: "200px 32px", zIndex: 2,
        textAlign: "center", overflow: "hidden",
      }}>
        <Watermark text="Register" style={{ top: "30%", left: "50%", transform: "translateX(-50%)" }} />

        {/* Massive background glow */}
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
              fontSize: 13, color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.12em", textTransform: "uppercase",
              display: "block", marginBottom: 36,
            }}>Don't Miss Out</span>

            <h2 className="serif" style={{
              fontSize: "clamp(44px, 8vw, 88px)",
              fontWeight: 400, fontStyle: "italic", lineHeight: 1,
              marginBottom: 28,
            }}>
              Ready to build<br />the future?
            </h2>

            <p style={{
              fontSize: 19, color: "rgba(255,255,255,0.5)",
              maxWidth: 460, margin: "0 auto 56px", lineHeight: 1.7,
            }}>
              Seats are limited. Join us May 4th and build your first AI agent with AWS.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <MagneticWrap strength={0.2}>
              <motion.a
                href="https://www.eventbrite.com"
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
                Register Now →
              </motion.a>
            </MagneticWrap>

            <p className="mono" style={{
              marginTop: 28, fontSize: 13,
              color: "rgba(255,255,255,0.35)",
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
        <p className="mono" style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>
          Blacks in Technology RDU · May 4, 2026
        </p>
        <p className="mono" style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", marginTop: 10, letterSpacing: "0.06em" }}>
          Powered by AWS & Northwestern Mutual
        </p>
      </footer>
    </div>
  );
}
