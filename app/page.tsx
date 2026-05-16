'use client'
import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const TARGETS = { calories: 2700, protein: 170, carbs: 280, fat: 89 }
const START_WEIGHT = 93
const CUT_START = '2026-05-16'

type FoodEntry = { id: number; name: string; calories: number; protein: number; carbs: number; fat: number; date: string }
type WeightEntry = { id: number; date: string; weight: number }

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function MacroBar({ label, val, target, color }: { label: string; val: number; target: number; color: string }) {
  const pct = Math.min(100, Math.round((val / target) * 100))
  const over = val > target
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: over ? 'var(--red)' : 'var(--text)' }}>
          {Math.round(val)}<span style={{ color: 'var(--text3)', fontWeight: 400 }}>/{target}{label === 'Calories' ? '' : 'g'}</span>
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: over ? 'var(--red)' : color, borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<'today' | 'diary' | 'weight' | 'weekly'>('today')
  const [dark, setDark] = useState(false)
  const [date, setDate] = useState(todayStr())
  const [foods, setFoods] = useState<FoodEntry[]>([])
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [cardio, setCardio] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fname, setFname] = useState('')
  const [fcal, setFcal] = useState('')
  const [fpro, setFpro] = useState('')
  const [fcar, setFcar] = useState('')
  const [ffat, setFfat] = useState('')
  const [wval, setWval] = useState('')

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const loadFoods = useCallback(async () => {
    const r = await fetch(`/api/food?date=${date}`)
    setFoods(await r.json())
  }, [date])

  const loadWeights = useCallback(async () => {
    const r = await fetch('/api/weight')
    setWeights(await r.json())
  }, [])

  const loadCardio = useCallback(async () => {
    const r = await fetch(`/api/cardio?date=${date}`)
    const data = await r.json()
    setCardio(data[0]?.done || false)
  }, [date])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme')
      if (saved === 'dark') { setDark(true); document.documentElement.classList.add('dark') }
    } catch {}
  }, [])

  useEffect(() => { loadFoods(); loadCardio() }, [loadFoods, loadCardio])
  useEffect(() => { loadWeights() }, [loadWeights])

  const addFood = async () => {
    if (!fname || !fcal) return
    setLoading(true)
    await fetch('/api/food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fname, calories: Number(fcal), protein: Number(fpro) || 0, carbs: Number(fcar) || 0, fat: Number(ffat) || 0, date })
    })
    setFname(''); setFcal(''); setFpro(''); setFcar(''); setFfat('')
    await loadFoods()
    setLoading(false)
  }

  const deleteFood = async (id: number) => {
    await fetch(`/api/food?id=${id}`, { method: 'DELETE' })
    await loadFoods()
  }

  const toggleCardio = async () => {
    const next = !cardio
    setCardio(next)
    await fetch('/api/cardio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, done: next })
    })
  }

  const logWeight = async () => {
    if (!wval) return
    await fetch('/api/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: todayStr(), weight: Number(wval) })
    })
    setWval('')
    await loadWeights()
  }

  const totals = foods.reduce((a, f) => ({
    calories: a.calories + f.calories,
    protein: a.protein + f.protein,
    carbs: a.carbs + f.carbs,
    fat: a.fat + f.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const remaining = TARGETS.calories - totals.calories - (cardio ? 200 : 0)
  const latestWeight = weights[weights.length - 1]?.weight
  const totalLost = latestWeight ? Math.max(0, START_WEIGHT - latestWeight) : 0
  const weeksPassed = Math.max(0, Math.floor((new Date().getTime() - new Date(CUT_START).getTime()) / (7 * 86400000)))

  const NAV = [
    { key: 'today', label: 'Today' },
    { key: 'diary', label: 'Diary' },
    { key: 'weight', label: 'Weight' },
    { key: 'weekly', label: 'Weekly' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58, position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--bg)', fontSize: 13, fontWeight: 700 }}>CT</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', color: 'var(--text)' }}>CutTrack</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{formatDate(todayStr())}</span>
          <button onClick={toggleDark} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: 'var(--text)', fontSize: 13 }}>
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, padding: '10px 16px', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {NAV.map(n => (
          <button key={n.key} onClick={() => setTab(n.key as typeof tab)} style={{
            padding: '7px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
            background: tab === n.key ? 'var(--text)' : 'transparent',
            color: tab === n.key ? 'var(--bg)' : 'var(--text2)',
            transition: 'all 0.15s', whiteSpace: 'nowrap'
          }}>{n.label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>

        {tab === 'today' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
              <StatCard label="Remaining" value={`${Math.max(0, remaining)}`} sub="kcal left" color={remaining < 200 ? 'var(--red)' : 'var(--green)'} />
              <StatCard label="Consumed" value={`${Math.round(totals.calories)}`} sub={`of ${TARGETS.calories}`} />
              <StatCard label="Lost" value={`${totalLost.toFixed(1)}kg`} sub={`from ${START_WEIGHT}kg`} color="var(--blue)" />
              <StatCard label="Week" value={`W${weeksPassed + 1}`} sub="of 12" />
            </div>

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>Macros today</div>
              <MacroBar label="Calories" val={totals.calories} target={TARGETS.calories} color="var(--text)" />
              <MacroBar label="Protein" val={totals.protein} target={TARGETS.protein} color="var(--green)" />
              <MacroBar label="Carbs" val={totals.carbs} target={TARGETS.carbs} color="var(--blue)" />
              <MacroBar label="Fat" val={totals.fat} target={TARGETS.fat} color="var(--amber)" />
            </div>

            <div onClick={toggleCardio} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: cardio ? 'var(--green-bg)' : 'var(--bg2)',
              border: `1px solid ${cardio ? 'var(--green)' : 'var(--border)'}`,
              borderRadius: 16, padding: '14px 20px', marginBottom: 14, cursor: 'pointer', transition: 'all 0.2s'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: cardio ? 'var(--green)' : 'var(--text)' }}>
                  {cardio ? '✓ Cardio done' : 'Mark cardio done'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>20 min incline treadmill · ~200 kcal</div>
              </div>
              <div style={{ width: 44, height: 24, borderRadius: 99, background: cardio ? 'var(--green)' : 'var(--bg3)', border: '1px solid var(--border)', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: 18, height: 18, borderRadius: 99, background: 'white', position: 'absolute', top: 2, left: cardio ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>Log food</div>
              <input value={fname} onChange={e => setFname(e.target.value)} placeholder="Food name (e.g. 4 boiled eggs + 2 paratha)" style={{ marginBottom: 8 }} onKeyDown={e => e.key === 'Enter' && addFood()} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                <input type="number" value={fcal} onChange={e => setFcal(e.target.value)} placeholder="kcal" />
                <input type="number" value={fpro} onChange={e => setFpro(e.target.value)} placeholder="P (g)" />
                <input type="number" value={fcar} onChange={e => setFcar(e.target.value)} placeholder="C (g)" />
                <input type="number" value={ffat} onChange={e => setFfat(e.target.value)} placeholder="F (g)" />
              </div>
              <button onClick={addFood} disabled={loading || !fname || !fcal} style={{
                width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                background: 'var(--text)', color: 'var(--bg)', fontWeight: 600, fontSize: 14,
                cursor: loading || !fname || !fcal ? 'not-allowed' : 'pointer',
                opacity: loading || !fname || !fcal ? 0.45 : 1, transition: 'opacity 0.15s'
              }}>{loading ? 'Adding...' : '+ Add food'}</button>
            </div>

            {foods.length > 0 && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Today&apos;s log</span>
                  <span style={{ color: 'var(--text3)', fontWeight: 400 }}>{foods.length} items</span>
                </div>
                {foods.map((f, i) => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 20px', borderBottom: i < foods.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>P {f.protein}g · C {f.carbs}g · F {f.fat}g</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 12 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{f.calories}</span>
                      <button onClick={() => deleteFood(f.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, padding: '0 2px', lineHeight: 1 }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'diary' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Browse date</div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ maxWidth: 200 }} />
            </div>
            {foods.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🍽</div>
                <div style={{ fontSize: 14 }}>No entries for {formatDate(date)}</div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
                  <StatCard label="Calories" value={`${Math.round(totals.calories)}`} />
                  <StatCard label="Protein" value={`${Math.round(totals.protein)}g`} color="var(--green)" />
                  <StatCard label="Carbs" value={`${Math.round(totals.carbs)}g`} color="var(--blue)" />
                  <StatCard label="Fat" value={`${Math.round(totals.fat)}g`} color="var(--amber)" />
                </div>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                  {foods.map((f, i) => (
                    <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: i < foods.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{f.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>P {f.protein}g · C {f.carbs}g · F {f.fat}g</div>
                      </div>
                      <span style={{ fontWeight: 700 }}>{f.calories} kcal</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'weight' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
              <StatCard label="Start" value={`${START_WEIGHT}kg`} />
              <StatCard label="Current" value={latestWeight ? `${latestWeight}kg` : '—'} color="var(--blue)" />
              <StatCard label="Lost" value={`${totalLost.toFixed(1)}kg`} color="var(--green)" />
              <StatCard label="Target" value="6–8kg" sub="total" />
            </div>

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Log today&apos;s weight</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="number" value={wval} onChange={e => setWval(e.target.value)} placeholder="e.g. 92.3" step="0.1" onKeyDown={e => e.key === 'Enter' && logWeight()} />
                <button onClick={logWeight} style={{ padding: '10px 22px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>Log</button>
              </div>
            </div>

            {weights.length > 1 && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Weight trend</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={weights} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                    <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                    <Line type="monotone" dataKey="weight" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {weights.length > 0 && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>History</div>
                {[...weights].reverse().slice(0, 20).map((w, i, arr) => (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: 14, color: 'var(--text2)' }}>{formatDate(w.date)}</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{w.weight}kg</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'weekly' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
              <StatCard label="Week" value={`W${weeksPassed + 1}`} sub="of 12" />
              <StatCard label="Weekly loss" value="0.5–0.7kg" sub="target" />
              <StatCard label="Daily deficit" value="~750" sub="kcal" color="var(--green)" />
              <StatCard label="End weight" value="~86kg" sub="target" color="var(--blue)" />
            </div>

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>10-day check-in rules</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Adjust based on how your body responds</div>
              {[
                { icon: '↓', text: 'Weight dropping + feeling strong → stay at 2,700 kcal', color: 'var(--green)' },
                { icon: '⚠', text: 'Feeling weak / training suffering → bump to 2,850 kcal', color: 'var(--amber)' },
                { icon: '—', text: 'Weight not moving at all → drop to 2,500 kcal', color: 'var(--red)' },
                { icon: '⚖', text: 'Weigh every morning before eating', color: 'var(--text3)' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                  <span style={{ color: r.color, fontSize: 16, minWidth: 20, fontWeight: 700 }}>{r.icon}</span>
                  <span style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.5 }}>{r.text}</span>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Daily targets</div>
              {[
                { label: 'Calories', val: '2,700 kcal', sub: '~2,500 effective after cardio' },
                { label: 'Protein', val: '170g', sub: 'non-negotiable' },
                { label: 'Carbs', val: '280g', sub: 'timed around training' },
                { label: 'Fat', val: '89g', sub: 'from eggs and chicken' },
                { label: 'Cardio', val: '20 min', sub: 'incline treadmill · ~200 kcal' },
              ].map((r, i, arr) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{r.sub}</div>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
