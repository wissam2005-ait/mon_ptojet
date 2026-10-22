import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { company } from '../../lib/company'
import { dateFr, eur } from '../../lib/format'
import { api } from '../../lib/http'
import { invoiceStatusLabels, type Client, type Invoice, type Project } from '../../lib/types'

export default function InvoiceView() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api<Invoice>(`/invoices/${id}`).then(setInvoice).catch((e: Error) => setError(e.message))
  }, [id])
  useEffect(load, [load])

  useEffect(() => {
    if (!invoice) return
    api<Client[]>('/clients').then((all) => setClient(all.find((c) => c.id === invoice.clientId) ?? null)).catch(() => undefined)
    api<Project>(`/projects/${invoice.projectId}`).then(setProject).catch(() => undefined)
  }, [invoice])

  async function act(path: string, json?: unknown, confirm?: string) {
    if (confirm && !window.confirm(confirm)) return
    setError('')
    try {
      setInvoice(await api<Invoice>(`/invoices/${id}/${path}`, { method: 'POST', json: json ?? {} }))
    } catch (e) { setError((e as Error).message) }
  }

  if (error && !invoice) return <p className="text-red-700" role="alert">{error}</p>
  if (!invoice) return <p className="text-ink/60">Chargement…</p>

  const draft = invoice.status === 'DRAFT'

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <Link to="/admin/factures" className="text-sm font-semibold underline">← Factures</Link>
        <span className="rounded-full bg-ink/10 px-3 py-1 text-sm">{invoiceStatusLabels[invoice.status]}</span>
        {draft && <button type="button" onClick={() => act('issue', undefined, 'Émettre la facture ? Elle recevra son numéro définitif et ne pourra plus être supprimée.')} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy">Émettre la facture</button>}
        {invoice.status === 'SENT' && <button type="button" onClick={() => act('paid', { paid: true })} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy">Marquer comme payée</button>}
        {invoice.status === 'PAID' && <button type="button" onClick={() => act('paid', { paid: false })} className="text-sm font-semibold underline">Marquer comme non payée</button>}
        <button type="button" onClick={() => window.print()} className="rounded-md border border-ink/30 px-4 py-2 text-sm font-semibold hover:border-ink">Imprimer / PDF</button>
      </div>
      {error && <p className="mt-3 text-red-700 print:hidden" role="alert">{error}</p>}
      {draft && <p className="mt-3 text-sm text-amber-800 print:hidden">Brouillon : le numéro et la date seront attribués à l’émission. Vérifiez les coordonnées de l’entreprise dans <code>lib/company.ts</code>.</p>}

      <article className="mx-auto mt-6 max-w-3xl rounded-lg border border-ink/10 bg-white p-8 print:mt-0 print:max-w-none print:border-0 print:p-0">
        <header className="flex flex-wrap justify-between gap-6">
          <div className="text-sm">
            <p className="font-display text-2xl font-extrabold">{company.name}</p>
            {company.legalForm && <p>{company.legalForm}</p>}
            {company.address && <p>{company.address}</p>}
            <p>{[company.postalCode, company.city].filter(Boolean).join(' ')}</p>
            {company.phone && <p>Tél. {company.phone}</p>}
            {company.email && <p>{company.email}</p>}
            {company.siret && <p>SIRET : {company.siret}</p>}
            {company.vatNumber && <p>TVA : {company.vatNumber}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold">FACTURE</p>
            <p className="font-semibold">{invoice.number ?? 'BROUILLON'}</p>
            <p className="text-sm">Date : {invoice.issueDate ? dateFr(invoice.issueDate) : '—'}</p>
            {invoice.dueDate && <p className="text-sm">Échéance : {dateFr(invoice.dueDate)}</p>}
          </div>
        </header>

        <section className="mt-8 text-sm">
          <p className="font-semibold">Facturé à</p>
          <p>{client?.name}</p>
          {client?.address && <p>{client.address}</p>}
          {(client?.postalCode || client?.city) && <p>{[client.postalCode, client.city].filter(Boolean).join(' ')}</p>}
          {client?.siret && <p>SIRET : {client.siret}</p>}
          {client?.vatNumber && <p>TVA : {client.vatNumber}</p>}
          {project && <p className="mt-3"><span className="font-semibold">Chantier :</span> {project.name}{project.address ? ` — ${project.address}` : ''}</p>}
        </section>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b-2 border-ink text-left"><th className="py-2">Désignation</th><th className="text-right">Qté</th><th className="text-right">PU HT</th><th className="text-right">Total HT</th></tr></thead>
            <tbody>
              {invoice.lines.map((l, i) => (
                <tr key={i} className="border-b border-ink/10">
                  <td className="py-2">{l.description}</td>
                  <td className="text-right">{l.quantity} {l.unit}</td>
                  <td className="text-right">{eur(l.unitPrice)}</td>
                  <td className="text-right">{eur(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto mt-6 w-64 text-sm">
          <div className="flex justify-between py-1"><dt>Total HT</dt><dd>{eur(invoice.totalHt)}</dd></div>
          <div className="flex justify-between py-1"><dt>TVA ({invoice.vatRate} %)</dt><dd>{eur(invoice.totalVat)}</dd></div>
          <div className="flex justify-between border-t-2 border-ink py-2 text-lg font-extrabold"><dt>Total TTC</dt><dd>{eur(invoice.totalTtc)}</dd></div>
        </dl>

        {invoice.notes && <p className="mt-6 whitespace-pre-line text-sm">{invoice.notes}</p>}
        {company.paymentInfo && <p className="mt-4 whitespace-pre-line text-sm"><span className="font-semibold">Règlement :</span> {company.paymentInfo}</p>}
        <footer className="mt-8 border-t border-ink/10 pt-4 text-xs text-ink/60">{company.legalFooter}</footer>
      </article>
    </div>
  )
}
