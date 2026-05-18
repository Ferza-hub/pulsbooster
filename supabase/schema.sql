-- PulseBooster schema
-- Run this in Supabase SQL Editor

create table if not exists campaigns (
  id           uuid primary key default gen_random_uuid(),
  user_id      text,
  name         text not null,
  platform     text not null default 'web',
  url          text not null,
  action       text not null default 'google_traffic',
  geo          text not null default 'US',
  phase        text not null default 'warmup',
  daily_target integer not null default 5000,
  total_delivered integer not null default 0,
  phase_schedule jsonb,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists orders (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid references campaigns(id) on delete cascade,
  user_id      text,
  platform     text not null,
  url          text not null,
  action       text not null,
  quantity     integer not null,
  delivered    integer not null default 0,
  failed       integer not null default 0,
  geo          text not null default 'US',
  status       text not null default 'pending',
  price_paid   numeric default 0,
  is_refill    boolean default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Function called by worker to increment campaign delivered count
create or replace function increment_campaign_delivered(campaign_id uuid, amount integer)
returns void language sql as $$
  update campaigns
  set total_delivered = total_delivered + amount
  where id = campaign_id;
$$;

-- Index for fast queue polling
create index if not exists orders_status_idx on orders(status);
create index if not exists orders_campaign_id_idx on orders(campaign_id);
