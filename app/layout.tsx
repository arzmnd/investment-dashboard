import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mi Portafolio',
  description: 'Gestión personal de inversiones',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          * { margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
            background: #0c0c0c;
            color: #d4d4d4;
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
            font-size: 13px;
          }
          a { color: inherit; text-decoration: none; }
          button { font-family: inherit; cursor: pointer; }
          input, select, textarea { font-family: inherit; }
          .mono { font-family: 'JetBrains Mono', 'SF Mono', monospace; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #2a2a2a; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
