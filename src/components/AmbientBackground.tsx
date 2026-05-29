import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';

/**
 * Fondo ambiental reactivo al ratón: un halo de luz fría que sigue el
 * puntero con inercia, sobre una rejilla técnica muy tenue y una viñeta.
 * Va detrás de todo el contenido (z negativo) y no captura eventos.
 */
export default function AmbientBackground() {
  const reduced = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.2);
  const sx = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 60, damping: 20, mass: 0.6 });

  const left = useTransform(sx, (v) => `${v * 100}%`);
  const top = useTransform(sy, (v) => `${v * 100}%`);

  useEffect(() => {
    // En táctil no hay hover y el halo grande con blur es caro; y con
    // movimiento reducido lo dejamos fijo. En ambos casos, no escuchamos.
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduced || coarse) {
      mx.set(0.5);
      my.set(0.22);
      return;
    }
    const onMove = (e: PointerEvent) => {
      mx.set(e.clientX / window.innerWidth);
      my.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [mx, my, reduced]);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-black pointer-events-none">
      {/* Rejilla técnica tenue */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)',
        }}
      />
      {/* Halo que sigue al puntero */}
      <motion.div
        className="absolute h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
        style={{
          left,
          top,
          background:
            'radial-gradient(circle, rgba(56,140,255,0.16) 0%, rgba(34,211,238,0.10) 35%, transparent 70%)',
        }}
      />
      {/* Halo fijo superior para anclar el hero */}
      <div
        className="absolute left-1/2 top-0 h-[36rem] w-[60rem] -translate-x-1/2 -translate-y-1/3 rounded-full blur-[140px]"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }}
      />
      {/* Viñeta */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.85)_100%)]" />
    </div>
  );
}
