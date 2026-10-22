import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Field, inputClass } from '../../components/Field'
import { useAuth } from '../../lib/auth'
import { dateFr, eur, todayIso } from '../../lib/format'
import { api } from '../../lib/http'
import type { Material, Project } from '../../lib/types'

const units = ['u', 'm', 'ml', 'm²', 'kg', 'lot', 'boîte', 'rouleau']

export default function Materials() {
  const { session } = useAuth()
  const isAdmin = session?.role === 'ADMIN'
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [items, setItems] = useState<Material[]>([])
  const [form, setForm] = useState({ name: '', quantity: '1', unit: 'u' })
  const [buyingId, setBuyingId] = useState<number | null>(null)
  const [buy, setBuy] = useState({ unitCost: '', purchasedOn: todayIso(), supplier: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    api<Project[]>('/projects')
      .then((p) => { setProjects(p); if (p.length > 0) setProjectId((cur) => cur || String(p[0].id)) })
      .catch((e: Error) => setError(e.message))
  }, [])

  const load = useCallback(() => {
    if (!projectId) { setItems([]); return }
    api<Material[]>(`/materials?projectId=${projectId}`).then(setItems).catch((e: Error) => setError(e.message))
  }, [projectId])
  useEffect(load, [load])

  async function onAdd(ev: FormEvent) {
    ev.preventDefault()
    setError('')
    try {
      await api('/materials', { method: 'POST', json: { projectId: Number(projectId), name: form.name, unit: form.unit, quantity: Number(form.quantity) } })
      setForm((f) => ({ ...f, name: '', quantity: '1' })) // on garde l'unité : on enchaîne les saisies
      load()
    } catch (e) { setError((e as Error).message) }
  }

  async function changeQuantity(m: Material) {
    const v = window.prompt(`Nouvelle quantité pour « ${m.name} » (${m.unit}) :`, String(m.quantity))
    if (!v) return
    const quantity = Number(v.replace(',', '.'))
    if (!(quantity > 0)) { setError('Quantité invalide.'); return }
    setError('')
    try {
      await api(`/materials/${m.id}`, { method: 'PUT', json: { quantity } })
      load()
    } catch (e) { setError((e as Error).message) }
  }

  async function remove(m: Material) {
    if (!window.confirm(`Retirer « ${m.name} » de la liste ?`)) return
    setError('')
    try {
      await api(`/materials/${m.id}`, { method: 'DELETE' })
      load()
    } catch (e) { setError((e as Error).message) }
  }

  function startBuy(m: Material) {
    setBuy({ unitCost: m.unitCost != null ? String(m.unitCost) : '', purchasedOn: m.purchasedOn ?? todayIso(), supplier: m.supplier ?? '' })
    setBuyingId(buyingId === m.id ? null : m.id)
  }

  async function saveBuy(m: Material) {
    setError('')
    try {
      await api(`/materials/${m.id}/purchase`, { method: 'POST', json: { unitCost: Number(buy.unitCost), purchasedOn: buy.purchasedOn, supplier: buy.supplier } })
      setBuyingId(null)
      load()
    } catch (e) { setError((e as Error).message) }
  }

  async function cancelBuy(m: Material) {
    if (!window.confirm(`Annuler l’achat de « ${m.name} » ?`)) return
    setError('')
    try {
      await api(`/materials/${m.id}/purchase`, { method: 'DELETE' })
      load()
    } catch (e) { setError((e as Error).message) }
  }

  const boughtTotal = items.filter((m) => m.purchasedOn).reduce((s, m) => s + (m.unitCost ?? 0) * m.quantity, 0)
  const toBuy = items.filter((m) => !m.purchasedOn).length

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Matériel des chantiers</h1>
      {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
      {projects.length === 0 && !error && <p className="mt-6 text-ink/60">{isAdmin ? 'Créez d’abord un chantier.' : 'Vous n’êtes affecté à aucun chantier pour le moment.'}</p>}

      {projects.length > 0 && (
        <>
          <div className="mt-6 max-w-md">
            <Field label="Chantier" htmlFor="m-project">
              <select id="m-project" className={inputClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          </div>

          <form onSubmit={onAdd} className="mt-6 grid gap-3 rounded-lg border border-ink/10 bg-white p-4 sm:grid-cols-[1fr_7rem_7rem_auto] sm:items-end">
            <Field label="Matériel nécessaire" htmlFor="m-name"><input id="m-name" required maxLength={200} className={inputClass} placeholder="Câble 3G2,5 mm²" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Quantité" htmlFor="m-qty"><input id="m-qty" type="number" required min="0.01" step="0.01" className={inputClass} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} /></Field>
            <Field label="Unité" htmlFor="m-unit">
              <select id="m-unit" className={inputClass} value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <button type="submit" className="rounded-md bg-ink px-5 py-2.5 font-semibold text-white hover:bg-navy">Ajouter</button>
          </form>

          <p className="mt-4 text-sm text-ink/60">
            {toBuy} à acheter{isAdmin && <> · Total acheté (HT) : <strong>{eur(boughtTotal)}</strong></>}
          </p>
          {items.length === 0 && <p className="mt-4 text-ink/60">Aucun matériel listé pour ce chantier.</p>}
          <ul className="mt-3 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white">
            {items.map((m) => (
              <li key={m.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {m.name} <span className="font-normal text-ink/60">— {m.quantity} {m.unit}</span>
                      {m.invoiceId ? <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Facturé</span>
                        : m.purchasedOn ? <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">Acheté</span>
                        : <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">À acheter</span>}
                    </p>
                    {isAdmin && m.purchasedOn && (
                      <p className="text-sm text-ink/60">{[`${eur(m.unitCost)} HT l’unité`, `soit ${eur((m.unitCost ?? 0) * m.quantity)}`, m.supplier, `le ${dateFr(m.purchasedOn)}`].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm font-semibold">
                    {!m.purchasedOn && <button type="button" className="underline" onClick={() => changeQuantity(m)}>Quantité</button>}
                    {isAdmin && !m.invoiceId && <button type="button" className="underline" onClick={() => startBuy(m)}>{m.purchasedOn ? 'Modifier l’achat' : 'Marquer acheté'}</button>}
                    {isAdmin && m.purchasedOn && !m.invoiceId && <button type="button" className="underline" onClick={() => cancelBuy(m)}>Annuler l’achat</button>}
                    {!m.invoiceId && (isAdmin || !m.purchasedOn) && <button type="button" className="underline" onClick={() => remove(m)}>Retirer</button>}
                  </div>
                </div>
                {isAdmin && buyingId === m.id && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-4 sm:items-end">
                    <Field label="Prix d’achat HT / unité (€)" htmlFor={`b-cost-${m.id}`}><input id={`b-cost-${m.id}`} type="number" min="0" step="0.01" className={inputClass} value={buy.unitCost} onChange={(e) => setBuy((b) => ({ ...b, unitCost: e.target.value }))} /></Field>
                    <Field label="Date d’achat" htmlFor={`b-date-${m.id}`}><input id={`b-date-${m.id}`} type="date" className={inputClass} value={buy.purchasedOn} onChange={(e) => setBuy((b) => ({ ...b, purchasedOn: e.target.value }))} /></Field>
                    <Field label="Fournisseur" htmlFor={`b-sup-${m.id}`}><input id={`b-sup-${m.id}`} className={inputClass} value={buy.supplier} onChange={(e) => setBuy((b) => ({ ...b, supplier: e.target.value }))} /></Field>
                    <button type="button" disabled={buy.unitCost === '' || !buy.purchasedOn} onClick={() => saveBuy(m)} className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy disabled:opacity-50">Enregistrer</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
