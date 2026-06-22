export function formatCurrency(value: number, currency = 'USD', compact = false): string {
  if (compact && Math.abs(value) >= 1_000_000) {
    return new Intl.NumberFormat('es-MX', { style:'currency', currency, notation:'compact', maximumFractionDigits:2 }).format(value)
  }
  return new Intl.NumberFormat('es-MX', { style:'currency', currency, minimumFractionDigits:2, maximumFractionDigits:2 }).format(value)
}

export function formatNumber(value: number, decimals = 4): string {
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits:0, maximumFractionDigits:decimals }).format(value)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })
}

export const CATEGORIES    = ['Negocio', 'Cash', 'Deuda', 'Bolsa'] as const
export const RISK_PROFILES = ['High', 'Medium-high', 'Medium', 'Medium-low', 'Low'] as const
export const CURRENCIES    = ['USD', 'MXN'] as const
export const TX_TYPES      = ['buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'interest'] as const

export const CATEGORY_COLORS: Record<string, string> = {
  Negocio: '#a78bfa', Cash: '#6ee7b7', Deuda: '#fbbf24', Bolsa: '#60a5fa',
}
export const RISK_COLORS: Record<string, string> = {
  'High': '#f87171', 'Medium-high': '#fb923c', 'Medium': '#fbbf24',
  'Medium-low': '#a3e635', 'Low': '#6ee7b7',
}
export const TX_TYPE_LABELS: Record<string, string> = {
  buy: 'Compra', sell: 'Venta', dividend: 'Dividendo',
  deposit: 'Depósito', withdrawal: 'Retiro', interest: 'Interés',
}

// DD/MM/YYYY → YYYY-MM-DD
export function parseDMY(dateStr: string): string | null {
  const match = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [, d, m, y] = match
  const date = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`)
  if (isNaN(date.getTime())) return null
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
}

// Fetch tipo de cambio MXN→USD para una fecha dada
export async function fetchExchangeRate(date: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.frankfurter.app/${date}?from=MXN&to=USD`)
    if (!res.ok) return null
    const data = await res.json()
    return data?.rates?.USD ?? null
  } catch {
    return null
  }
}

// Generar y descargar CSV en el browser
export function downloadCSV(filename: string, headers: string[], rows: string[][]): void {
  const lines = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))]
  const blob  = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// Parsear CSV texto → array de objetos
export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  })
  return { headers, rows }
}
