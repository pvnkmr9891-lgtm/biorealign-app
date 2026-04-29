# BioRealign Mobile App

React Native (Expo) · NativeWind · Supabase · Expo Router

---

## Quick start

### 1. Install dependencies
```bash
npm install
```

### 2. Install Expo Google Fonts
```bash
npx expo install @expo-google-fonts/dm-serif-display @expo-google-fonts/dm-sans @expo-google-fonts/cormorant-garamond
```

### 3. Set up environment variables
```bash
cp .env.example .env
```
Open `.env` and paste your Supabase project URL and anon key from:
**Supabase Dashboard → Project Settings → API**

### 4. Run the app
```bash
npx expo start
```
Scan the QR code with **Expo Go** on your phone, or press:
- `i` for iOS simulator
- `a` for Android emulator

---

## Project structure

```
biorealign-app/
├── app/                    # Expo Router file-based routes
│   ├── _layout.tsx         # Root layout — fonts, auth guard, QueryClient
│   ├── (auth)/             # Login, register
│   ├── (client)/           # Tab nav: Dashboard, Programs, Check-in, Progress, Profile
│   ├── (coach)/            # Tab nav: Dashboard, Clients
│   └── (admin)/            # Tab nav: Analytics, Content, Users
│
├── src/
│   ├── lib/
│   │   ├── supabase.ts     # Typed Supabase client (SecureStore session)
│   │   └── queryClient.ts  # React Query config
│   ├── constants/
│   │   └── theme.ts        # Brand colors, fonts, spacing
│   ├── store/
│   │   └── authStore.ts    # Zustand — session, profile, role
│   ├── hooks/
│   │   └── useAuth.ts      # Auth listener + convenience hook
│   ├── types/
│   │   └── index.ts        # All TypeScript types + Database interface
│   └── components/ui/
│       ├── Button.tsx       # Primary/secondary/ghost/danger
│       ├── Card.tsx         # Surface card with variants
│       └── ScoreRing.tsx   # Animated SVG progress ring (Fitness/Recovery/Longevity)
│
├── tailwind.config.js      # Brand design tokens as Tailwind theme
├── babel.config.js         # NativeWind + Reanimated
├── metro.config.js         # NativeWind Metro integration
└── app.json                # Expo config
```

---

## Auth flow

```
App open
  └── getSession() → hydrate Zustand store
        ├── No session  → redirect to /(auth)/login
        └── Session     → fetchProfile() → read role
              ├── client → /(client)
              ├── coach  → /(coach)
              └── admin  → /(admin)
```

---

## Supabase tables (run SQL in Phase 2)

8 new tables to create:
- `profiles` — extends auth.users with role, health info
- `programs` — 7 BioRealign programs
- `enrollments` — client ↔ program ↔ coach
- `sessions` — coaching session records
- `daily_checkins` — mood, energy, sleep, pain logs
- `progress_metrics` — scores + body measurements
- `program_content` — weekly/daily modules per program
- `messages` — in-app coach ↔ client chat

---

## Brand reference

| Token     | Value     |
|-----------|-----------|
| Background | `#0A0A0B` |
| Teal accent | `#00C4B4` |
| Amber accent | `#E8A44A` |
| Text primary | `#F0EEE8` |
| Serif font | DM Serif Display |
| Body font | DM Sans |
| Display font | Cormorant Garamond |

---

## Phase roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | **Scaffold** (this) — project setup, auth, routing, design system | ✅ Done |
| 2 | Client core — dashboard, check-ins, progress tracking | Next |
| 3 | Coach portal + program content | Planned |
| 4 | Admin panel + App Store launch | Planned |
