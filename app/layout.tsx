import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'Mi Portafolio',
  description: 'Gestión personal de inversiones',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}` }} />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap');
          *, *::before, *::after { box-sizing: border-box; }
          * { margin: 0; padding: 0; }
          :root {
            --bg: #0c0c0c; --bg-subtle: #111111;
            --border: #1a1a1a; --border-sub: #151515;
            --text-hi: #e8e8e8; --text-md: #d4d4d4;
            --text-lo: #888888; --text-muted: #444444; --text-faint: #2a2a2a;
            --green: #6ee7b7; --red: #fca5a5;
          }
          :root.light {
            --bg: #f5f1eb; --bg-subtle: #ece8e1;
            --border: #d8d2ca; --border-sub: #e2ddd7;
            --text-hi: #1c1914; --text-md: #3a3530;
            --text-lo: #7a7268; --text-muted: #a89e94; --text-faint: #c8c0b8;
            --green: #16a34a; --red: #dc2626;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
            background: var(--bg); color: var(--text-md);
            min-height: 100vh; -webkit-font-smoothing: antialiased; font-size: 13px;
            transition: background 0.2s, color 0.2s;
          }
          a { color: inherit; text-decoration: none; }
          button { font-family: inherit; cursor: pointer; }
          input, select, textarea { font-family: inherit; color-scheme: dark; }
          :root.light input, :root.light select, :root.light textarea { color-scheme: light; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: var(--border); }
        `}</style>
      </head>
      <body><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  )
}
