import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Field, inputClass } from '../../components/Field'
import { api } from '../../lib/http'
import { roleLabels, type Role, type UserAccount } from '../../lib/types'

const empty = { fullName: '', email: '', role: 'EMPLOYEE' as Role, phone: '', jobTitle: '', password: '' }

export default function Employees() {
  const [items, setItems] = useState<UserAccount[]>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api<UserAccount[]>('/users').then(setItems).catch((e: Error) => setError(e.message))
  }, [])
  useEffect(load, [load])

  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function close() {
    setOpen(false)
    setEditingId(null)
    setForm(empty)
  }

  function edit(u: UserAccount) {
    setForm({ fullName: u.fullName, email: u.email, role: u.role, phone: u.phone ?? '', jobTitle: u.jobTitle ?? '', password: '' })
    setEditingId(u.id)
    setOpen(true)
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError('')
    try {
      if (editingId) {
        await api(`/users/${editingId}`, { method: 'PUT', json: { fullName: form.fullName, role: form.role, phone: form.phone, jobTitle: form.jobTitle } })
      } else {
        await api('/users', { method: 'POST', json: form })
      }
      close()
      load()
    } catch (e) { setError((e as Error).message) }
  }

  async function toggleActive(u: UserAccount) {
    const action = u.active ? 'Désactiver' : 'Réactiver'
    if (!window.confirm(`${action} le compte de ${u.fullName} ?`)) return
    setError('')
    try {
      await api(`/users/${u.id}/active`, { method: 'POST', json: { active: !u.active } })
      load()
    } catch (e) { setError((e as Error).message) }
  }

  async function resetPassword(u: UserAccount) {
    const password = window.prompt(`Nouveau mot de passe pour ${u.fullName} (10 caractères minimum) :`)
    if (!password) return
    setError('')
    try {
      await api(`/users/${u.id}/password`, { method: 'POST', json: { password } })
      window.alert('Mot de passe modifié. Communiquez-le à la personne.')
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Employés</h1>
        <button type="button" onClick={() => (open ? close() : setOpen(true))} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy">
          {open ? 'Annuler' : 'Ajouter un employé'}
        </button>
      </div>

      {open && (
        <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-lg border border-ink/10 bg-white p-5 sm:grid-cols-2">
          <Field label="Nom et prénom" htmlFor="u-name"><input id="u-name" required className={inputClass} value={form.fullName} onChange={set('fullName')} /></Field>
          <Field label="E-mail (identifiant de connexion)" htmlFor="u-email">
            <input id="u-email" type="email" required disabled={editingId !== null} className={`${inputClass} disabled:bg-ink/5`} value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Rôle" htmlFor="u-role" hint="Employé : voit ses chantiers et ses tâches. Stagiaire : même accès limité. Dirigeant : accès complet.">
            <select id="u-role" className={inputClass} value={form.role} onChange={set('role')}>
              {(Object.keys(roleLabels) as Role[]).map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
            </select>
          </Field>
          <Field label="Fonction" htmlFor="u-job"><input id="u-job" className={inputClass} placeholder="Électricien, apprenti…" value={form.jobTitle} onChange={set('jobTitle')} /></Field>
          <Field label="Téléphone" htmlFor="u-phone"><input id="u-phone" type="tel" className={inputClass} value={form.phone} onChange={set('phone')} /></Field>
          {!editingId && (
            <Field label="Mot de passe provisoire" htmlFor="u-pass" hint="10 caractères minimum. Communiquez-le à la personne.">
              <input id="u-pass" type="text" required minLength={10} maxLength={72} autoComplete="off" className={inputClass} value={form.password} onChange={set('password')} />
            </Field>
          )}
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md bg-ink px-5 py-2.5 font-semibold text-white hover:bg-navy">{editingId ? 'Enregistrer' : 'Créer le compte'}</button>
          </div>
        </form>
      )}

      {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
      <ul className="mt-6 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white">
        {items.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">
                {u.fullName} <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-xs font-medium">{roleLabels[u.role]}</span>
                {!u.active && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Désactivé</span>}
              </p>
              <p className="text-sm text-ink/60">{[u.jobTitle, u.email, u.phone].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm font-semibold">
              <button type="button" className="underline" onClick={() => edit(u)}>Modifier</button>
              <button type="button" className="underline" onClick={() => resetPassword(u)}>Mot de passe</button>
              <button type="button" className="underline" onClick={() => toggleActive(u)}>{u.active ? 'Désactiver' : 'Réactiver'}</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
