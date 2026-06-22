import { createClient } from '@/lib/supabase/server'
import { formatCurrency, TX_TYPE_LABELS, CATEGORY_COLORS, RISK_COLORS } from '@/lib/utils'
import { Charts } from '@/components/charts'
import type { Transaction, Asset } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: transactions },
    { data: assets },
    { data: snapshots },
    { data: priceSnaps },
  ] = await Promise.all([
    supabase.from('transactions').select('*, asset:assets(name, activo, category, risk_profile)').eq('user_id', user!.id).order('transaction_date', { ascending: false }),
    supabase.from('assets').select('*').eq('user_id', user!.id),
    supabase.from('net_worth_snapshots').select('*').eq('user_id', user!.id).order('date', { ascending: true }),
    supabase.from('price_snapshots').select('*').eq('user_id', user!.id),
  ])

  const txs       = (transactions ?? []) as Transaction[]
  const assetList = (assets ?? []) as Asset[]

  const totalIn   = txs.filter(t => ['buy','deposit'].includes(t.transaction_type)).reduce((s,t) => s+Number(t.total_usd), 0)
  const totalOut  = txs.filter(t => ['sell','withdrawal'].includes(t.transaction_type)).reduce((s,t) => s+Number(t.total_usd), 0)
  const dividends = txs.filter(t => ['dividend','interest'].includes(t.transaction_type)).reduce((s,t) => s+Number(t.total_usd), 0)
  const netDeployed = totalIn - totalOut

  const holdingsByAsset: Record<string, { asset: Asset; cost: number; value: number }> = {}
  assetList.forEach(asset => {
    const assetTxs   = txs.filter(t => t.asset_id === asset.id)
    const bought     = assetTxs.filter(t => t.transaction_type==='buy').reduce((s,t) => s+(t.quantity??0), 0)
    const sold       = assetTxs.filter(t => t.transaction_type==='sell').reduce((s,t) => s+(t.quantity??0), 0)
    const qty        = bought - sold
    const cost       = assetTxs.filter(t => t.transaction_type==='buy').reduce((s,t) => s+Number(t.total_usd), 0)
    const latestSnap = (priceSnaps ?? []).filter((s:any) => s.asset_id===asset.id).sort((a:any,b:any) => b.snapshot_date.localeCompare(a.snapshot_date))[0]
    const value      = latestSnap ? qty * Number(latestSnap.price) : cost
    if (qty > 0 || cost > 0) holdingsByAsset[asset.id] = { asset, cost, value }
  })

  const byAsset = Object.values(holdingsByAsset).map(h => ({ name: h.asset.activo ?? h.asset.name, value: h.value })).sort((a,b) => b.value-a.value)
  const totalPortfolio = byAsset.reduce((s,a) => s+a.value, 0)

  const byCat: Record<string, number> = {}
  Object.values(holdingsByAsset).forEach(h => { const c = h.asset.category ?? 'Sin categoría'; byCat[c] = (byCat[c]??0)+h.value })

  const byRisk: Record<string, number> = {}
  Object.values(holdingsByAsset).forEach(h => { const r = h.asset.risk_profile ?? 'Sin perfil'; byRisk[r] = (byRisk[r]??0)+h.value })

  const roiByAsset = Object.values(holdingsByAsset).map(h => ({
    name: h.asset.activo ?? h.asset.name,
    roiAbs: h.value - h.cost,
    roiPct: h.cost > 0 ? ((h.value - h.cost) / h.cost) * 100 : 0,
  })).sort((a,b) => b.roiAbs-a.roiAbs)

  const nwHistory = ((snapshots ?? []) as any[]).map(s => ({ date: s.date, value: Number(s.value) }))
  const recent5   = txs.slice(0, 5)
  const label: React.CSSProperties = { fontSize:'11px', color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:'8px' }

  return (
    <div style={{ maxWidth:'860px' }}>
      <div style={{ marginBottom:'40px' }}>
        <p style={label}>Capital neto</p>
        <p style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'42px', fontWeight:'300', color:'var(--text-hi)', letterSpacing:'-1px', lineHeight:1 }}>
          {formatCurrency(netDeployed)}
        </p>
        {txs.length === 0 && (
          <p style={{ fontSize:'12px', color:'var(--text-faint)', marginTop:'12px' }}>
            Sin movimientos — <a href="/dashboard/transactions" style={{ color:'var(--text-muted)' }}>agrega tu primera transacción</a>
          </p>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', borderTop:'1px solid var(--border)', borderLeft:'1px solid var(--border)', marginBottom:'40px' }}>
        {[
          { label:'Entradas',   value: formatCurrency(totalIn) },
          { label:'Salidas',    value: formatCurrency(totalOut) },
          { label:'Dividendos', value: formatCurrency(dividends) },
        ].map(s => (
          <div key={s.label} style={{ padding:'16px 20px', borderRight:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
            <p style={{ fontSize:'11px', color:'var(--text-muted)', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</p>
            <p style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'13px', color:'var(--text-md)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <Charts
        byAsset={byAsset}
        byCat={byCat}
        byRisk={byRisk}
        roiByAsset={roiByAsset}
        nwHistory={nwHistory}
        total={totalPortfolio}
        categoryColors={CATEGORY_COLORS}
        riskColors={RISK_COLORS}
      />

      <div style={{ marginTop:'40px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'16px' }}>
          <p style={label}>Últimos movimientos</p>
          <a href="/dashboard/transactions" style={{ fontSize:'11px', color:'var(--text-muted)' }}>Ver todos</a>
        </div>
        {recent5.length === 0 ? (
          <p style={{ fontSize:'12px', color:'var(--text-faint)' }}>Sin movimientos aún.</p>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <tbody>
              {recent5.map((tx, i) => {
                const isOut = ['sell','withdrawal'].includes(tx.transaction_type)
                return (
                  <tr key={tx.id} style={{ borderTop: i===0?'1px solid var(--border)':'none', borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'11px 0', fontSize:'12px', color:'var(--text-muted)', width:'80px' }}>{TX_TYPE_LABELS[tx.transaction_type]}</td>
                    <td style={{ padding:'11px 8px', fontSize:'12px', color:'var(--text-lo)' }}>{(tx.asset as any)?.activo ?? (tx.asset as any)?.name ?? '—'}</td>
                    <td style={{ padding:'11px 0', fontFamily:"'JetBrains Mono', monospace", fontSize:'13px', color: isOut?'var(--text-lo)':'var(--text-hi)', textAlign:'right' }}>
                      {isOut?'−':'+'}{formatCurrency(Number(tx.total_usd))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
