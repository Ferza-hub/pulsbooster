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
  const pausedCampaigns = campaigns.filter(c => !c.active).length
  const todayTarget = campaigns.reduce((a, c) => a + (c.today_target || 0), 0)
  const proxyTotal = health?.proxy?.total || 0
  const proxyAvailable = Object.values(health?.proxy?.byGeo || {}).reduce((sum, stats: any) => sum + (stats.available || 0), 0) as number
  const proxyHealth = proxyTotal ? Math.round((proxyAvailable / proxyTotal) * 100) : 0
  const workerStable = health ? health.activeHour && proxyAvailable > 0 : false
  const workerStatusLabel = health ? (workerStable ? 'Stable' : 'Needs attention') : 'Unknown'
  const workerStatusColor = workerStable ? 'text-green' : 'text-amber'
  const lastUpdated = health?.time ? new Date(health.time).toLocaleTimeString() : 'Pending'

  return (
    <div className="relative min-h-screen bg-bg text-white font-sans overflow-hidden">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-amber/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
          <aside className="glass-card flex flex-col gap-6 p-6">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.35em] text-accent mb-4">PULSEBOOSTER</div>
              <div className="text-3xl font-semibold">Control Panel</div>
              <p className="mt-3 text-sm leading-6 text-dim">Kelola kampanye, kesehatan worker, dan delivery semuanya di satu dashboard profesional.</p>
            </div>

            <nav className="grid gap-3">
              {['Overview', 'Campaigns', 'Insights', 'Reports', 'Settings'].map((item, index) => (
                <button key={item} className={`rounded-3xl border px-4 py-3 text-left text-sm font-semibold transition ${index === 0 ? 'border-accent/30 bg-accent/10 text-accent' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'}`}>
                  {item}
                </button>
              ))}
            </nav>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-dim font-mono">Quick status</div>
              <div className="mt-4 space-y-3 text-sm text-white/90">
                <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
                  <span>Worker uptime</span>
                  <span className="text-green">99.2%</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
                  <span>Proxy pool</span>
                  <span>{proxyAvailable}/{proxyTotal}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
                  <span>Current phase</span>
                  <span className="text-accent">Growth</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-dim font-mono">Morning brief</div>
              <ul className="mt-4 space-y-2 text-sm text-dim list-inside list-disc">
                <li>Ramp campaign volume jika delivery stabil.</li>
                <li>Periksa broken URL sebelum scaling.</li>
                <li>Benchmark target harian buat klien.</li>
              </ul>
            </div>
          </aside>

          <main className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="font-mono text-xs uppercase tracking-[0.25em] text-dim">Dashboard</div>
                  <h1 className="mt-2 text-4xl font-semibold tracking-tight">SMM performance hub</h1>
                </div>
                <div className="flex flex-wrap gap-3">
                  <span className="panel-pill text-accent border-accent/20 bg-accent/10">Live</span>
                  <span className="panel-pill text-blue">Secure</span>
                  <span className="panel-pill text-green">Stable</span>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Active campaigns', value: activeCampaigns, tone: 'text-accent' },
                  { label: 'Paused campaigns', value: pausedCampaigns, tone: 'text-muted' },
                  { label: 'Proxy health', value: `${proxyHealth}%`, tone: proxyHealth > 65 ? 'text-green' : 'text-amber' },
                ].map(item => (
                  <div key={item.label} className="glass-card p-5">
                    <div className={`text-3xl font-semibold ${item.tone}`}>{item.value}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.25em] text-dim font-mono">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
              <div className="glass-card p-6">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.25em] text-dim font-mono">System health</div>
                    <div className="mt-3 flex items-center gap-3">
                      <span className={`inline-flex h-3.5 w-3.5 rounded-full ${workerStable ? 'bg-green' : 'bg-amber'}`} />
                      <span className="text-2xl font-semibold">{workerStatusLabel}</span>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-dim font-mono">Active window</div>
                      <div className="mt-2 text-xl font-semibold">{health?.activeHour ? 'Open' : 'Closed'}</div>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-dim font-mono">Proxies ready</div>
                      <div className="mt-2 text-xl font-semibold">{proxyAvailable}/{proxyTotal}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-white/10 bg-black/10 p-4">
                  <div className="text-sm text-dim">Performance note</div>
                  <div className="mt-2 text-sm text-white/80">
                    Stabilitas proxy dan worker mempengaruhi delivery rate. Pastikan target harian disesuaikan dengan kapasitas proxy.
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.25em] text-dim font-mono">Quick metrics</div>
                    <div className="mt-2 text-lg font-semibold">Snapshot</div>
                  </div>
                  <div className="panel-pill">Team mode</div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[{
                    label: 'Traffic goal', value: todayTarget.toLocaleString(),
                  }, {
                    label: 'Delivered', value: totalDelivered.toLocaleString(),
                  }].map(item => (
                    <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-dim font-mono">{item.label}</div>
                      <div className="mt-3 text-2xl font-semibold">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-dim font-mono">Campaign pipeline</div>
                  <div className="mt-2 text-xl font-semibold">Active campaigns overview</div>
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-dim font-mono">{campaigns.length} campaigns</div>
              </div>

              {loading && <div className="mt-6 text-sm text-dim">Loading campaign data...</div>}
              {!loading && campaigns.length === 0 && <div className="mt-6 text-sm text-dim">No campaigns available.</div>}

              <div className="mt-6 space-y-4">
                {campaigns.map(c => {
                  const phase = PHASE_LABELS[c.current_phase] || PHASE_LABELS.warmup
                  return (
                    <div key={c.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold truncate">{c.name}</div>
                            <span className={`rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.2em] ${c.active ? 'bg-green/10 text-green' : 'bg-muted/20 text-muted'}`}>
                              {c.active ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-dim truncate">{c.url}</div>
                        </div>

                        <div className="flex flex-col gap-2 text-right">
                          <div className="text-xs uppercase tracking-[0.2em] text-dim font-mono">Phase</div>
                          <div className="text-sm font-semibold" style={{ color: phase.color }}>{phase.label}</div>
                          <div className="text-xs text-dim">Day {c.current_day}</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-dim mb-2 font-mono">
                          <span>{(c.total_delivered || 0).toLocaleString()} delivered</span>
                          <span>Today: {(c.today_target || 0).toLocaleString()}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(((c.total_delivered || 0) / (c.daily_target * 30)) * 100, 100)}%`, background: phase.color }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-dim font-mono">
                        <span className="rounded-full bg-white/5 px-2 py-1">{c.platform}</span>
                        <span className="rounded-full bg-white/5 px-2 py-1">{c.geo}</span>
                        <span className="rounded-full bg-white/5 px-2 py-1">{c.action}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.25em] text-dim font-mono">New campaign</div>
                    <div className="mt-2 text-lg font-semibold">Ready to launch</div>
                  </div>
                  <div className="panel-pill text-green">Instant setup</div>
                </div>

                <div className="mt-6 space-y-4">
                  <input
                    placeholder="Campaign name"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-accent/40 transition placeholder:text-dim text-white"
                  />
                  <input
                    placeholder="Target URL (https://yourblog.com)"
                    value={form.url}
                    onChange={e => setForm({ ...form, url: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-accent/40 transition placeholder:text-dim text-white"
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={form.action}
                      onChange={e => setForm({ ...form, action: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none text-white"
                    >
                      <option value="google_traffic">Google Traffic</option>
                      <option value="social_traffic">Social Traffic</option>
                      <option value="mixed_traffic">Mixed Traffic</option>
                    </select>
                    <select
                      value={form.geo}
                      onChange={e => setForm({ ...form, geo: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none text-white"
                    >
                      <option value="US">🇺🇸 USA</option>
                      <option value="GB">🇬🇧 UK</option>
                    </select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="font-mono text-xs text-dim mb-1">MAX DAILY TARGET</div>
                      <input
                        type="number"
                        value={form.daily_target}
                        onChange={e => setForm({ ...form, daily_target: parseInt(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none text-white"
                      />
                    </div>
                    <div>
                      <div className="font-mono text-xs text-dim mb-1">WARMUP DAYS</div>
                      <input
                        type="number"
                        value={form.warmup_days}
                        onChange={e => setForm({ ...form, warmup_days: parseInt(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none text-white"
                      />
                    </div>
                  </div>

                  <button
                    onClick={createCampaign}
                    disabled={creating || !form.url}
                    className="w-full rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-black uppercase tracking-[0.18em] disabled:opacity-40 transition hover:opacity-90"
                  >
                    {creating ? 'CREATING...' : 'LAUNCH CAMPAIGN'}
                  </button>

                  <div className="font-mono text-xs text-dim text-center">Warmup {form.warmup_days} days → Add ads day {form.warmup_days + 1}</div>
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.25em] text-dim font-mono">Trend</div>
                    <div className="mt-2 text-lg font-semibold">Traffic growth</div>
                  </div>
                  <div className="rounded-full bg-green/10 px-3 py-1 text-xs text-green uppercase tracking-[0.18em]">Stable</div>
                </div>

                <div className="mt-6 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={RAMP_DATA} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#a3e635" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.15} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#a3a3a3', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a3a3a3', fontSize: 11 }} width={30} />
                      <Tooltip contentStyle={{ background: '#0b0b0d', borderColor: 'rgba(255,255,255,0.08)' }} />
                      <Line type="monotone" dataKey="sessions" stroke="url(#lineGradient)" strokeWidth={4} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
