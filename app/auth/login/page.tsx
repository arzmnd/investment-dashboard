'use client'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0c0c0c',
    }}>
      <div style={{ width: '280px' }}>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          color: '#444',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '40px',
        }}>
          Mi Portafolio
        </p>

        <h1 style={{
          fontSize: '20px',
          fontWeight: '400',
          color: '#e8e8e8',
          marginBottom: '8px',
          lineHeight: 1.3,
        }}>
          Centro de control financiero
        </h1>
        <p style={{
          fontSize: '13px',
          color: '#555',
          marginBottom: '40px',
          lineHeight: 1.6,
        }}>
          Acceso privado. Solo tus datos.
        </p>

        <button
          onClick={signInWithGoogle}
          style={{
            width: '100%',
            padding: '11px 16px',
            background: 'transparent',
            color: '#d4d4d4',
            border: '1px solid #2a2a2a',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#555')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
        >
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          Continuar con Google
        </button>
      </div>
    </div>
  )
}
