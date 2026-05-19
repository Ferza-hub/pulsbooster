import { NextResponse, NextRequest } from 'next/server'
import { proxyStats } from '@/lib/proxy/manager'
import { isActiveHour } from '@/lib/scheduler'
import { supabaseAdmin } from '@/lib/supabase/client'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET(req: NextRequest) {
  const QUEUE_KEY = 'pb:queue:orders'
  const HEALTH_KEY = 'pb:worker:health'

  let queueSize = 0
  let workerHealth: any = null
  let dbHealth = { ok: false, error: '' }
  let redisHealth = { ok: false, error: '' }

  try {
    // Check Redis
    await redis.set('pb:ping', Date.now(), { ex: 10 })
    const testVal = await redis.get('pb:ping')
    redisHealth.ok = !!testVal

    // Get queue size
    queueSize = await redis.llen(QUEUE_KEY)

    // Get worker health
    const workerHealthStr = await redis.get(HEALTH_KEY)
    workerHealth = workerHealthStr ? JSON.parse(workerHealthStr as string) : null
  } catch (err: any) {
    redisHealth.error = err.message
  }

  try {
    // Check DB connection
    const { error } = await supabaseAdmin.from('campaigns').select('id').limit(1)
    if (error) throw error
    dbHealth.ok = true
  } catch (err: any) {
    dbHealth.error = err.message
  }

  // Count pending orders
  let pendingOrders = 0
  let runningOrders = 0
  try {
    const { data: pending } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact' })
      .eq('status', 'pending')

    const { data: running } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact' })
      .eq('status', 'running')

    pendingOrders = pending?.length || 0
    runningOrders = running?.length || 0
  } catch (err) {
    // ignore
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    
    // Worker status
    worker: {
      activeHour: isActiveHour(),
      time: new Date().toLocaleTimeString(),
      health: workerHealth || { status: 'unknown' },
    },

    // Queue status
    queue: {
      total: queueSize,
      pending: pendingOrders,
      running: runningOrders,
    },

    // Connections
    connections: {
      redis: redisHealth,
      supabase: dbHealth,
    },

    // Proxy status
    proxy: proxyStats(),

    // Debug info (shows common issues)
    debug: {
      outsideActiveHours: !isActiveHour(),
      queueStuck: queueSize > 100,
      noAvailableProxy: proxyStats().total === 0,
      dbConnected: dbHealth.ok,
      redisConnected: redisHealth.ok,
      recommendations: [
        !isActiveHour() && '⚠️ Outside active hours (8-23)',
        queueSize > 100 && '⚠️ Queue backed up, check worker',
        proxyStats().total === 0 && '⚠️ No proxies configured',
        !dbHealth.ok && '❌ Database connection failed',
        !redisHealth.ok && '❌ Redis connection failed',
      ].filter(Boolean),
    }
  })
}
