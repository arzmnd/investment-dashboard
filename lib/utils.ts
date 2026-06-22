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

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export const CATEGORIES = ['Negocio', 'Cash', 'Deuda', 'Bolsa'] as const
export const RISK_PROFILES = ['High', 'Medium-high', 'Medium', 'Medium-low', 'Low'] as const

export const CATEGORY_COLORS: Record<string, string> = {
  Negocio: '#a78bfa',
  Cash:    '#6ee7b7',
  Deuda:   '#fbbf24',
  Bolsa:   '#60a5fa',
}

export const RISK_COLORS: Record<string, string> = {
  'High':        '#f87171',
  'Medium-high': '#fb923c',
  'Medium':      '#fbbf24',
  'Medium-low':  '#a3e635',
  'Low':         '#6ee7b7',
}

export const TX_TYPE_LABELS: Record<string, string> = {
  buy: 'Compra', sell: 'Venta', dividend: 'Dividendo',
  deposit: 'Depósito', withdrawal: 'Retiro', interest: 'Interés',
}
