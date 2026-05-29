import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Intensidad del giro en grados (máx). */
  max?: number;
  /** Color del resplandor que sigue al cursor. */
  glow?: string;
}

/**
 * Tarjeta con inclinación 3D hacia el cursor y un brillo que lo sigue.
 * Sensación "premium" sin librerías extra (sólo motion). En táctil no
 * hay hover, así que se queda plana sin penalización.
 */
export default function TiltCard({ children, className = '', max = 6, glow = 'rgba(34,211,238,0.18)' }: TiltCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState(false);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 150, damping: 18 });
  const bg = useTransform(
    [px, py],
    ([x, y]: number[]) => `radial-gradient(300px circle at ${x * 100}% ${y * 100}%, ${glow}, transparent 65%)`,
  );

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const reset = () => { px.set(0.5); py.set(0.5); setHover(false); };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d', transformPerspective: 900 }}
      className={`relative ${className}`}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ background: bg, opacity: hover ? 1 : 0, transition: 'opacity 0.3s ease' }}
      />
      {children}
    </motion.div>
  );
}
