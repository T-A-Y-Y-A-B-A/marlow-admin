"use client";

import { useEffect, useRef } from "react";
import type { City } from "@/lib/data";

type Vec = [number, number, number];

const HUB = "London";

const toVec = (lat: number, lon: number): Vec => {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
};

/** Great-circle path from a to b, lifted off the surface so long routes arc higher. */
function arc(a: Vec, b: Vec, steps = 48): Vec[] {
  const w = Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
  const s = Math.sin(w);
  const lift = 0.05 + (w / Math.PI) * 0.35;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const k1 = Math.sin((1 - t) * w) / s;
    const k2 = Math.sin(t * w) / s;
    const h = 1 + Math.sin(Math.PI * t) * lift;
    return [(k1 * a[0] + k2 * b[0]) * h, (k1 * a[1] + k2 * b[1]) * h, (k1 * a[2] + k2 * b[2]) * h];
  });
}

function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Dotted, draggable 3D globe drawn on a 2D canvas — no WebGL, ~0 KB of dependencies. */
export function Globe({ cities, className }: { cities: City[]; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const root = document.documentElement;
    const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
    const reduced = () => root.dataset.motion === "reduce" || reducedQuery.matches;

    // Fibonacci sphere: evenly spread dots.
    const N = 1500;
    const dots: Vec[] = Array.from({ length: N }, (_, i) => {
      const y = 1 - (2 * i + 1) / N;
      const r = Math.sqrt(1 - y * y);
      const th = i * 2.399963229728653;
      return [Math.cos(th) * r, y, Math.sin(th) * r];
    });
    const markers = cities.map((c) => ({ v: toVec(c.lat, c.lon), size: 1.5 + Math.sqrt(c.subscribers) / 6, pulse: c.subscribers > 300 }));
    const hub = cities.find((c) => c.name === HUB) ?? cities[0];
    const routes = cities
      .filter((c) => c !== hub)
      .sort((a, b) => b.subscribers - a.subscribers)
      .slice(0, 7)
      .map((c, i) => ({ path: arc(toVec(hub.lat, hub.lon), toVec(c.lat, c.lon)), offset: i / 7 }));

    const readColors = () => {
      const s = getComputedStyle(root);
      const v = (name: string) => s.getPropertyValue(name).trim();
      return { dot: v("--ink-3"), accent: v("--c1"), arc: v("--c3"), panel: v("--panel"), line: v("--line") };
    };
    let colors = readColors();

    let w = 0;
    let h = 0;
    let rot = 0.55; // start over the Atlantic
    let tilt = 0.38;
    let vel = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let visible = true;
    let frame = 0;
    let last = performance.now();

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(now: number) {
      const c = ctx!;
      const R = Math.min(w, h) / 2 - 8;
      if (R <= 0) return;
      const cx = w / 2;
      const cy = h / 2;
      const cr = Math.cos(rot);
      const sr = Math.sin(rot);
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const project = (v: Vec): [number, number, number] => {
        const x1 = v[0] * cr + v[2] * sr;
        const z1 = -v[0] * sr + v[2] * cr;
        return [cx + x1 * R, cy - (v[1] * ct - z1 * st) * R, v[1] * st + z1 * ct];
      };
      const shown = (p: [number, number, number]) => p[2] > 0 || (p[0] - cx) ** 2 + (p[1] - cy) ** 2 > R * R;

      c.clearRect(0, 0, w, h);

      // Body with a soft rim light for depth.
      c.globalAlpha = 1;
      c.beginPath();
      c.arc(cx, cy, R, 0, Math.PI * 2);
      c.fillStyle = colors.panel;
      c.fill();
      const rim = c.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.2, cx, cy, R);
      rim.addColorStop(0, rgba(colors.accent, 0));
      rim.addColorStop(1, rgba(colors.accent, 0.14));
      c.fillStyle = rim;
      c.fill();
      c.strokeStyle = colors.line;
      c.lineWidth = 1;
      c.stroke();

      c.fillStyle = colors.dot;
      for (const d of dots) {
        const [x, y, z] = project(d);
        if (z < -0.1) continue;
        c.globalAlpha = z < 0 ? 0.06 : 0.12 + z * 0.55;
        const s = z < 0 ? 1 : 1 + z * 0.6;
        c.fillRect(x - s / 2, y - s / 2, s, s);
      }

      c.strokeStyle = colors.arc;
      c.fillStyle = colors.arc;
      c.lineWidth = 1.2;
      for (const route of routes) {
        c.globalAlpha = 0.5;
        c.beginPath();
        let drawing = false;
        const projected = route.path.map(project);
        for (const p of projected) {
          if (!shown(p)) {
            drawing = false;
            continue;
          }
          if (drawing) c.lineTo(p[0], p[1]);
          else c.moveTo(p[0], p[1]);
          drawing = true;
        }
        c.stroke();
        if (!reduced()) {
          const p = projected[Math.floor((((now / 2600 + route.offset) % 1) * (projected.length - 1)))];
          if (shown(p)) {
            c.globalAlpha = 1;
            c.beginPath();
            c.arc(p[0], p[1], 2, 0, Math.PI * 2);
            c.fill();
          }
        }
      }

      c.fillStyle = colors.accent;
      c.strokeStyle = colors.accent;
      markers.forEach((m, i) => {
        const [x, y, z] = project(m.v);
        if (z <= 0.05) return;
        if (m.pulse && !reduced()) {
          const phase = (now / 2200 + i * 0.17) % 1;
          c.globalAlpha = (1 - phase) * 0.45 * z;
          c.beginPath();
          c.arc(x, y, m.size + phase * 12, 0, Math.PI * 2);
          c.stroke();
        }
        c.globalAlpha = 0.35 + z * 0.65;
        c.beginPath();
        c.arc(x, y, m.size, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = colors.panel;
        c.lineWidth = 1.5;
        c.stroke();
        c.strokeStyle = colors.accent;
        c.lineWidth = 1.2;
      });
      c.globalAlpha = 1;
    }

    function tick(now: number) {
      const dt = Math.min(64, now - last);
      last = now;
      if (!dragging) {
        rot += vel;
        vel *= 0.94;
        if (Math.abs(vel) < 1e-4) vel = 0;
        if (!reduced()) rot += dt * 0.00012;
      }
      draw(now);
      frame = visible && (!reduced() || dragging || vel !== 0) ? requestAnimationFrame(tick) : 0;
    }

    const start = () => {
      if (frame || !visible) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      vel = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      start();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      vel = (e.clientX - lastX) * 0.006;
      rot += vel;
      tilt = Math.min(1, Math.max(-0.3, tilt + (e.clientY - lastY) * 0.004));
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    resizeObserver.observe(canvas);

    // Only animate while on screen.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(canvas);

    // Theme or motion preference changed: re-read colours, redraw, resume if allowed.
    const prefs = new MutationObserver(() => {
      colors = readColors();
      draw(performance.now());
      start();
    });
    prefs.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-motion"] });

    start();
    return () => {
      stop();
      resizeObserver.disconnect();
      io.disconnect();
      prefs.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [cities]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="Globe showing subscriber locations. Drag to rotate."
      className={`touch-pan-y cursor-grab active:cursor-grabbing ${className ?? ""}`}
    />
  );
}
