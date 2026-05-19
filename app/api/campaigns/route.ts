import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { Redis } from '@upstash/redis'
import { campaignDay, dailyTargetForDay } from '@/lib/scheduler'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const QUEUE_KEY = 'pb:queue:orders'

// GET /api/campaigns - list all campaigns
export async function GET(req: NextRequest) {
  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with current phase and daily target
  const enriched = data.map(c => {
    const day = campaignDay(c.created_at)
    const phase = c.phase_schedule
    const target = dailyTargetForDay(day, c.daily_target)

    return {
      ...c,
      current_day: day,
      today_target: target,
      current_phase: getCurrentPhase(
        day,
        phase?.warmup_days || 7,
        phase?.monetize_1_day || 8,
        phase?.monetize_2_day || 15,
        phase?.monetize_3_day || 22,
      ),
    }
  })

  return NextResponse.json(enriched)
}

// POST /api/campaigns - create campaign
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    name,
    platform = 'web',
    url,
    action = 'google_traffic',
    daily_target = 5000,
    geo = 'US',
    warmup_days = 7,
  } = body

  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const campaignId = crypto.randomUUID()

  const { error } = await supabaseAdmin.from('campaigns').insert({
    id: campaignId,
    name: name || `Campaign ${new Date().toLocaleDateString()}`,
    platform,
    url,
    action,
    daily_target,
    geo,
    total_delivered: 0,
    active: true,
    phase: 'warmup',
    phase_schedule: {
      warmup_days,
      monetize_1_day: warmup_days + 1,
      monetize_2_day: warmup_days + 8,
      monetize_3_day: warmup_days + 15,
    },
    created_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create first order and queue it
  await queueDailyOrder(campaignId, platform, url, action, geo, warmup_days)

  return NextResponse.json({ id: campaignId, status: 'created' })
}

async function queueDailyOrder(
  campaignId: string,
  platform: string,
  url: string,
  action: string,
  geo: string,
  warmupDays: number
) {
  const day = 1
  const target = dailyTargetForDay(day, 5000)
  const orderId = crypto.randomUUID()

  await supabaseAdmin.from('orders').insert({
    id: orderId,
    campaign_id: campaignId,
    platform,
    url,
    action,
    quantity: target,
    delivered: 0,
    failed: 0,
    geo,
    status: 'pending',
    created_at: new Date().toISOString(),
  })

  // Push to Upstash Redis queue
  await redis.rpush(QUEUE_KEY, orderId)
}

function getCurrentPhase(
  day: number,
  warmupDays: number,
  m1: number,
  m2: number,
  m3: number
): string {
  if (day <= warmupDays) return 'warmup'
  if (day <= m1) return 'warmup'
  if (day <= m2) return 'monetize_1'
  if (day <= m3) return 'monetize_2'
  return 'monetize_3'
}
