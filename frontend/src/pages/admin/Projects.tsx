import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Field, inputClass } from '../../components/Field'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/http'
import { projectStatusLabels, roleLabels, type Client, type Project, type ProjectStatus, type UserAccount } from '../../lib/types'

const empty = { name: '', clientId: '', address: '', description: '', startDate: '', endDate: '', budget: '' }

export default function Projects() {
  const { session } = useAuth()
  const isAdmin = session?.role === 'ADMIN'
  const [items, setItems] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<UserAccount[]>([])
  const [form, setForm] = useState(empty)
  const [open, setOpen] = useState(false)
  const [teamFor, setTeamFor] = useState<number | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api<Project[]>('/projects').then(setItems).catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    load()
    if (isAdmin) {
      api<Client[]>('/clients').then(setClients).catch((e: Error) => setError(e.message))
      api<UserAccount[]>('/users').then(setUsers).catch((e: Error) => setError(e.message))
    }
  }, [load, isAdmin])

  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const clientName = (id: number) => clients.find((c) => c.id === id)?.name
  const activeUsers = users.filter((u) => u.active)
  const memberNames = (p: Project) => p.memberIds.map((id) => users.find((u) => u.id === id)?.fullName).filter(Boolean).join(', ')

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError('')
    try {
      await api('/projects', {
        method: 'POST',
        json: {
          name: form.name,
          clientId: Number(form.clientId),
          address: form.address,
          description: form.description,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          budget: form.budget ? Number(form.budget) : null,
        },
      })
      setForm(empty)
      setOpen(false)
      load()
    } catch (e) { setError((e as Error).message) }
  }

  async function changeStatus(id: number, status: ProjectStatus) {
    try {
      await api(`/projects/${id}/status`, { method: 'PATCH', json: { status } })
      load()
    } catch (e) { setError((e as Error).message) }
  }

  function openTeam(p: Project) {
    if (teamFor === p.id) { setTeamFor(null); return }
    setSelected(p.memberIds.filter((id) => activeUsers.some((u) => u.id === id)))
    setTeamFor(p.id)
  }

  async function saveTeam(id: number) {
    setError('')
    try {
      await api(`/projects/${id}/members`, { method: 'PUT', json: { userIds: selected } })
      setTeamFor(null)
      load()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">{isAdmin ? 'Chantiers' : 'Mes chantiers'}</h1>
        {isAdmin && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy">
            {open ? 'Annuler' : 'Nouveau chantier'}
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-lg border border-ink/10 bg-white p-5 sm:grid-cols-2">
          <Field label="Nom du chantier" htmlFor="p-name"><input id="p-name" required className={inputClass} value={form.name} onChange={set('name')} /></Field>
          <Field label="Client" htmlFor="p-client" hint={clients.length === 0 ? 'Créez d’abord un client.' : undefined}>
            <select id="p-client" required className={inputClass} value={form.clientId} onChange={set('clientId')}>
              <option value="">Choisir…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="Adresse" htmlFor="p-address"><input id="p-address" className={inputClass} value={form.address} onChange={set('address')} /></Field></div>
          <Field label="Début prévu" htmlFor="p-start"><input id="p-start" type="date" className={inputClass} value={form.startDate} onChange={set('startDate')} /></Field>
          <Field label="Fin prévue" htmlFor="p-end"><input id="p-end" type="date" className={inputClass} value={form.endDate} onChange={set('endDate')} /></Field>
          <Field label="Budget prévisionnel (€)" htmlFor="p-budget"><input id="p-budget" type="number" min="0" step="0.01" className={inputClass} value={form.budget} onChange={set('budget')} /></Field>
          <div className="sm:col-span-2"><Field label="Description des travaux" htmlFor="p-desc"><textarea id="p-desc" rows={3} className={inputClass} value={form.description} onChange={set('description')} /></Field></div>
          <div className="sm:col-span-2"><button type="submit" className="rounded-md bg-ink px-5 py-2.5 font-semibold text-white hover:bg-navy">Créer le chantier</button></div>
        </form>
      )}

      {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
      {items.length === 0 && !error && <p className="mt-6 text-ink/60">{isAdmin ? 'Aucun chantier pour le moment.' : 'Vous n’êtes affecté à aucun chantier pour le moment.'}</p>}
      <ul className="mt-6 space-y-4">
        {items.map((p) => (
          <li key={p.id} className="rounded-lg border border-ink/10 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{p.name}</p>
                <p className="text-sm text-ink/60">
                  {[isAdmin && clientName(p.clientId), p.address, p.startDate && `du ${new Date(p.startDate).toLocaleDateString('fr-FR')}`, p.endDate && `au ${new Date(p.endDate).toLocaleDateString('fr-FR')}`].filter(Boolean).join(' · ')}
                </p>
              </div>
              {isAdmin ? (
                <select aria-label={`Statut du chantier ${p.name}`} className="rounded-md border border-ink/20 bg-white px-3 py-2 text-sm" value={p.status} onChange={(e) => changeStatus(p.id, e.target.value as ProjectStatus)}>
                  {Object.entries(projectStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              ) : (
                <span className="rounded-full bg-ink/10 px-3 py-1 text-sm font-medium">{projectStatusLabels[p.status]}</span>
              )}
            </div>
            {p.description && <p className="mt-3 whitespace-pre-line text-ink/80">{p.description}</p>}
            {isAdmin && p.budget != null && <p className="mt-2 text-sm text-ink/60">Budget prévu : {p.budget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>}

            {isAdmin && (
              <div className="mt-4 border-t border-ink/10 pt-4">
                <p className="text-sm"><span className="font-semibold">Équipe :</span> {memberNames(p) || 'personne d’affecté'}</p>
                <button type="button" className="mt-2 text-sm font-semibold underline" onClick={() => openTeam(p)}>{teamFor === p.id ? 'Fermer' : 'Gérer l’équipe'}</button>
                {teamFor === p.id && (
                  <fieldset className="mt-3 space-y-2">
                    <legend className="sr-only">Équipe du chantier {p.name}</legend>
                    {activeUsers.length === 0 && <p className="text-sm text-ink/60">Aucun compte actif. Créez d’abord des employés dans la page Employés.</p>}
                    {activeUsers.map((u) => (
                      <label key={u.id} className="flex items-center gap-3 text-sm">
                        <input type="checkbox" className="h-4 w-4" checked={selected.includes(u.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, u.id] : s.filter((id) => id !== u.id)))} />
                        {u.fullName} <span className="text-ink/50">({roleLabels[u.role]})</span>
                      </label>
                    ))}
                    <button type="button" onClick={() => saveTeam(p.id)} className="mt-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy">Enregistrer l’équipe</button>
                  </fieldset>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
