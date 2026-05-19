import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'

const wsOptions = {
  global: { fetch: fetch as any },
  realtime: { transport: WebSocket as any },
}

// Server-side client (service role)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  wsOptions
)

// Client-side client (anon)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  wsOptions
)
