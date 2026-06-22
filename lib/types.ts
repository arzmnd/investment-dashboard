export type AssetType = 'stock' | 'etf' | 'crypto' | 'bond' | 'real_estate' | 'cash' | 'other'
export type TransactionType = 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal' | 'interest'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  currency: string
  created_at: string
}

export interface AssetCategory {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface Asset {
  id: string
  user_id: string
  category_id: string | null
  name: string
  ticker: string | null
  asset_type: AssetType
  currency: string
  created_at: string
  category?: AssetCategory
}

export interface Transaction {
  id: string
  user_id: string
  asset_id: string | null
  transaction_type: TransactionType
  quantity: number | null
  price_per_unit: number | null
  total_amount: number
  fees: number
  notes: string | null
  transaction_date: string
  created_at: string
  asset?: Asset
}

export interface PriceSnapshot {
  id: string
  user_id: string
  asset_id: string
  price: number
  snapshot_date: string
  created_at: string
}

export interface Holding {
  user_id: string
  asset_id: string
  name: string
  ticker: string | null
  asset_type: AssetType
  currency: string
  category_id: string | null
  quantity: number
  avg_cost: number
  current_price?: number
  current_value?: number
  pnl?: number
  pnl_pct?: number
}
