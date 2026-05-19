import { createClient } from '@supabase/supabase-js'
import { RealtimeClient } from '@supabase/realtime-js'
import WebSocket from 'ws'

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket as any
}

const wsOptions = {
  global: { fetch: fetch as any },
  realtime: {
    transport: WebSocket as any,
    client: (url: string) => new RealtimeClient(url, { transport: WebSocket as any }) as any,
  } as any,
}

// Lazy initialize to avoid build-time errors
let supabaseAdminInstance: any = null
let supabaseInstance: any = null

// Server-side client (service role)
export function getSupabaseAdmin() {
  if (!supabaseAdminInstance) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('Missing Supabase environment variables')
    }
    supabaseAdminInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      wsOptions
    )
  }
  return supabaseAdminInstance
}

// Client-side client (anon)
export function getSupabase() {
  if (!supabaseInstance) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables')
    }
    supabaseInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      wsOptions
    )
  }
  return supabaseInstance
}

// Export for backward compatibility
export const supabaseAdmin = new Proxy({} as any, {
  get(target, prop) {
    return getSupabaseAdmin()[prop]
  }
})

export const supabase = new Proxy({} as any, {
  get(target, prop) {
    return getSupabase()[prop]
  }
})
