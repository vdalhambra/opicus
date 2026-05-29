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
    <div className="relative pt-20 pb-16 sm:pt-28 sm:pb-20 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

          {/* Texto */}
          <div className="lg:col-span-6 flex flex-col justify-center order-2 lg:order-1">
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
              className="font-display text-[2.7rem] leading-[0.95] sm:text-6xl md:text-7xl font-extrabold tracking-tighter text-white text-left"
            >
              El cálculo de estructuras,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-400">
                resuelto por correo.
              </span>
            </motion.h1>

            <motion.p
              {...fade(0.16)}
              className="font-sans text-sm sm:text-base text-neutral-400 leading-relaxed text-left max-w-lg mt-6"
            >
              Envía tu consulta a una dirección de correo y recibe una memoria de cálculo
              con el artículo de norma citado, el número concreto y el nivel de confianza.
              Cada respuesta la <span className="text-neutral-200">revisa un ingeniero</span> antes
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
                className="px-6 py-3 rounded-full border border-white/15 hover:border-white/40 text-white font-sans font-medium text-sm transition-all duration-300"
              >
                Cómo funciona
              </button>
            </motion.div>

            <motion.div {...fade(0.32)} className="flex items-center gap-2 mt-7 text-neutral-500">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-500/70" />
              <span className="font-mono text-[10px] tracking-wide">
                Revisión humana · Trazabilidad a norma · Sin instalar nada
              </span>
            </motion.div>
          </div>

          {/* Cubos */}
          <div className="lg:col-span-6 flex justify-center order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.1, delay: 0.2, ease: 'easeOut' }}
              className="w-full aspect-square max-w-[300px] sm:max-w-[420px] relative"
            >
              <StructuralCanvas />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 font-mono text-[9px] text-neutral-500 tracking-widest uppercase whitespace-nowrap hidden [@media(pointer:fine)]:block">
                Arrastra para rotar
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}
