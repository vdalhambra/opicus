# Opicus — landing de producto

Página de captación del servicio de **consultoría de cálculo estructural por
correo**. Convierte visitantes en suscriptores del acceso Beta.

Stack: **Vite + React 19 + Tailwind v4 + motion**.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build

```bash
npm run build      # genera dist/
npm run preview    # sirve dist/ en local
```

Para una project page bajo `/<repo>/` (GitHub Pages), construye con la base
correcta:

```bash
VITE_BASE=/<repo>/ npm run build
```

## Suscripción

El formulario envía a `POST /api/subscribe`. Según el despliegue:

- **Local** (`node server.js`): registra la solicitud mediante un backend
  local.
- **Vercel** (`api/subscribe.js`): entrega la solicitud por correo a la
  bandeja del servicio (variables `GMAIL_*`, ver `.env.example`).
- **Host estático** sin backend: el formulario degrada a un alta por correo
  (mailto), de modo que nunca queda inoperativo.

Variables de entorno: ver `.env.example`.

## Despliegue

- **Vercel** (recomendado): `vercel --prod` desde esta carpeta y configura las
  variables de `.env.example`.
- **GitHub Pages**: build con `VITE_BASE=/<repo>/` y publica `dist/`.
