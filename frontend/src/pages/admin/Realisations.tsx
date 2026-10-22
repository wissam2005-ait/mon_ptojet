import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Field, inputClass } from '../../components/Field'
import { photoUrl } from '../../components/RealisationsGallery'
import { useAuth } from '../../lib/auth'
import { api } from '../../lib/http'
import { photoToBase64 } from '../../lib/image'
import type { Realisation } from '../../lib/types'

const empty = { title: '', city: '', completedOn: '', description: '' }

export default function Realisations() {
  const { session } = useAuth()
  const isAdmin = session?.role === 'ADMIN'
  const [items, setItems] = useState<Realisation[]>([])
  const [form, setForm] = useState(empty)
  const [files, setFiles] = useState<File[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api<Realisation[]>('/realisations').then(setItems).catch((e: Error) => setError(e.message))
  }, [])
  useEffect(load, [load])

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    setFiles((prev) => [...prev, ...picked].slice(0, 8))
    e.target.value = ''
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError('')
    if (files.length === 0) { setError('Ajoutez au moins une photo.'); return }
    setBusy(true)
    try {
      const photos = await Promise.all(files.map((f) => photoToBase64(f)))
      await api('/realisations', {
        method: 'POST',
        json: { title: form.title, city: form.city, completedOn: form.completedOn || null, description: form.description, photos },
      })
      setForm(empty)
      setFiles([])
      setOpen(false)
      load()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  async function togglePublished(r: Realisation) {
    setError('')
    try {
      await api(`/realisations/${r.id}/published`, { method: 'PATCH', json: { published: !r.published } })
      load()
    } catch (e) { setError((e as Error).message) }
  }

  async function remove(r: Realisation) {
    if (!window.confirm(`Supprimer la réalisation « ${r.title} » ? Elle disparaîtra du site.`)) return
    setError('')
    try {
      await api(`/realisations/${r.id}`, { method: 'DELETE' })
      load()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">{isAdmin ? 'Réalisations' : 'Mes réalisations'}</h1>
        <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy">
          {open ? 'Annuler' : 'Ajouter une réalisation'}
        </button>
      </div>
      <p className="mt-2 text-sm text-ink/60">Les réalisations ajoutées ici apparaissent sur la page d’accueil du site, visible par les clients.</p>

      {open && (
        <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-lg border border-ink/10 bg-white p-5 sm:grid-cols-2">
          <Field label="Titre" htmlFor="r-title"><input id="r-title" required maxLength={150} className={inputClass} placeholder="Rénovation électrique d’un appartement" value={form.title} onChange={set('title')} /></Field>
          <Field label="Ville" htmlFor="r-city"><input id="r-city" maxLength={100} className={inputClass} value={form.city} onChange={set('city')} /></Field>
          <Field label="Date de fin des travaux" htmlFor="r-date"><input id="r-date" type="date" className={inputClass} value={form.completedOn} onChange={set('completedOn')} /></Field>
          <div className="sm:col-span-2"><Field label="Description" htmlFor="r-desc"><textarea id="r-desc" rows={3} maxLength={3000} className={inputClass} value={form.description} onChange={set('description')} /></Field></div>
          <div className="sm:col-span-2">
            <Field label="Photos (1 à 8)" htmlFor="r-photos" hint="La première photo sert d’image principale. Elles sont réduites automatiquement avant l’envoi.">
              <input id="r-photos" type="file" accept="image/*" multiple onChange={onFiles} className="block w-full text-sm" />
            </Field>
            {previews.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-3">
                {previews.map((src, i) => (
                  <li key={src} className="relative">
                    <img src={src} alt={`Photo ${i + 1}`} className="h-20 w-28 rounded object-cover" />
                    <button type="button" aria-label={`Retirer la photo ${i + 1}`} onClick={() => setFiles((f) => f.filter((_, j) => j !== i))} className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-ink text-xs text-white">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="rounded-md bg-ink px-5 py-2.5 font-semibold text-white hover:bg-navy disabled:opacity-50">{busy ? 'Envoi des photos…' : 'Publier sur le site'}</button>
          </div>
        </form>
      )}

      {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
      {items.length === 0 && !error && <p className="mt-6 text-ink/60">Aucune réalisation pour le moment.</p>}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((r) => (
          <li key={r.id} className="overflow-hidden rounded-lg border border-ink/10 bg-white">
            {r.photos[0] && <img src={photoUrl(r.photos[0])} alt={r.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />}
            <div className="p-4">
              <p className="font-semibold">{r.title}</p>
              <p className="text-sm text-ink/60">{[r.city, isAdmin && r.authorName, `${r.photos.length} photo${r.photos.length > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}</p>
              <p className="mt-2 text-sm">
                {r.published
                  ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">Visible sur le site</span>
                  : <span className="rounded-full bg-ink/10 px-2 py-0.5">Masquée</span>}
              </p>
              <div className="mt-3 flex gap-4 text-sm font-semibold">
                {isAdmin && <button type="button" className="underline" onClick={() => togglePublished(r)}>{r.published ? 'Masquer' : 'Afficher'}</button>}
                <button type="button" className="underline" onClick={() => remove(r)}>Supprimer</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
