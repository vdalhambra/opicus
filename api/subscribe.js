/**
 * api/subscribe.js — función serverless (Vercel) para el alta de suscripción.
 *
 * El frontend en un host serverless (Vercel) no puede tocar la base local
 * de clientes. Por eso este endpoint ENTREGA el alta al agente por el canal
 * que el agente ya sondea: el correo. Envía un mensaje con asunto
 * `[ALTA WEB] <email>` a la bandeja del agente; el polling (gmail_polling.py,
 * con su manejador de altas web) registra al cliente en la siguiente pasada.
 *
 * Reutiliza las credenciales OAuth de Gmail existentes (no requiere ninguna
 * cuenta nueva). Configura en Vercel estas variables de entorno:
 *   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
 *   GMAIL_INBOX (opcional, def. se1seguridadestructural@gmail.com)
 *
 * Si faltan credenciales, responde status 'email_fallback' para que la UI
 * ofrezca el alta por correo (mailto) — la web nunca queda rota.
 */

const INBOX = process.env.GMAIL_INBOX || 'se1seguridadestructural@gmail.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate limit best-effort por instancia (efímero en serverless; para un
// límite duro usar Vercel KV/Upstash). Frena ráfagas triviales.
const PER_MIN = 5, PER_DAY = 30;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const e = hits.get(ip) || { min: [], day: [] };
  e.min = e.min.filter((t) => t > now - 60_000);
  e.day = e.day.filter((t) => t > now - 86_400_000);
  if (e.min.length >= PER_MIN || e.day.length >= PER_DAY) { hits.set(ip, e); return true; }
  e.min.push(now); e.day.push(now); hits.set(ip, e);
  return false;
}

function b64url(str) {
  return Buffer.from(str, 'utf-8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function accessToken() {
  const body = new URLSearchParams({
    client_id: process.env.GMAIL_CLIENT_ID,
    client_secret: process.env.GMAIL_CLIENT_SECRET,
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error(`token ${r.status}`);
  const j = await r.json();
  return j.access_token;
}

async function enviarAlta({ email, nombre, rol, plan }) {
  const token = await accessToken();
  const asunto = `[ALTA WEB] ${email}`;
  const texto = [
    'Alta de suscripción desde la web.',
    '',
    `Email: ${email}`,
    nombre ? `Nombre/empresa: ${nombre}` : '',
    rol ? `Perfil: ${rol}` : '',
    `Plan de interés: ${plan === 'pro' ? 'Profesional' : 'Beta'}`,
  ].filter(Boolean).join('\r\n');

  const mime =
    `To: ${INBOX}\r\nFrom: ${INBOX}\r\n` +
    `Subject: =?UTF-8?B?${b64url(asunto)}?=\r\n` +
    `Content-Type: text/plain; charset="UTF-8"\r\n\r\n${texto}`;

  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: b64url(mime) }),
  });
  if (!r.ok) throw new Error(`gmail send ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Método no permitido' });

  const ip = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').toString().split(',')[0].trim();
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, status: 'rate_limited', message: 'Demasiadas solicitudes. Inténtalo más tarde.' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const email = (body?.email || '').trim().toLowerCase();
  const nombre = (body?.nombre || '').slice(0, 120);
  const rol = (body?.rol || '').slice(0, 60);
  const plan = body?.plan === 'pro' ? 'pro' : 'beta';

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, status: 'invalid', message: 'Correo no válido.' });
  }

  // Sin credenciales configuradas → que la UI use el alta por correo.
  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_REFRESH_TOKEN) {
    return res.status(200).json({
      ok: false,
      status: 'email_fallback',
      message: 'Backend de correo no configurado; usa el alta por correo.',
    });
  }

  try {
    await enviarAlta({ email, nombre, rol, plan });
    return res.status(200).json({
      ok: true,
      status: 'created',
      message: 'Alta recibida; activaremos tu acceso pronto.',
    });
  } catch (e) {
    console.error('[api/subscribe]', e);
    return res.status(200).json({
      ok: false,
      status: 'email_fallback',
      message: 'No se pudo entregar automáticamente; usa el alta por correo.',
    });
  }
}
