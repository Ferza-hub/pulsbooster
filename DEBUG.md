# PulseBooster Debugging Guide

## Quick Health Check

```bash
# Check overall system health
curl https://your-domain.com/api/health

# Should show:
# - worker.activeHour: true/false (must be 8-23 for delivery)
# - queue.total: number of pending orders
# - connections.redis: ok: true/false
# - connections.supabase: ok: true/false
# - debug.recommendations: list of issues
```

## Common Issues & Fixes

### ❌ Queue tidak berkurang (orders stuck)

**Cek:**
1. Apakah worker berjalan?
   ```bash
   # Check worker logs di Railway dashboard
   # Harus ada "🚀 PulseBooster Worker started"
   ```

2. Apakah dalam active hours (8-23)?
   ```bash
   curl https://your-domain.com/api/health | grep "activeHour"
   # Jika false, queue ditahan sampai jam 8 besok
   ```

3. Apakah Redis connected?
   ```bash
   curl https://your-domain.com/api/health | grep "redis"
   # "ok": true harus ada
   ```

4. Apakah ada proxies?
   ```bash
   curl https://your-domain.com/api/health | grep "proxy"
   # "total" harus > 0
   ```

### ❌ Campaign status tidak update (on/off toggle tidak bekerja)

**Sebelum fix:**
```bash
# Update campaign status
curl -X PATCH https://your-domain.com/api/campaigns?id=CAMPAIGN_ID \
  -H "Content-Type: application/json" \
  -d '{"active": false}'

# Verify
curl https://your-domain.com/api/campaigns | grep CAMPAIGN_ID
```

### ❌ Delivered count tidak bertambah

**Cek:**
1. Lihat order status
   ```bash
   curl https://your-domain.com/api/orders?status=running
   # Harus ada order dengan status "running"
   ```

2. Jika stuck di "running", retry:
   ```bash
   curl -X PATCH https://your-domain.com/api/orders?id=ORDER_ID&action=retry
   ```

3. Lihat worker logs untuk error details

## Manual Testing

### 1. Create Campaign
```bash
curl -X POST https://your-domain.com/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "name": "Test Campaign",
    "daily_target": 100,
    "geo": "US"
  }'
```

### 2. Create Additional Order
```bash
curl -X POST https://your-domain.com/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "CAMPAIGN_ID",
    "quantity": 50,
    "geo": "US"
  }'
```

### 3. Pause Campaign
```bash
curl -X PATCH https://your-domain.com/api/campaigns?id=CAMPAIGN_ID \
  -H "Content-Type: application/json" \
  -d '{"active": false}'
```

### 4. Resume Campaign
```bash
curl -X PATCH https://your-domain.com/api/campaigns?id=CAMPAIGN_ID \
  -H "Content-Type: application/json" \
  -d '{"active": true}'
```

### 5. Pause Order
```bash
curl -X PATCH https://your-domain.com/api/orders?id=ORDER_ID&action=pause
```

### 6. Resume Order
```bash
curl -X PATCH https://your-domain.com/api/orders?id=ORDER_ID&action=resume
```

### 7. Retry Failed Order
```bash
curl -X PATCH https://your-domain.com/api/orders?id=ORDER_ID&action=retry
```

## Worker Logs to Check

The worker should output these logs:
- `✅ Redis connected` - Redis connection OK
- `✅ Supabase connected` - Database connection OK
- `📥 Got order from queue: <orderId>` - Order picked from queue
- `📦 Processing order <orderId>` - Starting delivery
- `📈 Progress: X/Y` - Active delivery progress
- `✅ Order <orderId> done: X/Y delivered` - Order completed

## Environment Variables to Verify

```bash
# Required for worker:
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...

# Optional but recommended:
PROXIES_JSON='[{"host":"...", "port":...}, ...]'
MAX_SESSIONS_PER_IP_WEB=300
SESSION_SPACING_MIN_MS=900000
```

## Real-time Monitoring

Add this to your monitoring dashboard:
```
GET /api/health every 30s

Check for:
- queue.total increasing/decreasing
- debug.recommendations has items
- connections.redis.ok == true
- connections.supabase.ok == true
```

## If Still Stuck

1. **Check Railway logs** for worker errors
2. **Verify env vars** are set correctly in Railway + Vercel
3. **Check Redis quota** - Upstash has usage limits
4. **Check Supabase quota** - may hit rate limits
5. **Check proxy pool** - if PROXIES_JSON is empty/invalid
6. **Check active hours** - worker only runs 8-23
