/**
 * Capa de analítica agnóstica de proveedor. No-op si no hay proveedor
 * cargado, así que es seguro llamar a track() en cualquier sitio.
 *
 * Para activar (sin cookies, compatible con host estático): descomenta el
 * script de Plausible/Umami en index.html y pon tu dominio. track() emitirá
 * eventos a window.plausible y/o window.gtag si existen.
 */
type Props = Record<string, string | number | boolean>;

export function track(event: string, props?: Props): void {
  try {
    const w = window as unknown as {
      plausible?: (e: string, o?: { props?: Props }) => void;
      gtag?: (...args: unknown[]) => void;
    };
    w.plausible?.(event, props ? { props } : undefined);
    w.gtag?.('event', event, props ?? {});
  } catch {
    /* no-op */
  }
}
