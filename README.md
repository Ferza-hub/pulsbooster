# PulseBooster v2

Next.js full stack. Vercel + Railway + Supabase + Upstash.

## Stack
- **Frontend + API**: Next.js 14 → Vercel
- **Browser Worker**: Playwright → Railway
- **Database**: Supabase
- **Queue**: Upstash Redis
- **Proxy**: proxy-seller.com ISP

## Structure
```
app/
  page.tsx              ← Landing
  dashboard/page.tsx    ← Main dashboard
  api/
    health/route.ts     ← Health check
    campaigns/route.ts  ← Campaign CRUD

lib/
  platforms/web.ts      ← Web traffic engine
  proxy/manager.ts      ← ISP proxy pool
  scheduler/index.ts    ← 48h delivery + ramp
  worker/index.ts       ← Railway worker
  supabase/client.ts    ← DB client

types/index.ts          ← Shared types + ramp schedule
```

## Deploy

### Vercel (Frontend + API)
```bash
vercel --prod
```

### Railway (Worker)
```bash
# Connect repo, set env vars, deploy
# Start command: node lib/worker/index.mjs
```

### Environment Variables
Copy `.env.example` → `.env.local` for local dev.
Set all vars in Vercel + Railway dashboards.

## Delivery Strategy
- **48h window** — all orders complete within 48 hours
- **Gradual ramp** — Day 1: 500 → Day 30: 5,000 sessions
- **Warmup phase** — Pure traffic, no ads (7 days default)
- **Phase rollout** — Add ad platforms one by one after warmup

## Ramp Schedule
| Day | Sessions/day |
|-----|-------------|
| 1-3 | 500 |
| 4-7 | 1,000 |
| 8-14 | 2,000 |
| 15-21 | 3,500 (add ads platform 2) |
| 22-30 | 5,000 (add ads platform 3) |

## Proxy Config
```json
PROXIES_JSON=[
  {"host":"proxy1.example.com","port":8080,"user":"u","pass":"p","geo":"US"},
  {"host":"proxy2.example.com","port":8080,"user":"u","pass":"p","geo":"GB"}
]
```
