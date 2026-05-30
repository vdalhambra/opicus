/**
 * server.js — servidor local que sirve la SPA construida (dist/) y expone
 * POST /api/subscribe, que registra el alta llamando a
 * 06_scripts/suscripciones.py (clientes.crear_cliente real).
 *
 * Este es el despliegue "de verdad" en local: una suscripción desde la web
 * crea un cliente en 03_clientes/. Pensado para correr junto al agente y,
 * opcionalmente, exponerse por un túnel para verlo desde el móvil.
 *
 *   node server.js              # sirve dist/ + API en :8787
 *   PORT=3000 node server.js
 *
 * Variables:
 *   PORT                  puerto (def. 8787)
 *   PYTHON_BIN            ejecutable python (def. "python")
 *   ALLOWED_ORIGINS       CSV de orígenes permitidos para /api (def. * )
 *   ALTA_TOKEN            si se define, exige cabecera X-Alta-Token igual
 *   PRODUCTO_IA_AUTO_GRANT_BETA=true  concede acceso Beta al registrar
 */
import express from 'express';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');           // C:\PRODUCTO_IA\PRODUCTO IA
const SCRIPT = path.join(RAIZ, '06_scripts', 'suscripciones.py');
const DIST = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT || 8787);
const PYTHON = process.env.PYTHON_BIN || 'python';
const ALLOWED = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const ALTA_TOKEN = process.env.ALTA_TOKEN || '';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

// CORS: allowlist si ALLOWED_ORIGINS está definido; si no, '*'.
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED.length === 0) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Alta-Token');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Rate limiting en memoria (sin dependencias): por IP y global/día.
const PER_MIN = 6, PER_DAY = 40, GLOBAL_DAY = 500;
const hits = new Map();          // ip -> { min:[ts], day:[ts] }
let globalDay = [];
function rateLimited(ip) {
  const now = Date.now();
  const minAgo = now - 60_000, dayAgo = now - 86_400_000;
  globalDay = globalDay.filter((t) => t > dayAgo);
  if (globalDay.length >= GLOBAL_DAY) return true;
  const e = hits.get(ip) || { min: [], day: [] };
  e.min = e.min.filter((t) => t > minAgo);
  e.day = e.day.filter((t) => t > dayAgo);
  if (e.min.length >= PER_MIN || e.day.length >= PER_DAY) { hits.set(ip, e); return true; }
  e.min.push(now); e.day.push(now); globalDay.push(now);
  hits.set(ip, e);
  return false;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function registrar(payload) {
  return new Promise((resolve) => {
    const proc = spawn(PYTHON, [SCRIPT, '--json', JSON.stringify(payload)], { cwd: RAIZ, env: process.env });
    let out = '', err = '';
    proc.stdout.on('data', (d) => (out += d));
    proc.stderr.on('data', (d) => (err += d));
    proc.on('error', (e) => resolve({ ok: false, error: `spawn: ${e.message}` }));
    proc.on('close', (code) => {
      const line = out.trim().split('\n').filter(Boolean).pop() || '';
      try { resolve(JSON.parse(line)); }
      catch { resolve({ ok: false, error: `salida no-JSON (code ${code}): ${(err || out).slice(0, 300)}` }); }
    });
  });
}

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Respuesta SIEMPRE uniforme (anti-enumeración): no revela si el correo ya existía.
const RES_OK = { ok: true, status: 'received', message: 'Solicitud recibida. Si todo es correcto, activaremos tu acceso y te avisaremos por correo.' };

app.post('/api/subscribe', async (req, res) => {
  if (ALTA_TOKEN && req.headers['x-alta-token'] !== ALTA_TOKEN) {
    return res.status(401).json({ ok: false, status: 'unauthorized', message: 'No autorizado.' });
  }
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString().split(',')[0].trim();
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, status: 'rate_limited', message: 'Demasiadas solicitudes. Inténtalo más tarde.' });
  }
  const { email, nombre, rol, plan } = req.body || {};
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ ok: false, status: 'invalid', message: 'Correo no válido.' });
  }
  const r = await registrar({
    email: String(email).trim().toLowerCase(),
    nombre: nombre ? String(nombre).slice(0, 120) : '',
    rol: rol ? String(rol).slice(0, 60) : '',
    plan: plan === 'pro' ? 'pro' : 'beta',
  });
  if (!r.ok) {
    console.error('[subscribe] error:', r.error);
    return res.status(502).json({ ok: false, status: 'error', message: 'No se pudo procesar la solicitud.' });
  }
  // Log interno detallado, respuesta pública uniforme.
  console.log(`[subscribe] ip=${ip} status=${r.status} slug=${r.slug}`);
  return res.json(RES_OK);
});

// SPA estática (si existe dist/).
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
} else {
  app.get('/', (_req, res) => res.status(503).send('dist/ no encontrado. Ejecuta "npm run build" primero.'));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[opicus] sirviendo en http://localhost:${PORT}`);
  console.log(`[opicus] API alta → ${SCRIPT}`);
});
