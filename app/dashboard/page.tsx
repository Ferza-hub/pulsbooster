'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  warmup: { label: 'Pure Traffic', color: '#38bdf8' },
  monetize_1: { label: 'Ads Platform 1', color: '#a3e635' },
  monetize_2: { label: '+ Platform 2', color: '#fbbf24' },
  monetize_3: { label: 'Full Speed', color: '#a78bfa' },
}

const RAMP_DATA = [
  { day: 1, sessions: 500 },
  { day: 3, sessions: 500 },
  { day: 4, sessions: 1000 },
  { day: 7, sessions: 1000 },
  { day: 8, sessions: 2000 },
  { day: 14, sessions: 3000 },
  { day: 21, sessions: 4000 },
  { day: 30, sessions: 5000 },
]

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    url: '',
    action: 'google_traffic',
    daily_target: 5000,
    geo: 'US',
    warmup_days: 7,
  })

  useEffect(() => {
    fetchData()
    const iv = setInterval(fetchData, 30000)
    return () => clearInterval(iv)
  }, [])

  async function fetchData() {
    const [c, h] = await Promise.all([
      fetch('/api/campaigns').then(r => r.json()),
      fetch('/api/health').then(r => r.json()),
    ])
    setCampaigns(Array.isArray(c) ? c : [])
    setHealth(h)
    setLoading(false)
  }

  async function createCampaign() {
    setCreating(true)
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    await fetchData()
    setCreating(false)
  }

  const totalDelivered = campaigns.reduce((a, c) => a + (c.total_delivered || 0), 0)
  const activeCampaigns = campaigns.filter(c => c.active).length

  return (
    <div className="min-h-screen bg-bg text-white font-sans">
      {/* Google Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap')`}</style>

      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div>
          <div className="font-mono text-xs text-accent tracking-widest">PULSEBOOSTER</div>
          <div className="font-mono text-xs text-dim mt-1">
            {health?.activeHour ? '● ACTIVE' : '○ INACTIVE'} ·{' '}
            {health?.proxy?.total || 0} IP ·{' '}
            {new Date().toLocaleTimeString()}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs text-muted">TOTAL DELIVERED</div>
          <div className="font-mono text-xl text-accent">{totalDelivered.toLocaleString()}</div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-2xl mx-auto">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Active', val: activeCampaigns, color: 'text-accent' },
            { label: 'IPs', val: health?.proxy?.total || 0, color: 'text-blue' },
            { label: 'Sessions Today', val: campaigns.reduce((a, c) => a + (c.today_target || 0), 0).toLocaleString(), color: 'text-purple' },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-white/5 rounded-xl p-4 text-center">
              <div className={`font-mono text-xl font-bold ${s.color}`}>{s.val}</div>
              <div className="font-mono text-xs text-dim mt-1 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Ramp chart */}
        <div className="bg-surface border border-white/5 rounded-xl p-4 mb-6">
          <div className="font-mono text-xs text-dim tracking-widest mb-4">DELIVERY RAMP SCHEDULE</div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={RAMP_DATA}>
              <XAxis dataKey="day" tick={{ fill: '#3f3f46', fontSize: 10 }} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#111113', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, fontSize: 11 }}
                formatter={(v: any) => [`${v.toLocaleString()} sessions`, 'Target']}
              />
              <Line type="monotone" dataKey="sessions" stroke="#a3e635" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs font-mono text-dim">
            <span className="text-blue">Day 1-7: Warmup (no ads)</span>
            <span className="text-accent">Day 8+: Add ads platforms</span>
          </div>
        </div>

        {/* Campaigns */}
        <div className="mb-6">
          <div className="font-mono text-xs text-dim tracking-widest mb-3">CAMPAIGNS</div>
          {loading && <div className="text-muted text-sm">Loading...</div>}
          {!loading && campaigns.length === 0 && (
            <div className="text-center py-8 text-dim text-sm">No campaigns yet</div>
          )}
          <div className="flex flex-col gap-3">
            {campaigns.map(c => {
              const phase = PHASE_LABELS[c.current_phase] || PHASE_LABELS.warmup
              return (
                <div key={c.id} className="bg-surface border border-white/5 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-sm font-medium">{c.name}</div>
                      <div className="text-xs text-muted mt-1 truncate max-w-[200px]">{c.url}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs" style={{ color: phase.color }}>
                        DAY {c.current_day}
                      </div>
                      <div className="font-mono text-xs text-dim mt-1">{phase.label}</div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-dim mb-1 font-mono">
                      <span>{(c.total_delivered || 0).toLocaleString()} delivered</span>
                      <span>Today: {(c.today_target || 0).toLocaleString()}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(((c.total_delivered || 0) / (c.daily_target * 30)) * 100, 100)}%`,
                          background: phase.color,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <span className="font-mono text-xs px-2 py-1 rounded bg-white/4 text-muted">{c.platform}</span>
                    <span className="font-mono text-xs px-2 py-1 rounded bg-white/4 text-muted">{c.geo}</span>
                    <span className="font-mono text-xs px-2 py-1 rounded bg-white/4 text-muted">{c.action}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* New Campaign Form */}
        <div className="bg-surface border border-white/5 rounded-xl p-4">
          <div className="font-mono text-xs text-dim tracking-widest mb-4">NEW CAMPAIGN</div>

          <div className="flex flex-col gap-3">
            <input
              placeholder="Campaign name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/40 transition placeholder:text-dim text-white"
            />
            <input
              placeholder="Target URL (https://yourblog.com)"
              value={form.url}
              onChange={e => setForm({ ...form, url: e.target.value })}
              className="bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/40 transition placeholder:text-dim text-white"
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.action}
                onChange={e => setForm({ ...form, action: e.target.value })}
                className="bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-sm outline-none text-white"
              >
                <option value="google_traffic">Google Traffic</option>
                <option value="social_traffic">Social Traffic</option>
                <option value="mixed_traffic">Mixed Traffic</option>
              </select>

              <select
                value={form.geo}
                onChange={e => setForm({ ...form, geo: e.target.value })}
                className="bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-sm outline-none text-white"
              >
                <option value="US">🇺🇸 USA</option>
                <option value="GB">🇬🇧 UK</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-mono text-xs text-dim mb-1">MAX DAILY TARGET</div>
                <input
                  type="number"
                  value={form.daily_target}
                  onChange={e => setForm({ ...form, daily_target: parseInt(e.target.value) })}
                  className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-sm outline-none text-white"
                />
              </div>
              <div>
                <div className="font-mono text-xs text-dim mb-1">WARMUP DAYS</div>
                <input
                  type="number"
                  value={form.warmup_days}
                  onChange={e => setForm({ ...form, warmup_days: parseInt(e.target.value) })}
                  className="w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-sm outline-none text-white"
                />
              </div>
            </div>

            <button
              onClick={createCampaign}
              disabled={creating || !form.url}
              className="w-full py-3 bg-accent text-black font-mono font-bold text-sm rounded-xl tracking-widest disabled:opacity-40 transition hover:opacity-90"
            >
              {creating ? 'CREATING...' : 'LAUNCH CAMPAIGN →'}
            </button>

            <div className="font-mono text-xs text-dim text-center">
              Warmup {form.warmup_days} days → Add ads day {form.warmup_days + 1}
            </div>
          </div>
        </div>

        {/* Proxy status */}
        {health?.proxy?.byGeo && (
          <div className="mt-4 bg-surface border border-white/5 rounded-xl p-4">
            <div className="font-mono text-xs text-dim tracking-widest mb-3">PROXY STATUS</div>
            <div className="flex flex-col gap-2">
              {Object.entries(health.proxy.byGeo).map(([geo, stats]: any) => (
                <div key={geo} className="flex justify-between items-center">
                  <span className="font-mono text-xs text-muted">🌍 {geo}</span>
                  <span className="font-mono text-xs text-accent">{stats.available}/{stats.total} available</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
