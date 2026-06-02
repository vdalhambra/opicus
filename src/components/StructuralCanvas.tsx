import React, { useEffect, useRef } from 'react';

/**
 * Hero de Opicus: malla estructural abstracta (celosía / membrana de
 * elementos finitos) en 2.5D. Una superficie triangulada que ondula muy
 * suavemente, como bajo carga; cada miembro se tiñe de acero → cian → índigo
 * según su deformación (proxy de tensión) y el puntero actúa como una "sonda"
 * que ilumina la zona próxima, igual que al inspeccionar un mapa de esfuerzos.
 *
 * Sin figuras humanas. Mismo registro nocturno/técnico de la marca.
 * Lienzo pointer-events-none: el parallax y la sonda se calculan a nivel de
 * ventana. Va detrás del titular (el scrim del Hero da legibilidad a la izq.).
 * Respeta prefers-reduced-motion: la malla queda congelada en una pose.
 */

const FOCAL = 620;
const TILT = 0.92; // inclinación del plano (rad) → perspectiva del mapa de tensiones
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

type Node = { px: number; pz: number; sx: number; sy: number; dy: number; depth: number };

export default function StructuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef({ x: 0, y: 0, inside: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mo = reduce ? 0 : 1;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, time = 0, raf = 0, visible = true;

    let cols = 0, rows = 0, cell = 0;
    let nodes: Node[] = [];
    let edges: number[][] = [];

    // Reconstruye la retícula triangulada al cambiar el tamaño. Triángulos =
    // miembros horizontales + verticales + una diagonal por celda (truss).
    const build = () => {
      const sizeScale = clamp(Math.min(W, H) / 760, 0.55, 1.2);
      cell = 92 * sizeScale;
      cols = clamp(Math.round(W / cell) + 3, 6, 20);
      rows = clamp(Math.round(H / cell) + 1, 5, 14);
      nodes = [];
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++)
          nodes.push({ px: (i - (cols - 1) / 2) * cell, pz: (j - (rows - 1) / 2) * cell, sx: 0, sy: 0, dy: 0, depth: 0 });
      edges = [];
      const idx = (i: number, j: number) => j * cols + i;
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          if (i < cols - 1) edges.push([idx(i, j), idx(i + 1, j)]);
          if (j < rows - 1) edges.push([idx(i, j), idx(i, j + 1)]);
          if (i < cols - 1 && j < rows - 1) edges.push([idx(i, j), idx(i + 1, j + 1)]);
        }
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = container.clientWidth; H = container.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };
    const ro = new ResizeObserver(resize); ro.observe(container); resize();
    const io = new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true; }, { threshold: 0.01 });
    io.observe(container);

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.current.x = e.clientX - r.left;
      pointer.current.y = e.clientY - r.top;
      pointer.current.inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const render = () => {
      if (!visible) { raf = requestAnimationFrame(render); return; }
      time += 0.006 * mo;
      ctx.clearRect(0, 0, W, H);

      const sizeScale = clamp(Math.min(W, H) / 760, 0.55, 1.2);
      const amp = cell * 0.42;
      const mpx = pointer.current.inside ? pointer.current.x / W - 0.5 : 0;
      const mpy = pointer.current.inside ? pointer.current.y / H - 0.5 : 0;
      const tilt = TILT + mpy * 0.12;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const cx = W * 0.5 + mpx * 40;
      const cy = H * 0.5 + mpy * 26;
      const radius = Math.max(W, H) * 0.85;

      // Desplazamiento vertical (carga) → proyección en perspectiva del plano.
      for (const n of nodes) {
        const wave =
          amp * (Math.sin(n.px * 0.012 + time * 0.9) + Math.sin(n.pz * 0.014 - time * 0.75) + Math.sin((n.px + n.pz) * 0.009 + time * 1.25)) * 0.5;
        n.dy = wave;
        const y1 = wave * ct - n.pz * st;
        const z1 = wave * st + n.pz * ct;
        const k = FOCAL / (FOCAL - z1);
        n.sx = cx + n.px * k;
        n.sy = cy - y1 * k;
        n.depth = z1;
      }

      // Miembros: tensión ≈ flexión relativa entre nodos + sonda del puntero.
      for (const e of edges) {
        const na = nodes[e[0]], nb = nodes[e[1]];
        const strain = clamp(Math.abs(na.dy - nb.dy) / (amp * 1.1), 0, 1);
        const mx = (na.sx + nb.sx) / 2, my = (na.sy + nb.sy) / 2;
        let probe = 0;
        if (pointer.current.inside) {
          const d = Math.hypot(pointer.current.x - mx, pointer.current.y - my);
          probe = clamp(1 - d / (150 * sizeScale), 0, 1);
        }
        const t = clamp(strain * 0.8 + probe * 0.9, 0, 1);
        const dc = Math.hypot(mx - cx, my - cy);
        const rad = smooth(clamp(1 - dc / radius, 0, 1));
        const depthFade = clamp((na.depth + nb.depth) / 2 / radius + 0.7, 0.35, 1);
        const a0 = (0.1 + t * 0.6) * rad * depthFade;
        if (a0 < 0.012) continue;

        // Acero → cian → índigo
        const s = smooth(t);
        const u = Math.min(s * 1.4, 1);
        let R = lerp(150, 34, u), G = lerp(163, 211, u), B = lerp(184, 238, u);
        if (s > 0.55) { const v = (s - 0.55) / 0.45; R = lerp(R, 99, v); G = lerp(G, 102, v); B = lerp(B, 241, v); }
        const rgb = `${R | 0},${G | 0},${B | 0}`;

        if (t > 0.45) {
          ctx.strokeStyle = `rgba(${rgb},${(a0 * 0.5).toFixed(3)})`;
          ctx.lineWidth = (1.2 + t * 2.4) * sizeScale;
          ctx.beginPath(); ctx.moveTo(na.sx, na.sy); ctx.lineTo(nb.sx, nb.sy); ctx.stroke();
        }
        ctx.strokeStyle = `rgba(${rgb},${a0.toFixed(3)})`;
        ctx.lineWidth = (0.5 + t * 0.9) * sizeScale;
        ctx.beginPath(); ctx.moveTo(na.sx, na.sy); ctx.lineTo(nb.sx, nb.sy); ctx.stroke();
      }

      // Nodos: punto fino; halo aditivo cuando están "calientes" o bajo la sonda.
      for (const n of nodes) {
        const dc = Math.hypot(n.sx - cx, n.sy - cy);
        const rad = smooth(clamp(1 - dc / radius, 0, 1));
        if (rad < 0.05) continue;
        let probe = 0;
        if (pointer.current.inside) {
          const d = Math.hypot(pointer.current.x - n.sx, pointer.current.y - n.sy);
          probe = clamp(1 - d / (120 * sizeScale), 0, 1);
        }
        const hot = clamp(Math.abs(n.dy) / amp * 0.7 + probe, 0, 1);
        const r = (1.1 + hot * 1.8) * sizeScale;
        if (hot > 0.35) {
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(n.sx, n.sy, 0, n.sx, n.sy, r * 6);
          g.addColorStop(0, `rgba(56,189,248,${(0.5 * hot * rad).toFixed(3)})`);
          g.addColorStop(1, 'rgba(56,189,248,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.sx, n.sy, r * 6, 0, Math.PI * 2); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.fillStyle = `rgba(${hot > 0.4 ? '186,230,253' : '203,213,225'},${((0.25 + hot * 0.7) * rad).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(n.sx, n.sy, r, 0, Math.PI * 2); ctx.fill();
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
    </div>
  );
}
