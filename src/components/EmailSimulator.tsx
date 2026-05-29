import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { INBOX_AGENTE } from '../lib/config';
import { track } from '../lib/analytics';

interface Calculation {
  label: string;
  formula: string;
  result: string;
  status: 'pass' | 'warning' | 'fail';
}

interface ExampleEmail {
  id: string;
  subject: string;
  excerpt: string;
  replySubject: string;
  replyBody: string;
  calculations: Calculation[];
  cita: string;
  confianza: 'alto' | 'medio' | 'bajo';
}

const EMAIL_EXAMPLES: ExampleEmail[] = [
  {
    id: 'STRUCT-912A',
    subject: 'Comprobación pandeo pilar HEB 200',
    excerpt: 'Pilar HEB 200 (S275), 4,2 m birrotulado, N_Ed = 620 kN, M_Ed = 38 kNm.',
    replySubject: 'RE: Comprobación pandeo pilar HEB 200',
    replyBody: 'Hemos verificado la estabilidad del HEB 200 conforme a EN 1993-1-1 (Eurocódigo 3) y CTE DB-SE-A. La sección es Clase 1 y la interacción pandeo–flexión cumple:',
    calculations: [
      { label: 'Resistencia plástica de la sección', formula: 'N_pl,Rd = A·f_y / γ_M0', result: '2.147 kN', status: 'pass' },
      { label: 'Interacción pandeo + flexión', formula: 'N_Ed/N_b,Rd + k_yy·M_Ed/M_y,Rd ≤ 1,0', result: '0,84', status: 'pass' },
    ],
    cita: 'CTE DB-SE-A §6.3 · EN 1993-1-1 §6.3.3',
    confianza: 'alto',
  },
  {
    id: 'STRUCT-382C',
    subject: 'Cortante muro de sótano HA-30',
    excerpt: 'Muro HA-30, V_Ed = 480 kN, 3,5 m × 0,25 m. ¿Cumple a cortante?',
    replySubject: 'RE: Cortante muro de sótano',
    replyBody: 'Analizada la sección de hormigón de 3.500×250 mm frente a cortante de 480 kN según el Código Estructural (Título 4). El alma resiste, pero la solicitación está próxima a la capacidad:',
    calculations: [
      { label: 'Agotamiento por bielas de compresión', formula: 'V_u1 = 0,30·f_cd·b_w·d', result: '1.575 kN', status: 'pass' },
      { label: 'Solicitación frente a capacidad', formula: 'V_Ed / V_u2', result: '0,89 (ajustado)', status: 'warning' },
    ],
    cita: 'Código Estructural, Art. 44 (cortante)',
    confianza: 'medio',
  },
  {
    id: 'STRUCT-004B',
    subject: 'Tensión en zapata medianera',
    excerpt: 'Zapata 1,8×1,4 m, N = 900 kN, M = 110 kNm, σ_adm = 0,20 N/mm².',
    replySubject: 'RE: Tensión en zapata medianera',
    replyBody: 'Evaluada la seguridad geotécnica del cimiento medianero con los criterios del CTE DB-SE-C. La tensión en el borde supera la admisible: la zapata necesita redimensionado.',
    calculations: [
      { label: 'Tensión máxima en borde', formula: 'σ_max = (N/A)·(1 + 6e/B)', result: '0,245 N/mm²', status: 'fail' },
      { label: 'Frente a tensión admisible', formula: 'σ_max > σ_adm', result: '+22 % sobrepresión', status: 'fail' },
    ],
    cita: 'CTE DB-SE-C §4.3 (presiones admisibles)',
    confianza: 'alto',
  },
];

const CONF: Record<ExampleEmail['confianza'], { txt: string; cls: string }> = {
  alto: { txt: 'Confianza alta', cls: 'text-emerald-400 border-emerald-500/20 bg-emerald-950/30' },
  medio: { txt: 'Confianza media', cls: 'text-amber-400 border-amber-500/20 bg-amber-950/30' },
  bajo: { txt: 'Confianza baja', cls: 'text-rose-400 border-rose-500/20 bg-rose-950/30' },
};

function scrollToBeta() {
  document.getElementById('beta')?.scrollIntoView({ behavior: 'smooth' });
}

export default function EmailSimulator() {
  const [idx, setIdx] = useState(0);
  const sel = EMAIL_EXAMPLES[idx];

  return (
    <section id="simulador" className="py-12 scroll-mt-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-10">
          <span className="font-mono text-[9px] text-cyan-400/80 uppercase tracking-widest font-semibold">SIMULADOR · EJEMPLOS ILUSTRATIVOS</span>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tighter text-white mt-3">
            Mira la respuesta que recibirías.
          </h2>
          <p className="font-sans text-xs text-neutral-400 mt-2 max-w-md leading-relaxed">
            Pulsa un caso para ver el formato: cálculo, veredicto, cita a norma y nivel de
            confianza. Son ejemplos ilustrativos; cada respuesta real se redacta sobre la
            normativa vigente y la revisa un ingeniero.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Consultas */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <span className="font-mono text-[9px] text-neutral-600 tracking-wider uppercase mb-1">CONSULTAS DE ENTRADA</span>
            {EMAIL_EXAMPLES.map((item, i) => (
              <button
                key={item.id}
                onClick={() => setIdx(i)}
                className={`p-4 text-left rounded-xl border transition-all duration-300 ${
                  idx === i
                    ? 'bg-neutral-900/70 border-cyan-500/30 shadow-[0_0_30px_-12px_rgba(34,211,238,0.6)]'
                    : 'bg-transparent border-neutral-900/60 hover:bg-neutral-950/50 hover:border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[8px] text-neutral-500">{item.id}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${idx === i ? 'bg-cyan-400' : 'bg-neutral-700'}`} />
                </div>
                <h4 className="font-sans text-xs font-semibold text-white tracking-tight truncate">{item.subject}</h4>
                <p className="font-sans text-[10px] text-neutral-500 line-clamp-2 leading-normal mt-1">{item.excerpt}</p>
              </button>
            ))}
          </div>

          {/* Respuesta */}
          <div className="lg:col-span-7">
            <span className="font-mono text-[9px] text-neutral-600 tracking-wider uppercase block mb-3">RESPUESTA DEL AGENTE</span>
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-neutral-800/80 bg-neutral-950/60 overflow-hidden backdrop-blur-sm"
              >
                <div className="bg-neutral-950/90 border-b border-neutral-900 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500/60" />
                    <span className="w-2 h-2 rounded-full bg-amber-500/60" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
                  </div>
                  <span className="font-mono text-[8px] text-neutral-500 tracking-wider truncate max-w-[60%]">DE: {INBOX_AGENTE}</span>
                </div>

                <div className="p-6 flex flex-col gap-4">
                  <div>
                    <span className="font-mono text-[9px] text-neutral-500">Asunto</span>
                    <h3 className="font-sans text-xs font-semibold text-white mt-0.5">{sel.replySubject}</h3>
                  </div>
                  <div className="h-px bg-neutral-900" />
                  <p className="font-sans text-xs text-neutral-400 leading-relaxed">{sel.replyBody}</p>

                  <div className="flex flex-col gap-3 mt-1">
                    {sel.calculations.map((c, i) => (
                      <div key={i} className="p-4 rounded-xl bg-neutral-950 border border-neutral-900 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-sans text-xs font-medium text-neutral-300">{c.label}</span>
                          <span className={`font-mono text-[8px] px-2 py-0.5 rounded-full border whitespace-nowrap ${
                            c.status === 'pass'
                              ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400'
                              : c.status === 'warning'
                              ? 'bg-amber-950/30 border-amber-500/20 text-amber-500'
                              : 'bg-rose-950/30 border-rose-500/20 text-rose-500'
                          }`}>
                            {c.status === 'pass' ? 'CUMPLE' : c.status === 'warning' ? 'AJUSTADO' : 'NO CUMPLE'}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-neutral-900/45 p-2.5 rounded-lg font-mono text-[10px] border border-neutral-900">
                          <span className="text-neutral-500">{c.formula}</span>
                          <span className="text-white font-semibold sm:text-right">{c.result}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cita + confianza */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="font-mono text-[9px] text-neutral-500">
                      Fuente citada: <span className="text-neutral-300">{sel.cita}</span>
                    </span>
                    <span className={`font-mono text-[8px] px-2 py-0.5 rounded-full border ${CONF[sel.confianza].cls}`}>
                      {CONF[sel.confianza].txt}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 pt-3 border-t border-neutral-900">
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400/80" />
                    <span className="font-mono text-[9px] text-neutral-500">Pendiente de revisión por un ingeniero antes del envío</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <button
              onClick={() => { track('cta_sim_beta'); scrollToBeta(); }}
              className="group mt-5 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200 font-sans text-xs font-medium transition-colors"
            >
              ¿Tienes un caso parecido? Solicita acceso Beta
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
