import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

const items = [
  { to: '/admin', label: 'Tableau de bord', end: true, roles: ['ADMIN'] },
  { to: '/admin/demandes', label: 'Demandes', roles: ['ADMIN'] },
  { to: '/admin/clients', label: 'Clients', roles: ['ADMIN'] },
  { to: '/admin/chantiers', label: 'Chantiers', roles: ['ADMIN', 'EMPLOYEE', 'INTERN'] },
  { to: '/admin/taches', label: 'Tâches', roles: ['ADMIN', 'EMPLOYEE', 'INTERN'] },
  { to: '/admin/materiel', label: 'Matériel', roles: ['ADMIN', 'EMPLOYEE', 'INTERN'] },
  { to: '/admin/factures', label: 'Factures', roles: ['ADMIN'] },
  { to: '/admin/realisations', label: 'Réalisations', roles: ['ADMIN', 'EMPLOYEE', 'INTERN'] },
  { to: '/admin/employes', label: 'Employés', roles: ['ADMIN'] },
  { to: '/admin/salaires', label: 'Salaires', roles: ['ADMIN'] },
]

export default function AdminLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const visible = items.filter((i) => session && i.roles.includes(session.role))

  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-ink text-white md:w-60 md:shrink-0 print:hidden">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <p className="font-display text-xl font-extrabold">Electro<span className="text-volt">Pro</span></p>
          <p className="text-sm text-white/60 md:mt-1">{session?.fullName}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:px-3" aria-label="Espace professionnel">
          {visible.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) => `whitespace-nowrap rounded px-3 py-2 text-sm font-medium ${isActive ? 'bg-white/10 text-volt' : 'text-white/80 hover:text-white'}`}
            >
              {i.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => { logout(); navigate('/admin/login') }}
            className="whitespace-nowrap rounded px-3 py-2 text-left text-sm text-white/70 hover:text-white md:mt-6"
          >
            Se déconnecter
          </button>
        </nav>
      </aside>
      <main className="flex-1 px-4 py-8 md:px-10 print:p-0"><Outlet /></main>
    </div>
  )
}
