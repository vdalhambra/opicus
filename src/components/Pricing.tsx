import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Loader2, ArrowRight, Mail, PartyPopper } from 'lucide-react';
import { suscribir, emailValido, mailtoAlta, mailtoConsulta, type SubscribeResult } from '../lib/subscribe';
import { INBOX_AGENTE } from '../lib/config';
import { track } from '../lib/analytics';

const ROLES = ['Arquitecto/a', 'Ingeniería / consultora', 'Constructora / promotora', 'Estudiante', 'Otro'];

const BETA_FEATURES = [
  'Consultas técnicas por correo',
  'Memoria de cálculo con cita a norma',
  'Nivel de confianza en cada respuesta',
  'Revisión por un ingeniero',
];
const PRO_FEATURES = [
  'Consultas ilimitadas y prioritarias',
  'Adjuntos (PDF, planos, DWG/DXF)',
  'Memorias completas listas para visar',
  'Histórico y memoria por proyecto',
];

type Status = 'idle' | 'loading' | 'done' | 'fallback';

export default function Pricing() {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState(ROLES[0]);
  const [plan, setPlan] = useState<'beta' | 'pro'>('beta');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<SubscribeResult | null>(null);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!emailValido(email)) {
      setError('Introduce un correo válido.');
      return;
    }
    setStatus('loading');
    const r = await suscribir({ email: email.trim(), nombre: nombre.trim(), rol, plan });
    setResult(r);
    if (r.status === 'rate_limited' || r.status === 'invalid') {
      setError(r.message);
      setStatus('idle');
      return;
    }
    if (r.ok) {
      track('alta_ok', { plan });
      setStatus('done');
    } else {
      track('alta_fallback', { plan });
      setStatus('fallback');
    }
  };

  return (
    <section id="beta" className="py-20 sm:py-28 scroll-mt-20">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-12"
        >
          <span className="font-mono text-[9px] text-cyan-400/80 uppercase tracking-widest font-semibold">ACCESO</span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tighter text-white mt-3">
            Entra en la Beta. Gratis.
          </h2>
          <p className="font-sans text-sm text-neutral-400 leading-relaxed mt-4 max-w-lg">
            Estamos abriendo plazas limitadas. Déjanos tu correo y activaremos tu acceso para
            que empieces a enviar consultas. Sin tarjeta, sin compromiso.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Planes informativos */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="p-6 rounded-2xl bg-gradient-to-b from-cyan-950/20 to-neutral-950/60 border border-cyan-500/25">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[10px] text-cyan-300 uppercase tracking-widest">Beta</span>
                <span className="font-mono text-[8px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">DISPONIBLE</span>
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="font-display text-4xl font-extrabold text-white">0€</span>
                <span className="font-sans text-xs text-neutral-500">/ durante la beta</span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {BETA_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 font-sans text-xs text-neutral-300">
                    <Check className="h-3.5 w-3.5 text-cyan-400 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-950/50 border border-neutral-900">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Profesional</span>
                <span className="font-mono text-[8px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-500 border border-neutral-800">PRÓXIMAMENTE</span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 font-sans text-xs text-neutral-400">
                    <Check className="h-3.5 w-3.5 text-neutral-600 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Formulario funcional */}
          <div className="lg:col-span-7">
            <div className="h-full p-6 sm:p-8 rounded-2xl bg-neutral-950/70 border border-neutral-800 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
              <AnimatePresence mode="wait">
                {status === 'done' ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative flex flex-col gap-4 py-4"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/15 border border-cyan-500/30">
                      <PartyPopper className="h-6 w-6 text-cyan-300" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-white">¡Solicitud recibida!</h3>
                    <p className="font-sans text-xs text-neutral-400 leading-relaxed max-w-md">
                      Hemos recibido tu solicitud para <span className="text-white font-mono">{email}</span>. Activamos los
                      accesos manualmente para cuidar la calidad; te avisaremos por correo en cuanto el tuyo esté listo
                      (normalmente en 24–48 h). Mientras tanto, ya puedes enviar tu primera consulta:
                    </p>
                    <a
                      href={mailtoConsulta(email)}
                      onClick={() => track('primera_consulta_click')}
                      className="group inline-flex w-fit items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-cyan-50 text-black font-sans font-semibold text-xs transition-all"
                    >
                      <Mail className="h-4 w-4" />
                      Escribir a {INBOX_AGENTE}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  </motion.div>
                ) : status === 'fallback' ? (
                  <motion.div
                    key="fallback"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative flex flex-col gap-4 py-4"
                  >
                    <h3 className="font-display text-xl font-bold text-white">Confirma tu alta con un clic</h3>
                    <p className="font-sans text-xs text-neutral-400 leading-relaxed max-w-md">
                      Para completar tu solicitud, envíanos el alta por correo. Se abre tu cliente de email
                      con todo prerrellenado; solo tienes que darle a enviar.
                    </p>
                    <a
                      href={mailtoAlta({ email: email.trim(), nombre: nombre.trim(), rol, plan })}
                      className="group inline-flex w-fit items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-cyan-50 text-black font-sans font-semibold text-xs transition-all"
                    >
                      <Mail className="h-4 w-4" />
                      Enviar alta por correo
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </a>
                    <button onClick={() => setStatus('idle')} className="font-mono text-[10px] text-neutral-500 hover:text-neutral-300 w-fit">
                      ← volver al formulario
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={onSubmit}
                    className="relative flex flex-col gap-4"
                  >
                    <h3 className="font-display text-lg font-bold text-white">Solicita tu acceso</h3>

                    {/* Toggle plan */}
                    <div className="flex gap-2" role="group" aria-label="Plan">
                      {(['beta', 'pro'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          aria-pressed={plan === p}
                          onClick={() => setPlan(p)}
                          className={`flex-1 py-2 rounded-lg font-sans text-[11px] font-semibold border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${
                            plan === p
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                          }`}
                        >
                          {p === 'beta' ? 'Acceso Beta (gratis)' : 'Lista Profesional'}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="alta-email" className="sr-only">Correo electrónico</label>
                        <input
                          id="alta-email"
                          name="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="tu@correo.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          aria-required="true"
                          aria-invalid={!!error}
                          aria-describedby={error ? 'alta-error' : undefined}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500/60 rounded-lg px-3 py-2.5 text-xs text-slate-200 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        />
                      </div>
                      <div>
                        <label htmlFor="alta-nombre" className="sr-only">Nombre o empresa (opcional)</label>
                        <input
                          id="alta-nombre"
                          name="organization"
                          type="text"
                          autoComplete="organization"
                          placeholder="Nombre o empresa (opcional)"
                          value={nombre}
                          onChange={(e) => setNombre(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500/60 rounded-lg px-3 py-2.5 text-xs text-slate-200 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all"
                        />
                      </div>
                    </div>

                    <label htmlFor="alta-rol" className="sr-only">Tu perfil</label>
                    <select
                      id="alta-rol"
                      name="rol"
                      value={rol}
                      onChange={(e) => setRol(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500/60 rounded-lg px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>

                    {error && <p id="alta-error" role="alert" className="font-sans text-[11px] text-rose-400">{error}</p>}

                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="group w-full py-3 px-4 rounded-lg bg-white hover:bg-cyan-50 disabled:opacity-60 text-black font-sans font-semibold text-xs transition-all flex items-center justify-center gap-2"
                    >
                      {status === 'loading' ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Registrando…</>
                      ) : (
                        <>{plan === 'beta' ? 'Solicitar acceso Beta' : 'Avísame al lanzar Profesional'}
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></>
                      )}
                    </button>
                    <p className="font-mono text-[9px] text-neutral-600 leading-relaxed">
                      Al solicitar acceso aceptas que te contactemos sobre el servicio. Nada de spam.
                      Tus datos se tratan de forma aislada y nunca se comparten.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
