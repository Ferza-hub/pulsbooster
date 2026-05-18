import type { Proxy } from '../../types/index.js'

// Load proxy pool from env
function loadProxies(): Proxy[] {
  try {
    const raw = process.env.PROXIES_JSON || '[]'
    const parsed = JSON.parse(raw)
    return parsed.map((p: any) => ({
      ...p,
      usedToday: 0,
      lastUsed: 0,
      failed: 0,
    }))
  } catch {
    return []
  }
}

const pool: Proxy[] = loadProxies()

// Platform-specific daily caps
export const SESSION_CAPS: Record<string, number> = {
  web: parseInt(process.env.MAX_SESSIONS_PER_IP_WEB || '300'),
  youtube: 20,
  facebook: 15,
  tiktok: 30,
  instagram: 30,
  twitter: 25,
}

// Minimum spacing between sessions on same IP (ms)
const MIN_SPACING = parseInt(process.env.SESSION_SPACING_MIN_MS || '900000') // 15 min

export function getProxy(geo: string, platform: string): Proxy | null {
  if (pool.length === 0) return null

  const cap = SESSION_CAPS[platform] || 30
  const now = Date.now()

  // Filter: correct geo, under daily cap, spacing respected
  const available = pool.filter(p =>
    p.geo === geo &&
    p.usedToday < cap &&
    p.failed < 3 &&
    now - p.lastUsed > MIN_SPACING
  )

  if (available.length === 0) {
    // Fallback: any geo, under cap
    const fallback = pool.filter(p =>
      p.usedToday < cap &&
      p.failed < 3 &&
      now - p.lastUsed > MIN_SPACING
    )
    if (fallback.length === 0) return null
    return fallback[Math.floor(Math.random() * fallback.length)]
  }

  return available[Math.floor(Math.random() * available.length)]
}

export function markUsed(proxy: Proxy) {
  const p = pool.find(x => x.host === proxy.host)
  if (p) {
    p.usedToday++
    p.lastUsed = Date.now()
  }
}

export function markFailed(proxy: Proxy) {
  const p = pool.find(x => x.host === proxy.host)
  if (p) p.failed++
}

export function resetDailyCaps() {
  pool.forEach(p => {
    p.usedToday = 0
    p.failed = 0
  })
}

export function proxyStats() {
  const byGeo: Record<string, { total: number; available: number }> = {}
  const now = Date.now()

  pool.forEach(p => {
    if (!byGeo[p.geo]) byGeo[p.geo] = { total: 0, available: 0 }
    byGeo[p.geo].total++
    const cap = SESSION_CAPS.web
    if (p.usedToday < cap && p.failed < 3 && now - p.lastUsed > MIN_SPACING) {
      byGeo[p.geo].available++
    }
  })

  return {
    total: pool.length,
    byGeo,
    pool: pool.map(p => ({
      host: p.host,
      geo: p.geo,
      usedToday: p.usedToday,
      failed: p.failed,
      available: p.usedToday < SESSION_CAPS.web && p.failed < 3,
    }))
  }
}
