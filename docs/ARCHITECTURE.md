# Live Sauna Tallinn — Архитектура MVP

Рабочее название: **SaunaLive** (или **Külmvesi** / **Leil** — бренд обсуждается отдельно, для кода используется рабочий слаг `sauna-live`)

Стек: Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres, Auth, Storage, Realtime) + Leaflet/OSM + Gemini API + Vercel.

Этот документ — источник истины для реализации. Решения по открытым вопросам зафиксированы в разделе 9.

---

## 1. Структура проекта

```
. (repo root)
├── app/
│   ├── (map)/
│   │   └── page.tsx                 # главный экран — карта
│   ├── location/[id]/
│   │   └── page.tsx                 # карточка места (deep link для QR)
│   ├── explore/
│   │   └── page.tsx                 # список мест, фильтры
│   ├── bookings/
│   │   ├── page.tsx                 # мои бронирования
│   │   └── [locationId]/page.tsx    # форма бронирования
│   ├── activity/
│   │   └── page.tsx                 # community feed
│   ├── profile/
│   │   ├── page.tsx
│   │   └── [username]/page.tsx
│   ├── admin/
│   │   ├── page.tsx
│   │   ├── locations/page.tsx
│   │   ├── reports/page.tsx
│   │   └── users/page.tsx
│   ├── api/
│   │   ├── occupancy/route.ts
│   │   ├── water/route.ts
│   │   ├── ice/route.ts
│   │   ├── visits/route.ts
│   │   ├── bookings/route.ts
│   │   ├── weather/route.ts         # прокси к погодному API + кэш
│   │   └── assistant/route.ts       # Gemini function-calling эндпоинт
│   └── layout.tsx
├── components/
│   ├── map/
│   │   ├── MapView.tsx
│   │   ├── LocationMarker.tsx
│   │   └── ClusterLayer.tsx
│   ├── location/
│   │   ├── LocationCard.tsx         # bottom sheet / modal
│   │   ├── OccupancyBadge.tsx
│   │   ├── WeatherStrip.tsx
│   │   ├── WaterTempStat.tsx
│   │   ├── IceStatus.tsx
│   │   └── ReportButtons.tsx
│   ├── visit/
│   │   ├── CheckInButton.tsx
│   │   ├── VisitSummaryForm.tsx
│   │   └── BeforeAfterPhoto.tsx
│   ├── booking/
│   │   └── BookingForm.tsx
│   ├── profile/
│   │   ├── ReputationBadge.tsx
│   │   └── BadgeList.tsx
│   ├── feed/
│   │   └── FeedItem.tsx
│   ├── assistant/
│   │   └── AssistantSheet.tsx
│   └── nav/
│       └── BottomNav.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── types.ts                 # generated types
│   ├── freshness.ts                 # TTL / staleness логика (переиспользуется в 3 местах)
│   ├── reputation.ts                # расчёт score
│   ├── weather.ts                   # обёртка над погодным API
│   └── gemini.ts
├── i18n/
│   ├── et.json
│   ├── ru.json
│   └── en.json
└── supabase/
    └── migrations/
```

Комментарий: структура почти 1:1 повторяет то, что уже отработано в TallinnVäljak и QueueLive — это сознательно, чтобы Claude Code мог переиспользовать паттерны, а не изобретать заново.

---

## 2. Database schema (Postgres / Supabase)

```sql
-- users (расширяет auth.users)
create table profiles (
  id uuid primary key references auth.users(id),
  username text unique not null,
  avatar_url text,
  reputation numeric default 0,
  reports_count int default 0,
  confirmed_reports int default 0,
  rejected_reports int default 0,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- locations
create table locations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,           -- для QR/deep link: /location/harku
  name text not null,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  type text not null check (type in ('sauna','winter_swimming','beach','ice_swimming','sauna_swimming')),
  capacity int,                        -- null = не применимо (пляж)
  booking_enabled boolean default false,
  opening_hours jsonb,                 -- {"mon": "07:00-21:00", ...}
  is_free boolean default true,
  created_at timestamptz default now()
);

-- occupancy_reports
create table occupancy_reports (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) not null,
  user_id uuid references profiles(id) not null,
  people_count int not null,
  created_at timestamptz default now()
);

-- water_reports
create table water_reports (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) not null,
  user_id uuid references profiles(id),
  temperature numeric not null,
  source text default 'user' check (source in ('user','sensor')),
  created_at timestamptz default now()
);

-- ice_reports
create table ice_reports (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) not null,
  user_id uuid references profiles(id) not null,
  condition text check (condition in ('none','partial','frozen')),
  created_at timestamptz default now()
);

-- visits
create table visits (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) not null,
  user_id uuid references profiles(id) not null,
  started_at timestamptz default now(),
  finished_at timestamptz,
  rating int check (rating between 1 and 5),
  crowd_level text check (crowd_level in ('low','medium','high'))
);

-- photos
create table photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  location_id uuid references locations(id) not null,
  visit_id uuid references visits(id),
  type text check (type in ('before','after')),
  storage_url text not null,
  moderated boolean default false,
  created_at timestamptz default now()
);

-- bookings
create table bookings (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) not null,
  user_id uuid references profiles(id) not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  people_count int not null,
  status text default 'confirmed' check (status in ('confirmed','cancelled','completed')),
  created_at timestamptz default now()
);

-- ratings
create table ratings (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) not null,
  user_id uuid references profiles(id) not null,
  rating int check (rating between 1 and 5),
  created_at timestamptz default now(),
  unique(location_id, user_id)
);
```

**Индексы, о которых стоит не забыть:**
`(location_id, created_at desc)` на `occupancy_reports`, `water_reports`, `ice_reports` — вся логика "последнее свежее значение" строится через них.

**Freshness как вычисляемое поле, не хранимое** — TTL считается на лету (`lib/freshness.ts`), не пишется в БД. Так проще менять пороги (15/30/60 мин) без миграций.

---

## 3. RLS policies (кратко)

| Таблица | select | insert | update/delete |
|---|---|---|---|
| locations | public | admin only | admin only |
| occupancy/water/ice reports | public | `auth.uid() = user_id` | запрещено (репорты неизменяемы — это лог, не состояние) |
| visits | владелец + admin | `auth.uid() = user_id` | владелец, только пока `finished_at is null` |
| photos | public (после moderated=true), владелец видит свои всегда | владелец | владелец на удаление, admin на moderated |
| bookings | владелец + admin | владелец | владелец (cancel), admin |
| profiles | public (ограниченные поля) | — | владелец на свои поля, admin на reputation/is_admin |

Важно: репорты **не редактируются** — если человек ошибся, он шлёт новый репорт. Это и проще для RLS, и естественно ограничивает "штурмовку" данных (см. anti-spam).

---

## 4. Anti-spam (конкретный механизм)

- Rate limit: 1 occupancy-репорт на пользователя на локацию **раз в 5 минут** (проверка на API-уровне перед insert, не в БД).
- Если новый репорт отклоняется от предыдущего (не своего, а последнего в системе) больше чем на определённый порог — не блокировать, но помечать `needs_confirmation = true` и понижать вес до второго подтверждающего репорта.
- Reputation ниже порога → репорты пользователя учитываются, но не сразу становятся "видимым" статусом (нужно подтверждение вторым пользователем).
- Жалоба на репорт от других пользователей → admin queue.

---

## 5. Freshness / TTL логика

```
0–15 мин   → HIGH confidence, отображается как есть
15–30 мин  → MEDIUM, помечается "могло измениться"
30–60 мин  → LOW, приглушённый цвет на карте
60+ мин    → UNKNOWN (⚪), число не показываем, только "нет свежих данных"
```

Одна функция `getFreshness(timestamp)` используется во всех трёх типах репортов и на фронте, и в API — не дублировать логику.

---

## 6. UX flow — ключевые экраны

1. **Map (главный)** — точки с маркерами, цвет = occupancy freshness, клик → bottom sheet с карточкой места.
2. **Location card** — occupancy, вода, лёд, погода, "Go here" (маршрут), "I'm going there", "Report status".
3. **Check-in flow** — QR или кнопка → создаётся `visit` → опционально Before-фото → таймер визита идёт в фоне.
4. **Finish visit** — рейтинг, crowd level, обновление воды/льда одним экраном, After-фото → reputation +N.
5. **Booking** (только для мест с `booking_enabled`) — выбор даты/времени/людей → подтверждение (без оплаты в MVP).
6. **Profile** — визиты, репутация, бейджи, история фото.
7. **Admin** — CRUD локаций, модерация фото/репортов, просмотр бронирований.

---

## 7. AI Assistant — архитектура запроса

```
User query (RU/ET/EN)
   → Gemini: извлечь intent + параметры (structured output, JSON)
   → сервер: собрать реальные данные из Supabase (locations + последние reports) и weather API
   → Gemini: сформулировать ответ на языке пользователя СТРОГО на основе присланных данных
   → ответ + опционально движение карты к найденной точке
```

Жёсткое правило в системном промпте ассистента: никогда не придумывать occupancy/температуру — только то, что пришло из Supabase/weather API за этот запрос.

---

## 8. MVP Milestones

**Phase 0 — Foundation**
Next.js проект, Supabase проект, схема БД + RLS, auth (email + Google), i18n каркас (ET/RU/EN), деплой на Vercel — пустой, но работающий скелет.

**Phase 1 — Карта и данные**
Seed 7 локаций (Harku, Iglupark Noblessner, Stroomi, Pikakari, Kakumäe, Pirita, Aegna), карта с маркерами, location card (read-only), интеграция погодного API.

**Phase 2 — Live-механика**
Occupancy/water/ice репорты, freshness-логика, realtime-обновление карты через Supabase Realtime.

**Phase 3 — Community loop**
Auth-профили, check-in/visit flow, before/after фото, базовая reputation, community feed.

**Phase 4 — Полировка и рост**
QR-коды, deep links, AI-ассистент, admin panel, booking-архитектура (без оплаты).

**Phase 5 (после MVP)** — платежи, push, IoT-датчики воды, достижения.

Каждый Phase должен запускаться и быть демонстрируемым самому себе — не копим "невидимый" код.

---

## 9. Решения по открытым вопросам (зафиксировано 2026-08-10)

1. **Бренд/имя** — обсуждается отдельно (SaunaLive / Külmvesi / Leil), нужно проверить .ee домен. Для кода используется рабочий слаг `sauna-live`.
2. **Booking для MVP** — **выключен до Phase 4.** Во всех seed-локациях Phase 1–3 `booking_enabled = false`. Реально нужен только для Iglupark Noblessner; для Харку и других бесплатных общественных саун не нужен вообще. Реальный booking-flow (`/bookings`, API) строится в Phase 4 по плану.
3. **Источник погоды** — **Ilmateenistus** (Eesti Ilmateenistus), без fallback на OpenWeather (сознательно, чтобы не усложнять MVP двумя наборами credentials/лимитов).
4. **Порог reputation** для "невидимых пока не подтверждено" репортов — не решено, отложено до Phase 3 перед реализацией `lib/reputation.ts`.
