import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Field, inputClass } from '../../components/Field'
import { dateFr, eur, round2 } from '../../lib/format'
import { api } from '../../lib/http'
import { invoiceStatusLabels, type Client, type Invoice, type Material, type Project } from '../../lib/types'

interface Extra { description: string; unit: string; quantity: string; unitPrice: string }
const emptyExtra: Extra = { description: '', unit: 'h', quantity: '1', unitPrice: '' }

export default function Invoices() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [billable, setBillable] = useState<Material[]>([])
  const [markup, setMarkup] = useState('20')
  const [vat, setVat] = useState('20')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [extras, setExtras] = useState<Extra[]>([])
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api<Invoice[]>('/invoices').then(setInvoices).catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    load()
    api<Project[]>('/projects').then(setProjects).catch((e: Error) => setError(e.message))
    api<Client[]>('/clients').then(setClients).catch((e: Error) => setError(e.message))
  }, [load])

  // Matériel acheté et pas encore facturé du chantier choisi
  useEffect(() => {
    if (!projectId) { setBillable([]); return }
    api<Material[]>(`/materials?projectId=${projectId}`)
      .then((all) => setBillable(all.filter((m) => m.purchasedOn && !m.invoiceId)))
      .catch((e: Error) => setError(e.message))
  }, [projectId])

  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? `Chantier n°${id}`
  const clientName = (id: number) => clients.find((c) => c.id === id)?.name ?? ''

  // Aperçu des totaux (le serveur recalcule et fait foi)
  const preview = useMemo(() => {
    const k = 1 + (Number(markup) || 0) / 100
    const mat = billable.reduce((s, m) => s + round2(m.quantity * round2((m.unitCost ?? 0) * k)), 0)
    const ext = extras.reduce((s, e) => s + round2((Number(e.quantity) || 0) * (Number(e.unitPrice) || 0)), 0)
    const ht = round2(mat + ext)
    const tva = round2((ht * (Number(vat) || 0)) / 100)
    return { ht, tva, ttc: round2(ht + tva) }
  }, [billable, extras, markup, vat])

  function setExtra(i: number, k: keyof Extra, v: string) {
    setExtras((list) => list.map((e, j) => (j === i ? { ...e, [k]: v } : e)))
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError('')
    try {
      const created = await api<Invoice>('/invoices/generate', {
        method: 'POST',
        json: {
          projectId: Number(projectId),
          markupPercent: Number(markup),
          vatRate: Number(vat),
          dueDate: dueDate || null,
          notes,
          extraLines: extras.filter((e) => e.description.trim()).map((e) => ({ description: e.description, unit: e.unit, quantity: Number(e.quantity), unitPrice: Number(e.unitPrice) })),
        },
      })
      setOpen(false); setProjectId(''); setExtras([]); setNotes(''); setDueDate('')
      load()
      navigate(`/admin/factures/${created.id}`)
    } catch (e) { setError((e as Error).message) }
  }

  async function remove(i: Invoice) {
    if (!window.confirm('Supprimer ce brouillon ? Son matériel redeviendra facturable.')) return
    setError('')
    try {
      await api(`/invoices/${i.id}`, { method: 'DELETE' })
      load()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Factures</h1>
        <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy">{open ? 'Annuler' : 'Générer une facture'}</button>
      </div>

      {open && (
        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border border-ink/10 bg-white p-5">
          <Field label="Chantier" htmlFor="i-project" hint="La facture reprend le matériel acheté de ce chantier qui n’a pas encore été facturé.">
            <select id="i-project" required className={inputClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Choisir…</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>

          {projectId && (
            <>
              {billable.length === 0
                ? <p className="text-sm text-amber-800">Aucun matériel acheté et non facturé sur ce chantier. Marquez le matériel « acheté » dans la page Matériel, ou ajoutez des lignes libres ci-dessous.</p>
                : (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-ink/60"><th className="py-1">Matériel acheté</th><th>Qté</th><th className="text-right">Coût HT</th></tr></thead>
                    <tbody>{billable.map((m) => <tr key={m.id} className="border-t border-ink/10"><td className="py-1">{m.name}</td><td>{m.quantity} {m.unit}</td><td className="text-right">{eur((m.unitCost ?? 0) * m.quantity)}</td></tr>)}</tbody>
                  </table>
                )}

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Marge sur le matériel (%)" htmlFor="i-markup" hint="0 pour refacturer au prix d’achat."><input id="i-markup" type="number" min="0" step="0.01" required className={inputClass} value={markup} onChange={(e) => setMarkup(e.target.value)} /></Field>
                <Field label="TVA (%)" htmlFor="i-vat" hint="20, 10 ou 5,5 selon les travaux."><input id="i-vat" type="number" min="0" max="100" step="0.01" required className={inputClass} value={vat} onChange={(e) => setVat(e.target.value)} /></Field>
                <Field label="Échéance de paiement" htmlFor="i-due"><input id="i-due" type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
              </div>

              <div>
                <p className="text-sm font-semibold">Lignes supplémentaires (main d’œuvre, déplacement…)</p>
                {extras.map((e, i) => (
                  <div key={i} className="mt-2 grid gap-2 sm:grid-cols-[1fr_5rem_6rem_8rem_auto] sm:items-center">
                    <input aria-label="Description" className={inputClass} placeholder="Main d’œuvre" value={e.description} onChange={(ev) => setExtra(i, 'description', ev.target.value)} />
                    <input aria-label="Unité" className={inputClass} value={e.unit} onChange={(ev) => setExtra(i, 'unit', ev.target.value)} />
                    <input aria-label="Quantité" type="number" min="0.01" step="0.01" className={inputClass} value={e.quantity} onChange={(ev) => setExtra(i, 'quantity', ev.target.value)} />
                    <input aria-label="Prix unitaire HT" type="number" min="0" step="0.01" className={inputClass} placeholder="Prix HT" value={e.unitPrice} onChange={(ev) => setExtra(i, 'unitPrice', ev.target.value)} />
                    <button type="button" className="text-sm font-semibold underline" onClick={() => setExtras((l) => l.filter((_, j) => j !== i))}>Retirer</button>
                  </div>
                ))}
                <button type="button" className="mt-2 text-sm font-semibold underline" onClick={() => setExtras((l) => [...l, { ...emptyExtra }])}>+ Ajouter une ligne</button>
              </div>

              <Field label="Notes (facultatif)" htmlFor="i-notes"><textarea id="i-notes" rows={2} maxLength={2000} className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

              <p className="text-sm">Aperçu : <strong>{eur(preview.ht)}</strong> HT · TVA {eur(preview.tva)} · <strong>{eur(preview.ttc)}</strong> TTC</p>
              <button type="submit" className="rounded-md bg-ink px-5 py-2.5 font-semibold text-white hover:bg-navy">Créer le brouillon</button>
            </>
          )}
        </form>
      )}

      {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
      {invoices.length === 0 && !error && <p className="mt-6 text-ink/60">Aucune facture pour le moment.</p>}
      <ul className="mt-6 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white">
        {invoices.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">
                {i.number ?? `Brouillon n°${i.id}`}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${i.status === 'PAID' ? 'bg-green-100 text-green-800' : i.status === 'SENT' ? 'bg-blue-100 text-blue-800' : 'bg-ink/10'}`}>{invoiceStatusLabels[i.status]}</span>
              </p>
              <p className="text-sm text-ink/60">{[clientName(i.clientId), projectName(i.projectId), i.issueDate && `émise le ${dateFr(i.issueDate)}`].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="flex items-center gap-4 text-sm font-semibold">
              <span className="text-base">{eur(i.totalTtc)} TTC</span>
              <Link to={`/admin/factures/${i.id}`} className="underline">Ouvrir</Link>
              {i.status === 'DRAFT' && <button type="button" className="underline" onClick={() => remove(i)}>Supprimer</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
