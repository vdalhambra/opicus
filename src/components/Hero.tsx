import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import StructuralCanvas from './StructuralCanvas';
import { track } from '../lib/analytics';

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: [0.21, 0.5, 0.18, 1] as const },
});

export default function Hero() {
  return (
    <div className="relative overflow-hidden min-h-[92vh] flex items-start border-b border-white/5">
      {/* Malla estructural abstracta (celosía / mapa de tensiones) */}
      <div className="absolute inset-0 z-0">
        <StructuralCanvas />
      </div>
      {/* Scrim localizado tras el titular; deja brillar la malla del fondo */}
      <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(120%_90%_at_15%_24%,rgba(0,0,0,0.92),rgba(0,0,0,0.5)_40%,transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-24 z-[1] pointer-events-none bg-gradient-to-b from-black/85 to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 w-full pt-28 pb-20">
        <div className="max-w-xl">
          <motion.div
            {...fade(0)}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 mb-6"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-300">Acceso Beta abierto</span>
          </motion.div>

          <motion.h1
            {...fade(0.08)}
            className="font-display text-[2.7rem] leading-[0.95] sm:text-6xl md:text-7xl font-extrabold tracking-tighter text-white"
          >
            El cálculo de estructuras,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-400">
              resuelto por correo.
            </span>
          </motion.h1>

          <motion.p
            {...fade(0.16)}
            className="font-sans text-sm sm:text-base text-neutral-300 leading-relaxed max-w-lg mt-6"
          >
            Envía tu consulta a una dirección de correo y recibe una memoria de cálculo
            con el artículo de norma citado, el número concreto y el nivel de confianza.
            Cada respuesta la <span className="text-white">revisa y firma un ingeniero</span> antes
            de salir. Conforme a CTE, Código Estructural y Eurocódigos.
          </motion.p>

          <motion.div {...fade(0.24)} className="flex flex-wrap items-center gap-3 mt-8">
            <button
              onClick={() => { track('cta_hero_beta'); scrollTo('beta'); }}
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-cyan-50 text-black font-sans font-semibold text-sm transition-all duration-300 hover:shadow-[0_0_40px_-5px_rgba(34,211,238,0.5)]"
            >
              Solicitar acceso Beta
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => { track('cta_hero_como_funciona'); scrollTo('como-funciona'); }}
              className="px-6 py-3 rounded-full border border-white/15 hover:border-white/40 text-white font-sans font-medium text-sm transition-all duration-300 backdrop-blur-sm"
            >
              Cómo funciona
            </button>
          </motion.div>

          <motion.div {...fade(0.32)} className="flex items-center gap-2 mt-7 text-neutral-400">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-500/70" />
            <span className="font-mono text-[10px] tracking-wide">
              Revisado por ingeniero · Trazabilidad a norma · Sin instalar nada
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
