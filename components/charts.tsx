'use client'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

// ── Mini Pie Chart (SVG) ──────────────────────────────────
function PieChart({ data, colors, total, title }: {
  data: { name: string; value: number }[]
  colors: Record<string, string>
  total: number
  title: string
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const SIZE = 140, CX = 70, CY = 70, R = 56, GAP = 0.02

  let cumAngle = -Math.PI / 2
  const slices = data.filter(d => d.value > 0).map(d => {
    const pct   = d.value / total
    const start = cumAngle
    const end   = cumAngle + pct * Math.PI * 2 - GAP
    cumAngle   += pct * Math.PI * 2
    const large = pct > 0.5 ? 1 : 0
    const x1 = CX + R * Math.cos(start), y1 = CY + R * Math.sin(start)
    const x2 = CX + R * Math.cos(end),   y2 = CY + R * Math.sin(end)
    return { name: d.name, value: d.value, pct, x1, y1, x2, y2, large, color: colors[d.name] ?? '#555' }
  })

  const hoveredSlice = slices.find(s => s.name === hovered)

  return (
    <div>
      <p style={{ fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'16px' }}>{title}</p>
      <div style={{ display:'flex', gap:'24px', alignItems:'flex-start' }}>
        <div style={{ position:'relative', flexShrink:0 }}>
          <svg width={SIZE} height={SIZE}>
            {slices.map(s => (
              <path key={s.name}
                d={`M ${CX} ${CY} L ${s.x1} ${s.y1} A ${R} ${R} 0 ${s.large} 1 ${s.x2} ${s.y2} Z`}
                fill={s.color}
                opacity={hovered && hovered !== s.name ? 0.3 : 1}
                style={{ cursor:'pointer', transition:'opacity 0.15s' }}
                onMouseEnter={() => setHovered(s.name)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
            {/* Center label */}
            <text x={CX} y={CY - 6} textAnchor="middle" fill="var(--text-hi)" fontSize="11" fontFamily="JetBrains Mono, monospace">
              {hoveredSlice ? `${(hoveredSlice.pct*100).toFixed(1)}%` : `${slices.length}`}
            </text>
            <text x={CX} y={CY + 10} textAnchor="middle" fill="var(--text-muted)" fontSize="9">
              {hoveredSlice ? hoveredSlice.name : 'activos'}
            </text>
          </svg>
        </div>
        {/* Legend */}
        <div style={{ display:'flex', flexDirection:'column', gap:'7px', paddingTop:'4px' }}>
          {slices.map(s => (
            <div key={s.name} style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', opacity: hovered && hovered!==s.name ? 0.4 : 1, transition:'opacity 0.15s' }}
              onMouseEnter={() => setHovered(s.name)} onMouseLeave={() => setHovered(null)}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:s.color, flexShrink:0 }} />
              <span style={{ fontSize:'11px', color:'var(--text-lo)', whiteSpace:'nowrap' }}>{s.name}</span>
              <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'10px', color:'var(--text-muted)', marginLeft:'auto', paddingLeft:'12px' }}>
                {(s.pct*100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Bar Chart ─────────────────────────────────────────────
function BarChart({ data, title }: {
  data: { name: string; roiAbs: number; roiPct: number }[]
  title: string
}) {
  const [mode, setMode] = useState<'abs'|'pct'>('abs')
  const [hovered, setHovered] = useState<string|null>(null)

  const values = data.map(d => mode==='abs' ? d.roiAbs : d.roiPct)
  const max    = Math.max(...values.map(Math.abs), 1)
  const BAR_H  = 20

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'16px' }}>
        <p style={{ fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{title}</p>
        <div style={{ display:'flex', gap:'0' }}>
          {(['abs','pct'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              background:'transparent', border:'none', padding:'2px 8px',
              fontSize:'10px', color: mode===m ? 'var(--text-hi)' : 'var(--text-faint)',
              borderBottom: mode===m ? '1px solid var(--text-lo)' : '1px solid transparent',
            }}>
              {m==='abs' ? '$' : '%'}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <p style={{ fontSize:'12px', color:'var(--text-faint)' }}>Sin datos.</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
          {data.map(d => {
            const val   = mode==='abs' ? d.roiAbs : d.roiPct
            const pct   = (Math.abs(val) / max) * 100
            const pos   = val >= 0
            const color = pos ? 'var(--green)' : 'var(--red)'
            return (
              <div key={d.name} style={{ display:'grid', gridTemplateColumns:'64px 1fr 80px', alignItems:'center', gap:'10px', opacity: hovered&&hovered!==d.name ? 0.4:1, transition:'opacity 0.15s' }}
                onMouseEnter={() => setHovered(d.name)} onMouseLeave={() => setHovered(null)}>
                <span style={{ fontSize:'11px', color:'var(--text-lo)', textAlign:'right', fontFamily:"'JetBrains Mono', monospace", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</span>
                <div style={{ height:`${BAR_H}px`, background:'var(--bg-subtle)', position:'relative', display:'flex', alignItems:'center' }}>
                  <div style={{ position:'absolute', left: pos?'50%':'auto', right: pos?'auto':'50%', width:`${pct/2}%`, height:'100%', background:color, opacity:0.7 }} />
                  <div style={{ position:'absolute', left:'50%', width:'1px', height:'100%', background:'var(--border)' }} />
                </div>
                <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'11px', color, textAlign:'right' }}>
                  {mode==='abs' ? (pos?'+':'')+formatCurrency(val) : (pos?'+':'')+val.toFixed(1)+'%'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Line Chart ────────────────────────────────────────────
function LineChart({ data, title }: {
  data: { date: string; value: number }[]
  title: string
}) {
  const [hovered, setHovered] = useState<number|null>(null)
  const W = 500, H = 140, PAD = { t:16, r:16, b:28, l:72 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  if (data.length < 2) return (
    <div>
      <p style={{ fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'16px' }}>{title}</p>
      <p style={{ fontSize:'12px', color:'var(--text-faint)' }}>Agrega al menos 2 registros de net worth para ver la evolución.</p>
    </div>
  )

  const values = data.map(d => d.value)
  const minV   = Math.min(...values)
  const maxV   = Math.max(...values)
  const range  = maxV - minV || 1

  const toX = (i: number) => PAD.l + (i / (data.length-1)) * innerW
  const toY = (v: number) => PAD.t + innerH - ((v - minV) / range) * innerH

  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ')
  const area   = `M ${toX(0)} ${toY(data[0].value)} ` + data.map((d,i) => `L ${toX(i)} ${toY(d.value)}`).join(' ') + ` L ${toX(data.length-1)} ${H-PAD.b} L ${toX(0)} ${H-PAD.b} Z`

  const hovData = hovered !== null ? data[hovered] : null

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'16px' }}>
        <p style={{ fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{title}</p>
        {hovData && (
          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'11px', color:'var(--text-hi)' }}>
            {hovData.date} · {formatCurrency(hovData.value)}
          </span>
        )}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:'visible' }}
        onMouseLeave={() => setHovered(null)}>
        {/* Y axis labels */}
        {[0, 0.5, 1].map(t => {
          const v = minV + t * range
          const y = toY(v)
          return (
            <g key={t}>
              <line x1={PAD.l} y1={y} x2={W-PAD.r} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x={PAD.l-6} y={y+4} textAnchor="end" fill="var(--text-faint)" fontSize="9" fontFamily="JetBrains Mono, monospace">
                {formatCurrency(v, 'USD', true)}
              </text>
            </g>
          )
        })}
        {/* Area fill */}
        <path d={area} fill="var(--text-muted)" opacity="0.06" />
        {/* Line */}
        <polyline points={points} fill="none" stroke="var(--text-lo)" strokeWidth="1.5" strokeLinejoin="round" />
        {/* Hover dots */}
        {data.map((d, i) => (
          <g key={i}>
            <rect x={toX(i)-10} y={PAD.t} width={20} height={innerH} fill="transparent"
              onMouseEnter={() => setHovered(i)} style={{ cursor:'crosshair' }} />
            {hovered === i && (
              <>
                <line x1={toX(i)} y1={PAD.t} x2={toX(i)} y2={H-PAD.b} stroke="var(--text-faint)" strokeWidth="1" strokeDasharray="3,3" />
                <circle cx={toX(i)} cy={toY(d.value)} r={3} fill="var(--text-hi)" />
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────
export function Charts({ byAsset, byCat, byRisk, roiByAsset, nwHistory, total, categoryColors, riskColors }: {
  byAsset:    { name: string; value: number }[]
  byCat:      Record<string, number>
  byRisk:     Record<string, number>
  roiByAsset: { name: string; roiAbs: number; roiPct: number }[]
  nwHistory:  { date: string; value: number }[]
  total:      number
  categoryColors: Record<string, string>
  riskColors:     Record<string, string>
}) {
  const isEmpty = byAsset.length === 0

  if (isEmpty) return (
    <div style={{ padding:'40px 0', borderTop:'1px solid var(--border)' }}>
      <p style={{ fontSize:'12px', color:'var(--text-faint)' }}>
        Agrega activos y transacciones para ver las gráficas.
      </p>
    </div>
  )

  const catData  = Object.entries(byCat).map(([name,value]) => ({ name, value })).sort((a,b) => b.value-a.value)
  const riskData = Object.entries(byRisk).map(([name,value]) => ({ name, value })).sort((a,b) => b.value-a.value)

  // Assign colors to assets dynamically
  const assetColors: Record<string,string> = {}
  const palette = ['#60a5fa','#a78bfa','#f472b6','#34d399','#fbbf24','#f87171','#818cf8','#fb923c','#6ee7b7','#e879f9']
  byAsset.forEach((a, i) => { assetColors[a.name] = palette[i % palette.length] })

  const divider = { borderTop:'1px solid var(--border)', margin:'36px 0' }

  return (
    <div>
      <div style={divider} />

      {/* Row 1: 3 pies */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'40px', marginBottom:'0' }}>
        <PieChart data={byAsset.slice(0,10)} colors={assetColors} total={total} title="Por inversión" />
        <PieChart data={catData}  colors={categoryColors} total={total} title="Por categoría" />
        <PieChart data={riskData} colors={riskColors}     total={total} title="Perfil de riesgo" />
      </div>

      <div style={divider} />

      {/* Row 2: Bar ROI */}
      <BarChart data={roiByAsset} title="ROI por inversión" />

      <div style={divider} />

      {/* Row 3: Line net worth */}
      <LineChart data={nwHistory} title="Evolución del net worth" />
    </div>
  )
}
