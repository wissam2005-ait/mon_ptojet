import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Services from './pages/Services'
import Realisations from './pages/Realisations'
import Contact from './pages/Contact'
import Devis from './pages/Devis'
import { RequireAuth, useAuth } from './lib/auth'
import AdminLayout from './pages/admin/AdminLayout'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import Requests from './pages/admin/Requests'
import Clients from './pages/admin/Clients'
import Projects from './pages/admin/Projects'
import Tasks from './pages/admin/Tasks'
import Employees from './pages/admin/Employees'
import Materials from './pages/admin/Materials'
import Invoices from './pages/admin/Invoices'
import InvoiceView from './pages/admin/InvoiceView'
import Salaries from './pages/admin/Salaries'
import AdminRealisations from './pages/admin/Realisations'

function AdminHome() {
  const { session } = useAuth()
  return session?.role === 'ADMIN' ? <Dashboard /> : <Navigate to="/admin/chantiers" replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="services" element={<Services />} />
        <Route path="realisations" element={<Realisations />} />
        <Route path="contact" element={<Contact />} />
        <Route path="devis" element={<Devis />} />
      </Route>

      <Route path="admin/login" element={<Login />} />
      <Route path="admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
        <Route index element={<AdminHome />} />
        <Route path="demandes" element={<Requests />} />
        <Route path="clients" element={<Clients />} />
        <Route path="chantiers" element={<Projects />} />
        <Route path="taches" element={<Tasks />} />
        <Route path="employes" element={<Employees />} />
        <Route path="materiel" element={<Materials />} />
        <Route path="factures" element={<Invoices />} />
        <Route path="factures/:id" element={<InvoiceView />} />
        <Route path="salaires" element={<Salaries />} />
        <Route path="realisations" element={<AdminRealisations />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
