'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, TX_TYPE_LABELS } from '@/lib/utils'
import type { Transaction, Asset } from '@/lib/types'

const TX_TYPES = ['buy','sell','dividend','deposit','withdrawal','interest']
const emptyForm = { asset_id:'', transaction_type:'buy', quantity:'', price_per_unit:'', total_amount:'', fees:'0', notes:'', transaction_date: new Date().toISOString().split('T')[0] }

const inp: React.CSSProperties = { background:'transparent', border:'1px solid var(--border)', padding:'8px 10px', fontSize:'13px', color:'var(--text-md)', width:'100%', outline:'none' }
const lbl: React.CSSProperties = { fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:'6px' }
const th:  React.CSSProperties = { padding:'10px 16px', textAlign:'left', fontSize:'11px', color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:'400', borderBottom:'1px solid var(--border)' }

export default function TransactionsPage() {
  const supabase = createClient()
  const [txs, setTxs]         = useState<Transaction[]>([])
  const [assets, setAssets]   = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState(emptyForm)
  const [saving, setSaving]   = useState(false)
  const [filter, setFilter]   = useState<string>('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: transactions }, { data: assetList }] = await Promise.all([
      supabase.from('transactions').select('*, asset:assets(name, ticker, asset_type)').eq('user_id', user.id).order('transaction_date', { ascending: false }),
      supabase.from('assets').select('*').eq('user_id', user.id),
    ])
    setTxs((transactions ?? []) as Transaction[])
    setAssets((assetList ?? []) as Asset[])
    setLoading(false)
  }

  function handleFormChange(field: string, value: string) {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      if (field==='quantity'||field==='price_per_unit') {
        const qty   = parseFloat(field==='quantity' ? value : prev.quantity)
        const price = parseFloat(field==='price_per_unit' ? value : prev.price_per_unit)
        if (!isNaN(qty) && !isNaN(price)) updated.total_amount = (qty*price).toFixed(4)
      }
      return updated
    })
  }

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload: Record<string,unknown> = {
      user_id: user.id, transaction_type: form.transaction_type,
      total_amount: parseFloat(form.total_amount), fees: parseFloat(form.fees||'0'),
      notes: form.notes||null, transaction_date: form.transaction_date,
    }
    if (form.asset_id) payload.asset_id = form.asset_id
    if (form.quantity) payload.quantity = parseFloat(form.quantity)
    if (form.price_per_unit) payload.price_per_unit = parseFloat(form.price_per_unit)
    await supabase.from('transactions').insert(payload)
    setForm(emptyForm); setShowForm(false); setSaving(false); load()
  }

  const displayed = filter==='all' ? txs : txs.filter(t => t.transaction_type===filter)

  return (
    <div style={{ maxWidth:'1000px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'40px' }}>
        <div>
          <p style={{ fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'4px' }}>Movimientos</p>
          <p style={{ fontSize:'13px', color:'var(--text-lo)' }}>{txs.length} transacciones</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background:'transparent', border:'1px solid var(--border)', padding:'7px 14px', fontSize:'12px', color:'var(--text-lo)', transition:'border-color 0.1s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor='var(--text-lo)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor='var(--border)')}>
          + Movimiento
        </button>
      </div>

      {showForm && (
        <div style={{ border:'1px solid var(--border)', padding:'24px', marginBottom:'32px' }}>
          <p style={{ fontSize:'12px', color:'var(--text-lo)', marginBottom:'20px' }}>Nuevo movimiento</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
            <div><label style={lbl}>Tipo</label>
              <select style={inp} value={form.transaction_type} onChange={e => handleFormChange('transaction_type', e.target.value)}>
                {TX_TYPES.map(t => <option key={t} value={t}>{TX_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Fecha</label>
              <input type="date" style={inp} value={form.transaction_date} onChange={e => handleFormChange('transaction_date', e.target.value)} />
            </div>
            <div><label style={lbl}>Activo <span style={{ color:'var(--text-faint)' }}>(opcional)</span></label>
              <select style={inp} value={form.asset_id} onChange={e => handleFormChange('asset_id', e.target.value)}>
                <option value="">— Sin activo —</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.ticker?`${a.ticker} — `:''}{a.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Cantidad</label>
              <input type="number" step="any" style={inp} placeholder="100" value={form.quantity} onChange={e => handleFormChange('quantity', e.target.value)} />
            </div>
            <div><label style={lbl}>Precio por unidad</label>
              <input type="number" step="any" style={inp} placeholder="183.50" value={form.price_per_unit} onChange={e => handleFormChange('price_per_unit', e.target.value)} />
            </div>
            <div><label style={lbl}>Total <span style={{ color:'var(--text-lo)' }}>(requerido)</span></label>
              <input type="number" step="any" style={{ ...inp, borderColor:'var(--text-muted)' }} placeholder="18350.00" value={form.total_amount} onChange={e => handleFormChange('total_amount', e.target.value)} />
            </div>
            <div><label style={lbl}>Comisión</label>
              <input type="number" step="any" style={inp} placeholder="0" value={form.fees} onChange={e => handleFormChange('fees', e.target.value)} />
            </div>
            <div><label style={lbl}>Notas</label>
              <input style={inp} placeholder="Compra mensual DCA" value={form.notes} onChange={e => handleFormChange('notes', e.target.value)} />
            </div>
          </div>
          <div style={{ display:'flex', gap:'12px' }}>
            <button onClick={save} disabled={!form.total_amount||saving}
              style={{ background:'transparent', border:'1px solid var(--text-muted)', padding:'7px 16px', fontSize:'12px', color:'var(--text-md)', opacity: !form.total_amount ? 0.4 : 1 }}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(emptyForm) }} style={{ background:'transparent', border:'none', fontSize:'12px', color:'var(--text-muted)' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:'0', marginBottom:'24px', borderBottom:'1px solid var(--border)' }}>
        {['all',...TX_TYPES].map(type => (
          <button key={type} onClick={() => setFilter(type)} style={{
            background:'transparent', border:'none',
            borderBottom: filter===type ? '1px solid var(--text-lo)' : '1px solid transparent',
            padding:'8px 14px', fontSize:'11px',
            color: filter===type ? 'var(--text-hi)' : 'var(--text-muted)',
            marginBottom:'-1px', transition:'color 0.1s',
          }}>
            {type==='all' ? 'Todos' : TX_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize:'12px', color:'var(--text-faint)' }}>Cargando…</p>
      ) : displayed.length === 0 ? (
        <p style={{ fontSize:'12px', color:'var(--text-faint)', padding:'40px 0' }}>Sin movimientos.</p>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>{['Fecha','Tipo','Activo','Cantidad','Precio unit.','Total','Comisión','Notas'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {displayed.map(tx => {
              const isOut = ['sell','withdrawal'].includes(tx.transaction_type)
              return (
                <tr key={tx.id}
                  onMouseEnter={e => (e.currentTarget.style.background='var(--bg-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                  <td style={{ padding:'12px 16px', fontSize:'12px', color:'var(--text-muted)', borderBottom:'1px solid var(--border-sub)', fontFamily:"'JetBrains Mono', monospace", whiteSpace:'nowrap' }}>{formatDate(tx.transaction_date)}</td>
                  <td style={{ padding:'12px 16px', fontSize:'12px', color:'var(--text-lo)', borderBottom:'1px solid var(--border-sub)' }}>{TX_TYPE_LABELS[tx.transaction_type]}</td>
                  <td style={{ padding:'12px 16px', fontSize:'12px', color:'var(--text-lo)', borderBottom:'1px solid var(--border-sub)' }}>
                    {tx.asset ? <span>{(tx.asset as any).ticker && <span style={{ color:'var(--text-hi)', fontFamily:"'JetBrains Mono', monospace", marginRight:'6px', fontSize:'11px' }}>{(tx.asset as any).ticker}</span>}{(tx.asset as any).name}</span> : '—'}
                  </td>
                  <td style={{ padding:'12px 16px', fontFamily:"'JetBrains Mono', monospace", fontSize:'12px', color:'var(--text-lo)', borderBottom:'1px solid var(--border-sub)' }}>{tx.quantity!=null?tx.quantity:'—'}</td>
                  <td style={{ padding:'12px 16px', fontFamily:"'JetBrains Mono', monospace", fontSize:'12px', color:'var(--text-lo)', borderBottom:'1px solid var(--border-sub)' }}>{tx.price_per_unit!=null?formatCurrency(Number(tx.price_per_unit)):'—'}</td>
                  <td style={{ padding:'12px 16px', fontFamily:"'JetBrains Mono', monospace", fontSize:'13px', color: isOut ? 'var(--text-lo)' : 'var(--text-hi)', borderBottom:'1px solid var(--border-sub)', fontWeight:'500' }}>{isOut?'−':'+'}{formatCurrency(Number(tx.total_amount))}</td>
                  <td style={{ padding:'12px 16px', fontFamily:"'JetBrains Mono', monospace", fontSize:'12px', color: Number(tx.fees)>0 ? 'var(--text-lo)' : 'var(--text-faint)', borderBottom:'1px solid var(--border-sub)' }}>{Number(tx.fees)>0?formatCurrency(Number(tx.fees)):'—'}</td>
                  <td style={{ padding:'12px 16px', fontSize:'11px', color:'var(--text-muted)', borderBottom:'1px solid var(--border-sub)', maxWidth:'140px' }}>
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>{tx.notes??'—'}</span>
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
