import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/http'

interface Summary { newRequests: number; activeProjects: number; clients: number; activeAccounts: number; openTasks: number }

export default function Dashboard() {
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Summary>('/dashboard').then(setData).catch((e: Error) => setError(e.message))
  }, [])

  const cards = data && [
    { label: 'Nouvelles demandes', value: data.newRequests, to: '/admin/demandes' },
    { label: 'Chantiers en cours', value: data.activeProjects, to: '/admin/chantiers' },
    { label: 'Clients', value: data.clients, to: '/admin/clients' },
    { label: 'Tâches en cours ou à faire', value: data.openTasks, to: '/admin/taches' },
    { label: 'Comptes actifs', value: data.activeAccounts, to: '/admin/employes' },
  ]

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Tableau de bord</h1>
      {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
      {!data && !error && <p className="mt-4 text-ink/60">Chargement…</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards?.map((c) => (
          <Link key={c.label} to={c.to} className="rounded-lg border border-ink/10 bg-white p-5 hover:border-ink">
            <p className="text-4xl font-extrabold">{c.value}</p>
            <p className="mt-1 text-ink/70">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
