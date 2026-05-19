import { RAMP_SCHEDULE } from '@/types'

// Active delivery hours: 8am - 11pm
export function isActiveHour(): boolean {
  const hour = new Date().getHours()
  return hour >= 8 && hour <= 23
}

// Hours left in active window today
export function hoursLeftToday(): number {
  const hour = new Date().getHours()
  if (hour < 8) return 15
  if (hour > 23) return 0
  return 23 - hour
}

// Sessions to run this hour (48h window = 30 active hours)
export function sessionsThisHour(
  totalQty: number,
  delivered: number,
  hoursElapsed: number
): number {
  if (delivered >= totalQty) return 0
  const WINDOW = 30 // 48h = 30 active hours
  if (hoursElapsed >= WINDOW) return totalQty - delivered

  const remaining = totalQty - delivered
  const hoursLeft = WINDOW - hoursElapsed
  const perHour = remaining / hoursLeft

  // Natural variance ±20%
  return Math.max(1, Math.round(perHour * (0.8 + Math.random() * 0.4)))
}

// Daily target based on campaign age (gradual ramp)
export function dailyTargetForDay(campaignDay: number, maxTarget: number): number {
  const schedule = [...RAMP_SCHEDULE].reverse()
  const entry = schedule.find(s => campaignDay >= s.day)
  if (!entry) return RAMP_SCHEDULE[0].target

  // Scale to max target
  const ratio = entry.target / 5000
  return Math.round(maxTarget * ratio)
}

// Hourly weights — peak Indonesia prime time
const HOURLY_WEIGHTS: Record<number, number> = {
  8: 0.04, 9: 0.06, 10: 0.09, 11: 0.09,
  12: 0.08, 13: 0.07, 14: 0.05, 15: 0.05,
  16: 0.05, 17: 0.06, 18: 0.07, 19: 0.09,
  20: 0.09, 21: 0.07, 22: 0.05, 23: 0.04,
}

export function weightForCurrentHour(): number {
  return HOURLY_WEIGHTS[new Date().getHours()] || 0.06
}

// Natural delay between sessions (ms)
export function sessionDelay(min = 3000, max = 20000): number {
  const base = min + Math.random() * (max - min)
  const noise = (Math.random() - 0.5) * 3000
  return Math.max(min, Math.min(max, base + noise))
}

// Estimate completion for new order
export function estimateCompletion(): string {
  const hour = new Date().getHours()
  if (hour >= 8 && hour <= 20) return '24-36 jam'
  return '36-48 jam'
}

// Get campaign day number
export function campaignDay(startDate: string): number {
  const start = new Date(startDate)
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
}

// Get current campaign phase based on schedule
export function getCurrentPhase(
  startDate: string,
  warmupDays: number,
  m1Day: number,
  m2Day: number,
  m3Day: number
): string {
  const day = campaignDay(startDate)
  if (day < warmupDays) return 'warmup'
  if (day < m1Day) return 'warmup'
  if (day < m2Day) return 'monetize_1'
  if (day < m3Day) return 'monetize_2'
  return 'monetize_3'
}
