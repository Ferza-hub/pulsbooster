#!/usr/bin/env node
// Railway worker — processes delivery queue
// Deploy separately on Railway

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { webSession } from '../platforms/web.js'
import { getProxy, markUsed, markFailed, resetDailyCaps } from '../proxy/manager.js'
import { isActiveHour, sessionsThisHour, sessionDelay } from '../scheduler/index.js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const QUEUE_KEY = 'pb:queue:orders'
const PROCESSING_KEY = 'pb:processing'

console.log('🚀 PulseBooster Worker started')
console.log(`📍 Active hours: 08:00 - 23:00`)

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
  while (true) {
    try {
      if (!isActiveHour()) {
        console.log('😴 Outside active hours, waiting...')
        await sleep(30 * 60 * 1000) // wait 30 min
        continue
      }

      // Pop order from queue
      const orderId = await redis.lpop<string>(QUEUE_KEY)

      if (!orderId) {
        await sleep(10000) // no orders, wait 10s
        continue
      }

      // Get order from DB
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (!order || order.status === 'paused') {
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
        if (!isActiveHour()) break

        const proxy = getProxy(order.geo, order.platform)

        let result: any = { success: false }

        // Route to correct platform
        if (order.platform === 'web') {
          result = await webSession({
            url: order.url,
            type: order.action,
            proxy,
            geo: order.geo,
          })
        }
        // Add other platforms here as needed

        if (result.success) {
          delivered++
          if (proxy) markUsed(proxy)
        } else {
          failed++
          if (proxy) markFailed(proxy)
        }

        // Update progress every 10 sessions
        if (i % 10 === 0) {
          await supabase.from('orders').update({
            delivered,
            failed,
            updated_at: new Date().toISOString(),
          }).eq('id', orderId)
        }

        // Natural delay between sessions
        if (i < remaining - 1) {
          const delay = sessionDelay(5000, 25000)
          await sleep(delay)
        }
      }

      // Final update
      const status = failed > 0 && delivered === 0 ? 'failed' : 'completed'
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

      await redis.del(`${PROCESSING_KEY}:${orderId}`)
      console.log(`✅ Order ${orderId} done: ${delivered}/${order.quantity} delivered`)

    } catch (err) {
      console.error('Worker error:', err)
      await sleep(5000)
    }
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

processLoop()
