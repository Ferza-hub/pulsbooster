import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const QUEUE_KEY = 'pb:queue:orders'

// GET /api/orders - list orders
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get('campaign_id')
  const status = searchParams.get('status')

  let query = supabaseAdmin.from('orders').select('*')

  if (campaignId) query = query.eq('campaign_id', campaignId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// POST /api/orders - create manual order
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { campaign_id, quantity, geo = 'US' } = body

  if (!campaign_id || !quantity) {
    return NextResponse.json({ error: 'campaign_id and quantity required' }, { status: 400 })
  }

  // Get campaign to copy settings
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', campaign_id)
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const orderId = crypto.randomUUID()

  try {
    // Create order
    await supabaseAdmin.from('orders').insert({
      id: orderId,
      campaign_id,
      platform: campaign.platform,
      url: campaign.url,
      action: campaign.action,
      quantity,
      delivered: 0,
      failed: 0,
      geo,
      status: 'pending',
      created_at: new Date().toISOString(),
    })

    // Queue it
    await redis.rpush(QUEUE_KEY, orderId)
    console.log(`✅ Manual order created and queued: ${orderId}`)

    return NextResponse.json({ id: orderId, status: 'queued' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/orders?id=<orderId> - update order
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('id')
  const action = searchParams.get('action')

  if (!orderId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    if (action === 'pause') {
      // Pause order
      await supabaseAdmin
        .from('orders')
        .update({ status: 'paused' })
        .eq('id', orderId)
      return NextResponse.json({ id: orderId, status: 'paused' })
    }

    if (action === 'resume') {
      // Resume order
      await supabaseAdmin
        .from('orders')
        .update({ status: 'pending' })
        .eq('id', orderId)

      // Re-queue it
      await redis.rpush(QUEUE_KEY, orderId)
      return NextResponse.json({ id: orderId, status: 'queued' })
    }

    if (action === 'retry') {
      // Retry failed order
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

      // Calculate remaining
      const remaining = order.quantity - order.delivered

      if (remaining <= 0) {
        return NextResponse.json({ error: 'Order already completed' }, { status: 400 })
      }

      // Reset and re-queue
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'pending',
          failed: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      await redis.rpush(QUEUE_KEY, orderId)
      return NextResponse.json({ id: orderId, status: 'queued', remaining })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
