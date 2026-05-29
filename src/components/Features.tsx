import React from 'react';
import { motion } from 'motion/react';
import { Quote, UserCheck, BookMarked, Lock, Gauge, Inbox } from 'lucide-react';
import TiltCard from './TiltCard';

const VALUES = [
  {
    icon: Quote,
    title: 'Trazabilidad absoluta',
    desc: 'Toda afirmación cita su origen: artículo de norma, libro y página o precedente. Si no está en la base documental, te lo decimos; no lo inventamos.',
    span: true,
  },
  {
    icon: UserCheck,
    title: 'Revisión por ingeniero',
    desc: 'La IA redacta; un ingeniero valida antes de enviar. Nunca sale una respuesta sin supervisión humana.',
  },
  {
    icon: BookMarked,
    title: 'Normativa española al día',
    desc: 'CTE, Código Estructural, EHE-08 y EAE, con Eurocódigos de respaldo. La base documental manda sobre el modelo.',
  },
  {
    icon: Gauge,
    title: 'Dato concreto y confianza',
    desc: 'Número exacto, no un rango ambiguo, y un nivel de confianza declarado: alto, medio o bajo.',
  },
  {
    icon: Lock,
    title: 'Privacidad por diseño',
    desc: 'Cada cliente es un universo cerrado. Tus planos y datos nunca se cruzan con los de otro. Procesado en local.',
  },
  {
    icon: Inbox,
    title: 'Cero interfaces nuevas',
    desc: 'No aprendes ningún software. Tu canal de interacción es el correo que ya usas cada día.',
  },
];

export default function Features() {
  return (
    <section id="adn" className="py-20 sm:py-28 scroll-mt-24">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mb-14 max-w-3xl"
        >
          <span className="font-mono text-[9px] text-cyan-400/80 uppercase tracking-widest font-semibold">POR QUÉ CONFIAR</span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tighter leading-[1.02] text-white mt-3">
            Rigor de ingeniería, velocidad de un correo.
          </h2>
          <p className="font-sans text-sm text-neutral-400 mt-5 leading-relaxed max-w-lg">
            No es un chatbot que improvisa. Es una base documental de normativa oficial,
            búsqueda híbrida y un ingeniero al final del proceso.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {VALUES.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className={v.span ? 'md:col-span-2' : ''}
            >
              <TiltCard className="h-full rounded-2xl" glow="rgba(99,102,241,0.16)">
                <div className="group h-full p-6 rounded-2xl bg-neutral-950/50 border border-neutral-900 hover:border-neutral-700/70 transition-colors duration-300">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/10 mb-5">
                    <v.icon className="h-4 w-4 text-cyan-300" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {v.title}
                  </h3>
                  <p className="font-sans text-xs text-neutral-400 leading-relaxed mt-2.5">{v.desc}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
