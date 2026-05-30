import React, { useEffect, useRef } from 'react';

/**
 * StructuralCanvas — campo de cubos cromados plateados, en movimiento
 * continuo y reactivos al cursor. Diseñado para ocupar todo el hero como
 * fondo (pointer-events-none): escucha el puntero a nivel de ventana, así
 * que reacciona sin bloquear los botones.
 *
 * Cada cubo: posición "hogar" normalizada (se reparte por todo el lienzo),
 * tamaño propio, tumble local 3D, y al acercar el ratón se agranda, gira
 * más rápido, brilla y se aparta (repulsión). Siempre animado (incluso con
 * movimiento reducido se mueve, más lento) — es la pieza viva de la marca.
 */

type V3 = { x: number; y: number; z: number };

interface Cube {
  nx: number; ny: number;        // hogar normalizado (-1..1) sobre el lienzo
  size: number;                  // tamaño base del cubo
  depth: number;                 // factor de parallax / orden de dibujo
  phase: number;
  rx: number; ry: number; rz: number;
  sx: number; sy: number; sz: number;  // velocidades de giro
  glow: number;                  // 0..1 reacción al cursor (suavizada)
  lastCx: number; lastCy: number;       // centro proyectado (frame anterior)
}

const CUBE_VERTICES: V3[] = [
  { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 },
  { x: 1, y: 1, z: -1 },   { x: -1, y: 1, z: -1 },
  { x: -1, y: -1, z: 1 },  { x: 1, y: -1, z: 1 },
  { x: 1, y: 1, z: 1 },    { x: -1, y: 1, z: 1 },
];
const CUBE_FACES = [
  [4, 5, 6, 7], [1, 0, 3, 2], [5, 1, 2, 6],
  [0, 4, 7, 3], [7, 6, 2, 3], [5, 4, 0, 1],
];

// Paleta cromada plateada (metal pulido): sombra → gris → especular blanco → gris → sombra.
const SILVER_STOPS: [number, string][] = [
  [0, '#2b2e33'], [0.18, '#8d949d'], [0.5, '#ffffff'], [0.78, '#c2c8d0'], [1, '#3a3e44'],
];
const SILVER_EDGE = '#eef1f5';
const SILVER_GLOW = 'rgba(200,212,228,';

// 11 cubos repartidos por todo el lienzo, tamaños variados.
const HOMES: Array<{ nx: number; ny: number; size: number; depth: number }> = [
  { nx: 0.60, ny: -0.55, size: 66, depth: 1.15 },
  { nx: -0.52, ny: -0.34, size: 40, depth: 0.8 },
  { nx: 0.86, ny: 0.12, size: 30, depth: 0.55 },
  { nx: 0.16, ny: 0.5, size: 52, depth: 0.95 },
  { nx: -0.82, ny: 0.34, size: 26, depth: 0.45 },
  { nx: 0.46, ny: 0.66, size: 58, depth: 1.25 },
  { nx: -0.18, ny: -0.12, size: 34, depth: 0.7 },
  { nx: 0.95, ny: -0.28, size: 24, depth: 0.4 },
  { nx: -0.66, ny: -0.78, size: 30, depth: 0.6 },
  { nx: 0.04, ny: -0.82, size: 44, depth: 0.85 },
  { nx: 0.74, ny: 0.82, size: 22, depth: 0.5 },
];

function makeCubes(): Cube[] {
  return HOMES.map((h, i) => ({
    nx: h.nx, ny: h.ny, size: h.size, depth: h.depth, phase: i * 1.37,
    rx: 0.3 + i * 0.21, ry: 0.5 + i * 0.17, rz: i * 0.11,
    sx: 0.0030 + (i % 4) * 0.0006, sy: 0.0024 + (i % 3) * 0.0007, sz: 0.0012 + (i % 5) * 0.0003,
    glow: 0, lastCx: 0, lastCy: 0,
  }));
}

export default function StructuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef({ nx: 0, ny: 0, inside: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mo = reduce ? 0.4 : 1; // los cubos SE MUEVEN siempre; con reduced-motion, más lento
    const cubes = makeCubes();
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, time = 0, raf = 0, visible = true;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = container.clientWidth; H = container.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const io = new IntersectionObserver(
      (e) => { visible = e[0]?.isIntersecting ?? true; },
      { threshold: 0.01 },
    );
    io.observe(container);

    // Puntero a nivel de ventana (el lienzo es pointer-events-none).
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      pointer.current.inside = x >= -0.05 && x <= 1.05 && y >= -0.05 && y <= 1.05;
      pointer.current.nx = x * 2 - 1;
      pointer.current.ny = y * 2 - 1;
    };
    const onLeave = () => { pointer.current.inside = false; };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerout', onLeave, { passive: true });

    const FOCAL = 420;

    const render = () => {
      if (!visible) return;
      time += 0.006 * mo;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      const sizeScale = Math.max(0.55, Math.min(1.25, Math.min(W, H) / 560));
      const ppx = (pointer.current.nx * 0.5 + 0.5) * W;
      const ppy = (pointer.current.ny * 0.5 + 0.5) * H;
      const parX = (pointer.current.inside ? pointer.current.nx : 0) * 26;
      const parY = (pointer.current.inside ? pointer.current.ny : 0) * 16;
      const R = 190 * sizeScale;

      interface RC { faces: { pts: { x: number; y: number }[]; depth: number; shade: number }[]; cx: number; cy: number; depth: number; r: number; glow: number; }
      const list: RC[] = [];

      for (const c of cubes) {
        // Reacción al cursor (proximidad respecto al centro del frame anterior).
        const d = Math.hypot(c.lastCx - ppx, c.lastCy - ppy);
        const prox = pointer.current.inside ? Math.max(0, 1 - d / R) : 0;
        c.glow += (prox - c.glow) * 0.12;

        const t = time + c.phase;
        const bobX = Math.sin(t * 0.6) * 16 + Math.cos(t * 0.27) * 8;
        const bobY = Math.cos(t * 0.5) * 14 + Math.sin(t * 0.33) * 7;

        let homeX = cx + c.nx * W * 0.46 + bobX + parX * c.depth;
        let homeY = cy + c.ny * H * 0.44 + bobY + parY * c.depth;
        // Repulsión: el cubo se aparta del cursor.
        if (c.glow > 0.01 && pointer.current.inside) {
          const dx = c.lastCx - ppx, dy = c.lastCy - ppy;
          const dd = Math.hypot(dx, dy) || 1;
          homeX += (dx / dd) * c.glow * 30;
          homeY += (dy / dd) * c.glow * 30;
        }

        const boost = 1 + c.glow * 2.4;
        c.rx += c.sx * mo * boost;
        c.ry += c.sy * mo * boost;
        c.rz += c.sz * mo;

        const s = c.size * sizeScale * (1 + c.glow * 0.5);
        const cosX = Math.cos(c.rx), sinX = Math.sin(c.rx);
        const cosY = Math.cos(c.ry), sinY = Math.sin(c.ry);
        const cosZ = Math.cos(c.rz), sinZ = Math.sin(c.rz);

        const proj: { x: number; y: number; z: number }[] = [];
        for (const v of CUBE_VERTICES) {
          const vx = v.x * s, vy = v.y * s, vz = v.z * s;
          const y1 = vy * cosX - vz * sinX, z1 = vy * sinX + vz * cosX;
          const x2 = vx * cosY + z1 * sinY, z2 = -vx * sinY + z1 * cosY;
          const x3 = x2 * cosZ - y1 * sinZ, y3 = x2 * sinZ + y1 * cosZ;
          const k = FOCAL / (FOCAL - z2);
          proj.push({ x: homeX + x3 * k, y: homeY + y3 * k, z: z2 });
        }

        const faces: RC['faces'] = [];
        for (const f of CUBE_FACES) {
          const p = f.map((i) => proj[i]);
          const nz = (p[1].x - p[0].x) * (p[2].y - p[0].y) - (p[1].y - p[0].y) * (p[2].x - p[0].x);
          if (nz <= 0) continue;
          const depth = (p[0].z + p[1].z + p[2].z + p[3].z) / 4;
          const shade = Math.max(0.28, Math.min(1, Math.abs(nz) / (s * s * 3)));
          faces.push({ pts: p.map((q) => ({ x: q.x, y: q.y })), depth, shade });
        }
        faces.sort((a, b) => a.depth - b.depth);

        c.lastCx = homeX; c.lastCy = homeY;
        list.push({ faces, cx: homeX, cy: homeY, depth: c.depth, r: s * 2.4, glow: c.glow });
      }

      list.sort((a, b) => a.depth - b.depth);

      // Glows plateados detrás.
      ctx.globalCompositeOperation = 'lighter';
      for (const rc of list) {
        const g = ctx.createRadialGradient(rc.cx, rc.cy, 0, rc.cx, rc.cy, rc.r);
        g.addColorStop(0, SILVER_GLOW + (0.10 + rc.glow * 0.45).toFixed(2) + ')');
        g.addColorStop(1, SILVER_GLOW + '0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(rc.cx, rc.cy, rc.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // Caras cromadas.
      for (const rc of list) {
        for (const face of rc.faces) {
          const { pts, shade } = face;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();
          const grad = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[2].x, pts[2].y);
          for (const [stop, col] of SILVER_STOPS) grad.addColorStop(stop, col);
          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.5 + shade * 0.5;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = SILVER_EDGE;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${(0.32 + rc.glow * 0.45).toFixed(2)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerout', onLeave);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
    </div>
  );
}
