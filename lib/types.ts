export type Category     = 'Negocio' | 'Cash' | 'Deuda' | 'Bolsa'
export type RiskProfile  = 'High' | 'Medium-high' | 'Medium' | 'Medium-low' | 'Low'
export type TransactionType = 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal' | 'interest'
export type Currency     = 'USD' | 'MXN'

export interface Profile {
  id: string; email: string | null; full_name: string | null
  avatar_url: string | null; currency: string; created_at: string
}

export interface Asset {
  id: string; user_id: string; category_id: string | null
  name: string; activo: string | null; category: Category | null
  risk_profile: RiskProfile | null; currency: string; created_at: string
}

export interface Transaction {
  id: string; user_id: string; asset_id: string | null
  transaction_type: TransactionType; quantity: number | null
  price_per_unit: number | null; total_amount: number
  currency: Currency; exchange_rate: number; total_usd: number
  notes: string | null; transaction_date: string; created_at: string
  asset?: Asset
}

export interface PriceSnapshot {
  id: string; user_id: string; asset_id: string
  price: number; snapshot_date: string; created_at: string
}

export interface NetWorthSnapshot {
  id: string; user_id: string; value: number
  date: string; notes: string | null; created_at: string
}

// Para el bulk import
export interface BulkRow {
  raw: Record<string, string>
  lineNumber: number
  status: 'ok' | 'error' | 'warning'
  errors: string[]
  warnings: string[]
  parsed?: {
    fecha: string           // YYYY-MM-DD
    operacion: TransactionType
    tipo: Category
    activo: string
    cantidad?: number
    divisa: Currency
    precio_unitario?: number
    total: number
    notas?: string
  }
}
