'use client'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#060810',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#0d1117',
        border: '1px solid #1c1c28',
        borderRadius: '20px',
        padding: '48px 40px',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{
          width: '64px',
          height: '64px',
          background: 'linear-gradient(135deg, #f5c842, #f59e0b)',
          borderRadius: '16px',
          margin: '0 auto 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
        }}>
          ◈
        </div>

        <h1 style={{
          fontSize: '26px',
          fontWeight: '700',
          letterSpacing: '-0.5px',
          color: '#f1f5f9',
          marginBottom: '10px',
        }}>
          Mi Portafolio
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#64748b',
          marginBottom: '40px',
          lineHeight: '1.5',
        }}>
          Tu centro de control financiero personal
        </p>

        <button
          onClick={signInWithGoogle}
          style={{
            width: '100%',
            padding: '14px 20px',
            background: '#fff',
            color: '#111',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          Continuar con Google
        </button>

        <p style={{ marginTop: '28px', fontSize: '12px', color: '#334155' }}>
          Solo tú ves tus datos — RLS activo en la base de datos
        </p>
      </div>
    </div>
  )
}
