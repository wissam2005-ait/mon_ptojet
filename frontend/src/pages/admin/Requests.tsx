import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/http'
import { requestStatusLabels, type ContactRequest, type RequestStatus } from '../../lib/types'

export default function Requests() {
  const [items, setItems] = useState<ContactRequest[]>([])
  const [filter, setFilter] = useState<'' | RequestStatus>('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api<ContactRequest[]>(`/contact-requests${filter ? `?status=${filter}` : ''}`).then(setItems).catch((e: Error) => setError(e.message))
  }, [filter])
  useEffect(load, [load])

  async function changeStatus(id: number, status: RequestStatus) {
    setError('')
    try { await api(`/contact-requests/${id}/status`, { method: 'PATCH', json: { status } }); load() } catch (e) { setError((e as Error).message) }
  }

  async function createClient(id: number) {
    setError('')
    try { await api(`/contact-requests/${id}/client`, { method: 'POST' }); load() } catch (e) { setError((e as Error).message) }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Demandes</h1>
        <select aria-label="Filtrer par statut" className="rounded-md border border-ink/20 bg-white px-3 py-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value as '' | RequestStatus)}>
          <option value="">Toutes</option>
          {Object.entries(requestStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
      {items.length === 0 && !error && <p className="mt-6 text-ink/60">Aucune demande.</p>}
      <ul className="mt-6 space-y-4">
        {items.map((r) => (
          <li key={r.id} className="rounded-lg border border-ink/10 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {r.fullName} <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-xs font-medium">{r.kind === 'QUOTE' ? 'Devis' : 'Message'}</span>
                </p>
                <p className="text-sm text-ink/60">
                  {[r.phone, r.email, r.workType, r.siteAddress, new Date(r.createdAt).toLocaleString('fr-FR')].filter(Boolean).join(' · ')}
                </p>
              </div>
              <select aria-label={`Statut de la demande de ${r.fullName}`} className="rounded-md border border-ink/20 bg-white px-3 py-2 text-sm" value={r.status} onChange={(e) => changeStatus(r.id, e.target.value as RequestStatus)}>
                {Object.entries(requestStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <p className="mt-3 whitespace-pre-line text-ink/80">{r.message}</p>
            <div className="mt-3 text-sm font-semibold">
              {r.clientId ? <span className="text-green-800">Client créé</span> : <button type="button" className="underline" onClick={() => createClient(r.id)}>Créer la fiche client</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
