'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, TX_TYPE_LABELS, TX_TYPES } from '@/lib/utils'
import { BulkUpload } from '@/components/bulk-upload'
import type { Transaction, Asset, NetWorthSnapshot } from '@/lib/types'

const emptyTx = { asset_id:'', transaction_type:'buy', quantity:'', price_per_unit:'', total_amount:'', currency:'USD', notes:'', transaction_date: new Date().toISOString().split('T')[0] }
const emptyNW = { value:'', date: new Date().toISOString().split('T')[0], notes:'' }

const inp: React.CSSProperties = { background:'transparent', border:'1px solid var(--border)', padding:'8px 10px', fontSize:'13px', color:'var(--text-md)', width:'100%', outline:'none' }
const lbl: React.CSSProperties = { fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:'6px' }
const th:  React.CSSProperties = { padding:'10px 16px', textAlign:'left', fontSize:'11px', color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:'400', borderBottom:'1px solid var(--border)' }

type Tab    = 'transactions' | 'networth'
type SubTab = 'manual' | 'bulk'

export default function TransactionsPage() {
  const supabase = createClient()
  const [tab, setTab]           = useState<Tab>('transactions')
  const [subTab, setSubTab]     = useState<SubTab>('manual')
  const [txs, setTxs]           = useState<Transaction[]>([])
  const [assets, setAssets]     = useState<Asset[]>([])
  const [nwSnaps, setNwSnaps]   = useState<NetWorthSnapshot[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(emptyTx)
  const [nwForm, setNwForm]     = useState(emptyNW)
  const [saving, setSaving]     = useState(false)
  const [filter, setFilter]     = useState<string>('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: transactions }, { data: assetList }, { data: snapshots }] = await Promise.all([
      supabase.from('transactions').select('*, asset:assets(name, activo, category)').eq('user_id', user.id).order('transaction_date', { ascending: false }),
      supabase.from('assets').select('*').eq('user_id', user.id),
      supabase.from('net_worth_snapshots').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    ])
    setTxs((transactions ?? []) as Transaction[])
    setAssets((assetList ?? []) as Asset[])
    setNwSnaps((snapshots ?? []) as NetWorthSnapshot[])
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

  async function saveTx() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const total = parseFloat(form.total_amount)
    const payload: Record<string,unknown> = {
      user_id: user.id, transaction_type: form.transaction_type,
      total_amount: total, currency: form.currency,
      exchange_rate: 1, total_usd: total, // manual entry assumes USD
      notes: form.notes||null, transaction_date: form.transaction_date,
    }
    if (form.asset_id) payload.asset_id = form.asset_id
    if (form.quantity) payload.quantity = parseFloat(form.quantity)
    if (form.price_per_unit) payload.price_per_unit = parseFloat(form.price_per_unit)
    await supabase.from('transactions').insert(payload)
    setForm(emptyTx); setShowForm(false); setSaving(false); load()
  }

  async function saveNW() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('net_worth_snapshots').upsert({
      user_id: user.id, value: parseFloat(nwForm.value),
      date: nwForm.date, notes: nwForm.notes||null,
    }, { onConflict: 'user_id,date' })
    setNwForm(emptyNW); setShowForm(false); setSaving(false); load()
  }

  const displayed = filter==='all' ? txs : txs.filter(t => t.transaction_type===filter)

  const tabStyle = (active: boolean): React.CSSProperties => ({
    background:'transparent', border:'none',
    borderBottom: active ? '1px solid var(--text-lo)' : '1px solid transparent',
    padding:'8px 14px', fontSize:'11px',
    color: active ? 'var(--text-hi)' : 'var(--text-muted)',
    marginBottom:'-1px', cursor:'pointer', transition:'color 0.1s',
  })

  const subTabStyle = (active: boolean): React.CSSProperties => ({
    background: active ? 'var(--bg-subtle)' : 'transparent',
    border:'1px solid var(--border)',
    borderBottom: active ? '1px solid var(--bg-subtle)' : '1px solid var(--border)',
    padding:'6px 14px', fontSize:'11px',
    color: active ? 'var(--text-hi)' : 'var(--text-muted)',
    cursor:'pointer', marginBottom:'-1px',
  })

  return (
    <div style={{ maxWidth:'1000px' }}>
      {/* Main tabs */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'32px' }}>
        <div style={{ display:'flex', gap:'0', borderBottom:'1px solid var(--border)' }}>
          <button style={tabStyle(tab==='transactions')} onClick={() => { setTab('transactions'); setShowForm(false); setSubTab('manual') }}>Movimientos</button>
          <button style={tabStyle(tab==='networth')} onClick={() => { setTab('networth'); setShowForm(false); setSubTab('manual') }}>Net Worth</button>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button style={subTabStyle(subTab==='bulk')} onClick={() => { setSubTab('bulk'); setShowForm(false) }}>↑ Subir CSV</button>
          <button style={subTabStyle(subTab==='manual')} onClick={() => setSubTab('manual')}>+ Agregar manual</button>
        </div>
      </div>

      {/* ── BULK UPLOAD ── */}
      {subTab === 'bulk' && (
        <BulkUpload mode={tab === 'transactions' ? 'movimientos' : 'networth'} onDone={() => { load(); setSubTab('manual') }} />
      )}

      {/* ── MANUAL — TRANSACTIONS ── */}
      {subTab === 'manual' && tab === 'transactions' && (
        <>
          {showForm && (
            <div style={{ border:'1px solid var(--border)', padding:'24px', marginBottom:'28px' }}>
              <p style={{ fontSize:'12px', color:'var(--text-lo)', marginBottom:'20px' }}>Nuevo movimiento</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                <div><label style={lbl}>Tipo de operación</label>
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
                    {assets.map(a => <option key={a.id} value={a.id}>{a.activo ? `${a.activo} — ` : ''}{a.name}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Divisa</label>
                  <select style={inp} value={form.currency} onChange={e => handleFormChange('currency', e.target.value)}>
                    <option value="USD">USD</option>
                    <option value="MXN">MXN</option>
                  </select>
                </div>
                <div><label style={lbl}>Cantidad</label>
                  <input type="number" step="any" style={inp} placeholder="100" value={form.quantity} onChange={e => handleFormChange('quantity', e.target.value)} />
                </div>
                <div><label style={lbl}>Precio por unidad</label>
                  <input type="number" step="any" style={inp} placeholder="185.50" value={form.price_per_unit} onChange={e => handleFormChange('price_per_unit', e.target.value)} />
                </div>
                <div><label style={lbl}>Total <span style={{ color:'var(--text-lo)' }}>(requerido)</span></label>
                  <input type="number" step="any" style={{ ...inp, borderColor:'var(--text-muted)' }} placeholder="1855.00" value={form.total_amount} onChange={e => handleFormChange('total_amount', e.target.value)} />
                </div>
                <div><label style={lbl}>Notas</label>
                  <input style={inp} placeholder="Compra mensual DCA" value={form.notes} onChange={e => handleFormChange('notes', e.target.value)} />
                </div>
              </div>
              <div style={{ display:'flex', gap:'12px' }}>
                <button onClick={saveTx} disabled={!form.total_amount||saving}
                  style={{ background:'var(--text-hi)', border:'none', padding:'8px 20px', fontSize:'12px', color:'var(--bg)', fontWeight:'600', opacity: !form.total_amount?0.4:1, cursor:'pointer' }}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={() => { setShowForm(false); setForm(emptyTx) }} style={{ background:'transparent', border:'none', fontSize:'12px', color:'var(--text-muted)', cursor:'pointer' }}>Cancelar</button>
              </div>
            </div>
          )}

          {!showForm && (
            <div style={{ marginBottom:'20px' }}>
              <button onClick={() => setShowForm(true)}
                style={{ background:'transparent', border:'1px solid var(--border)', padding:'7px 14px', fontSize:'12px', color:'var(--text-lo)', cursor:'pointer', transition:'border-color 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor='var(--text-lo)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor='var(--border)')}>
                + Nuevo movimiento
              </button>
            </div>
          )}

          {/* Filter tabs */}
          <div style={{ display:'flex', gap:'0', marginBottom:'24px', borderBottom:'1px solid var(--border)' }}>
            {['all',...TX_TYPES].map(type => (
              <button key={type} onClick={() => setFilter(type)} style={{
                background:'transparent', border:'none',
                borderBottom: filter===type ? '1px solid var(--text-lo)' : '1px solid transparent',
                padding:'7px 12px', fontSize:'11px',
                color: filter===type ? 'var(--text-hi)' : 'var(--text-muted)',
                marginBottom:'-1px', cursor:'pointer',
              }}>
                {type==='all' ? `Todos (${txs.length})` : TX_TYPE_LABELS[type]}
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
                <tr>{['Fecha','Operación','Activo','Categoría','Total','USD','Notas'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
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
                      <td style={{ padding:'12px 16px', fontSize:'12px', color:'var(--text-hi)', borderBottom:'1px solid var(--border-sub)' }}>
                        {tx.asset ? <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'11px' }}>{(tx.asset as any).activo ?? (tx.asset as any).name}</span> : <span style={{ color:'var(--text-faint)' }}>—</span>}
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:'11px', color:'var(--text-muted)', borderBottom:'1px solid var(--border-sub)' }}>{(tx.asset as any)?.category ?? '—'}</td>
                      <td style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-sub)' }}>
                        <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'13px', color: isOut?'var(--text-lo)':'var(--text-hi)', fontWeight:'500' }}>
                          {isOut?'−':'+'}{formatCurrency(Number(tx.total_amount), tx.currency)}
                        </span>
                        {tx.currency === 'MXN' && (
                          <span style={{ fontSize:'10px', color:'var(--text-faint)', marginLeft:'6px' }}>MXN</span>
                        )}
                      </td>
                      <td style={{ padding:'12px 16px', fontFamily:"'JetBrains Mono', monospace", fontSize:'12px', color:'var(--text-muted)', borderBottom:'1px solid var(--border-sub)' }}>
                        {formatCurrency(Number(tx.total_usd))}
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:'11px', color:'var(--text-muted)', borderBottom:'1px solid var(--border-sub)', maxWidth:'120px' }}>
                        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>{tx.notes??'—'}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ── MANUAL — NET WORTH ── */}
      {subTab === 'manual' && tab === 'networth' && (
        <>
          {showForm && (
            <div style={{ border:'1px solid var(--border)', padding:'24px', marginBottom:'28px' }}>
              <p style={{ fontSize:'12px', color:'var(--text-lo)', marginBottom:'20px' }}>Nuevo registro de net worth</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 2fr', gap:'12px', marginBottom:'12px' }}>
                <div><label style={lbl}>Valor total (USD)</label>
                  <input type="number" step="any" style={{ ...inp, borderColor:'var(--text-muted)' }} placeholder="250000.00" value={nwForm.value} onChange={e => setNwForm(p => ({ ...p, value: e.target.value }))} />
                </div>
                <div><label style={lbl}>Fecha</label>
                  <input type="date" style={inp} value={nwForm.date} onChange={e => setNwForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div><label style={lbl}>Notas</label>
                  <input style={inp} placeholder="Registro quincenal" value={nwForm.notes} onChange={e => setNwForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <div style={{ display:'flex', gap:'12px' }}>
                <button onClick={saveNW} disabled={!nwForm.value||saving}
                  style={{ background:'var(--text-hi)', border:'none', padding:'8px 20px', fontSize:'12px', color:'var(--bg)', fontWeight:'600', opacity: !nwForm.value?0.4:1, cursor:'pointer' }}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={() => { setShowForm(false); setNwForm(emptyNW) }} style={{ background:'transparent', border:'none', fontSize:'12px', color:'var(--text-muted)', cursor:'pointer' }}>Cancelar</button>
              </div>
            </div>
          )}

          {!showForm && (
            <div style={{ marginBottom:'20px' }}>
              <button onClick={() => setShowForm(true)}
                style={{ background:'transparent', border:'1px solid var(--border)', padding:'7px 14px', fontSize:'12px', color:'var(--text-lo)', cursor:'pointer', transition:'border-color 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor='var(--text-lo)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor='var(--border)')}>
                + Nuevo registro
              </button>
            </div>
          )}

          {loading ? (
            <p style={{ fontSize:'12px', color:'var(--text-faint)' }}>Cargando…</p>
          ) : nwSnaps.length === 0 ? (
            <p style={{ fontSize:'12px', color:'var(--text-faint)', padding:'40px 0' }}>Sin registros. Agrega el valor de tu portafolio cada 15 días.</p>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Fecha','Valor (USD)','Cambio','Notas'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {nwSnaps.map((snap, i) => {
                  const prev      = nwSnaps[i+1]
                  const change    = prev ? Number(snap.value) - Number(prev.value) : null
                  const changePct = change !== null && Number(prev!.value) > 0 ? (change/Number(prev!.value))*100 : null
                  return (
                    <tr key={snap.id}
                      onMouseEnter={e => (e.currentTarget.style.background='var(--bg-subtle)')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                      <td style={{ padding:'12px 16px', fontFamily:"'JetBrains Mono', monospace", fontSize:'12px', color:'var(--text-muted)', borderBottom:'1px solid var(--border-sub)' }}>{formatDate(snap.date)}</td>
                      <td style={{ padding:'12px 16px', fontFamily:"'JetBrains Mono', monospace", fontSize:'14px', fontWeight:'500', color:'var(--text-hi)', borderBottom:'1px solid var(--border-sub)' }}>{formatCurrency(Number(snap.value))}</td>
                      <td style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-sub)' }}>
                        {change !== null ? (
                          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'12px', color: change>=0?'var(--green)':'var(--red)' }}>
                            {change>=0?'+':''}{formatCurrency(change)} {changePct!==null && `(${change>=0?'+':''}${changePct.toFixed(1)}%)`}
                          </span>
                        ) : <span style={{ color:'var(--text-faint)', fontSize:'11px' }}>primer registro</span>}
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:'11px', color:'var(--text-muted)', borderBottom:'1px solid var(--border-sub)' }}>{snap.notes??'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}
