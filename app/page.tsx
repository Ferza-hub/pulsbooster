import Link from 'next/link'

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-bg text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue/10 blur-3xl" />
        <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-amber/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.9fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="font-mono text-xs uppercase tracking-[0.4em] text-accent/80 mb-4">PULSEBOOSTER</div>
            <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-tight">
              The professional dashboard for smart traffic growth.
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-dim">
              Launch campaigns, monitor delivery health, and scale performance from a single polished control panel designed for growth teams and agencies.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/dashboard" className="inline-flex items-center justify-center rounded-3xl bg-accent px-8 py-4 text-sm font-bold uppercase tracking-[0.18em] text-black shadow-[0_20px_60px_-30px_rgba(163,230,53,0.8)] transition hover:opacity-90">
                Open dashboard
              </Link>
              <span className="panel-pill">Enterprise-ready SMM control</span>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-dim font-mono">Realtime overview</div>
                <div className="mt-3 text-2xl font-semibold">42 active campaigns</div>
              </div>
              <div className="panel-pill text-accent border-accent/20 bg-accent/10">Live</div>
            </div>

            <div className="mt-6 grid gap-3">
              {[
                { label: 'Proxy health', value: '98%' },
                { label: 'Delivery rate', value: '93%' },
                { label: 'Daily reach', value: '178K' },
              ].map(item => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
                  <div className="text-sm text-dim font-mono uppercase tracking-[0.2em]">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-black/10 p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-dim font-mono">
                <span>Campaign pipeline</span>
                <span>Live</span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-accent" style={{ width: '78%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
