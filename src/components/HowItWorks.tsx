import React from 'react';
import { motion } from 'motion/react';
import { Mail, ScanSearch, UserCheck } from 'lucide-react';
import TiltCard from './TiltCard';

const STEPS = [
  {
    icon: Mail,
    n: '01',
    title: 'Escribes un correo',
    desc: 'Describe tu caso en lenguaje normal: material, geometría, esfuerzos y la norma de referencia. Sin formularios, sin software, sin instalar nada.',
  },
  {
    icon: ScanSearch,
    n: '02',
    title: 'El agente busca y calcula',
    desc: 'Localiza el artículo aplicable en su base documental (CTE, Código Estructural, EHE, EAE, Eurocódigos) y redacta la memoria con cada dato citado a su fuente.',
  },
  {
    icon: UserCheck,
    n: '03',
    title: 'Un ingeniero revisa y responde',
    desc: 'El borrador llega a nuestro equipo, que lo valida y te contesta en el mismo hilo. Nunca enviamos nada sin revisión humana.',
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="py-20 sm:py-28 scroll-mt-24">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mb-14 max-w-2xl"
        >
          <span className="font-mono text-[9px] text-cyan-400/80 uppercase tracking-widest font-semibold">CÓMO FUNCIONA</span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tighter text-white mt-3">
            Tres pasos. Cero fricción.
          </h2>
          <p className="font-sans text-sm text-neutral-400 mt-4 leading-relaxed">
            Tu canal de siempre, el correo, convertido en una ventanilla de cálculo estructural
            con respaldo documental y revisión profesional.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
            >
              <TiltCard className="h-full rounded-2xl">
                <div className="h-full p-6 rounded-2xl bg-neutral-950/60 border border-neutral-900 hover:border-neutral-700/80 transition-colors duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/15 to-indigo-500/10 border border-cyan-500/20">
                      <s.icon className="h-5 w-5 text-cyan-300" />
                    </div>
                    <span className="font-mono text-xs text-neutral-700 font-bold">{s.n}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-white">{s.title}</h3>
                  <p className="font-sans text-xs text-neutral-400 leading-relaxed mt-2.5">{s.desc}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
