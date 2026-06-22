'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatNumber, ASSET_TYPE_LABELS } from '@/lib/utils'
import type { Asset, Transaction, PriceSnapshot } from '@/lib/types'

interface HoldingRow {
  asset: Asset; quantity: number; avgCost: number; totalCost: number
  latestPrice: number | null; currentValue: number | null; pnl: number | null; pnlPct: number | null
}

const inp: React.CSSProperties = { background:'transparent', border:'1px solid var(--border)', padding:'8px 10px', fontSize:'13px', color:'var(--text-md)', width:'100%', outline:'none' }
const lbl: React.CSSProperties = { fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:'6px' }
const th:  React.CSSProperties = { padding:'10px 16px', textAlign:'left', fontSize:'11px', color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:'400', borderBottom:'1px solid var(--border)' }

export default function PortfolioPage() {
  const supabase = createClient()
  const [holdings, setHoldings] = useState<HoldingRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newAsset, setNewAsset] = useState({ name:'', ticker:'', asset_type:'stock', currency:'USD' })
  const [saving, setSaving]     = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: assets }, { data: txs }, { data: snapshots }] = await Promise.all([
      supabase.from('assets').select('*').eq('user_id', user.id),
      supabase.from('transactions').select('*').eq('user_id', user.id).in('transaction_type', ['buy','sell']),
      supabase.from('price_snapshots').select('*').eq('user_id', user.id),
    ])
    const rows: HoldingRow[] = (assets ?? []).map((asset: Asset) => {
      const assetTxs    = (txs ?? []).filter((t: Transaction) => t.asset_id === asset.id)
      const totalBought = assetTxs.filter(t => t.transaction_type==='buy').reduce((s,t) => s+(t.quantity??0), 0)
      const totalSold   = assetTxs.filter(t => t.transaction_type==='sell').reduce((s,t) => s+(t.quantity??0), 0)
      const quantity    = totalBought - totalSold
      const totalCost   = assetTxs.filter(t => t.transaction_type==='buy').reduce((s,t) => s+Number(t.total_amount), 0)
      const avgCost     = totalBought > 0 ? totalCost/totalBought : 0
      const assetSnaps  = (snapshots ?? []).filter((s: PriceSnapshot) => s.asset_id===asset.id).sort((a:PriceSnapshot,b:PriceSnapshot) => b.snapshot_date.localeCompare(a.snapshot_date))
      const latestPrice = assetSnaps[0]?.price ?? null
      const currentValue = latestPrice !== null ? quantity*latestPrice : null
      const pnl          = currentValue !== null ? currentValue-totalCost : null
      const pnlPct       = pnl !== null && totalCost > 0 ? (pnl/totalCost)*100 : null
      return { asset, quantity, avgCost, totalCost, latestPrice, currentValue, pnl, pnlPct }
    }).filter(r => r.quantity > 0 || r.totalCost > 0)
    setHoldings(rows.sort((a,b) => (b.currentValue??b.totalCost)-(a.currentValue??a.totalCost)))
    setLoading(false)
  }

  async function addAsset() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('assets').insert({ ...newAsset, user_id: user.id })
    setNewAsset({ name:'', ticker:'', asset_type:'stock', currency:'USD' })
    setShowForm(false); setSaving(false); load()
  }

  return (
    <div style={{ maxWidth:'900px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'40px' }}>
        <div>
          <p style={{ fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'4px' }}>Portafolio</p>
          <p style={{ fontSize:'13px', color:'var(--text-lo)' }}>{holdings.length} activos</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background:'transparent', border:'1px solid var(--border)', padding:'7px 14px', fontSize:'12px', color:'var(--text-lo)', transition:'border-color 0.1s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor='var(--text-lo)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor='var(--border)')}>
          + Activo
        </button>
      </div>

      {showForm && (
        <div style={{ border:'1px solid var(--border)', padding:'24px', marginBottom:'32px' }}>
          <p style={{ fontSize:'12px', color:'var(--text-lo)', marginBottom:'20px' }}>Nuevo activo</p>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'12px', marginBottom:'16px' }}>
            {[{ label:'Nombre', field:'name', placeholder:'Apple Inc.' }, { label:'Ticker', field:'ticker', placeholder:'AAPL' }].map(f => (
              <div key={f.field}>
                <label style={lbl}>{f.label}</label>
                <input style={inp} placeholder={f.placeholder} value={(newAsset as any)[f.field]}
                  onChange={e => setNewAsset(p => ({ ...p, [f.field]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label style={lbl}>Tipo</label>
              <select style={inp} value={newAsset.asset_type} onChange={e => setNewAsset(p => ({ ...p, asset_type: e.target.value }))}>
                {Object.entries(ASSET_TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Divisa</label>
              <select style={inp} value={newAsset.currency} onChange={e => setNewAsset(p => ({ ...p, currency: e.target.value }))}>
                {['USD','MXN','EUR','BTC'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:'12px' }}>
            <button onClick={addAsset} disabled={!newAsset.name||saving}
              style={{ background:'transparent', border:'1px solid var(--text-muted)', padding:'7px 16px', fontSize:'12px', color:'var(--text-md)', opacity: !newAsset.name ? 0.4 : 1 }}>
              {saving ? 'Guardando...' : 'Crear'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background:'transparent', border:'none', fontSize:'12px', color:'var(--text-muted)' }}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ fontSize:'12px', color:'var(--text-faint)' }}>Cargando…</p>
      ) : holdings.length === 0 ? (
        <p style={{ fontSize:'12px', color:'var(--text-faint)', padding:'40px 0' }}>Sin activos. Crea uno y registra transacciones de compra.</p>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>{['Activo','Tipo','Cantidad','Costo prom.','Costo total','Precio actual','Valor actual','P&L'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {holdings.map(row => {
              const pnlColor = row.pnl===null ? 'var(--text-muted)' : row.pnl>=0 ? 'var(--green)' : 'var(--red)'
              return (
                <tr key={row.asset.id}
                  onMouseEnter={e => (e.currentTarget.style.background='var(--bg-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                  <td style={{ padding:'13px 16px', borderBottom:'1px solid var(--border-sub)' }}>
                    <p style={{ fontSize:'13px', color:'var(--text-hi)' }}>{row.asset.name}</p>
                    {row.asset.ticker && <p style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px', fontFamily:"'JetBrains Mono', monospace" }}>{row.asset.ticker}</p>}
                  </td>
                  <td style={{ padding:'13px 16px', fontSize:'11px', color:'var(--text-lo)', borderBottom:'1px solid var(--border-sub)' }}>{ASSET_TYPE_LABELS[row.asset.asset_type]??row.asset.asset_type}</td>
                  <td style={{ padding:'13px 16px', fontFamily:"'JetBrains Mono', monospace", fontSize:'12px', color:'var(--text-lo)', borderBottom:'1px solid var(--border-sub)' }}>{formatNumber(row.quantity)}</td>
                  <td style={{ padding:'13px 16px', fontFamily:"'JetBrains Mono', monospace", fontSize:'12px', color:'var(--text-lo)', borderBottom:'1px solid var(--border-sub)' }}>{formatCurrency(row.avgCost,row.asset.currency)}</td>
                  <td style={{ padding:'13px 16px', fontFamily:"'JetBrains Mono', monospace", fontSize:'12px', color:'var(--text-lo)', borderBottom:'1px solid var(--border-sub)' }}>{formatCurrency(row.totalCost,row.asset.currency)}</td>
                  <td style={{ padding:'13px 16px', fontFamily:"'JetBrains Mono', monospace", fontSize:'12px', color:'var(--text-lo)', borderBottom:'1px solid var(--border-sub)' }}>
                    {row.latestPrice!==null ? formatCurrency(row.latestPrice,row.asset.currency) : <span style={{ color:'var(--text-faint)' }}>—</span>}
                  </td>
                  <td style={{ padding:'13px 16px', fontFamily:"'JetBrains Mono', monospace", fontSize:'13px', color:'var(--text-hi)', borderBottom:'1px solid var(--border-sub)' }}>
                    {row.currentValue!==null ? formatCurrency(row.currentValue,row.asset.currency) : <span style={{ color:'var(--text-faint)' }}>—</span>}
                  </td>
                  <td style={{ padding:'13px 16px', borderBottom:'1px solid var(--border-sub)' }}>
                    {row.pnl!==null ? (
                      <div>
                        <p style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'12px', color: pnlColor }}>{row.pnl>=0?'+':''}{formatCurrency(row.pnl,row.asset.currency)}</p>
                        {row.pnlPct!==null && <p style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'10px', color: pnlColor, marginTop:'2px', opacity:0.7 }}>{row.pnlPct>=0?'+':''}{row.pnlPct.toFixed(2)}%</p>}
                      </div>
                    ) : <span style={{ fontSize:'11px', color:'var(--text-faint)' }}>sin precio</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
