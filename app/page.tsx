import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-bg text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="font-mono text-sm text-accent tracking-widest mb-4">PULSEBOOSTER</div>
        <h1 className="font-serif text-4xl mb-4">
          Growth engine.<br />
          <span className="italic text-accent">Self-sustaining.</span>
        </h1>
        <p className="text-muted text-sm mb-8">
          Manage campaigns, monitor delivery, track revenue.
        </p>
        <Link href="/dashboard" className="inline-block bg-accent text-black font-mono font-bold text-sm px-8 py-4 rounded-xl tracking-widest hover:opacity-90 transition">
          OPEN DASHBOARD →
        </Link>
      </div>
    </main>
  )
}
