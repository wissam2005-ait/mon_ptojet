import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Field, inputClass } from '../../components/Field'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/http'
import { taskStatusLabels, type Project, type Task, type TaskStatus, type UserAccount } from '../../lib/types'

const empty = { projectId: '', assigneeId: '', title: '', description: '', dueDate: '' }

export default function Tasks() {
  const { session } = useAuth()
  const isAdmin = session?.role === 'ADMIN'
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<UserAccount[]>([])
  const [form, setForm] = useState(empty)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api<Task[]>(isAdmin ? '/tasks' : '/tasks/mine').then(setTasks).catch((e: Error) => setError(e.message))
  }, [isAdmin])

  useEffect(() => {
    load()
    api<Project[]>('/projects').then(setProjects).catch((e: Error) => setError(e.message))
    if (isAdmin) api<UserAccount[]>('/users').then(setUsers).catch((e: Error) => setError(e.message))
  }, [load, isAdmin])

  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const projectName = (id: number) => projects.find((p) => p.id === id)?.name ?? `Chantier n°${id}`
  const userName = (id: number) => users.find((u) => u.id === id)?.fullName ?? ''
  const selectedProject = projects.find((p) => p.id === Number(form.projectId))
  const assignable = users.filter((u) => u.active && selectedProject?.memberIds.includes(u.id))
  const today = new Date().toISOString().slice(0, 10)

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError('')
    try {
      await api('/tasks', {
        method: 'POST',
        json: {
          projectId: Number(form.projectId),
          assigneeId: Number(form.assigneeId),
          title: form.title,
          description: form.description,
          dueDate: form.dueDate || null,
        },
      })
      setForm(empty)
      setOpen(false)
      load()
    } catch (e) { setError((e as Error).message) }
  }

  async function changeStatus(id: number, status: TaskStatus) {
    setError('')
    try {
      await api(`/tasks/${id}/status`, { method: 'PATCH', json: { status } })
      load()
    } catch (e) { setError((e as Error).message) }
  }

  async function remove(t: Task) {
    if (!window.confirm(`Supprimer la tâche « ${t.title} » ?`)) return
    try {
      await api(`/tasks/${t.id}`, { method: 'DELETE' })
      load()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">{isAdmin ? 'Tâches' : 'Mes tâches'}</h1>
        {isAdmin && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy">
            {open ? 'Annuler' : 'Nouvelle tâche'}
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-lg border border-ink/10 bg-white p-5 sm:grid-cols-2">
          <Field label="Chantier" htmlFor="t-project">
            <select id="t-project" required className={inputClass} value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, assigneeId: '' }))}>
              <option value="">Choisir…</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Attribuée à" htmlFor="t-assignee" hint={form.projectId && assignable.length === 0 ? 'Aucune personne affectée à ce chantier : ajoutez l’équipe dans la page Chantiers.' : 'Seules les personnes affectées au chantier sont proposées.'}>
            <select id="t-assignee" required disabled={!form.projectId} className={inputClass} value={form.assigneeId} onChange={set('assigneeId')}>
              <option value="">Choisir…</option>
              {assignable.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </Field>
          <Field label="Titre" htmlFor="t-title"><input id="t-title" required className={inputClass} value={form.title} onChange={set('title')} /></Field>
          <Field label="Échéance" htmlFor="t-due"><input id="t-due" type="date" className={inputClass} value={form.dueDate} onChange={set('dueDate')} /></Field>
          <div className="sm:col-span-2"><Field label="Détails" htmlFor="t-desc"><textarea id="t-desc" rows={3} className={inputClass} value={form.description} onChange={set('description')} /></Field></div>
          <div className="sm:col-span-2"><button type="submit" className="rounded-md bg-ink px-5 py-2.5 font-semibold text-white hover:bg-navy">Créer la tâche</button></div>
        </form>
      )}

      {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
      {tasks.length === 0 && !error && <p className="mt-6 text-ink/60">{isAdmin ? 'Aucune tâche pour le moment.' : 'Aucune tâche ne vous est attribuée pour le moment.'}</p>}
      <ul className="mt-6 space-y-3">
        {tasks.map((t) => {
          const late = t.status !== 'DONE' && t.dueDate !== null && t.dueDate < today
          return (
            <li key={t.id} className="rounded-lg border border-ink/10 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className={`font-semibold ${t.status === 'DONE' ? 'text-ink/50 line-through' : ''}`}>{t.title}</p>
                  <p className="text-sm text-ink/60">
                    {[projectName(t.projectId), isAdmin && userName(t.assigneeId), t.dueDate && `échéance le ${new Date(t.dueDate).toLocaleDateString('fr-FR')}`].filter(Boolean).join(' · ')}
                    {late && <span className="ml-2 font-semibold text-red-700">En retard</span>}
                  </p>
                  {t.description && <p className="mt-2 whitespace-pre-line text-sm text-ink/80">{t.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <select aria-label={`Avancement de la tâche ${t.title}`} className="rounded-md border border-ink/20 bg-white px-3 py-2 text-sm" value={t.status} onChange={(e) => changeStatus(t.id, e.target.value as TaskStatus)}>
                    {(Object.keys(taskStatusLabels) as TaskStatus[]).map((s) => <option key={s} value={s}>{taskStatusLabels[s]}</option>)}
                  </select>
                  {isAdmin && <button type="button" className="text-sm font-semibold underline" onClick={() => remove(t)}>Supprimer</button>}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
