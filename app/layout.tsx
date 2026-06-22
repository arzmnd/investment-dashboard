import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mi Portafolio',
  description: 'Gestión personal de inversiones',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          * { margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
            background: #060810;
            color: #e2e8f0;
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
          }
          a { color: inherit; text-decoration: none; }
          button { font-family: inherit; cursor: pointer; }
          input, select, textarea { font-family: inherit; }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #1c1c28; border-radius: 3px; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
