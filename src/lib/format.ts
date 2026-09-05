/** Everything that turns a value into the string you read on screen. */

const money = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
})

export function formatPrice(value: number | null | undefined): string {
  return money.format(value ?? 0)
}

export function formatPotSize(cm: number | null): string {
  return cm === null ? '—' : `${cm} cm`
}

/** `I`, `II`, `III` … Used by the name generator so a cutting reads as the next
 *  in its line, and nowhere else. Above 39 it gives up and returns the number,
 *  which is the right moment to stop pretending this is a Roman inscription. */
export function toRoman(value: number): string {
  if (value < 1 || value > 39) return String(value)

  const tens = ['', 'X', 'XX', 'XXX']
  const ones = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']

  return `${tens[Math.floor(value / 10)] ?? ''}${ones[value % 10] ?? ''}`
}

export function fromRoman(value: string): number | null {
  const numerals: Record<string, number> = { I: 1, V: 5, X: 10 }
  if (!/^[IVX]+$/.test(value)) return null

  let total = 0
  for (let i = 0; i < value.length; i += 1) {
    const current = numerals[value[i] as string] ?? 0
    const next = numerals[value[i + 1] as string] ?? 0
    total += next > current ? -current : current
  }
  return total
}

const LABELS: Record<string, string> = {
  hydro: 'Hydro',
  'semi-hydro': 'Semi-hydro',
  soil: 'Soil',
  active: 'Active',
  dormant: 'Dormant',
  died: 'Died',
  'given-away': 'Given away',
  cutting: 'Cutting',
  corm: 'Corm',
  division: 'Division',
  seed: 'Seed',
  nursery: 'Nursery',
  shop: 'Shop',
  trade: 'Trade',
  'own-cutting': 'Own cutting',
  gift: 'Gift',
  water: 'Water',
  repot: 'Repot',
  leaf: 'New leaf',
  bloom: 'Blooming',
  note: 'Note',
  location: 'Place',
  medium: 'Medium',
  fertilizer: 'Fertilizer',
}

/** The single place an enum value becomes English. */
export function label(value: string): string {
  return LABELS[value] ?? value
}

/** Plural without the "1 plants" tell. */
export function plural(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
