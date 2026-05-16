'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoWordmark } from '@/components/brand/Logo'
import Link from 'next/link'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Validate before setting loading state
    if (password.length < 6) {
      setError('Senha precisa ter ao menos 6 caracteres.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()

    const slug = businessName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()

    // 1. Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({ name: businessName, slug })
      .select()
      .single()

    if (tenantError || !tenant) {
      setError('Erro ao criar negócio. Tente novamente.')
      setLoading(false)
      return
    }

    // 2. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, tenant_id: tenant.id } }
    })

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Erro ao criar conta.')
      setLoading(false)
      return
    }

    // 3. Insert into users table
    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      tenant_id: tenant.id,
      email,
      role: 'owner',
    })

    if (userError) {
      setError('Conta criada mas erro ao salvar dados. Tente fazer login.')
      setLoading(false)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  const fields = [
    { label: 'Seu nome', value: name, onChange: setName, placeholder: 'Marina', type: 'text' },
    { label: 'Nome do negócio', value: businessName, onChange: setBusinessName, placeholder: 'Clínica Dermo SP', type: 'text' },
    { label: 'Email', value: email, onChange: setEmail, placeholder: 'voce@empresa.com', type: 'email' },
    { label: 'Senha', value: password, onChange: setPassword, placeholder: '••••••••', type: 'password' },
  ] as const

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'center' }}>
          <LogoWordmark size={32} />
        </div>

        <div style={{ background: 'var(--paper)', borderRadius: 24, padding: 40, border: '1px solid var(--line)' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>Criar conta grátis</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 32 }}>
            Já tem conta?{' '}
            <Link href="/auth/login" style={{ color: 'var(--salmon-ink)', fontWeight: 600, textDecoration: 'none' }}>
              Entrar
            </Link>
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {fields.map(({ label, value, onChange, placeholder, type }) => (
              <div key={label}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-soft)', display: 'block', marginBottom: 8 }}>{label}</label>
                <input
                  type={type} value={value} onChange={e => onChange(e.target.value)} required
                  placeholder={placeholder}
                  style={{ width: '100%', background: 'var(--cream)', border: '1.5px solid var(--line)', borderRadius: 12, padding: '14px 16px', fontSize: 15, fontFamily: 'inherit', outline: 'none', color: 'var(--ink)' }}
                />
              </div>
            ))}

            {error && (
              <div style={{ background: 'var(--rose-soft)', color: 'var(--salmon-ink)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{ background: 'var(--salmon)', color: 'var(--ink)', border: 0, borderRadius: 12, padding: '16px', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 8 }}
            >
              {loading ? 'Criando...' : 'Começar grátis →'}
            </button>

            <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
              14 dias grátis · sem cartão de crédito
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
