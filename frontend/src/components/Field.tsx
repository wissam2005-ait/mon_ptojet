import type { ReactNode } from 'react'

export const inputClass =
  'block w-full rounded-md border border-ink/25 bg-white px-3 py-2 text-ink placeholder:text-ink/40 focus:border-ink'

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink/60">{hint}</p>}
    </div>
  )
}
