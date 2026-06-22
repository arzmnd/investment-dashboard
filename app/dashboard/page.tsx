import { createClient } from '@/lib/supabase/server'
import { formatCurrency, TX_TYPE_LABELS } from '@/lib/utils'
import type { Transaction } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: transactions = [] } = await supabase
    .from('transactions')
    .select('*, asset:assets(name, ticker, asset_type)')
    .eq('user_id', user!.id)
    .order('transaction_date', { ascending: false })

  const txs = (transactions ?? []) as Transaction[]

  const totalIn = txs
    .filter(t => ['buy', 'deposit'].includes(t.transaction_type))
    .reduce((s, t) => s + Number(t.total_amount), 0)

  const totalOut = txs
    .filter(t => ['sell', 'withdrawal'].includes(t.transaction_type))
    .reduce((s, t) => s + Number(t.total_amount), 0)

  const dividends = txs
    .filter(t => ['dividend', 'interest'].includes(t.transaction_type))
    .reduce((s, t) => s + Number(t.total_amount), 0)

  const totalFees = txs.reduce((s, t) => s + Number(t.fees ?? 0), 0)
  const netDeployed = totalIn - totalOut
  const recent5 = txs.slice(0, 5)

  const byType: Record<string, number> = {}
  txs.filter(t => t.transaction_type === 'buy' && t.asset).forEach(t => {
    const type = (t.asset as any)?.asset_type ?? 'other'
    byType[type] = (byType[type] ?? 0) + Number(t.total_amount)
  })
  const allocationEntries = Object.entries(byType).sort((a, b) => b[1] - a[1])
  const allocationTotal = allocationEntries.reduce((s, [, v]) => s + v, 0)

  const TYPE_LABELS: Record<string, string> = {
    stock: 'Acciones', etf: 'ETF', crypto: 'Cripto',
    bond: 'Bonos', real_estate: 'Inmuebles', cash: 'Efectivo', other: 'Otro',
  }

  const divider = { borderTop: '1px solid #1a1a1a', margin: '32px 0' }
  const label = { fontSize: '11px', color: '#444', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '8px' }

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* Net worth */}
      <div style={{ marginBottom: '48px' }}>
        <p style={label}>Capital neto</p>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '42px',
          fontWeight: '300',
          color: '#e8e8e8',
          letterSpacing: '-1px',
          lineHeight: 1,
        }}>
          {formatCurrency(netDeployed)}
        </p>
        {txs.length === 0 && (
          <p style={{ fontSize: '12px', color: '#3a3a3a', marginTop: '12px' }}>
            Sin movimientos — <a href="/dashboard/transactions" style={{ color: '#555' }}>agrega tu primera transacción</a>
          </p>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0', borderTop: '1px solid #1a1a1a', borderLeft: '1px solid #1a1a1a' }}>
        {[
          { label: 'Entradas', value: formatCurrency(totalIn) },
          { label: 'Salidas',  value: formatCurrency(totalOut) },
          { label: 'Dividendos', value: formatCurrency(dividends) },
          { label: 'Comisiones', value: formatCurrency(totalFees) },
        ].map(s => (
          <div key={s.label} style={{ padding: '20px 20px', borderRight: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }}>
            <p style={{ fontSize: '11px', color: '#444', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#d4d4d4' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={divider} />

      {/* Allocation */}
      {allocationEntries.length > 0 && (
        <>
          <div style={{ marginBottom: '32px' }}>
            <p style={label}>Distribución</p>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {allocationEntries.map(([type, amount]) => {
                const pct = allocationTotal > 0 ? (amount / allocationTotal) * 100 : 0
                return (
                  <div key={type} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 48px', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>{TYPE_LABELS[type] ?? type}</span>
                    <div style={{ height: '1px', background: '#1a1a1a', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, height: '1px', width: `${pct}%`, background: '#444' }} />
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#555', textAlign: 'right' }}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={divider} />
        </>
      )}

      {/* Recent transactions */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
          <p style={label}>Últimos movimientos</p>
          <a href="/dashboard/transactions" style={{ fontSize: '11px', color: '#444' }}>Ver todos</a>
        </div>

        {recent5.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#333' }}>Sin movimientos aún.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {recent5.map((tx, i) => {
                const isOut = ['sell', 'withdrawal'].includes(tx.transaction_type)
                return (
                  <tr key={tx.id} style={{ borderTop: i === 0 ? '1px solid #1a1a1a' : 'none', borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ padding: '12px 0', fontSize: '12px', color: '#555', width: '80px' }}>
                      {TX_TYPE_LABELS[tx.transaction_type]}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '12px', color: '#888' }}>
                      {(tx.asset as any)?.ticker ?? (tx.asset as any)?.name ?? '—'}
                    </td>
                    <td style={{ padding: '12px 0', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace", color: isOut ? '#666' : '#d4d4d4', textAlign: 'right' }}>
                      {isOut ? '−' : '+'}{formatCurrency(Number(tx.total_amount))}
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
