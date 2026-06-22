'use client'
import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  parseCSV, parseDMY, fetchExchangeRate, downloadCSV,
  TX_TYPES, CATEGORIES, CURRENCIES, TX_TYPE_LABELS,
} from '@/lib/utils'
import type { BulkRow, Category, TransactionType, Currency } from '@/lib/types'

// ── Templates ──────────────────────────────────────────────
const TX_HEADERS  = ['fecha','operacion','tipo','activo','cantidad','divisa','precio_unitario','total','notas']
const TX_EXAMPLES = [
  ['15/01/2024','buy','Bolsa','AAPL','10','USD','185.50','1855.00','Compra mensual DCA'],
  ['20/01/2024','deposit','Cash','Efectivo','','MXN','','50000.00','Depósito enero'],
  ['01/02/2024','dividend','Bolsa','AAPL','','USD','','42.30','Dividendo Q1'],
]
const NW_HEADERS  = ['fecha','valor_usd','notas']
const NW_EXAMPLES = [
  ['15/01/2024','250000.00','Registro quincenal enero'],
  ['01/02/2024','263500.00','Registro quincenal febrero'],
]

type Mode = 'movimientos' | 'networth'
type UploadState = 'idle' | 'preview' | 'importing' | 'done'

interface ImportResult {
  imported: number
  assetsCreated: string[]
  errors: { line: number; msg: string }[]
}

// ── Validate a movimientos row ─────────────────────────────
function validateRow(raw: Record<string, string>, i: number): BulkRow {
  const errors: string[] = []
  const warnings: string[] = []

  const fecha     = parseDMY(raw.fecha ?? '')
  const operacion = (raw.operacion ?? '').toLowerCase().trim()
  const tipo      = raw.tipo?.trim() ?? ''
  const activo    = raw.activo?.trim() ?? ''
  const divisa    = (raw.divisa ?? '').toUpperCase().trim()
  const totalRaw  = raw.total?.trim() ?? ''

  if (!fecha)              errors.push('Fecha inválida — usa DD/MM/YYYY')
  if (!TX_TYPES.includes(operacion as any)) errors.push(`Operación inválida: "${operacion}" — usa buy, sell, dividend, deposit, withdrawal, interest`)
  if (!CATEGORIES.includes(tipo as any))    errors.push(`Tipo inválido: "${tipo}" — usa Negocio, Cash, Deuda, Bolsa`)
  if (!activo)             errors.push('El campo activo es requerido')
  if (!CURRENCIES.includes(divisa as any))  errors.push(`Divisa inválida: "${divisa}" — usa USD o MXN`)
  if (!totalRaw || isNaN(parseFloat(totalRaw))) errors.push('El campo total debe ser un número')

  if (divisa === 'MXN' && errors.length === 0) {
    warnings.push('Tipo de cambio se obtendrá automáticamente de frankfurter.app')
  }

  const qty   = raw.cantidad ? parseFloat(raw.cantidad) : undefined
  const price = raw.precio_unitario ? parseFloat(raw.precio_unitario) : undefined
  const total = parseFloat(totalRaw)

  return {
    raw, lineNumber: i + 2,
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok',
    errors, warnings,
    parsed: errors.length === 0 ? {
      fecha: fecha!, operacion: operacion as TransactionType,
      tipo: tipo as Category, activo,
      cantidad: qty, divisa: divisa as Currency,
      precio_unitario: price, total, notas: raw.notas?.trim() || undefined,
    } : undefined,
  }
}

// ── Main component ─────────────────────────────────────────
export function BulkUpload({ mode, onDone }: { mode: Mode; onDone: () => void }) {
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [dragging, setDragging]   = useState(false)
  const [state, setState]         = useState<UploadState>('idle')
  const [rows, setRows]           = useState<BulkRow[]>([])
  const [nwRows, setNwRows]       = useState<{ fecha: string; valor: number; notas?: string; lineNumber: number; error?: string }[]>([])
  const [importStatus, setImportStatus] = useState('')
  const [result, setResult]       = useState<ImportResult | null>(null)

  function downloadTemplate() {
    if (mode === 'movimientos') {
      downloadCSV('plantilla_movimientos.csv', TX_HEADERS, TX_EXAMPLES)
    } else {
      downloadCSV('plantilla_networth.csv', NW_HEADERS, NW_EXAMPLES)
    }
  }

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const { rows: rawRows } = parseCSV(text)
      if (rawRows.length === 0) return

      if (mode === 'movimientos') {
        const parsed = rawRows.map((r, i) => validateRow(r, i))
        setRows(parsed)
      } else {
        const parsed = rawRows.map((r, i) => {
          const fecha = parseDMY(r.fecha ?? '')
          const valor = parseFloat(r.valor_usd ?? '')
          const error = !fecha ? 'Fecha inválida (usa DD/MM/YYYY)' : isNaN(valor) ? 'valor_usd debe ser un número' : undefined
          return { fecha: fecha ?? r.fecha, valor, notas: r.notas?.trim(), lineNumber: i + 2, error }
        })
        setNwRows(parsed)
      }
      setState('preview')
    }
    reader.readAsText(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
  }, [mode])

  // ── Import movimientos ─────────────────────────────────
  async function importMovimientos() {
    setState('importing')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const validRows = rows.filter(r => r.status !== 'error' && r.parsed)
    const { data: existingAssets } = await supabase.from('assets').select('*').eq('user_id', user.id)
    const assetMap = new Map((existingAssets ?? []).map((a: any) => [a.activo?.toLowerCase(), a]))

    const assetsCreated: string[] = []
    const errors: { line: number; msg: string }[] = []
    let imported = 0

    // Group MXN rows by date to batch exchange rate fetches
    const mxnDates = [...new Set(validRows.filter(r => r.parsed!.divisa === 'MXN').map(r => r.parsed!.fecha))]
    const rateCache: Record<string, number> = {}

    setImportStatus('Obteniendo tipos de cambio…')
    await Promise.all(mxnDates.map(async date => {
      const rate = await fetchExchangeRate(date)
      if (rate) rateCache[date] = rate
    }))

    setImportStatus('Importando movimientos…')
    for (const row of validRows) {
      const p = row.parsed!
      try {
        // Find or create asset
        const key = p.activo.toLowerCase()
        let asset = assetMap.get(key)
        if (!asset) {
          const { data: newAsset } = await supabase.from('assets').insert({
            user_id: user.id, name: p.activo, activo: p.activo,
            category: p.tipo, risk_profile: 'Medium', currency: p.divisa,
          }).select().single()
          asset = newAsset
          assetMap.set(key, asset)
          if (!assetsCreated.includes(p.activo)) assetsCreated.push(p.activo)
        }

        // Exchange rate
        let exchangeRate = 1
        if (p.divisa === 'MXN') {
          exchangeRate = rateCache[p.fecha] ?? 0
          if (!exchangeRate) {
            errors.push({ line: row.lineNumber, msg: `No se pudo obtener TC para ${p.fecha}` })
            continue
          }
        }

        const totalUsd = p.divisa === 'MXN' ? p.total * exchangeRate : p.total
        const priceUsd = p.precio_unitario
          ? (p.divisa === 'MXN' ? p.precio_unitario * exchangeRate : p.precio_unitario)
          : undefined

        await supabase.from('transactions').insert({
          user_id: user.id, asset_id: asset?.id ?? null,
          transaction_type: p.operacion, quantity: p.cantidad ?? null,
          price_per_unit: priceUsd ?? null, total_amount: p.total,
          currency: p.divisa, exchange_rate: exchangeRate,
          total_usd: totalUsd, notes: p.notas ?? null,
          transaction_date: p.fecha,
        })
        imported++
      } catch (err: any) {
        errors.push({ line: row.lineNumber, msg: err.message ?? 'Error desconocido' })
      }
    }

    setResult({ imported, assetsCreated, errors })
    setState('done')
    if (imported > 0) onDone()
  }

  // ── Import net worth ───────────────────────────────────
  async function importNetWorth() {
    setState('importing')
    setImportStatus('Importando registros…')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const validRows = nwRows.filter(r => !r.error)
    let imported = 0
    const errors: { line: number; msg: string }[] = []

    for (const row of validRows) {
      try {
        await supabase.from('net_worth_snapshots').upsert({
          user_id: user.id, value: row.valor,
          date: row.fecha, notes: row.notas ?? null,
        }, { onConflict: 'user_id,date' })
        imported++
      } catch (err: any) {
        errors.push({ line: row.lineNumber, msg: err.message })
      }
    }

    setResult({ imported, assetsCreated: [], errors })
    setState('done')
    if (imported > 0) onDone()
  }

  function reset() {
    setState('idle'); setRows([]); setNwRows([]); setResult(null); setImportStatus('')
  }

  // ── Status counts ──────────────────────────────────────
  const okCount      = mode === 'movimientos' ? rows.filter(r => r.status === 'ok').length : nwRows.filter(r => !r.error).length
  const warnCount    = rows.filter(r => r.status === 'warning').length
  const errorCount   = mode === 'movimientos' ? rows.filter(r => r.status === 'error').length : nwRows.filter(r => !!r.error).length
  const importable   = okCount + warnCount

  const s = {
    btn: { background:'transparent', border:'1px solid var(--border)', padding:'8px 16px', fontSize:'12px', color:'var(--text-lo)', cursor:'pointer', transition:'border-color 0.15s' } as React.CSSProperties,
    btnPrimary: { background:'var(--text-hi)', border:'none', padding:'9px 20px', fontSize:'12px', color:'var(--bg)', cursor:'pointer', fontWeight:'600' } as React.CSSProperties,
    pill: (color: string) => ({ display:'inline-block', padding:'2px 8px', fontSize:'10px', fontFamily:"'JetBrains Mono', monospace", color, border:`1px solid ${color}`, borderRadius:'2px' } as React.CSSProperties),
  }

  return (
    <div>
      {/* ── IDLE: drop zone ── */}
      {state === 'idle' && (
        <div>
          {/* Download template */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
            <button onClick={downloadTemplate} style={s.btn}
              onMouseEnter={e => (e.currentTarget.style.borderColor='var(--text-lo)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor='var(--border)')}>
              ↓ Descargar plantilla .csv
            </button>
            <p style={{ fontSize:'11px', color:'var(--text-faint)' }}>
              Descarga, llena y sube el mismo archivo
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDragEnter={() => setDragging(true)}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `1px dashed ${dragging ? 'var(--text-lo)' : 'var(--border)'}`,
              borderRadius:'2px',
              padding:'48px 24px',
              textAlign:'center',
              cursor:'pointer',
              background: dragging ? 'var(--bg-subtle)' : 'transparent',
              transition:'all 0.15s',
            }}
          >
            <p style={{ fontSize:'24px', marginBottom:'12px', opacity:0.4 }}>↑</p>
            <p style={{ fontSize:'13px', color:'var(--text-lo)', marginBottom:'6px' }}>
              Arrastra tu .csv aquí
            </p>
            <p style={{ fontSize:'11px', color:'var(--text-faint)' }}>
              o <span style={{ color:'var(--text-muted)', textDecoration:'underline' }}>selecciona un archivo</span>
            </p>
            <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>

          {/* Column guide */}
          <div style={{ marginTop:'16px', padding:'14px 16px', background:'var(--bg-subtle)', border:'1px solid var(--border)' }}>
            <p style={{ fontSize:'10px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>
              Columnas esperadas
            </p>
            {mode === 'movimientos' ? (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {[
                  { name:'fecha', req:true, note:'DD/MM/YYYY' },
                  { name:'operacion', req:true, note:'buy, sell, dividend…' },
                  { name:'tipo', req:true, note:'Negocio, Cash, Deuda, Bolsa' },
                  { name:'activo', req:true, note:'AAPL, Lavandería, etc.' },
                  { name:'cantidad', req:false, note:'opcional' },
                  { name:'divisa', req:true, note:'USD o MXN' },
                  { name:'precio_unitario', req:false, note:'opcional' },
                  { name:'total', req:true, note:'monto en la divisa elegida' },
                  { name:'notas', req:false, note:'opcional' },
                ].map(col => (
                  <div key={col.name} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                    <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'11px', color: col.req ? 'var(--text-hi)' : 'var(--text-muted)' }}>
                      {col.name}
                    </span>
                    {col.req && <span style={{ fontSize:'9px', color:'var(--red)' }}>*</span>}
                    <span style={{ fontSize:'10px', color:'var(--text-faint)' }}>({col.note})</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display:'flex', gap:'16px' }}>
                {[
                  { name:'fecha', req:true, note:'DD/MM/YYYY' },
                  { name:'valor_usd', req:true, note:'en USD' },
                  { name:'notas', req:false, note:'opcional' },
                ].map(col => (
                  <div key={col.name} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                    <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'11px', color: col.req ? 'var(--text-hi)' : 'var(--text-muted)' }}>
                      {col.name}
                    </span>
                    {col.req && <span style={{ fontSize:'9px', color:'var(--red)' }}>*</span>}
                    <span style={{ fontSize:'10px', color:'var(--text-faint)' }}>({col.note})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {state === 'preview' && (
        <div>
          {/* Summary bar */}
          <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'20px' }}>
            <span style={s.pill('var(--green)')}>{okCount + warnCount} válidas</span>
            {errorCount > 0 && <span style={s.pill('var(--red)')}>{errorCount} con error</span>}
            {warnCount > 0 && <span style={s.pill('var(--text-muted)')}>{warnCount} con advertencia</span>}
            <div style={{ flex:1 }} />
            <button onClick={reset} style={{ ...s.btn, border:'none', color:'var(--text-muted)' }}>← Cancelar</button>
            <button
              onClick={mode === 'movimientos' ? importMovimientos : importNetWorth}
              disabled={importable === 0}
              style={{ ...s.btnPrimary, opacity: importable === 0 ? 0.4 : 1 }}
            >
              Importar {importable} {mode === 'movimientos' ? 'movimientos' : 'registros'}
            </button>
          </div>

          {/* Preview table — movimientos */}
          {mode === 'movimientos' && (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
                <thead>
                  <tr>
                    {['#','Estado','Fecha','Operación','Tipo','Activo','Cantidad','Divisa','Total','Notas'].map(h => (
                      <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'var(--text-faint)', borderBottom:'1px solid var(--border)', fontWeight:'400', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.lineNumber}
                      style={{ borderBottom:'1px solid var(--border-sub)', background: row.status==='error' ? 'rgba(248,113,113,0.04)' : row.status==='warning' ? 'rgba(251,191,36,0.04)' : 'transparent' }}>
                      <td style={{ padding:'8px 12px', color:'var(--text-faint)', fontFamily:"'JetBrains Mono', monospace" }}>{row.lineNumber}</td>
                      <td style={{ padding:'8px 12px' }}>
                        {row.status === 'ok'      && <span style={s.pill('var(--green)')}>OK</span>}
                        {row.status === 'warning' && <span style={s.pill('var(--text-muted)')}>TC auto</span>}
                        {row.status === 'error'   && (
                          <div>
                            <span style={s.pill('var(--red)')}>Error</span>
                            {row.errors.map((e,i) => <p key={i} style={{ fontSize:'10px', color:'var(--red)', marginTop:'3px' }}>{e}</p>)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding:'8px 12px', color:'var(--text-lo)', fontFamily:"'JetBrains Mono', monospace", whiteSpace:'nowrap' }}>{row.raw.fecha}</td>
                      <td style={{ padding:'8px 12px', color:'var(--text-lo)' }}>{TX_TYPE_LABELS[row.raw.operacion?.toLowerCase()] ?? row.raw.operacion}</td>
                      <td style={{ padding:'8px 12px', color:'var(--text-lo)' }}>{row.raw.tipo}</td>
                      <td style={{ padding:'8px 12px', color:'var(--text-hi)', fontWeight:'500' }}>{row.raw.activo}</td>
                      <td style={{ padding:'8px 12px', color:'var(--text-muted)', fontFamily:"'JetBrains Mono', monospace"}}>{row.raw.cantidad || '—'}</td>
                      <td style={{ padding:'8px 12px', color:'var(--text-muted)' }}>{row.raw.divisa}</td>
                      <td style={{ padding:'8px 12px', color:'var(--text-hi)', fontFamily:"'JetBrains Mono', monospace", whiteSpace:'nowrap' }}>{row.raw.total}</td>
                      <td style={{ padding:'8px 12px', color:'var(--text-muted)', maxWidth:'120px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.raw.notas || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Preview table — net worth */}
          {mode === 'networth' && (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
              <thead>
                <tr>
                  {['#','Estado','Fecha','Valor (USD)','Notas'].map(h => (
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'var(--text-faint)', borderBottom:'1px solid var(--border)', fontWeight:'400', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nwRows.map(row => (
                  <tr key={row.lineNumber} style={{ borderBottom:'1px solid var(--border-sub)', background: row.error ? 'rgba(248,113,113,0.04)' : 'transparent' }}>
                    <td style={{ padding:'8px 12px', color:'var(--text-faint)', fontFamily:"'JetBrains Mono', monospace" }}>{row.lineNumber}</td>
                    <td style={{ padding:'8px 12px' }}>
                      {row.error
                        ? <div><span style={s.pill('var(--red)')}>Error</span><p style={{ fontSize:'10px', color:'var(--red)', marginTop:'3px' }}>{row.error}</p></div>
                        : <span style={s.pill('var(--green)')}>OK</span>}
                    </td>
                    <td style={{ padding:'8px 12px', color:'var(--text-lo)', fontFamily:"'JetBrains Mono', monospace" }}>{row.fecha}</td>
                    <td style={{ padding:'8px 12px', color:'var(--text-hi)', fontFamily:"'JetBrains Mono', monospace" }}>${row.valor?.toLocaleString('es-MX', { minimumFractionDigits:2 })}</td>
                    <td style={{ padding:'8px 12px', color:'var(--text-muted)' }}>{row.notas || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── IMPORTING ── */}
      {state === 'importing' && (
        <div style={{ padding:'48px 0', textAlign:'center' }}>
          <p style={{ fontSize:'13px', color:'var(--text-lo)', marginBottom:'8px' }}>{importStatus}</p>
          <p style={{ fontSize:'11px', color:'var(--text-faint)' }}>Esto puede tomar unos segundos…</p>
        </div>
      )}

      {/* ── DONE ── */}
      {state === 'done' && result && (
        <div style={{ padding:'32px 0' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <span style={{ fontSize:'18px' }}>✓</span>
              <p style={{ fontSize:'14px', color:'var(--text-hi)' }}>
                {result.imported} {mode === 'movimientos' ? 'movimientos' : 'registros'} importados
              </p>
            </div>
            {result.assetsCreated.length > 0 && (
              <div style={{ paddingLeft:'28px' }}>
                <p style={{ fontSize:'12px', color:'var(--text-lo)', marginBottom:'4px' }}>Activos creados automáticamente:</p>
                {result.assetsCreated.map(a => (
                  <p key={a} style={{ fontSize:'11px', color:'var(--text-muted)', fontFamily:"'JetBrains Mono', monospace" }}>+ {a}</p>
                ))}
              </div>
            )}
            {result.errors.length > 0 && (
              <div style={{ paddingLeft:'28px' }}>
                <p style={{ fontSize:'12px', color:'var(--red)', marginBottom:'4px' }}>{result.errors.length} filas con error:</p>
                {result.errors.map((e,i) => (
                  <p key={i} style={{ fontSize:'11px', color:'var(--red)' }}>Línea {e.line}: {e.msg}</p>
                ))}
              </div>
            )}
          </div>
          <button onClick={reset} style={{ ...s.btn, marginTop:'24px' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor='var(--text-lo)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor='var(--border)')}>
            Subir otro archivo
          </button>
        </div>
      )}
    </div>
  )
}
