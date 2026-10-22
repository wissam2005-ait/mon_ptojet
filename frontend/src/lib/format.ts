export const eur = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

export const dateFr = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('fr-FR') : '')

export const todayIso = () => new Date().toISOString().slice(0, 10)

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
