import { chromium } from 'playwright'
import type { Proxy } from '@/types'

const DEVICE_POOL = [
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', w: 1366, h: 768, mobile: false, platform: 'Win32' },
  { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', w: 1440, h: 900, mobile: false, platform: 'MacIntel' },
  { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', w: 390, h: 844, mobile: true, platform: 'iPhone' },
  { ua: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36', w: 360, h: 780, mobile: true, platform: 'Android' },
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0', w: 1920, h: 1080, mobile: false, platform: 'Win32' },
]

const REFERRERS: Record<string, string[]> = {
  google_traffic: [
    'https://www.google.com/search?q=personal+finance+tips',
    'https://www.google.com/search?q=best+investment+2025',
    'https://www.google.co.uk/search?q=uk+mortgage+rates',
    'https://www.google.com/search?q=crypto+investment+guide',
  ],
  social_traffic: [
    'https://www.facebook.com/',
    'https://twitter.com/',
    'https://www.reddit.com/r/personalfinance',
    'https://www.linkedin.com/',
  ],
  mixed_traffic: [
    'https://www.google.com/',
    'https://www.bing.com/',
    'https://duckduckgo.com/',
    'https://www.facebook.com/',
  ],
}

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const naturalSleep = async (min: number, max: number) => {
  await sleep(rand(min, max))
}

export async function webSession({
  url,
  type = 'google_traffic',
  proxy,
  geo = 'US',
}: {
  url: string
  type: string
  proxy: Proxy | null
  geo?: string
}) {
  const device = DEVICE_POOL[rand(0, DEVICE_POOL.length - 1)]
  const referrers = REFERRERS[type] || REFERRERS.mixed_traffic
  const referrer = referrers[rand(0, referrers.length - 1)]
  const lang = geo === 'GB' ? 'en-GB,en;q=0.9' : 'en-US,en;q=0.9'

  const launchArgs = [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    `--lang=${geo === 'GB' ? 'en-GB' : 'en-US'}`,
  ]

  let browser: any = null

  try {
    browser = await chromium.launch({
      headless: true,
      args: launchArgs,
      ...(proxy ? {
        proxy: {
          server: `https://${proxy.host}:${proxy.port}`,
          username: proxy.user,
          password: proxy.pass,
        }
      } : {}),
    })

    const context = await browser.newContext({
      userAgent: device.ua,
      viewport: { width: device.w, height: device.h },
      locale: geo === 'GB' ? 'en-GB' : 'en-US',
      timezoneId: geo === 'GB' ? 'Europe/London' : 'America/New_York',
      isMobile: device.mobile,
      hasTouch: device.mobile,
      extraHTTPHeaders: {
        'Accept-Language': lang,
        'Referer': referrer,
      },
    })

    // Stealth
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false })
      (window as any).chrome = { runtime: {} }
      Object.defineProperty(navigator, 'plugins', {
        get: () => [{ name: 'Chrome PDF Plugin' }],
      })
    })

    const page = await context.newPage()

    // Warmup — visit referrer first
    try {
      await page.goto(referrer, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await naturalSleep(1500, 4000)
    } catch { /* warmup fail is ok */ }

    // Navigate to target
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await naturalSleep(2000, 5000)

    // Session duration: 30s - 3min (natural for blog)
    const sessionMs = rand(30000, 180000)
    const startTime = Date.now()
    let elapsed = 0

    while (elapsed < sessionMs) {
      const chunk = Math.min(sessionMs - elapsed, rand(10000, 30000))
      await sleep(chunk)
      elapsed = Date.now() - startTime

      const roll = Math.random()

      if (roll < 0.4) {
        // Scroll down
        await page.mouse.wheel(0, rand(200, 600))
        await naturalSleep(500, 2000)
      } else if (roll < 0.6) {
        // Scroll up slightly
        await page.mouse.wheel(0, -rand(100, 300))
        await naturalSleep(300, 1000)
      } else if (roll < 0.7) {
        // Click internal link (reduces bounce rate)
        const links = await page.$$('a[href^="/"]').catch(() => [])
        if (links.length > 0) {
          const link = links[rand(0, Math.min(4, links.length - 1))]
          await link.click().catch(() => {})
          await naturalSleep(3000, 8000)
          await page.goBack().catch(() => {})
        }
      } else if (roll < 0.75) {
        // Mouse move (human signal)
        await page.mouse.move(
          rand(100, device.w - 100),
          rand(100, device.h - 100),
          { steps: rand(5, 15) }
        )
      }
    }

    return {
      success: true,
      sessionMs,
      referrer,
      device: device.platform,
      geo,
    }

  } catch (err: any) {
    return { success: false, error: err.message }
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}
