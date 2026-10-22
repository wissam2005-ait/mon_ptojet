import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Field, inputClass } from '../../components/Field'
import { useAuth } from '../../lib/auth'

export default function Login() {
  const { session, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/admin" replace />

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate((location.state as { from?: string } | null)?.from ?? '/admin', { replace: true })
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6">
        <h1 className="text-2xl font-extrabold">Espace professionnel</h1>
        <Field label="E-mail" htmlFor="l-email"><input id="l-email" type="email" required autoComplete="username" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Mot de passe" htmlFor="l-pass"><input id="l-pass" type="password" required autoComplete="current-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <p className="text-red-700" role="alert">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-md bg-ink px-4 py-2.5 font-semibold text-white hover:bg-navy disabled:opacity-50">{busy ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    </div>
  )
}
