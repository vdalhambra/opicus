import React, { useEffect, useRef } from 'react';

/**
 * StructuralCanvas — constelación de cubos cromados reactivos al ratón.
 *
 * Reescritura (mayo 2026): la versión anterior sobrescribía la posición
 * objetivo de cada cubo cada frame con una misma sinusoide, así que los
 * cuatro cubos se amontonaban en el centro. Ahora cada cubo tiene una
 * posición "hogar" estable y un balanceo orgánico propio; el conjunto
 * reacciona al puntero con inclinación suave (tilt), parallax por
 * profundidad, arrastre con inercia y un cubo "imantado" hacia el ratón.
 *
 * Pointer Events (no Mouse Events) → funciona con ratón y con dedo en
 * móvil. Respeta prefers-reduced-motion y devicePixelRatio.
 */

type V3 = { x: number; y: number; z: number };

interface Cube {
  hx: number; hy: number; hz: number;   // posición hogar
  x: number; y: number; z: number;      // posición actual (suavizada)
  rx: number; ry: number; rz: number;   // rotación local
  sx: number; sy: number; sz: number;   // velocidad de giro local
  scale: number;
  parallax: number;                     // cuánto reacciona al puntero (profundidad)
  phase: number;                        // desfase del balanceo
  color: 'yellow' | 'blue' | 'purple' | 'green';
  glow: number;                         // 0..1 imantación al ratón
}

const CUBE_VERTICES: V3[] = [
  { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 },
  { x: 1, y: 1, z: -1 },   { x: -1, y: 1, z: -1 },
  { x: -1, y: -1, z: 1 },  { x: 1, y: -1, z: 1 },
  { x: 1, y: 1, z: 1 },    { x: -1, y: 1, z: 1 },
];

// Caras enrolladas CCW vistas desde fuera (para backface culling).
const CUBE_FACES = [
  [4, 5, 6, 7], [1, 0, 3, 2], [5, 1, 2, 6],
  [0, 4, 7, 3], [7, 6, 2, 3], [5, 4, 0, 1],
];

const PALETTE: Record<Cube['color'], { stops: [number, string][]; edge: string; glow: string }> = {
  yellow: {
    stops: [[0, '#533c04'], [0.2, '#f59e0b'], [0.5, '#fff7e6'], [0.75, '#fbbf24'], [1, '#78350f']],
    edge: '#fbbf24', glow: 'rgba(245,158,11,0.55)',
  },
  blue: {
    stops: [[0, '#172554'], [0.2, '#3b82f6'], [0.5, '#eaf2ff'], [0.75, '#60a5fa'], [1, '#1e3a8a']],
    edge: '#60a5fa', glow: 'rgba(56,140,255,0.55)',
  },
  purple: {
    stops: [[0, '#2e1065'], [0.2, '#a855f7'], [0.5, '#f6ecff'], [0.75, '#c084fc'], [1, '#4c1d95']],
    edge: '#c084fc', glow: 'rgba(168,85,247,0.5)',
  },
  green: {
    stops: [[0, '#14532d'], [0.2, '#84cc16'], [0.5, '#f2ffe0'], [0.75, '#a3e635'], [1, '#3f6212']],
    edge: '#a3e635', glow: 'rgba(132,204,22,0.5)',
  },
};

function makeCubes(): Cube[] {
  // Cuatro hogares bien separados (sin solaparse), profundidades distintas.
  const base: Array<Partial<Cube> & Pick<Cube, 'hx' | 'hy' | 'hz' | 'scale' | 'parallax' | 'phase' | 'color'>> = [
    { hx: -120, hy: -95, hz: -30, scale: 46, parallax: 0.7, phase: 0.0, color: 'yellow' },
    { hx: 125, hy: -78, hz: 95, scale: 56, parallax: 1.25, phase: 1.7, color: 'blue' },
    { hx: -98, hy: 108, hz: 60, scale: 42, parallax: 1.0, phase: 3.1, color: 'purple' },
    { hx: 112, hy: 96, hz: -70, scale: 50, parallax: 0.5, phase: 4.6, color: 'green' },
  ];
  return base.map((b) => ({
    hx: b.hx, hy: b.hy, hz: b.hz,
    x: b.hx, y: b.hy, z: b.hz,
    rx: 0.3 + b.phase * 0.1, ry: 0.5 + b.phase * 0.07, rz: 0.2,
    sx: 0.0034 + b.phase * 0.0004, sy: 0.0026 + b.phase * 0.0003, sz: 0.0015,
    scale: b.scale, parallax: b.parallax, phase: b.phase, color: b.color, glow: 0,
  }));
}

export default function StructuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Estado de interacción (refs para no re-renderizar).
  const pointer = useRef({ nx: 0, ny: 0, inside: false });     // -1..1 normalizado
  const tilt = useRef({ x: 0.32, y: 0.5 });                    // inclinación actual
  const tiltTarget = useRef({ x: 0.32, y: 0.5 });
  const vel = useRef({ x: 0, y: 0 });                          // inercia de arrastre
  const drag = useRef({ active: false, px: 0, py: 0 });
  const autoSpin = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const cubes = makeCubes();
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    let time = 0;
    let raf = 0;
    let visible = true;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = container.clientWidth;
      H = container.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(() => { resize(); if (reduce) render(); });
    ro.observe(container);
    resize();

    const io = new IntersectionObserver(
      (entries) => {
        const was = visible;
        visible = entries[0]?.isIntersecting ?? true;
        if (reduce && visible && !was) render();
      },
      { threshold: 0.01 },
    );
    io.observe(container);

    // ---- Pointer (ratón + táctil) ----
    const setPointerFromEvent = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.current.nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.current.ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    const onEnter = () => { pointer.current.inside = true; };
    const onLeave = () => { pointer.current.inside = false; drag.current.active = false; };
    const onMove = (e: PointerEvent) => {
      setPointerFromEvent(e);
      pointer.current.inside = true;
      if (drag.current.active) {
        const dx = e.clientX - drag.current.px;
        const dy = e.clientY - drag.current.py;
        vel.current.y = dx * 0.010;
        vel.current.x = dy * 0.010;
        tiltTarget.current.y += dx * 0.010;
        tiltTarget.current.x += dy * 0.010;
        drag.current.px = e.clientX;
        drag.current.py = e.clientY;
      }
    };
    const onDown = (e: PointerEvent) => {
      if (coarse) return; // en táctil no secuestramos el gesto (deja el scroll vertical)
      drag.current.active = true;
      drag.current.px = e.clientX;
      drag.current.py = e.clientY;
      vel.current.x = 0; vel.current.y = 0;
      canvas.setPointerCapture?.(e.pointerId);
    };
    const onUp = () => { drag.current.active = false; };

    canvas.addEventListener('pointerenter', onEnter);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    const render = () => {
      if (!visible) return;
      time += reduce ? 0.0015 : 0.006;

      // Inclinación objetivo: hogar (0.32,0.5) + desplazamiento del puntero.
      if (!drag.current.active) {
        const px = pointer.current.inside ? pointer.current.nx : 0;
        const py = pointer.current.inside ? pointer.current.ny : 0;
        autoSpin.current += reduce ? 0.0008 : 0.0016;
        tiltTarget.current.y = 0.5 + autoSpin.current + px * 0.42;
        tiltTarget.current.x = 0.32 + py * 0.32 + Math.sin(time * 0.5) * (reduce ? 0.02 : 0.06);
        // inercia residual del arrastre
        tiltTarget.current.y += vel.current.y;
        tiltTarget.current.x += vel.current.x;
        vel.current.x *= 0.9;
        vel.current.y *= 0.9;
      }
      tilt.current.x += (tiltTarget.current.x - tilt.current.x) * 0.08;
      tilt.current.y += (tiltTarget.current.y - tilt.current.y) * 0.08;
      tilt.current.x = clamp(tilt.current.x, -0.9, 1.4);

      ctx.clearRect(0, 0, W, H);
      const cx = W / 2;
      const cy = H / 2;
      // Factor de encuadre: escala todo el conjunto al tamaño del lienzo para
      // que NUNCA se recorte (problema detectado en auditoría). 520 ≈ tamaño
      // de diseño de referencia.
      const fit = Math.min(W, H) / 520;
      const cosGY = Math.cos(tilt.current.y), sinGY = Math.sin(tilt.current.y);
      const cosGX = Math.cos(tilt.current.x), sinGX = Math.sin(tilt.current.x);
      const DIST = 900;

      // Parallax del puntero (px reales).
      const parX = (pointer.current.inside ? pointer.current.nx : 0) * 22;
      const parY = (pointer.current.inside ? pointer.current.ny : 0) * 22;

      type RFace = { pts: { x: number; y: number }[]; depth: number; color: Cube['color']; shade: number };
      type RCube = { faces: RFace[]; cx: number; cy: number; depth: number; r: number; color: Cube['color']; glow: number };
      const renderCubes: RCube[] = [];

      for (const cube of cubes) {
        // Imantación: cubo cuyo hogar (proyectado aprox) está más cerca del puntero brilla.
        const homeScreenX = cube.hx / 2;
        const homeScreenY = cube.hy / 2;
        const near = pointer.current.inside
          ? 1 - clamp(Math.hypot(pointer.current.nx * 140 - homeScreenX, pointer.current.ny * 140 - homeScreenY) / 200, 0, 1)
          : 0;
        cube.glow += (near - cube.glow) * 0.08;

        // Balanceo orgánico alrededor del hogar.
        const t = time + cube.phase;
        const tx = cube.hx + Math.sin(t * 0.6) * 14 + Math.cos(t * 0.27) * 8;
        const ty = cube.hy + Math.cos(t * 0.5) * 12 + Math.sin(t * 0.33) * 6;
        const tz = cube.hz + Math.sin(t * 0.44) * 22;
        cube.x += (tx - cube.x) * 0.05;
        cube.y += (ty - cube.y) * 0.05;
        cube.z += (tz - cube.z) * 0.05;

        const spinBoost = 1 + cube.glow * 1.6;
        cube.rx += cube.sx * spinBoost * (reduce ? 0.3 : 1);
        cube.ry += cube.sy * spinBoost * (reduce ? 0.3 : 1);
        cube.rz += cube.sz * (reduce ? 0.3 : 1);
        const liveScale = cube.scale * (1 + cube.glow * 0.12);

        const cosLX = Math.cos(cube.rx), sinLX = Math.sin(cube.rx);
        const cosLY = Math.cos(cube.ry), sinLY = Math.sin(cube.ry);
        const cosLZ = Math.cos(cube.rz), sinLZ = Math.sin(cube.rz);

        const proj: { x: number; y: number; z: number }[] = [];
        for (const v of CUBE_VERTICES) {
          let vx = v.x * liveScale, vy = v.y * liveScale, vz = v.z * liveScale;
          // rot local X
          let y1 = vy * cosLX - vz * sinLX, z1 = vy * sinLX + vz * cosLX;
          // rot local Y
          let x2 = vx * cosLY + z1 * sinLY, z2 = -vx * sinLY + z1 * cosLY;
          // rot local Z
          let x3 = x2 * cosLZ - y1 * sinLZ, y3 = x2 * sinLZ + y1 * cosLZ;
          // traslación al hogar + parallax por profundidad
          let gx = x3 + cube.x + parX * cube.parallax;
          let gy = y3 + cube.y + parY * cube.parallax;
          let gz = z2 + cube.z;
          // rotación global (tilt)
          const rxx = gx * cosGY - gz * sinGY;
          const rzz = gx * sinGY + gz * cosGY;
          const ryy = gy * cosGX - rzz * sinGX;
          const rzz2 = gy * sinGX + rzz * cosGX;
          const k = DIST / (DIST - rzz2);
          proj.push({ x: cx + rxx * k * fit, y: cy + ryy * k * fit, z: rzz2 });
        }

        const faces: RFace[] = [];
        let centerZ = 0;
        for (const v of proj) centerZ += v.z;
        centerZ /= proj.length;

        for (const f of CUBE_FACES) {
          const p = f.map((i) => proj[i]);
          const v0x = p[1].x - p[0].x, v0y = p[1].y - p[0].y;
          const v1x = p[2].x - p[0].x, v1y = p[2].y - p[0].y;
          const nz = v0x * v1y - v0y * v1x;
          if (nz <= 0) continue; // backface
          const depth = (p[0].z + p[1].z + p[2].z + p[3].z) / 4;
          const area = Math.abs(nz);
          const shade = clamp(area / (liveScale * liveScale * 3.0), 0.25, 1);
          faces.push({ pts: p.map((q) => ({ x: q.x, y: q.y })), depth, color: cube.color, shade });
        }
        faces.sort((a, b) => a.depth - b.depth);

        // Centro proyectado (para situar el glow radial).
        let sumx = 0, sumy = 0;
        for (const v of proj) { sumx += v.x; sumy += v.y; }
        const projCenterK = DIST / (DIST - centerZ);
        renderCubes.push({
          faces,
          cx: sumx / proj.length,
          cy: sumy / proj.length,
          depth: centerZ,
          r: liveScale * 2.4 * projCenterK * fit,
          color: cube.color,
          glow: cube.glow,
        });
      }

      // Ordenar cubos por profundidad (los de atrás primero).
      renderCubes.sort((a, b) => a.depth - b.depth);

      // 1) Glows radiales detrás de todo.
      ctx.globalCompositeOperation = 'lighter';
      for (const rc of renderCubes) {
        const g = ctx.createRadialGradient(rc.cx, rc.cy, 0, rc.cx, rc.cy, rc.r);
        const base = PALETTE[rc.color].glow;
        g.addColorStop(0, base.replace(/0\.\d+\)/, `${(0.28 + rc.glow * 0.4).toFixed(2)})`));
        g.addColorStop(1, base.replace(/0\.\d+\)/, '0)'));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(rc.cx, rc.cy, rc.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // 2) Caras cromadas.
      for (const rc of renderCubes) {
        for (const face of rc.faces) {
          const { pts, color, shade } = face;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();

          const grad = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[2].x, pts[2].y);
          for (const [stop, col] of PALETTE[color].stops) grad.addColorStop(stop, col);
          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.55 + shade * 0.45;
          ctx.fill();
          ctx.globalAlpha = 1;

          ctx.strokeStyle = PALETTE[color].edge;
          ctx.lineWidth = 1.4;
          ctx.stroke();

          // Reflejo especular en una arista.
          ctx.strokeStyle = `rgba(255,255,255,${(0.35 + rc.glow * 0.4).toFixed(2)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.stroke();
        }
      }
    };

    const loop = () => {
      render();
      if (!reduce) raf = requestAnimationFrame(loop);  // reduced-motion: un frame estático
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('pointerenter', onEnter);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-transparent cursor-grab active:cursor-grabbing overflow-hidden outline-none touch-pan-y select-none"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
    </div>
  );
}
