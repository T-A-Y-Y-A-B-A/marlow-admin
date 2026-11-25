"use client";

import { useEffect, useRef, useState } from "react";
import type { Material, Mesh, MeshStandardMaterial } from "three";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/lib/cx";
import { REGION_REVENUE } from "@/lib/data";
import { money, moneyCompact } from "@/lib/format";

const { months, regions } = REGION_REVENUE;
const SERIES_VARS = ["--c1", "--c2", "--c3", "--c4", "--c5"];
const SWATCH = ["bg-c1", "bg-c2", "bg-c3", "bg-c4", "bg-c5"];
const CODES: Record<string, string> = {
  "North America": "NA",
  Europe: "EU",
  "Asia Pacific": "APAC",
  "Latin America": "LATAM",
  "Middle East & Africa": "MEA",
};
const BAR_MAX = 5;
const monthTotal = (m: number) => regions.reduce((s, r) => s + r.values[m], 0);

type Bar = { mesh: Mesh; material: MeshStandardMaterial; ri: number; mi: number; target: number; current: number; delay: number };
type Hover = { ri: number; mi: number; x: number; y: number; flip: boolean };

/** 3D bar "skyline": 12 months × 5 regions. Three.js is loaded on demand so it never blocks first paint. */
export function RevenueSkyline({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<{ show: (visible: boolean[]) => void; reset: () => void } | null>(null);
  const visibleRef = useRef<boolean[]>(regions.map(() => true));
  const [visible, setVisible] = useState<boolean[]>(() => regions.map(() => true));
  const [hover, setHover] = useState<Hover | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    visibleRef.current = visible;
    scene.current?.show(visible);
  }, [visible]);

  useEffect(() => {
    let disposed = false;
    let teardown = () => {};

    (async () => {
      const [THREE, { OrbitControls }, { RoundedBoxGeometry }, { CSS2DRenderer, CSS2DObject }] = await Promise.all([
        import("three"),
        import("three/addons/controls/OrbitControls.js"),
        import("three/addons/geometries/RoundedBoxGeometry.js"),
        import("three/addons/renderers/CSS2DRenderer.js"),
      ]);
      const el = host.current;
      if (disposed || !el) return;

      const root = document.documentElement;
      const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
      const reduced = () => root.dataset.motion === "reduce" || reducedQuery.matches;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute("aria-hidden", "true");
      el.appendChild(renderer.domElement);

      const labelRenderer = new CSS2DRenderer();
      Object.assign(labelRenderer.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
      el.appendChild(labelRenderer.domElement);

      const world = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
      camera.position.set(14, 10, 16);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 1.05, 0.3);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.enableZoom = false; // keep the page wheel-scrollable
      controls.minPolarAngle = 0.3;
      controls.maxPolarAngle = 1.4;
      controls.autoRotateSpeed = 0.5;
      controls.autoRotate = !reduced();
      controls.update();
      controls.saveState();
      renderer.domElement.style.touchAction = "pan-y"; // vertical swipes still scroll on phones

      const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 1.2);
      world.add(hemi);
      const sun = new THREE.DirectionalLight(0xffffff, 2.4);
      sun.position.set(-7, 14, 9);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 50 });
      sun.shadow.camera.updateProjectionMatrix();
      world.add(sun);

      const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.35 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      world.add(ground);

      const grid = new THREE.GridHelper(18, 18);
      const gridMaterial = grid.material as Material & { color: { set: (c: string) => void }; vertexColors: boolean };
      gridMaterial.vertexColors = false;
      gridMaterial.transparent = true;
      gridMaterial.opacity = 0.7;
      grid.position.y = 0.002;
      world.add(grid);

      const geometry = new RoundedBoxGeometry(0.72, 1, 0.72, 3, 0.09);
      geometry.translate(0, 0.5, 0); // pivot at the base so scaling grows upward

      const spacingZ = 1.2;
      const xOf = (mi: number) => (mi - (months.length - 1) / 2) * 1.02;
      const zOf = (ri: number) => (ri - (regions.length - 1) / 2) * spacingZ;

      const bars: Bar[] = [];
      regions.forEach((r, ri) =>
        r.values.forEach((_, mi) => {
          const material = new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.08 });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(xOf(mi), 0, zOf(ri));
          mesh.scale.y = 0.0001;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          world.add(mesh);
          bars.push({ mesh, material, ri, mi, target: 0, current: 0, delay: (mi + ri * 2.5) * 40 });
        }),
      );

      const label = (text: string, x: number, z: number, cls: string) => {
        const div = document.createElement("div");
        div.textContent = text;
        div.className = cls;
        const obj = new CSS2DObject(div);
        obj.position.set(x, 0, z);
        world.add(obj);
        return div;
      };
      const frontZ = zOf(regions.length - 1) + 1.05;
      const monthLabels = months.map((m, mi) => label(m.label, xOf(mi), frontZ, "select-none font-mono text-[10px] uppercase tracking-wider text-ink-3"));
      regions.forEach((r, ri) => label(CODES[r.name] ?? r.name, xOf(months.length - 1) + 1.25, zOf(ri), "select-none font-mono text-[10px] text-ink-2"));

      function show(visibleRegions: boolean[]) {
        const max = Math.max(1, ...regions.flatMap((r, ri) => (visibleRegions[ri] ? r.values : [])));
        for (const b of bars) b.target = visibleRegions[b.ri] ? (regions[b.ri].values[b.mi] / max) * BAR_MAX : 0;
      }
      show(visibleRef.current);

      function applyTheme() {
        const s = getComputedStyle(root);
        const dark = root.dataset.theme === "dark";
        for (const b of bars) b.material.color.set(s.getPropertyValue(SERIES_VARS[b.ri]).trim());
        gridMaterial.color.set(s.getPropertyValue("--line").trim());
        gridMaterial.needsUpdate = true;
        (ground.material as { opacity: number }).opacity = dark ? 0.5 : 0.16;
        hemi.intensity = dark ? 1.05 : 1.7;
        hemi.groundColor.set(dark ? 0x0c0d0c : 0x8a8a80);
      }
      applyTheme();

      function resize() {
        const w = el!.clientWidth;
        const h = el!.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h);
        labelRenderer.setSize(w, h);
        camera.aspect = w / h;
        camera.zoom = Math.min(1.12, Math.max(0.68, w / 900)); // fill wide cards; on phones the grid edges may crop, the bars don't
        monthLabels.forEach((d, i) => (d.style.visibility = w < 640 && i % 2 ? "hidden" : "")); // every other month on phones
        camera.updateProjectionMatrix();
      }
      resize();

      // Hover: raycast to the bar under the pointer.
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let hovered: Bar | null = null;
      const highlight = (bar: Bar | null) => {
        if (bar === hovered) return;
        hovered?.material.emissive.setHex(0x000000);
        hovered = bar;
        if (bar) bar.material.emissive.copy(bar.material.color).multiplyScalar(0.35);
      };
      const onMove = (e: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(bars.filter((b) => b.mesh.visible).map((b) => b.mesh), false)[0];
        const bar = hit ? (bars.find((b) => b.mesh === hit.object) ?? null) : null;
        highlight(bar);
        controls.autoRotate = !bar && !reduced();
        setHover(bar ? { ri: bar.ri, mi: bar.mi, x: e.clientX - rect.left, y: e.clientY - rect.top, flip: e.clientX - rect.left > rect.width * 0.6 } : null);
      };
      const onLeave = () => {
        highlight(null);
        controls.autoRotate = !reduced();
        setHover(null);
      };
      renderer.domElement.addEventListener("pointermove", onMove);
      renderer.domElement.addEventListener("pointerleave", onLeave);

      let frame = 0;
      let onScreen = true;
      const start = performance.now();
      const tick = (now: number) => {
        const instant = reduced();
        for (const b of bars) {
          if (!instant && now - start < b.delay) continue;
          b.current += (b.target - b.current) * (instant ? 1 : 0.085);
          b.mesh.scale.y = Math.max(0.0001, b.current);
          b.mesh.visible = b.current > 0.02;
        }
        controls.update();
        renderer.render(world, camera);
        labelRenderer.render(world, camera);
        frame = onScreen ? requestAnimationFrame(tick) : 0;
      };
      frame = requestAnimationFrame(tick);

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(el);
      const io = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen && !frame) frame = requestAnimationFrame(tick);
      });
      io.observe(el);
      const prefs = new MutationObserver(() => {
        applyTheme();
        controls.autoRotate = !reduced();
      });
      prefs.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-motion"] });

      scene.current = {
        show,
        reset: () => {
          controls.reset();
          controls.autoRotate = !reduced();
        },
      };
      setStatus("ready");

      teardown = () => {
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        io.disconnect();
        prefs.disconnect();
        renderer.domElement.removeEventListener("pointermove", onMove);
        renderer.domElement.removeEventListener("pointerleave", onLeave);
        controls.dispose();
        geometry.dispose();
        bars.forEach((b) => b.material.dispose());
        ground.geometry.dispose();
        (ground.material as Material).dispose();
        grid.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        labelRenderer.domElement.remove();
        scene.current = null;
      };
    })().catch(() => {
      if (!disposed) setStatus("error");
    });

    return () => {
      disposed = true;
      teardown();
    };
  }, []);

  const total = regions.reduce((s, r, i) => s + (visible[i] ? r.total : 0), 0);
  const hovered = hover && { region: regions[hover.ri], month: months[hover.mi], value: regions[hover.ri].values[hover.mi] };

  return (
    <section className={cx("relative overflow-hidden rounded-2xl border border-line bg-panel shadow-[var(--shadow)]", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 sm:px-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Last 12 months</p>
          <h2 className="mt-1 text-xl font-semibold sm:text-2xl">Revenue by region</h2>
          <p className="mt-1 text-sm text-ink-2">Drag to orbit. Hover a bar for the month’s figure.</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            <p className="tnum font-display text-[28px] font-semibold leading-none tracking-tight sm:text-[34px]">{money(total)}</p>
            <p className="mt-1.5 text-xs text-ink-3">{visible.every(Boolean) ? "All regions" : `${visible.filter(Boolean).length} of ${regions.length} regions`}</p>
          </div>
          <Button size="icon" variant="secondary" aria-label="Reset 3D view" title="Reset view" onClick={() => scene.current?.reset()}>
            <Icon name="rotate" />
          </Button>
        </div>
      </div>

      <div ref={host} className="relative mt-2 h-[340px] cursor-grab active:cursor-grabbing sm:h-[420px]">
        {status === "loading" && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-mono text-xs text-ink-3">Loading 3D view…</span>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-ink-2">
            This browser can’t show the 3D view (WebGL is off). The figures are in the legend below.
          </div>
        )}
        {hovered && hover && (
          <div
            className={cx(
              "pointer-events-none absolute z-10 w-52 rounded-xl border border-line bg-panel/95 p-3 text-xs shadow-xl backdrop-blur",
              hover.flip ? "-translate-x-[calc(100%+14px)]" : "translate-x-3.5",
            )}
            style={{ left: hover.x, top: Math.max(8, hover.y - 70) }}
          >
            <p className="flex items-center gap-2 font-medium text-ink">
              <span className={cx("size-2 rounded-full", SWATCH[hover.ri])} />
              {hovered.region.name}
            </p>
            <p className="mt-0.5 text-ink-3">{hovered.month.full}</p>
            <p className="tnum mt-2 font-display text-lg font-semibold leading-none">{money(hovered.value)}</p>
            <p className="tnum mt-1 text-ink-2">{((hovered.value / monthTotal(hover.mi)) * 100).toFixed(1)}% of the month</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4 sm:px-6" role="group" aria-label="Show or hide regions">
        {regions.map((r, i) => (
          <button
            key={r.name}
            type="button"
            aria-pressed={visible[i]}
            onClick={() => setVisible((v) => v.map((on, j) => (j === i ? !on : on)))}
            className={cx(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-[opacity,background-color]",
              visible[i] ? "border-line bg-panel-2 text-ink" : "border-dashed border-line text-ink-3 opacity-70",
            )}
          >
            <span className={cx("size-2.5 rounded-full transition-opacity", SWATCH[i], !visible[i] && "opacity-30")} />
            {r.name}
            <span className="tnum font-mono text-[11px] text-ink-3">{moneyCompact(r.total)}</span>
          </button>
        ))}
      </div>

      {/* Same data as a table for screen readers. */}
      <table className="sr-only">
        <caption>Revenue by region, last 12 months</caption>
        <thead>
          <tr>
            <th scope="col">Region</th>
            {months.map((m) => (
              <th key={m.full} scope="col">
                {m.full}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {regions.map((r) => (
            <tr key={r.name}>
              <th scope="row">{r.name}</th>
              {r.values.map((v, i) => (
                <td key={i}>{money(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
