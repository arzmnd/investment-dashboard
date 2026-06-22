# Mi Portafolio — Setup Guide

Stack: **Next.js 14 · Supabase · Google OAuth · Vercel**

---

## 1. Supabase — Proyecto nuevo

1. Ve a [supabase.com](https://supabase.com) → New project
2. Copia tus credenciales: **Project URL** y **anon public key**
3. Ve a **SQL Editor** → pega y ejecuta todo el contenido de `supabase/schema.sql`

---

## 2. Google OAuth en Supabase

1. Supabase Dashboard → **Authentication → Providers → Google**
2. Activa Google y pega tu **Client ID** y **Client Secret** de Google Cloud Console
3. En Google Cloud Console ([console.cloud.google.com](https://console.cloud.google.com)):
   - Crea un proyecto → APIs & Services → Credentials → OAuth 2.0 Client ID
   - Authorized redirect URIs: `https://TU_PROYECTO.supabase.co/auth/v1/callback`

---

## 3. Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

---

## 4. Correr en local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 5. Deploy en Vercel

1. Sube el proyecto a GitHub
2. Entra a [vercel.com](https://vercel.com) → Import Project → selecciona el repo
3. Agrega las variables de entorno en Vercel (mismas del `.env.local`)
4. Deploy — cada push a `main` dispara un auto-deploy

5. **Importante:** agrega la URL de producción de Vercel en Supabase:
   - Authentication → URL Configuration → Site URL: `https://tu-app.vercel.app`
   - Redirect URLs: `https://tu-app.vercel.app/auth/callback`

   Y en Google Cloud Console → Authorized redirect URIs agrega también:
   `https://tu-app.vercel.app/auth/callback`

---

## Estructura del proyecto

```
├── app/
│   ├── layout.tsx                  # Root layout (estilos globales)
│   ├── page.tsx                    # Redirect según auth
│   ├── auth/
│   │   ├── login/page.tsx          # Login con Google
│   │   └── callback/route.ts       # Handler OAuth
│   └── dashboard/
│       ├── layout.tsx              # Shell con sidebar
│       ├── page.tsx                # Resumen / net worth
│       ├── portfolio/page.tsx      # Activos y P&L
│       └── transactions/page.tsx   # Movimientos + formulario
├── components/
│   └── sidebar.tsx                 # Nav lateral (client component)
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   └── server.ts               # Server client (SSR)
│   ├── types.ts                    # Tipos TypeScript
│   └── utils.ts                    # Formatters (moneda, fecha, %)
├── middleware.ts                   # Protección de rutas + refresh sesión
└── supabase/
    └── schema.sql                  # Tablas + RLS + trigger de profiles
```

---

## Tablas en Supabase

| Tabla | Descripción |
|---|---|
| `profiles` | Se crea automáticamente al hacer login |
| `assets` | Activos (AAPL, BTC, ETF, etc.) |
| `asset_categories` | Agrupaciones custom por color |
| `transactions` | Compras, ventas, dividendos, depósitos |
| `price_snapshots` | Precios manuales para calcular P&L |

> **RLS activado:** cada usuario solo ve y modifica sus propios datos.

---

## Próximos pasos sugeridos

- [ ] Conectar API de precios (Yahoo Finance, Alpha Vantage, CoinGecko) para actualizar `price_snapshots` automáticamente
- [ ] Agregar gráfica de evolución del portafolio en el tiempo
- [ ] Exportar transacciones a CSV
- [ ] Soporte multi-moneda con tipo de cambio
- [ ] Categorías de activos con colores personalizados
