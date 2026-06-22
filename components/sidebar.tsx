'use client'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/theme-provider'
import type { User } from '@supabase/supabase-js'

const NAV_ITEMS = [
  { href: '/dashboard',              label: 'Resumen'     },
  { href: '/dashboard/portfolio',    label: 'Portafolio'  },
  { href: '/dashboard/transactions', label: 'Movimientos' },
]

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const { theme, toggle } = useTheme()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const name = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? user.email ?? 'Usuario'

  return (
    <aside style={{
      width: '200px',
      minHeight: '100vh',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '32px 0',
      flexShrink: 0,
      background: 'var(--bg)',
      transition: 'background 0.2s, border-color 0.2s',
    }}>
      {/* Logo */}
      <div style={{ padding: '0 28px 40px' }}>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Mi Portafolio
        </p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href
          return (
            <a key={item.href} href={item.href} style={{
              display: 'block',
              padding: '7px 12px',
              fontSize: '13px',
              color: active ? 'var(--text-hi)' : 'var(--text-muted)',
              background: active ? 'var(--bg-subtle)' : 'transparent',
              borderLeft: active ? '1px solid var(--text-lo)' : '1px solid transparent',
              transition: 'color 0.1s',
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-lo)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              {item.label}
            </a>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '20px 28px 0', borderTop: '1px solid var(--border)', marginTop: '16px' }}>
        {/* Theme toggle */}
        <button onClick={toggle} style={{
          background: 'transparent', border: 'none', padding: '0',
          fontSize: '12px', color: 'var(--text-muted)',
          marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px',
          transition: 'color 0.1s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-lo)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <span style={{ fontSize: '14px' }}>{theme === 'dark' ? '○' : '●'}</span>
          {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        </button>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </p>
        <button onClick={signOut} style={{
          background: 'transparent', border: 'none',
          fontSize: '12px', color: 'var(--text-faint)', padding: '0',
          transition: 'color 0.1s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-lo)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
