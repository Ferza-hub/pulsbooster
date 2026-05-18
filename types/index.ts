export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'twitter' | 'web'
export type ActionType = 
  | 'views' | 'likes' | 'subscribers' | 'followers' | 'saves' 
  | 'shares' | 'story_views' | 'reel_views' | 'impressions'
  | 'bookmarks' | 'page_likes' | 'video_views' | 'watch_time'
  | 'google_traffic' | 'social_traffic' | 'mixed_traffic'

export type OrderStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused'
export type CampaignPhase = 'warmup' | 'monetize_1' | 'monetize_2' | 'monetize_3'

export interface Proxy {
  host: string
  port: number
  user: string
  pass: string
  geo: string
  usedToday: number
  lastUsed: number
  failed: number
}

export interface Campaign {
  id: string
  user_id: string
  name: string
  platform: Platform
  url: string
  phase: CampaignPhase
  daily_target: number
  total_delivered: number
  phase_schedule: PhaseSchedule
  active: boolean
  created_at: string
}

export interface PhaseSchedule {
  warmup_days: number        // days of pure traffic before ads
  monetize_1_day: number     // day to add first ad platform
  monetize_2_day: number     // day to add second
  monetize_3_day: number     // day to add third
}

export interface Order {
  id: string
  campaign_id: string
  user_id: string
  platform: Platform
  url: string
  action: ActionType
  quantity: number
  delivered: number
  failed: number
  geo: string
  status: OrderStatus
  price_paid: number
  is_refill: boolean
  created_at: string
}

export interface DailyRamp {
  day: number
  target: number
}

// Ramp schedule: gradual increase to avoid detection
export const RAMP_SCHEDULE: DailyRamp[] = [
  { day: 1, target: 500 },
  { day: 2, target: 500 },
  { day: 3, target: 500 },
  { day: 4, target: 1000 },
  { day: 5, target: 1000 },
  { day: 6, target: 1000 },
  { day: 7, target: 1000 },
  { day: 8, target: 2000 },
  { day: 9, target: 2000 },
  { day: 10, target: 2000 },
  { day: 14, target: 3000 },
  { day: 21, target: 4000 },
  { day: 30, target: 5000 },
]
