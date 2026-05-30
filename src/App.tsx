import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Mail, ArrowUpRight } from 'lucide-react';
import AmbientBackground from './components/AmbientBackground';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import EmailSimulator from './components/EmailSimulator';
import Features from './components/Features';
import Pricing from './components/Pricing';
import { MARCA, EMPRESA, CONTACTO_EMPRESA, INBOX_AGENTE, NORMATIVA } from './lib/config';
import { track } from './lib/analytics';

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

const NAV = [
  { id: 'como-funciona', label: 'Cómo funciona' },
  { id: 'simulador', label: 'Simulador' },
  { id: 'adn', label: 'Por qué confiar' },
];

export default function App() {
  const reduced = useReducedMotion();
  return (
    <div className="min-h-screen text-neutral-100 selection:bg-cyan-500/20 selection:text-cyan-200 font-sans relative antialiased">
      <AmbientBackground />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <button onClick={() => scrollTo('top')} aria-label={`${MARCA} — inicio`} className="flex items-center gap-2.5 group">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-indigo-500 text-black font-display font-black text-[11px]">O</span>
            <span className="font-display font-extrabold text-sm tracking-tight text-white">{MARCA}</span>
          </button>

          <nav className="hidden sm:flex items-center gap-7 font-sans text-[12px] font-medium text-neutral-400">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => scrollTo(n.id)} className="hover:text-white transition-colors tracking-tight">
                {n.label}
              </button>
            ))}
          </nav>

          <button
            onClick={() => { track('cta_header_beta'); scrollTo('beta'); }}
            className="rounded-full bg-white/95 hover:bg-white text-black px-4 py-1.5 font-sans font-semibold text-xs transition-all hover:shadow-[0_0_24px_-6px_rgba(34,211,238,0.7)]"
          >
            Acceso Beta
          </button>
        </div>
      </header>

      <main id="top" className="relative z-10">
        <Hero />
        <HowItWorks />
        <EmailSimulator />
        <Features />

        {/* Marquee de normativa */}
        <section className="py-10 border-y border-white/5 overflow-hidden">
          <div className="max-w-5xl mx-auto px-6 mb-5">
            <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest block text-center">
              Base documental conforme a normativa oficial
            </span>
          </div>
          <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            <motion.div
              className="flex shrink-0 items-center gap-10 pr-10"
              animate={reduced ? undefined : { x: ['0%', '-50%'] }}
              transition={reduced ? undefined : { duration: 26, ease: 'linear', repeat: Infinity }}
            >
              {[...NORMATIVA, ...NORMATIVA].map((n, i) => (
                <span key={i} className="flex items-center gap-2 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                  <span className="h-1 w-1 rounded-full bg-cyan-500/60" /> {n}
                </span>
              ))}
            </motion.div>
          </div>
        </section>

        <Pricing />
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-16 px-6 text-neutral-500">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-indigo-500 text-black font-display font-black text-[11px]">O</span>
              <span className="font-display font-extrabold text-white text-sm">{MARCA}</span>
            </div>
            <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
              Consultoría de cálculo estructural por correo, con respaldo en normativa oficial y
              revisión de ingeniería. Un producto de {EMPRESA}.
            </p>
          </div>

          <div className="flex flex-col gap-3 items-start md:items-end md:text-right">
            <span className="font-mono text-[9px] text-neutral-600 tracking-wider uppercase">Consultas técnicas</span>
            <a href={`mailto:${INBOX_AGENTE}`} className="font-mono text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors break-all">
              <Mail className="h-3.5 w-3.5 shrink-0" />{INBOX_AGENTE}
            </a>
            <span className="font-mono text-[9px] text-neutral-600 tracking-wider uppercase mt-2">Contacto comercial</span>
            <a href={`mailto:${CONTACTO_EMPRESA}`} className="font-mono text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors">
              {CONTACTO_EMPRESA} <ArrowUpRight className="h-3 w-3" />
            </a>
            <div className="h-px bg-white/5 w-full md:w-48 my-3" />
            <span className="font-mono text-[9px] text-neutral-600 uppercase tracking-widest">
              © 2026 {EMPRESA}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
