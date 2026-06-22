'use client'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const name = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? user.email ?? 'Usuario'

  return (
    <aside style={{
      width: '200px',
      minHeight: '100vh',
      borderRight: '1px solid #1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      padding: '32px 0',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 28px 40px' }}>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          color: '#444',
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
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'block',
                padding: '7px 12px',
                fontSize: '13px',
                color: active ? '#e8e8e8' : '#555',
                background: active ? '#181818' : 'transparent',
                transition: 'color 0.1s',
                borderLeft: active ? '1px solid #444' : '1px solid transparent',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#888' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#555' }}
            >
              {item.label}
            </a>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '24px 28px 0', borderTop: '1px solid #1a1a1a', marginTop: '16px' }}>
        <p style={{ fontSize: '12px', color: '#444', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </p>
        <button
          onClick={signOut}
          style={{
            background: 'transparent', border: 'none',
            fontSize: '12px', color: '#3a3a3a', padding: '0',
            transition: 'color 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#888')}
          onMouseLeave={e => (e.currentTarget.style.color = '#3a3a3a')}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
