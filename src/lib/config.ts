/**
 * Configuración central del producto. Un único sitio para los datos
 * "de verdad" del agente de Seguridad Estructural SL, para no dispersar
 * direcciones de correo ni textos por los componentes.
 */

// Bandeja real que sondea el agente (FASE 5). Las consultas técnicas
// llegan aquí; el polling las identifica, redacta y deja borrador.
export const INBOX_AGENTE = 'se1seguridadestructural@gmail.com';

// Contacto humano de la empresa (no automatizado).
export const CONTACTO_EMPRESA = 'info@seguridadestructural.com';

export const MARCA = 'Estructura AI';
export const EMPRESA = 'Seguridad Estructural SL';

// Base del backend de suscripción. En local/desarrollo y en el túnel se
// sirve desde el mismo origen (''). En un host estático (GitHub Pages)
// se puede apuntar a un backend externo vía VITE_API_BASE.
export const API_BASE: string =
  (import.meta as any).env?.VITE_API_BASE?.replace(/\/$/, '') ?? '';

// Normativa que cubre la base documental (real: CTE, Código Estructural,
// EHE-08, EAE, Eurocódigos).
export const NORMATIVA = [
  'CTE DB-SE-A',
  'CTE DB-SE-AE',
  'CTE DB-SE-C',
  'Código Estructural',
  'EHE-08',
  'EAE',
  'Eurocódigo 2',
  'Eurocódigo 3',
];
