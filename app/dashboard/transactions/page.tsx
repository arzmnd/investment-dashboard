'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, TX_TYPE_LABELS, TX_TYPE_COLORS, ASSET_TYPE_LABELS } from '@/lib/utils'
import type { Transaction, Asset } from '@/lib/types'

const TX_TYPES = ['buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'interest']

const emptyForm = {
  asset_id: '',
  transaction_type: 'buy',
  quantity: '',
  price_per_unit: '',
  total_amount: '',
  fees: '0',
  notes: '',
  transaction_date: new Date().toISOString().split('T')[0],
}

export default function TransactionsPage() {
  const supabase = createClient()
  const [txs, setTxs]       = useState<Transaction[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]     = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: transactions }, { data: assetList }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, asset:assets(name, ticker, asset_type)')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false }),
      supabase.from('assets').select('*').eq('user_id', user.id),
    ])

    setTxs((transactions ?? []) as Transaction[])
    setAssets((assetList ?? []) as Asset[])
    setLoading(false)
  }

  // Auto-compute total_amount from qty * price
  function handleFormChange(field: string, value: string) {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'quantity' || field === 'price_per_unit') {
        const qty = parseFloat(field === 'quantity' ? value : prev.quantity)
        const price = parseFloat(field === 'price_per_unit' ? value : prev.price_per_unit)
        if (!isNaN(qty) && !isNaN(price)) {
          updated.total_amount = (qty * price).toFixed(4)
        }
      }
      return updated
    })
  }

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload: Record<string, unknown> = {
      user_id: user.id,
      transaction_type: form.transaction_type,
      total_amount: parseFloat(form.total_amount),
      fees: parseFloat(form.fees || '0'),
      notes: form.notes || null,
      transaction_date: form.transaction_date,
    }
    if (form.asset_id) payload.asset_id = form.asset_id
    if (form.quantity) payload.quantity = parseFloat(form.quantity)
    if (form.price_per_unit) payload.price_per_unit = parseFloat(form.price_per_unit)

    await supabase.from('transactions').insert(payload)
    setForm(emptyForm)
    setShowForm(false)
    setSaving(false)
    load()
  }

  const displayed = filter === 'all' ? txs : txs.filter(t => t.transaction_type === filter)

  const inputStyle = {
    background: '#161b22', border: '1px solid #1c1c28', borderRadius: '8px',
    padding: '10px 12px', fontSize: '14px', color: '#e2e8f0', width: '100%',
    outline: 'none',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Movimientos</h1>
          <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>{txs.length} transacciones registradas</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px', background: '#f5c842', color: '#0a0a0a',
            border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
          }}
        >
          + Nuevo movimiento
        </button>
      </div>

      {/* Add Transaction Form */}
      {showForm && (
        <div style={{
          background: '#0d1117', border: '1px solid #f5c842',
          borderRadius: '14px', padding: '24px', marginBottom: '28px',
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9', marginBottom: '20px' }}>
            Nuevo movimiento
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            {/* Type */}
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Tipo</label>
              <select style={inputStyle} value={form.transaction_type}
                onChange={e => handleFormChange('transaction_type', e.target.value)}>
                {TX_TYPES.map(t => <option key={t} value={t}>{TX_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            {/* Date */}
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Fecha</label>
              <input type="date" style={inputStyle} value={form.transaction_date}
                onChange={e => handleFormChange('transaction_date', e.target.value)} />
            </div>
            {/* Asset */}
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                Activo <span style={{ color: '#334155' }}>(opcional)</span>
              </label>
              <select style={inputStyle} value={form.asset_id}
                onChange={e => handleFormChange('asset_id', e.target.value)}>
                <option value="">— Sin activo específico —</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.ticker ? `${a.ticker} — ` : ''}{a.name}
                  </option>
                ))}
              </select>
            </div>
            {/* Quantity */}
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                Cantidad <span style={{ color: '#334155' }}>(unidades)</span>
              </label>
              <input type="number" step="any" style={inputStyle} placeholder="100"
                value={form.quantity} onChange={e => handleFormChange('quantity', e.target.value)} />
            </div>
            {/* Price per unit */}
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                Precio por unidad
              </label>
              <input type="number" step="any" style={inputStyle} placeholder="183.50"
                value={form.price_per_unit} onChange={e => handleFormChange('price_per_unit', e.target.value)} />
            </div>
            {/* Total */}
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                Total <span style={{ color: '#334155' }}>(requerido)</span>
              </label>
              <input type="number" step="any" style={{ ...inputStyle, borderColor: '#f5c842' }} placeholder="18350.00"
                value={form.total_amount} onChange={e => handleFormChange('total_amount', e.target.value)} />
            </div>
            {/* Fees */}
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Comisión</label>
              <input type="number" step="any" style={inputStyle} placeholder="0"
                value={form.fees} onChange={e => handleFormChange('fees', e.target.value)} />
            </div>
            {/* Notes */}
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>Notas</label>
              <input style={inputStyle} placeholder="Compra mensual DCA" value={form.notes}
                onChange={e => handleFormChange('notes', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={save} disabled={!form.total_amount || saving} style={{
              padding: '10px 24px', background: '#f5c842', color: '#0a0a0a',
              border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700',
              opacity: !form.total_amount ? 0.5 : 1,
            }}>
              {saving ? 'Guardando...' : 'Guardar movimiento'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(emptyForm) }} style={{
              padding: '10px 20px', background: 'transparent', border: '1px solid #1c1c28',
              borderRadius: '8px', fontSize: '14px', color: '#64748b',
            }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', ...TX_TYPES].map(type => (
          <button key={type} onClick={() => setFilter(type)} style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            border: filter === type ? `1px solid ${TX_TYPE_COLORS[type] ?? '#7c8cf8'}` : '1px solid #1c1c28',
            background: filter === type ? `${(TX_TYPE_COLORS[type] ?? '#7c8cf8')}18` : 'transparent',
            color: filter === type ? (TX_TYPE_COLORS[type] ?? '#7c8cf8') : '#475569',
            cursor: 'pointer',
          }}>
            {type === 'all' ? 'Todos' : TX_TYPE_LABELS[type]}
            {type !== 'all' && (
              <span style={{ marginLeft: '6px', opacity: 0.6 }}>
                {txs.filter(t => t.transaction_type === type).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: '#475569', fontSize: '14px' }}>Cargando movimientos…</p>
      ) : displayed.length === 0 ? (
        <div style={{ background: '#0d1117', border: '1px solid #1c1c28', borderRadius: '14px', padding: '60px', textAlign: 'center' }}>
          <p style={{ color: '#334155', fontSize: '14px' }}>
            {filter === 'all' ? 'Sin movimientos aún. Registra tu primera transacción.' : `Sin movimientos de tipo "${TX_TYPE_LABELS[filter]}".`}
          </p>
        </div>
      ) : (
        <div style={{ background: '#0d1117', border: '1px solid #1c1c28', borderRadius: '14px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1c1c28' }}>
                {['Fecha', 'Tipo', 'Activo', 'Cantidad', 'Precio unit.', 'Total', 'Comisión', 'Notas'].map(h => (
                  <th key={h} style={{
                    padding: '14px 20px', textAlign: 'left',
                    fontSize: '11px', color: '#475569',
                    textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((tx, i) => {
                const color = TX_TYPE_COLORS[tx.transaction_type] ?? '#94a3b8'
                const isOut = ['sell', 'withdrawal'].includes(tx.transaction_type)
                return (
                  <tr key={tx.id}
                    style={{ borderBottom: i < displayed.length - 1 ? '1px solid #1c1c28' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#161b22')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDate(tx.transaction_date)}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                        background: `${color}18`, color,
                      }}>
                        {TX_TYPE_LABELS[tx.transaction_type]}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#94a3b8' }}>
                      {tx.asset ? (
                        <span>
                          {(tx.asset as any).ticker && (
                            <span style={{ color: '#e2e8f0', fontWeight: '600', marginRight: '6px' }}>
                              {(tx.asset as any).ticker}
                            </span>
                          )}
                          {(tx.asset as any).name}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {tx.quantity != null ? tx.quantity : '—'}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {tx.price_per_unit != null ? formatCurrency(Number(tx.price_per_unit)) : '—'}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '600', fontVariantNumeric: 'tabular-nums', color: isOut ? '#f87171' : '#f1f5f9' }}>
                      {isOut ? '−' : '+'}{formatCurrency(Number(tx.total_amount))}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: Number(tx.fees) > 0 ? '#f97316' : '#334155', fontVariantNumeric: 'tabular-nums' }}>
                      {Number(tx.fees) > 0 ? formatCurrency(Number(tx.fees)) : '—'}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '12px', color: '#475569', maxWidth: '160px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {tx.notes ?? '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
