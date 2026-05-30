import React, { useEffect, useRef } from 'react';

/**
 * Hero de Opicus: crew de monigotes cromados en POSES FIJAS y deliberadas
 * (fiel a la imagen de referencia), con utensilios SUJETOS por las manos.
 * QUIETOS al 100%: sin flotación ni caminata. Sólo reaccionan al ratón.
 *
 * - 1 monigote PRINCIPAL: más grande, cabeza en azul gradiente, SIN herramienta.
 *   Va al FRENTE (derecha) liderando la marcha, separado del resto.
 * - La cuadrilla (de atrás a delante): llave fija al hombro, metro tensando la
 *   cinta, alicates agachado y lupa inspeccionando. Cada utensilio se ancla a la
 *   mano calculada según la pose y se modela con detalle (boca, aro, cinta…).
 * - Al pasar el ratón: se giran un poco hacia ti y se ILUMINAN en azul.
 * - Arrastrables (hit-test a nivel de ventana; lienzo pointer-events-none).
 * - Orden de pintado por CAPA anatómica fija: piernas < cuerpo < brazos <
 *   cabeza < herramientas. La profundidad solo desempata dentro de cada capa.
 */

type V3 = { x: number; y: number; z: number };
type Stops = [number, string][];
type Joint = 'armA' | 'armB' | 'legA' | 'legB';
type Pose = { armA: number; armB: number; legA: number; legB: number; lean: number };

const UNIT: V3[] = [
  { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
  { x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 }, { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 },
];
const FACES = [[4, 5, 6, 7], [1, 0, 3, 2], [5, 1, 2, 6], [0, 4, 7, 3], [7, 6, 2, 3], [5, 4, 0, 1]];
const SILVER: Stops = [[0, '#2b2e33'], [0.18, '#8d949d'], [0.5, '#ffffff'], [0.78, '#c2c8d0'], [1, '#3a3e44']];
const BLUE: Stops = [[0, '#0b3a52'], [0.2, '#22d3ee'], [0.5, '#eafdff'], [0.78, '#7dd3fc'], [1, '#4f46e5']];
const EDGE = '#eef1f5';
const FOCAL = 620;
const ARM_LEN = 36; // del hombro (y=82) a la mano (y=46)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rotX = (p: V3, a: number): V3 => ({ x: p.x, y: p.y * Math.cos(a) - p.z * Math.sin(a), z: p.y * Math.sin(a) + p.z * Math.cos(a) });
// Mano (espacio de figura) según el ángulo del brazo.
const handPt = (pivX: number, a: number): V3 => ({ x: pivX, y: 82 - ARM_LEN * Math.cos(a), z: -ARM_LEN * Math.sin(a) });

// layer = capa anatómica fija de pintado (mayor = más al frente):
// piernas(0) < cuerpo(1) < brazos(2) < cabeza(3) < herramientas(4, en código).
// La profundidad z solo desempata DENTRO de cada capa, nunca entre capas.
interface Part { cx: number; cy: number; cz: number; hx: number; hy: number; hz: number; piv?: V3; joint?: Joint; layer: number; head?: boolean; }
const PARTS: Part[] = [
  { cx: 0, cy: 104, cz: 0, hx: 17, hy: 17, hz: 16, layer: 3, head: true },
  { cx: 0, cy: 64, cz: 0, hx: 15, hy: 22, hz: 9, layer: 1 },
  { cx: -23, cy: 64, cz: 0, hx: 5.2, hy: 18, hz: 5.2, piv: { x: -23, y: 82, z: 0 }, joint: 'armA', layer: 2 },
  { cx: 23, cy: 64, cz: 0, hx: 5.2, hy: 18, hz: 5.2, piv: { x: 23, y: 82, z: 0 }, joint: 'armB', layer: 2 },
  { cx: -7.5, cy: 21, cz: 0, hx: 6.2, hy: 21, hz: 6.2, piv: { x: -7.5, y: 42, z: 0 }, joint: 'legA', layer: 0 },
  { cx: 7.5, cy: 21, cz: 0, hx: 6.2, hy: 21, hz: 6.2, piv: { x: 7.5, y: 42, z: 0 }, joint: 'legB', layer: 0 },
];

type Item = { kind: 'box'; cx: number; cy: number; cz: number; hx: number; hy: number; hz: number; zbias: number; rx?: number; rz?: number }
  | { kind: 'ring'; cx: number; cy: number; cz: number; r: number; zbias: number };

// Utensilio anclado a las manos posadas (hL = izq, hR = der). Cada herramienta
// se modela fiel a la imagen de referencia, integrada en la mano calculada.
function toolItems(tool: string, hL: V3, hR: V3): Item[] {
  const midY = (hL.y + hR.y) / 2, midZ = (hL.z + hR.z) / 2;
  switch (tool) {
    case 'llave': // llave fija al hombro: mango largo + boca abierta (dos puntas) al extremo
      return [
        { kind: 'box', cx: hR.x, cy: hR.y + 13, cz: hR.z, hx: 1.9, hy: 13, hz: 1.9, zbias: 6 },
        { kind: 'box', cx: hR.x - 2.6, cy: hR.y + 26, cz: hR.z, hx: 1.1, hy: 4, hz: 1.7, zbias: 7 },
        { kind: 'box', cx: hR.x + 2.6, cy: hR.y + 26, cz: hR.z, hx: 1.1, hy: 4, hz: 1.7, zbias: 7 },
      ];
    case 'metro': // carcasa en la mano derecha + cinta tensada entre las dos manos
      return [
        { kind: 'box', cx: hR.x, cy: hR.y, cz: hR.z, hx: 5, hy: 6, hz: 4, zbias: 6 },
        { kind: 'box', cx: 0, cy: midY, cz: midZ, hx: Math.max(8, Math.abs(hR.x - hL.x) / 2), hy: 1.5, hz: 0.5, zbias: 5 },
      ];
    case 'alicates': // alicates al frente y abajo: dos mangos + boca abierta en V hacia delante
      return [
        { kind: 'box', cx: hR.x, cy: hR.y, cz: hR.z + 3, hx: 2, hy: 2.4, hz: 7, zbias: 6 },
        { kind: 'box', cx: hR.x, cy: hR.y + 2.6, cz: hR.z + 11, hx: 1.3, hy: 1.1, hz: 5, rx: -0.5, zbias: 7 },
        { kind: 'box', cx: hR.x, cy: hR.y - 2.6, cz: hR.z + 11, hx: 1.3, hy: 1.1, hz: 5, rx: 0.5, zbias: 7 },
      ];
    case 'lupa': // lupa en alto inspeccionando: mango fino + aro de la lente
      return [
        { kind: 'box', cx: hR.x, cy: hR.y - 6, cz: hR.z, hx: 1.4, hy: 6, hz: 1.4, zbias: 6 },
        { kind: 'ring', cx: hR.x, cy: hR.y + 4, cz: hR.z, r: 8, zbias: 7 },
      ];
    default: return [];
  }
}

interface Fig {
  hx: number; hy: number; ax: number; ay: number; scale: number; phase: number;
  baseFace: number; face: number; faceT: number; tilt: number; hover: number;
  pose: Pose; main?: boolean; tool?: string; bbox: { x0: number; y0: number; x1: number; y1: number };
}
// Poses fijas (rad; ángulo negativo = brazo hacia delante/arriba, hacia cámara).
// Orden L→R según la imagen: la cuadrilla con utensilios y, al frente (derecha),
// el monigote PRINCIPAL de cabeza azul SIN herramienta liderando la marcha.
const FIG_DEFS: Omit<Fig, 'ax' | 'ay' | 'face' | 'faceT' | 'tilt' | 'hover' | 'phase' | 'bbox'>[] = [
  // Llave fija al hombro: brazo derecho en alto, herramienta apoyada arriba.
  { hx: 0.42, hy: 0.75, scale: 1.18, baseFace: 0.42, tool: 'llave', pose: { armA: 0.28, armB: -2.1, legA: 0.26, legB: -0.16, lean: -0.08 } },
  // Metro: ambos brazos al frente tensando la cinta, leve inclinación.
  { hx: 0.55, hy: 0.78, scale: 1.32, baseFace: 0.3, tool: 'metro', pose: { armA: -1.18, armB: -1.02, legA: 0.16, legB: -0.16, lean: -0.06 } },
  // Alicates: agachado, brazo derecho al frente y abajo sujetando la herramienta.
  { hx: 0.67, hy: 0.84, scale: 1.4, baseFace: 0.32, tool: 'alicates', pose: { armA: 0.2, armB: -1.3, legA: 0.82, legB: -0.5, lean: -0.28 } },
  // Lupa: agachado inspeccionando, brazo derecho en alto con la lupa a la cara.
  { hx: 0.785, hy: 0.82, scale: 1.38, baseFace: 0.36, tool: 'lupa', pose: { armA: 0.24, armB: -1.95, legA: 0.6, legB: -0.3, lean: -0.18 } },
  // PRINCIPAL: cabeza azul, sin utensilio. Andando hacia la DERECHA, al frente, liderando.
  { hx: 0.9, hy: 0.88, scale: 1.95, baseFace: 0.5, main: true, pose: { armA: 0.42, armB: -0.4, legA: 0.34, legB: -0.3, lean: 0.04 } },
];

interface Cube { nx: number; ny: number; size: number; depth: number; phase: number; rx: number; ry: number; rz: number; sx: number; sy: number; sz: number; }
const CUBE_DEFS = [
  { nx: -0.85, ny: -0.6, size: 30, depth: 0.4 }, { nx: 0.9, ny: -0.55, size: 26, depth: 0.35 },
  { nx: 0.1, ny: -0.82, size: 32, depth: 0.5 }, { nx: -0.5, ny: -0.85, size: 22, depth: 0.3 },
  { nx: 0.55, ny: -0.86, size: 24, depth: 0.32 }, { nx: -0.95, ny: 0.1, size: 20, depth: 0.28 },
  { nx: 0.96, ny: 0.05, size: 28, depth: 0.45 }, { nx: -0.2, ny: -0.55, size: 18, depth: 0.25 },
];

function boxFaces(proj: { x: number; y: number; z: number }[], scaleRef: number) {
  const out: { pts: { x: number; y: number }[]; depth: number; shade: number }[] = [];
  for (const f of FACES) {
    const p = f.map((i) => proj[i]);
    const nz = (p[1].x - p[0].x) * (p[2].y - p[0].y) - (p[1].y - p[0].y) * (p[2].x - p[0].x);
    if (nz <= 0) continue;
    out.push({
      pts: p.map((q) => ({ x: q.x, y: q.y })),
      depth: (p[0].z + p[1].z + p[2].z + p[3].z) / 4,
      shade: clamp(Math.abs(nz) / (scaleRef * scaleRef * 3.2), 0.28, 1),
    });
  }
  return out;
}

export default function StructuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef({ x: 0, y: 0, inside: false });
  const drag = useRef<{ idx: number; ox: number; oy: number }>({ idx: -1, ox: 0, oy: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mo = reduce ? 0.4 : 1;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, time = 0, raf = 0, visible = true;

    const figs: Fig[] = FIG_DEFS.map((d) => ({
      ...d, ax: 0, ay: 0, face: d.baseFace, faceT: d.baseFace, tilt: d.pose.lean, hover: 0,
      phase: Math.abs((d.hx * 9.13) % 6.28), bbox: { x0: 0, y0: 0, x1: 0, y1: 0 },
    }));
    const cubes: Cube[] = CUBE_DEFS.map((c, i) => ({
      ...c, phase: i * 1.7, rx: i * 0.4, ry: i * 0.3, rz: i * 0.2,
      sx: 0.0016 + (i % 3) * 0.0004, sy: 0.0013 + (i % 4) * 0.0003, sz: 0.0008,
    }));

    const placeFigs = () => {
      const mob = W < 700;
      figs.forEach((f, i) => {
        if (mob) { f.ax = (0.13 + (i * 0.74) / (figs.length - 1)) * W; f.ay = (0.72 + (i % 2) * 0.11) * H; }
        else { f.ax = f.hx * W; f.ay = f.hy * H; }
      });
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = container.clientWidth; H = container.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); placeFigs();
    };
    const ro = new ResizeObserver(resize); ro.observe(container); resize();
    const io = new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true; }, { threshold: 0.01 });
    io.observe(container);

    const rel = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, in: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom }; };
    const onMove = (e: PointerEvent) => {
      const p = rel(e); pointer.current.x = p.x; pointer.current.y = p.y; pointer.current.inside = p.in;
      if (drag.current.idx >= 0) { const f = figs[drag.current.idx]; f.ax = clamp(p.x - drag.current.ox, 40, W - 40); f.ay = clamp(p.y - drag.current.oy, 90, H - 8); }
    };
    const onDown = (e: PointerEvent) => {
      const p = rel(e); if (!p.in) return;
      let pick = -1;
      for (let i = 0; i < figs.length; i++) { const b = figs[i].bbox; if (p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1) { if (pick < 0 || figs[i].ay > figs[pick].ay) pick = i; } }
      if (pick >= 0) { drag.current = { idx: pick, ox: p.x - figs[pick].ax, oy: p.y - figs[pick].ay }; document.body.style.cursor = 'grabbing'; }
    };
    const onUp = () => { drag.current.idx = -1; document.body.style.cursor = ''; };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });

    const paintFaces = (faces: { pts: { x: number; y: number }[]; depth: number; shade: number }[], baseAlpha: number, stops: Stops, spec: number, tint: number) => {
      faces.sort((a, b) => a.depth - b.depth);
      for (const f of faces) {
        const { pts, shade } = f;
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        const g = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[2].x, pts[2].y);
        for (const [s, c] of stops) g.addColorStop(s, c);
        ctx.globalAlpha = baseAlpha; ctx.fillStyle = g; ctx.fill();
        ctx.fillStyle = '#080a10'; ctx.globalAlpha = baseAlpha * (1 - shade) * 0.55; ctx.fill();
        if (tint > 0.01) { ctx.fillStyle = '#38bdf8'; ctx.globalAlpha = baseAlpha * tint * 0.45; ctx.fill(); }
        ctx.globalAlpha = baseAlpha * 0.4; ctx.strokeStyle = EDGE; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = spec > 0.05 ? `rgba(125,211,252,${(0.35 + spec).toFixed(2)})` : 'rgba(255,255,255,0.24)';
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); ctx.stroke();
      }
    };

    const drawCube = (c: Cube, sizeScale: number, parX: number, parY: number) => {
      const t = time + c.phase;
      c.rx += c.sx * mo; c.ry += c.sy * mo; c.rz += c.sz * mo;
      const hx = W / 2 + c.nx * W * 0.5 + Math.sin(t * 0.4) * 6 + parX * c.depth;
      const hy = H / 2 + c.ny * H * 0.5 + Math.cos(t * 0.4) * 5 + parY * c.depth;
      const s = c.size * sizeScale;
      const cX = Math.cos(c.rx), sX = Math.sin(c.rx), cY = Math.cos(c.ry), sY = Math.sin(c.ry), cZ = Math.cos(c.rz), sZ = Math.sin(c.rz);
      const proj = UNIT.map((v) => {
        const vx = v.x * s, vy = v.y * s, vz = v.z * s;
        const y1 = vy * cX - vz * sX, z1 = vy * sX + vz * cX;
        const x2 = vx * cY + z1 * sY, z2 = -vx * sY + z1 * cY;
        const x3 = x2 * cZ - y1 * sZ, y3 = x2 * sZ + y1 * cZ;
        const k = FOCAL / (FOCAL - z2);
        return { x: hx + x3 * k, y: hy + y3 * k, z: z2 };
      });
      paintFaces(boxFaces(proj, s), 0.34, SILVER, 0.03, 0);
    };

    const drawFig = (f: Fig, sizeScale: number) => {
      // Monigotes 100% quietos: SIN flotación. Solo reaccionan al pasar el ratón.
      const dist = pointer.current.inside ? Math.hypot(pointer.current.x - f.ax, pointer.current.y - (f.ay - 90 * f.scale * sizeScale)) : 9999;
      const near = clamp(1 - dist / (210 * sizeScale), 0, 1);
      f.hover += (near - f.hover) * 0.1;
      const dx = pointer.current.inside ? pointer.current.x - f.ax : 0;
      f.faceT = f.baseFace + (f.hover > 0.05 ? clamp(dx * 0.0025, -0.5, 0.5) : 0);
      f.face += (f.faceT - f.face) * 0.08;
      f.tilt += ((f.pose.lean - f.hover * 0.05) - f.tilt) * 0.08;

      const sc = f.scale * sizeScale * (1 + f.hover * 0.1);
      const cF = Math.cos(f.face), sF = Math.sin(f.face);
      const ax = f.ax, ay = f.ay;
      const tf = (p0: V3) => {
        const q = rotX(p0, f.tilt);
        const rx = q.x * cF + q.z * sF, rz = -q.x * sF + q.z * cF;
        const X = rx * sc, Y = q.y * sc, Z = rz * sc;
        const k = FOCAL / (FOCAL - Z);
        return { x: ax + X * k, y: ay - Y * k, z: Z };
      };

      type Rend = { key: number } & ({ t: 'box'; faces: ReturnType<typeof boxFaces>; stops: Stops } | { t: 'ring'; cx: number; cy: number; r: number });
      const rs: Rend[] = [];
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      const acc = (px: number, py: number) => { if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; };

      for (const part of PARTS) {
        const a = part.joint ? f.pose[part.joint] : 0;
        const proj = UNIT.map((u) => {
          let p: V3 = { x: part.cx + u.x * part.hx, y: part.cy + u.y * part.hy, z: part.cz + u.z * part.hz };
          if (part.piv && a) { p = rotX({ x: p.x - part.piv.x, y: p.y - part.piv.y, z: p.z - part.piv.z }, a); p = { x: p.x + part.piv.x, y: p.y + part.piv.y, z: p.z + part.piv.z }; }
          const s = tf(p); acc(s.x, s.y); return s;
        });
        let cz = 0; for (const s of proj) cz += s.z; cz /= 8;
        rs.push({ key: part.layer * 1000 + cz, t: 'box', faces: boxFaces(proj, Math.max(part.hx, part.hy) * sc), stops: f.main && part.head ? BLUE : SILVER });
      }
      if (f.tool) {
        const hL = handPt(-23, f.pose.armA), hR = handPt(23, f.pose.armB);
        for (const it of toolItems(f.tool, hL, hR)) {
          if (it.kind === 'box') {
            const crx = Math.cos(it.rx ?? 0), srx = Math.sin(it.rx ?? 0);
            const crz = Math.cos(it.rz ?? 0), srz = Math.sin(it.rz ?? 0);
            const proj = UNIT.map((u) => {
              let p: V3 = { x: u.x * it.hx, y: u.y * it.hy, z: u.z * it.hz };
              if (it.rx) p = { x: p.x, y: p.y * crx - p.z * srx, z: p.y * srx + p.z * crx };
              if (it.rz) p = { x: p.x * crz - p.y * srz, y: p.x * srz + p.y * crz, z: p.z };
              const s = tf({ x: it.cx + p.x, y: it.cy + p.y, z: it.cz + p.z }); acc(s.x, s.y); return s;
            });
            let cz = 0; for (const s of proj) cz += s.z; cz /= 8;
            rs.push({ key: 4000 + it.zbias * 10 + cz, t: 'box', faces: boxFaces(proj, Math.max(it.hx, it.hy) * sc), stops: SILVER });
          } else {
            const c = tf({ x: it.cx, y: it.cy, z: it.cz }); const k = FOCAL / (FOCAL - c.z);
            acc(c.x - it.r * sc * k, c.y - it.r * sc * k); acc(c.x + it.r * sc * k, c.y + it.r * sc * k);
            rs.push({ key: 4000 + it.zbias * 10 + c.z, t: 'ring', cx: c.x, cy: c.y, r: it.r * sc * k });
          }
        }
      }
      f.bbox = { x0, y0, x1, y1 };

      if (f.hover > 0.02) {
        const gx = (x0 + x1) / 2, gy = (y0 + y1) / 2, rad = Math.max(x1 - x0, y1 - y0) * 1.0;
        ctx.globalCompositeOperation = 'lighter';
        const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
        gg.addColorStop(0, `rgba(56,189,248,${(0.6 * f.hover).toFixed(2)})`);
        gg.addColorStop(0.45, `rgba(99,102,241,${(0.32 * f.hover).toFixed(2)})`);
        gg.addColorStop(1, 'rgba(99,102,241,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(gx, gy, rad, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }

      rs.sort((a, b) => a.key - b.key);
      for (const r of rs) {
        if (r.t === 'box') paintFaces(r.faces, 1, r.stops, f.hover * 0.55, f.hover);
        else {
          ctx.globalAlpha = 0.55 + f.hover * 0.3;
          ctx.strokeStyle = f.hover > 0.05 ? 'rgba(125,211,252,0.95)' : EDGE;
          ctx.lineWidth = Math.max(1.6, 2.6 * sc * 0.5);
          ctx.beginPath(); ctx.ellipse(r.cx, r.cy, r.r, r.r * 0.94, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 0.12 + f.hover * 0.2; ctx.fillStyle = f.hover > 0.05 ? '#7dd3fc' : '#cfd6df';
          ctx.beginPath(); ctx.ellipse(r.cx, r.cy, r.r * 0.78, r.r * 0.73, 0, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    };

    const render = () => {
      if (!visible) { raf = requestAnimationFrame(render); return; }
      time += 0.006 * mo;
      ctx.clearRect(0, 0, W, H);
      const sizeScale = clamp(Math.min(W, H) / 760, 0.5, 1.15);
      const parX = (pointer.current.inside ? pointer.current.x / W - 0.5 : 0) * 34;
      const parY = (pointer.current.inside ? pointer.current.y / H - 0.5 : 0) * 20;
      for (const c of cubes) drawCube(c, sizeScale, parX, parY);
      for (const f of [...figs].sort((a, b) => a.ay - b.ay)) drawFig(f, sizeScale);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
    </div>
  );
}
