import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Field, inputClass } from '../../components/Field'
import { dateFr, eur, todayIso } from '../../lib/format'
import { api } from '../../lib/http'
import type { SalaryPayment, SalaryRow } from '../../lib/types'

const methods = ['Virement', 'Chèque', 'Espèces']

export default function Salaries() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [rows, setRows] = useState<SalaryRow[]>([])
  const [payFor, setPayFor] = useState<number | null>(null)
  const [pay, setPay] = useState({ amount: '', paidOn: todayIso(), method: 'Virement', note: '' })
  const [historyFor, setHistoryFor] = useState<number | null>(null)
  const [history, setHistory] = useState<SalaryPayment[]>([])
  const [error, setError] = useState('')

  const load = useCallback(() => {
    if (!month) return
    api<SalaryRow[]>(`/salaries?month=${month}`).then(setRows).catch((e: Error) => setError(e.message))
  }, [month])
  useEffect(load, [load])

  const loadHistory = useCallback((userId: number) => {
    api<SalaryPayment[]>(`/salaries/${userId}/payments`).then(setHistory).catch((e: Error) => setError(e.message))
  }, [])

  async function editAmount(r: SalaryRow) {
    const v = window.prompt(`Salaire mensuel de ${r.fullName} (€) :`, String(r.monthlyAmount))
    if (v === null) return
    const amount = Number(v.replace(',', '.'))
    if (!(amount >= 0)) { setError('Montant invalide.'); return }
    setError('')
    try {
      await api(`/salaries/${r.userId}`, { method: 'PUT', json: { monthlyAmount: amount } })
      load()
    } catch (e) { setError((e as Error).message) }
  }

  function startPay(r: SalaryRow) {
    if (payFor === r.userId) { setPayFor(null); return }
    setPay({ amount: r.remaining > 0 ? String(r.remaining) : '', paidOn: todayIso(), method: 'Virement', note: '' })
    setPayFor(r.userId)
  }

  async function onPay(ev: FormEvent, r: SalaryRow) {
    ev.preventDefault()
    setError('')
    try {
      await api(`/salaries/${r.userId}/payments`, { method: 'POST', json: { period: month, amount: Number(pay.amount), paidOn: pay.paidOn, method: pay.method, note: pay.note } })
      setPayFor(null)
      load()
      if (historyFor === r.userId) loadHistory(r.userId)
    } catch (e) { setError((e as Error).message) }
  }

  function toggleHistory(r: SalaryRow) {
    if (historyFor === r.userId) { setHistoryFor(null); return }
    setHistoryFor(r.userId)
    loadHistory(r.userId)
  }

  async function removePayment(p: SalaryPayment, userId: number) {
    if (!window.confirm(`Supprimer ce paiement de ${eur(p.amount)} ?`)) return
    setError('')
    try {
      await api(`/salaries/payments/${p.id}`, { method: 'DELETE' })
      load()
      loadHistory(userId)
    } catch (e) { setError((e as Error).message) }
  }

  const totalDue = rows.reduce((s, r) => s + r.monthlyAmount, 0)
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Salaires</h1>
        <div className="w-48"><Field label="Mois" htmlFor="s-month"><input id="s-month" type="month" className={inputClass} value={month} onChange={(e) => setMonth(e.target.value)} /></Field></div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-ink/10 bg-white p-4"><p className="text-sm text-ink/60">À verser ce mois</p><p className="text-2xl font-extrabold">{eur(totalDue)}</p></div>
        <div className="rounded-lg border border-ink/10 bg-white p-4"><p className="text-sm text-ink/60">Déjà versé</p><p className="text-2xl font-extrabold">{eur(totalPaid)}</p></div>
        <div className="rounded-lg border border-ink/10 bg-white p-4"><p className="text-sm text-ink/60">Reste à verser</p><p className="text-2xl font-extrabold">{eur(totalDue - totalPaid)}</p></div>
      </div>

      {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
      {rows.length === 0 && !error && <p className="mt-6 text-ink/60">Aucun employé ou stagiaire actif. Créez-les dans la page Employés.</p>}
      <ul className="mt-6 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white">
        {rows.map((r) => (
          <li key={r.userId} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{r.fullName} {r.jobTitle && <span className="font-normal text-ink/60">— {r.jobTitle}</span>}</p>
                <p className="text-sm text-ink/70">
                  Salaire : {r.monthlyAmount > 0 ? eur(r.monthlyAmount) : <em>non renseigné</em>} · Versé : {eur(r.paid)} ·{' '}
                  {r.monthlyAmount > 0 && (r.remaining <= 0
                    ? <span className="font-semibold text-green-700">{r.remaining < 0 ? `Payé (+${eur(-r.remaining)})` : 'Payé'}</span>
                    : <span className="font-semibold text-amber-700">Reste {eur(r.remaining)}</span>)}
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm font-semibold">
                <button type="button" className="underline" onClick={() => editAmount(r)}>Salaire mensuel</button>
                <button type="button" className="underline" onClick={() => startPay(r)}>{payFor === r.userId ? 'Fermer' : 'Enregistrer un paiement'}</button>
                <button type="button" className="underline" onClick={() => toggleHistory(r)}>{historyFor === r.userId ? 'Masquer l’historique' : 'Historique'}</button>
              </div>
            </div>

            {payFor === r.userId && (
              <form onSubmit={(e) => onPay(e, r)} className="mt-3 grid gap-3 sm:grid-cols-5 sm:items-end">
                <Field label="Montant (€)" htmlFor={`p-amount-${r.userId}`}><input id={`p-amount-${r.userId}`} type="number" required min="0.01" step="0.01" className={inputClass} value={pay.amount} onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} /></Field>
                <Field label="Date" htmlFor={`p-date-${r.userId}`}><input id={`p-date-${r.userId}`} type="date" required className={inputClass} value={pay.paidOn} onChange={(e) => setPay((p) => ({ ...p, paidOn: e.target.value }))} /></Field>
                <Field label="Moyen" htmlFor={`p-method-${r.userId}`}>
                  <select id={`p-method-${r.userId}`} className={inputClass} value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))}>{methods.map((m) => <option key={m}>{m}</option>)}</select>
                </Field>
                <Field label="Note" htmlFor={`p-note-${r.userId}`}><input id={`p-note-${r.userId}`} maxLength={300} className={inputClass} placeholder="Acompte, prime…" value={pay.note} onChange={(e) => setPay((p) => ({ ...p, note: e.target.value }))} /></Field>
                <button type="submit" className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy">Valider</button>
              </form>
            )}

            {historyFor === r.userId && (
              <ul className="mt-3 space-y-1 text-sm">
                {history.length === 0 && <li className="text-ink/60">Aucun paiement enregistré.</li>}
                {history.map((p) => (
                  <li key={p.id} className="flex flex-wrap justify-between gap-2 rounded bg-ink/5 px-3 py-2">
                    <span>{dateFr(p.paidOn)} · mois {p.period} · <strong>{eur(p.amount)}</strong> {[p.method, p.note].filter(Boolean).join(' · ')}</span>
                    <button type="button" className="font-semibold underline" onClick={() => removePayment(p, r.userId)}>Supprimer</button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
