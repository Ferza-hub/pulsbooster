import { NextResponse } from 'next/server'
import { proxyStats } from '@/lib/proxy/manager'
import { isActiveHour } from '@/lib/scheduler'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    activeHour: isActiveHour(),
    time: new Date().toISOString(),
    proxy: proxyStats(),
  })
}
