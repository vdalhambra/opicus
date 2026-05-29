import { API_BASE, INBOX_AGENTE } from './config';

export interface SubscribePayload {
  email: string;
  nombre?: string;
  rol?: string;
  plan?: 'beta' | 'pro';
}

export type SubscribeStatus = 'created' | 'received' | 'exists' | 'email_fallback' | 'rate_limited' | 'invalid';

export interface SubscribeResult {
  ok: boolean;
  status: SubscribeStatus;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValido(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/**
 * Construye un mailto de "alta por correo": el canal siempre disponible.
 * Si el backend no está accesible (host estático sin API), el alta se
 * confirma con un clic; el polling del agente reconoce el asunto
 * `[ALTA WEB]` y registra al cliente en la siguiente pasada.
 */
export function mailtoAlta(p: SubscribePayload): string {
  const asunto = `[ALTA WEB] ${p.email}`;
  const cuerpo = [
    'Hola, quiero solicitar acceso al servicio de consultoría estructural por correo.',
    '',
    `Email: ${p.email}`,
    p.nombre ? `Nombre / empresa: ${p.nombre}` : '',
    p.rol ? `Perfil: ${p.rol}` : '',
    `Plan de interés: ${p.plan === 'pro' ? 'Profesional' : 'Beta'}`,
    '',
    'Gracias.',
  ].filter(Boolean).join('\n');
  return `mailto:${INBOX_AGENTE}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}

export function mailtoConsulta(email?: string): string {
  const asunto = 'Consulta técnica estructural';
  const cuerpo = [
    'Hola, tengo una consulta técnica:',
    '',
    '(Describe aquí tu caso: material, geometría, esfuerzos, normativa de referencia...)',
    '',
    email ? `— Enviado desde ${email}` : '',
  ].filter(Boolean).join('\n');
  return `mailto:${INBOX_AGENTE}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}

/**
 * Registra la suscripción en el backend real (que llama a
 * clientes.crear_cliente). Si el backend no responde, devuelve
 * 'email_fallback' para que la UI ofrezca el alta por correo.
 */
export async function suscribir(p: SubscribePayload): Promise<SubscribeResult> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(`${API_BASE}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => null);
    if (res.status === 429) {
      return { ok: false, status: 'rate_limited', message: (data && data.message) || 'Demasiadas solicitudes; inténtalo en unos minutos.' };
    }
    if (res.status === 400) {
      return { ok: false, status: 'invalid', message: (data && data.message) || 'Correo no válido.' };
    }
    if (data && typeof data.ok === 'boolean') {
      return {
        ok: data.ok,
        status: (data.status as SubscribeStatus) ?? (data.ok ? 'received' : 'email_fallback'),
        message: data.message ?? '',
      };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, status: 'received', message: '' };
  } catch {
    return {
      ok: false,
      status: 'email_fallback',
      message: 'No hemos podido registrarte automáticamente; confírmanos tu alta por correo.',
    };
  }
}
