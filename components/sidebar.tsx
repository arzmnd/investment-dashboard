'use client'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const NAV_ITEMS = [
  { href: '/dashboard',              label: 'Resumen',      icon: '◈' },
  { href: '/dashboard/portfolio',    label: 'Portafolio',   icon: '◎' },
  { href: '/dashboard/transactions', label: 'Movimientos',  icon: '↕' },
]

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Usuario'
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside style={{
      width: '220px',
      minHeight: '100vh',
      background: '#0d1117',
      borderRight: '1px solid #1c1c28',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 20px 32px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '34px', height: '34px',
          background: 'linear-gradient(135deg, #f5c842, #f59e0b)',
          borderRadius: '9px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', flexShrink: 0,
        }}>◈</div>
        <span style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.3px' }}>
          Mi Portafolio
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href
          return (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: active ? '600' : '400',
                color: active ? '#f1f5f9' : '#64748b',
                background: active ? '#161b22' : 'transparent',
                transition: 'all 0.15s',
                border: active ? '1px solid #1c1c28' : '1px solid transparent',
              }}
              onMouseEnter={e => {
                if (!active) e.currentTarget.style.color = '#94a3b8'
              }}
              onMouseLeave={e => {
                if (!active) e.currentTarget.style.color = '#64748b'
              }}
            >
              <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </a>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '16px 20px 0', borderTop: '1px solid #1c1c28', marginTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: '#1c1c28', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#94a3b8',
            }}>
              {initials}
            </div>
          )}
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name.split(' ')[0]}
            </p>
            <p style={{ fontSize: '11px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </p>
          </div>
        </div>
        <button
          onClick={signOut}
          style={{
            width: '100%', padding: '8px', background: 'transparent',
            border: '1px solid #1c1c28', borderRadius: '8px',
            fontSize: '13px', color: '#64748b', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = '#f87171' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#1c1c28' }}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
