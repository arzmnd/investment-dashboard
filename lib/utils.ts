export function formatCurrency(
  value: number,
  currency = 'USD',
  compact = false
): string {
  if (compact && Math.abs(value) >= 1_000_000) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value)
  }
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number, decimals = 4): string {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export const ASSET_TYPE_LABELS: Record<string, string> = {
  stock:       'Acciones',
  etf:         'ETF',
  crypto:      'Cripto',
  bond:        'Bonos',
  real_estate: 'Bienes Raíces',
  cash:        'Efectivo',
  other:       'Otro',
}

export const TX_TYPE_LABELS: Record<string, string> = {
  buy:        'Compra',
  sell:       'Venta',
  dividend:   'Dividendo',
  deposit:    'Depósito',
  withdrawal: 'Retiro',
  interest:   'Interés',
}

export const TX_TYPE_COLORS: Record<string, string> = {
  buy:        '#22c55e',
  sell:       '#f87171',
  dividend:   '#7c8cf8',
  deposit:    '#22c55e',
  withdrawal: '#f87171',
  interest:   '#f5c842',
}
