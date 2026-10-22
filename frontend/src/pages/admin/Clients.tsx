import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Field, inputClass } from '../../components/Field'
import { api } from '../../lib/http'
import type { Client } from '../../lib/types'

const empty = { name: '', email: '', phone: '', address: '', postalCode: '', city: '', siret: '', vatNumber: '', notes: '' }

export default function Clients() {
  const [items, setItems] = useState<Client[]>([])
  const [q, setQ] = useState('')
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api<Client[]>(`/clients${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`).then(setItems).catch((e: Error) => setError(e.message))
  }, [q])
  useEffect(load, [load])

  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function close() { setOpen(false); setEditingId(null); setForm(empty) }

  function edit(c: Client) {
    setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '', postalCode: c.postalCode ?? '', city: c.city ?? '', siret: c.siret ?? '', vatNumber: c.vatNumber ?? '', notes: c.notes ?? '' })
    setEditingId(c.id)
    setOpen(true)
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError('')
    try {
      await api(editingId ? `/clients/${editingId}` : '/clients', { method: editingId ? 'PUT' : 'POST', json: form })
      close()
      load()
    } catch (e) { setError((e as Error).message) }
  }

  async function archive(c: Client) {
    if (!window.confirm(`Archiver le client « ${c.name} » ?`)) return
    setError('')
    try { await api(`/clients/${c.id}/archive`, { method: 'POST' }); load() } catch (e) { setError((e as Error).message) }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Clients</h1>
        <button type="button" onClick={() => (open ? close() : setOpen(true))} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy">{open ? 'Annuler' : 'Nouveau client'}</button>
      </div>

      {open && (
        <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-lg border border-ink/10 bg-white p-5 sm:grid-cols-2">
          <Field label="Nom / raison sociale" htmlFor="c-name"><input id="c-name" required maxLength={200} className={inputClass} value={form.name} onChange={set('name')} /></Field>
          <Field label="E-mail" htmlFor="c-email"><input id="c-email" type="email" className={inputClass} value={form.email} onChange={set('email')} /></Field>
          <Field label="Téléphone" htmlFor="c-phone"><input id="c-phone" type="tel" className={inputClass} value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Adresse" htmlFor="c-address"><input id="c-address" className={inputClass} value={form.address} onChange={set('address')} /></Field>
          <Field label="Code postal" htmlFor="c-zip"><input id="c-zip" maxLength={10} className={inputClass} value={form.postalCode} onChange={set('postalCode')} /></Field>
          <Field label="Ville" htmlFor="c-city"><input id="c-city" className={inputClass} value={form.city} onChange={set('city')} /></Field>
          <Field label="SIRET" htmlFor="c-siret" hint="Pour les professionnels."><input id="c-siret" maxLength={20} className={inputClass} value={form.siret} onChange={set('siret')} /></Field>
          <Field label="N° de TVA" htmlFor="c-vat"><input id="c-vat" maxLength={30} className={inputClass} value={form.vatNumber} onChange={set('vatNumber')} /></Field>
          <div className="sm:col-span-2"><Field label="Notes" htmlFor="c-notes"><textarea id="c-notes" rows={3} maxLength={2000} className={inputClass} value={form.notes} onChange={set('notes')} /></Field></div>
          <div className="sm:col-span-2"><button type="submit" className="rounded-md bg-ink px-5 py-2.5 font-semibold text-white hover:bg-navy">{editingId ? 'Enregistrer' : 'Créer le client'}</button></div>
        </form>
      )}

      <div className="mt-6 max-w-sm">
        <label htmlFor="c-search" className="sr-only">Rechercher un client</label>
        <input id="c-search" type="search" placeholder="Rechercher par nom ou e-mail" className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
      {items.length === 0 && !error && <p className="mt-6 text-ink/60">Aucun client.</p>}
      <ul className="mt-4 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white">
        {items.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm text-ink/60">{[c.email, c.phone, [c.postalCode, c.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="flex gap-4 text-sm font-semibold">
              <button type="button" className="underline" onClick={() => edit(c)}>Modifier</button>
              <button type="button" className="underline" onClick={() => archive(c)}>Archiver</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
