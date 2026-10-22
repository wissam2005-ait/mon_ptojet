export type RequestStatus = 'NEW' | 'IN_PROGRESS' | 'QUOTE_SENT' | 'ACCEPTED' | 'REFUSED'
export type ProjectStatus = 'TO_PLAN' | 'IN_PROGRESS' | 'SUSPENDED' | 'DONE'

export const requestStatusLabels: Record<RequestStatus, string> = {
  NEW: 'Nouvelle',
  IN_PROGRESS: 'En cours de traitement',
  QUOTE_SENT: 'Devis envoyé',
  ACCEPTED: 'Acceptée',
  REFUSED: 'Refusée',
}

export const projectStatusLabels: Record<ProjectStatus, string> = {
  TO_PLAN: 'À planifier',
  IN_PROGRESS: 'En cours',
  SUSPENDED: 'Suspendu',
  DONE: 'Terminé',
}

export interface ContactRequest {
  id: number
  kind: 'QUOTE' | 'CONTACT'
  fullName: string
  phone: string | null
  email: string | null
  workType: string | null
  siteAddress: string | null
  message: string
  status: RequestStatus
  clientId: number | null
  createdAt: string
}

export interface Client {
  id: number
  name: string
  email: string | null
  phone: string | null
  address: string | null
  postalCode: string | null
  city: string | null
  siret: string | null
  vatNumber: string | null
  notes: string | null
}

export interface Project {
  id: number
  name: string
  clientId: number
  address: string | null
  description: string | null
  startDate: string | null
  endDate: string | null
  status: ProjectStatus
  budget: number | null
  memberIds: number[]
}

export type Role = 'ADMIN' | 'EMPLOYEE' | 'INTERN'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Dirigeant',
  EMPLOYEE: 'Employé',
  INTERN: 'Stagiaire',
}

export const taskStatusLabels: Record<TaskStatus, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminée',
}

export interface UserAccount {
  id: number
  email: string
  fullName: string
  role: Role
  phone: string | null
  jobTitle: string | null
  active: boolean
}

export interface Task {
  id: number
  projectId: number
  title: string
  description: string | null
  assigneeId: number
  dueDate: string | null
  status: TaskStatus
}

export interface Material {
  id: number
  projectId: number
  name: string
  unit: string
  quantity: number
  supplier: string | null
  unitCost: number | null // null pour les non-dirigeants
  purchasedOn: string | null
  invoiceId: number | null
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID'

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Émise',
  PAID: 'Payée',
}

export interface InvoiceLine {
  description: string
  unit: string | null
  quantity: number
  unitPrice: number
  total: number
}

export interface Invoice {
  id: number
  number: string | null
  projectId: number
  clientId: number
  issueDate: string | null
  dueDate: string | null
  status: InvoiceStatus
  vatRate: number
  totalHt: number
  totalVat: number
  totalTtc: number
  notes: string | null
  lines: InvoiceLine[]
}

export interface Realisation {
  id: number
  title: string
  description: string | null
  city: string | null
  completedOn: string | null
  published: boolean
  authorName: string
  photos: string[]
  createdAt: string
}

export interface PublicRealisation {
  id: number
  title: string
  description: string | null
  city: string | null
  completedOn: string | null
  photos: string[]
}

export interface SalaryRow {
  userId: number
  fullName: string
  jobTitle: string | null
  monthlyAmount: number
  paid: number
  remaining: number
}

export interface SalaryPayment {
  id: number
  period: string
  amount: number
  paidOn: string
  method: string | null
  note: string | null
}
