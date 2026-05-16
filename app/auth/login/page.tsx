'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoWordmark } from '@/components/brand/Logo'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou senha incorretos.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'center' }}>
          <LogoWordmark size={32} />
        </div>

        <div style={{ background: 'var(--paper)', borderRadius: 24, padding: 40, border: '1px solid var(--line)' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>Entrar</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 32 }}>
            Não tem conta?{' '}
            <Link href="/auth/signup" style={{ color: 'var(--salmon-ink)', fontWeight: 600, textDecoration: 'none' }}>
              Criar agora
            </Link>
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-soft)', display: 'block', marginBottom: 8 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="voce@empresa.com"
                style={{ width: '100%', background: 'var(--cream)', border: '1.5px solid var(--line)', borderRadius: 12, padding: '14px 16px', fontSize: 15, fontFamily: 'inherit', outline: 'none', color: 'var(--ink)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-soft)', display: 'block', marginBottom: 8 }}>Senha</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{ width: '100%', background: 'var(--cream)', border: '1.5px solid var(--line)', borderRadius: 12, padding: '14px 16px', fontSize: 15, fontFamily: 'inherit', outline: 'none', color: 'var(--ink)' }}
              />
            </div>

            {error && (
              <div style={{ background: 'var(--rose-soft)', color: 'var(--salmon-ink)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{ background: 'var(--ink)', color: '#fff', border: 0, borderRadius: 12, padding: '16px', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 8 }}
            >
              {loading ? 'Entrando...' : 'Entrar →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
