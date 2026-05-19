#!/usr/bin/env node
// Railway worker — processes delivery queue
// Deploy separately on Railway

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { RealtimeClient } from '@supabase/realtime-js'
import WebSocket from 'ws'
import { Redis } from '@upstash/redis'
import { webSession } from '../platforms/web.js'
import { getProxy, markUsed, markFailed, resetDailyCaps } from '../proxy/manager.js'
import { isActiveHour, sessionsThisHour, sessionDelay } from '../scheduler/index.js'

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket as any
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.API_URL ?? process.env.APP_URL
if (!appUrl) {
  console.warn('⚠️  Public app URL not set. Set NEXT_PUBLIC_APP_URL, API_URL, or APP_URL in the worker environment.')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    global: { fetch: fetch as any },
    realtime: {
      transport: WebSocket as any,
      client: (url: string) => new RealtimeClient(url, { transport: WebSocket as any }) as any,
    } as any,
  }
)

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const QUEUE_KEY = 'pb:queue:orders'
const PROCESSING_KEY = 'pb:processing'
const HEALTH_KEY = 'pb:worker:health'

console.log('🚀 PulseBooster Worker started')
console.log(`📍 Active hours: 08:00 - 23:00`)

// Startup checks
async function healthCheck() {
  try {
    // Test Redis
    await redis.set('pb:ping', Date.now(), { ex: 10 })
    const pingVal = await redis.get('pb:ping')
    if (!pingVal) throw new Error('Redis set/get failed')
    console.log('✅ Redis connected')

    // Test Supabase
    const { error } = await supabase.from('campaigns').select('id').limit(1)
    if (error) throw error
    console.log('✅ Supabase connected')

    // Update worker status
    await redis.set(HEALTH_KEY, JSON.stringify({
      started: new Date().toISOString(),
      status: 'healthy',
      ordersProcessed: 0,
    }), { ex: 600 })

    return true
  } catch (err) {
    console.error('❌ Health check failed:', err)
    return false
  }
}

// Run health check before starting
await healthCheck()

// Reset daily caps at midnight
setInterval(() => {
  const hour = new Date().getHours()
  const min = new Date().getMinutes()
  if (hour === 0 && min === 0) {
    resetDailyCaps()
    console.log('🔄 Daily caps reset')
  }
}, 60000)

// Main loop
async function processLoop() {
  let consecutiveErrors = 0
  
  while (true) {
    try {
      if (!isActiveHour()) {
        console.log('😴 Outside active hours (8-23), waiting...')
        await sleep(30 * 60 * 1000) // wait 30 min
        continue
      }

      // Pop order from queue
      const orderId = await redis.lpop<string>(QUEUE_KEY)

      if (!orderId) {
        await sleep(10000) // no orders, wait 10s
        continue
      }

      console.log(`📥 Got order from queue: ${orderId}`)

      // Get order from DB
      let order: any
      try {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()
        
        if (!data) {
          console.error(`❌ Order not found: ${orderId}`)
          continue
        }
        
        order = data
      } catch (err) {
        console.error(`❌ DB error fetching order ${orderId}:`, err)
        // Re-queue the order
        await redis.rpush(QUEUE_KEY, orderId)
        continue
      }

      if (order.status === 'paused') {
        console.log(`⏸️  Order paused, skipping: ${orderId}`)
        continue
      }

      // Mark processing
      await redis.set(`${PROCESSING_KEY}:${orderId}`, true, { ex: 3600 })
      await supabase.from('orders').update({ status: 'running' }).eq('id', orderId)

      console.log(`📦 Processing order ${orderId}: ${order.platform} ${order.action} qty=${order.quantity}`)

      // Deliver sessions
      let delivered = order.delivered || 0
      let failed = 0
      const remaining = order.quantity - delivered

      for (let i = 0; i < remaining; i++) {
        if (!isActiveHour()) {
          console.log(`⏸️  Active hours ended, pausing order ${orderId} at ${delivered}/${order.quantity}`)
          break
        }

        let proxy: any
        try {
          proxy = getProxy(order.geo, order.platform)
        } catch (err) {
          console.error(`⚠️  Proxy manager error:`, err)
          failed++
          continue
        }

        let result: any = { success: false }

        try {
          // Route to correct platform
          if (order.platform === 'web') {
            result = await webSession({
              url: order.url,
              type: order.action,
              proxy,
              geo: order.geo,
            })
          }

          if (result.success) {
            delivered++
            if (proxy) markUsed(proxy)
            if (i % 50 === 0) console.log(`📈 Progress: ${delivered}/${order.quantity}`)
          } else {
            failed++
            if (proxy) markFailed(proxy)
          }
        } catch (err) {
          console.error(`❌ Session error (${i}/${remaining}):`, err)
          failed++
          if (proxy) markFailed(proxy)
        }

        // Update progress every 10 sessions
        if (i % 10 === 0) {
          try {
            await supabase.from('orders').update({
              delivered,
              failed,
              updated_at: new Date().toISOString(),
            }).eq('id', orderId)
          } catch (err) {
            console.error(`⚠️  DB update error:`, err)
          }
        }

        // Natural delay between sessions
        if (i < remaining - 1) {
          const delay = sessionDelay(5000, 25000)
          await sleep(delay)
        }
      }

      // Final update
      const status = failed > 0 && delivered === 0 ? 'failed' : 'completed'
      try {
        await supabase.from('orders').update({
          delivered,
          failed,
          status,
          updated_at: new Date().toISOString(),
        }).eq('id', orderId)

        // Update campaign delivered count
        if (order.campaign_id) {
          await supabase.rpc('increment_campaign_delivered', {
            campaign_id: order.campaign_id,
            amount: delivered,
          })
        }
      } catch (err) {
        console.error(`❌ Final DB update failed for ${orderId}:`, err)
      }

      await redis.del(`${PROCESSING_KEY}:${orderId}`)
      console.log(`✅ Order ${orderId} done: ${delivered}/${order.quantity} delivered, ${failed} failed`)
      
      // Reset error counter on success
      consecutiveErrors = 0

    } catch (err) {
      consecutiveErrors++
      console.error(`Worker error [${consecutiveErrors}/5]:`, err)
      
      if (consecutiveErrors >= 5) {
        console.error('🔴 Too many consecutive errors, worker stopping')
        process.exit(1)
      }
      
      await sleep(5000)
    }
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

processLoop()
