# Estructura AI — landing de producto

Página de captación del servicio de **consultoría estructural por correo** de
Seguridad Estructural SL. Convierte visitantes en suscriptores y los registra
como clientes reales en la Capa 3 del agente (`03_clientes/`).

Stack: **Vite + React 19 + Tailwind v4 + motion**. Sin dependencia de IA en el
frontend (la `@google/genai` del export original ya no se usa).

---

## Estructura

```
07_web/
├── src/
│   ├── components/
│   │   ├── StructuralCanvas.tsx   cubos cromados reactivos al ratón (canvas 2D)
│   │   ├── AmbientBackground.tsx  halo que sigue al puntero + rejilla
│   │   ├── TiltCard.tsx           tarjetas con inclinación 3D al cursor
│   │   ├── Hero / HowItWorks / EmailSimulator / Features / Pricing
│   ├── lib/
│   │   ├── config.ts              datos reales (bandeja del agente, normativa)
│   │   └── subscribe.ts           cliente del alta + fallback por correo
│   └── App.tsx
├── api/subscribe.js               función serverless (Vercel)
├── server.js                      servidor local (sirve dist/ + /api/subscribe)
└── vercel.json
```

## Cómo conecta con el agente (suscripción funcional)

Una suscripción **crea un cliente real** en `03_clientes/` por dos caminos:

1. **Despliegue local / túnel** → `server.js` recibe `POST /api/subscribe` y
   ejecuta `06_scripts/suscripciones.py`, que llama a `clientes.crear_cliente`.
   El cliente aparece al instante (`validado=false`, salvo auto-grant).
2. **Host estático (GitHub Pages) o Vercel** → no hay acceso a la base local,
   así que el alta se entrega por el canal que el agente ya sondea: un correo
   con asunto `[ALTA WEB] <email>` a la bandeja del agente. El polling
   (`gmail_polling.py::manejar_alta_web`) lo registra en la siguiente pasada.
   En host estático sin backend, el formulario abre ese correo con un clic
   (mailto), así que **nunca queda roto**.

En ambos casos el cliente nace **sin acceso concedido**: la promoción a Beta la
hace Antonio a mano (política de calidad). Para alta operativa inmediata,
`PRODUCTO_IA_AUTO_GRANT_BETA=true`.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000 (sólo frontend, sin API)
```

## Despliegue local funcional (frontend + API + base de clientes)

```bash
npm run build
node server.js     # http://localhost:8787  → sirve dist/ y registra altas
```

## Despliegue en Vercel (permanente, recomendado)

1. `vercel` (login una vez) y `vercel --prod` desde esta carpeta.
2. Configura las variables de entorno de Gmail (ver `.env.example`):
   `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`.
   Se obtienen de `00_sistema/gmail/client_secret.json` y `token.json`.
3. El alta llegará a la bandeja como `[ALTA WEB]` y el polling registrará al
   cliente.

## Despliegue en GitHub Pages (estático)

```bash
VITE_BASE=/estructura-ai/ npm run build
# publica dist/ en la rama gh-pages
```

El formulario usará el alta por correo (mailto) salvo que definas
`VITE_API_BASE` apuntando a un backend (Vercel o túnel a `server.js`).
