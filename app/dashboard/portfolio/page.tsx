'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatNumber, ASSET_TYPE_LABELS } from '@/lib/utils'
import type { Asset, Transaction, PriceSnapshot } from '@/lib/types'

interface HoldingRow {
  asset: Asset
  quantity: number
  avgCost: number
  totalCost: number
  latestPrice: number | null
  currentValue: number | null
  pnl: number | null
  pnlPct: number | null
}

export default function PortfolioPage() {
  const supabase = createClient()
  const [holdings, setHoldings] = useState<HoldingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [newAsset, setNewAsset] = useState({ name: '', ticker: '', asset_type: 'stock', currency: 'USD' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: assets }, { data: txs }, { data: snapshots }] = await Promise.all([
      supabase.from('assets').select('*').eq('user_id', user.id),
      supabase.from('transactions').select('*').eq('user_id', user.id).in('transaction_type', ['buy', 'sell']),
      supabase.from('price_snapshots').select('*').eq('user_id', user.id),
    ])

    const rows: HoldingRow[] = (assets ?? []).map((asset: Asset) => {
      const assetTxs = (txs ?? []).filter((t: Transaction) => t.asset_id === asset.id)

      const totalBought = assetTxs
        .filter(t => t.transaction_type === 'buy')
        .reduce((s, t) => s + (t.quantity ?? 0), 0)
      const totalSold = assetTxs
        .filter(t => t.transaction_type === 'sell')
        .reduce((s, t) => s + (t.quantity ?? 0), 0)
      const quantity = totalBought - totalSold

      const totalCost = assetTxs
        .filter(t => t.transaction_type === 'buy')
        .reduce((s, t) => s + Number(t.total_amount), 0)
      const avgCost = totalBought > 0 ? totalCost / totalBought : 0

      const assetSnaps = (snapshots ?? [])
        .filter((s: PriceSnapshot) => s.asset_id === asset.id)
        .sort((a: PriceSnapshot, b: PriceSnapshot) => b.snapshot_date.localeCompare(a.snapshot_date))
      const latestPrice = assetSnaps[0]?.price ?? null

      const currentValue = latestPrice !== null ? quantity * latestPrice : null
      const pnl = currentValue !== null ? currentValue - totalCost : null
      const pnlPct = pnl !== null && totalCost > 0 ? (pnl / totalCost) * 100 : null

      return { asset, quantity, avgCost, totalCost, latestPrice, currentValue, pnl, pnlPct }
    }).filter(r => r.quantity > 0 || r.totalCost > 0)

    setHoldings(rows.sort((a, b) => (b.currentValue ?? b.totalCost) - (a.currentValue ?? a.totalCost)))
    setLoading(false)
  }

  async function addAsset() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('assets').insert({ ...newAsset, user_id: user.id })
    setNewAsset({ name: '', ticker: '', asset_type: 'stock', currency: 'USD' })
    setShowAddAsset(false)
    setSaving(false)
    load()
  }

  const inputStyle = {
    background: '#161b22', border: '1px solid #1c1c28', borderRadius: '8px',
    padding: '10px 12px', fontSize: '14px', color: '#e2e8f0', width: '100%',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Portafolio</h1>
          <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>{holdings.length} activos</p>
        </div>
        <button
          onClick={() => setShowAddAsset(!showAddAsset)}
          style={{
            padding: '10px 20px', background: '#f5c842', color: '#0a0a0a',
            border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
          }}
        >
          + Nuevo activo
        </button>
      </div>

      {/* Add Asset Form */}
      {showAddAsset && (
        <div style={{ background: '#0d1117', border: '1px solid #f5c842', borderRadius: '14px', padding: '24px', marginBottom: '28px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9', marginBottom: '20px' }}>Nuevo activo</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Nombre</label>
              <input style={inputStyle} placeholder="Apple Inc." value={newAsset.name}
                onChange={e => setNewAsset(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Ticker</label>
              <input style={inputStyle} placeholder="AAPL" value={newAsset.ticker}
                onChange={e => setNewAsset(p => ({ ...p, ticker: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Tipo</label>
              <select style={inputStyle} value={newAsset.asset_type}
                onChange={e => setNewAsset(p => ({ ...p, asset_type: e.target.value }))}>
                {Object.entries(ASSET_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Divisa</label>
              <select style={inputStyle} value={newAsset.currency}
                onChange={e => setNewAsset(p => ({ ...p, currency: e.target.value }))}>
                {['USD', 'MXN', 'EUR', 'BTC'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={addAsset} disabled={!newAsset.name || saving} style={{
              padding: '10px 24px', background: '#f5c842', color: '#0a0a0a',
              border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700',
              opacity: !newAsset.name ? 0.5 : 1,
            }}>
              {saving ? 'Guardando...' : 'Crear activo'}
            </button>
            <button onClick={() => setShowAddAsset(false)} style={{
              padding: '10px 20px', background: 'transparent', border: '1px solid #1c1c28',
              borderRadius: '8px', fontSize: '14px', color: '#64748b',
            }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Holdings table */}
      {loading ? (
        <p style={{ color: '#475569', fontSize: '14px' }}>Cargando portafolio…</p>
      ) : holdings.length === 0 ? (
        <div style={{ background: '#0d1117', border: '1px solid #1c1c28', borderRadius: '14px', padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#334155', fontSize: '14px' }}>Sin activos. Crea uno y luego registra transacciones de compra.</p>
        </div>
      ) : (
        <div style={{ background: '#0d1117', border: '1px solid #1c1c28', borderRadius: '14px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1c1c28' }}>
                {['Activo', 'Tipo', 'Cantidad', 'Costo prom.', 'Costo total', 'Precio actual', 'Valor actual', 'P&L'].map(h => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.map((row, i) => {
                const pnlColor = row.pnl === null ? '#64748b' : row.pnl >= 0 ? '#22c55e' : '#f87171'
                return (
                  <tr key={row.asset.id} style={{ borderBottom: i < holdings.length - 1 ? '1px solid #1c1c28' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#161b22')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{row.asset.name}</p>
                      {row.asset.ticker && <p style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{row.asset.ticker}</p>}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: '12px', color: '#7c8cf8', background: '#7c8cf818', padding: '3px 8px', borderRadius: '6px' }}>
                        {ASSET_TYPE_LABELS[row.asset.asset_type] ?? row.asset.asset_type}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontVariantNumeric: 'tabular-nums', fontSize: '14px', color: '#e2e8f0' }}>
                      {formatNumber(row.quantity)}
                    </td>
                    <td style={{ padding: '16px 20px', fontVariantNumeric: 'tabular-nums', fontSize: '14px', color: '#94a3b8' }}>
                      {formatCurrency(row.avgCost, row.asset.currency)}
                    </td>
                    <td style={{ padding: '16px 20px', fontVariantNumeric: 'tabular-nums', fontSize: '14px', color: '#94a3b8' }}>
                      {formatCurrency(row.totalCost, row.asset.currency)}
                    </td>
                    <td style={{ padding: '16px 20px', fontVariantNumeric: 'tabular-nums', fontSize: '14px', color: '#e2e8f0' }}>
                      {row.latestPrice !== null ? formatCurrency(row.latestPrice, row.asset.currency) : <span style={{ color: '#334155' }}>—</span>}
                    </td>
                    <td style={{ padding: '16px 20px', fontVariantNumeric: 'tabular-nums', fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>
                      {row.currentValue !== null ? formatCurrency(row.currentValue, row.asset.currency) : <span style={{ color: '#334155' }}>—</span>}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {row.pnl !== null ? (
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: '600', color: pnlColor, fontVariantNumeric: 'tabular-nums' }}>
                            {row.pnl >= 0 ? '+' : ''}{formatCurrency(row.pnl, row.asset.currency)}
                          </p>
                          {row.pnlPct !== null && (
                            <p style={{ fontSize: '11px', color: pnlColor, marginTop: '2px' }}>
                              {row.pnlPct >= 0 ? '+' : ''}{row.pnlPct.toFixed(2)}%
                            </p>
                          )}
                        </div>
                      ) : <span style={{ color: '#334155', fontSize: '13px' }}>Agrega precio</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: '12px', color: '#334155', marginTop: '16px' }}>
        💡 Para ver el P&L, agrega el precio actual en <a href="#" style={{ color: '#475569' }}>Supabase → price_snapshots</a> (o extiende el boilerplate con una API de precios).
      </p>
    </div>
  )
}
