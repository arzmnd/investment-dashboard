import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatPercent, TX_TYPE_LABELS, TX_TYPE_COLORS } from '@/lib/utils'
import type { Transaction } from '@/lib/types'

// ── helpers ──────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: string
}) {
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #1c1c28',
      borderRadius: '14px',
      padding: '24px',
    }}>
      <p style={{ fontSize: '12px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
        {label}
      </p>
      <p style={{ fontSize: '26px', fontWeight: '700', color: accent ?? '#f1f5f9', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: '12px', color: '#475569', marginTop: '6px' }}>{sub}</p>}
    </div>
  )
}

// ── page ─────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all transactions
  const { data: transactions = [] } = await supabase
    .from('transactions')
    .select('*, asset:assets(name, ticker)')
    .eq('user_id', user!.id)
    .order('transaction_date', { ascending: false })

  const txs = (transactions ?? []) as Transaction[]

  // ── Compute summary numbers ──
  const totalIn = txs
    .filter(t => ['buy', 'deposit'].includes(t.transaction_type))
    .reduce((s, t) => s + Number(t.total_amount), 0)

  const totalOut = txs
    .filter(t => ['sell', 'withdrawal'].includes(t.transaction_type))
    .reduce((s, t) => s + Number(t.total_amount), 0)

  const dividends = txs
    .filter(t => ['dividend', 'interest'].includes(t.transaction_type))
    .reduce((s, t) => s + Number(t.total_amount), 0)

  const netDeployed = totalIn - totalOut
  const totalFees = txs.reduce((s, t) => s + Number(t.fees ?? 0), 0)
  const totalTxs = txs.length
  const recent5 = txs.slice(0, 5)

  // ── Allocation by type ──
  const byType: Record<string, number> = {}
  txs
    .filter(t => t.transaction_type === 'buy' && t.asset)
    .forEach(t => {
      const type = (t.asset as any)?.asset_type ?? 'other'
      byType[type] = (byType[type] ?? 0) + Number(t.total_amount)
    })

  const allocationEntries = Object.entries(byType).sort((a, b) => b[1] - a[1])
  const allocationTotal = allocationEntries.reduce((s, [, v]) => s + v, 0)

  const TYPE_COLORS: Record<string, string> = {
    stock: '#7c8cf8', etf: '#22c55e', crypto: '#f5c842',
    bond: '#f97316', real_estate: '#a78bfa', cash: '#94a3b8', other: '#475569',
  }
  const TYPE_LABELS: Record<string, string> = {
    stock: 'Acciones', etf: 'ETF', crypto: 'Cripto',
    bond: 'Bonos', real_estate: 'Inmuebles', cash: 'Efectivo', other: 'Otro',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <p style={{ fontSize: '12px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          Capital neto desplegado
        </p>
        <p style={{
          fontSize: '56px',
          fontWeight: '800',
          letterSpacing: '-2px',
          fontVariantNumeric: 'tabular-nums',
          fontFamily: '"SF Mono", "JetBrains Mono", monospace',
          color: '#f1f5f9',
          lineHeight: 1,
        }}>
          {formatCurrency(netDeployed)}
        </p>
        {totalTxs === 0 && (
          <p style={{ fontSize: '14px', color: '#475569', marginTop: '12px' }}>
            Sin movimientos aún — agrega tu primera transacción en{' '}
            <a href="/dashboard/transactions" style={{ color: '#7c8cf8' }}>Movimientos</a>
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '36px' }}>
        <StatCard label="Total entradas" value={formatCurrency(totalIn)} sub={`${txs.filter(t => ['buy','deposit'].includes(t.transaction_type)).length} operaciones`} />
        <StatCard label="Total salidas" value={formatCurrency(totalOut)} sub={`${txs.filter(t => ['sell','withdrawal'].includes(t.transaction_type)).length} operaciones`} />
        <StatCard label="Dividendos / Intereses" value={formatCurrency(dividends)} accent="#22c55e" />
        <StatCard label="Comisiones pagadas" value={formatCurrency(totalFees)} accent={totalFees > 0 ? '#f87171' : undefined} />
      </div>

      {/* Allocation + Recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '20px' }}>

        {/* Allocation by type */}
        <div style={{ background: '#0d1117', border: '1px solid #1c1c28', borderRadius: '14px', padding: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '20px' }}>
            Distribución por tipo
          </h2>
          {allocationEntries.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#334155' }}>Sin datos aún</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {allocationEntries.map(([type, amount]) => {
                const pct = allocationTotal > 0 ? (amount / allocationTotal) * 100 : 0
                const color = TYPE_COLORS[type] ?? '#475569'
                return (
                  <div key={type}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>{TYPE_LABELS[type] ?? type}</span>
                      <span style={{ fontSize: '13px', fontVariantNumeric: 'tabular-nums', color: '#f1f5f9' }}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ height: '6px', background: '#161b22', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div style={{ background: '#0d1117', border: '1px solid #1c1c28', borderRadius: '14px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8' }}>Últimos movimientos</h2>
            <a href="/dashboard/transactions" style={{ fontSize: '12px', color: '#7c8cf8' }}>Ver todos →</a>
          </div>

          {recent5.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#334155' }}>Sin movimientos aún</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {recent5.map(tx => {
                const color = TX_TYPE_COLORS[tx.transaction_type] ?? '#94a3b8'
                const isOut = ['sell', 'withdrawal'].includes(tx.transaction_type)
                return (
                  <div key={tx.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', borderRadius: '8px',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#161b22')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '6px',
                        fontSize: '11px', fontWeight: '600',
                        background: `${color}18`, color,
                      }}>
                        {TX_TYPE_LABELS[tx.transaction_type]}
                      </span>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                        {(tx.asset as any)?.ticker ?? (tx.asset as any)?.name ?? '—'}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      fontVariantNumeric: 'tabular-nums',
                      color: isOut ? '#f87171' : '#f1f5f9',
                    }}>
                      {isOut ? '−' : '+'}{formatCurrency(Number(tx.total_amount))}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
