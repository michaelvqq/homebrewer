# Homebrewer

**Describe a home. Agents build it. Friends redesign it.**

Homebrewer turns a text prompt into a furnished 3D house you can walk through. Two AI agents work in sequence: an **architect** lays out rooms, doors and windows, then an **interior designer** furnishes every room. Share the link and visitors can join you inside the house, see each other move around, like it, and suggest changes. When the owner approves a suggestion, the agents redesign the house, and everyone in the room watches it happen live.

Built solo for the Supabase Select 2026 Hackathon.

## What you can do

- **Prompt to house:** describe a home and get a furnished single-floor 3D model.
- **Furniture on/off:** see each room furnished or empty.
- **Walk mode:** first-person WASD walkthrough.
- **Share and collaborate:** anyone with the link can join, like and comment. You see who's here, and their avatars move through the house in real time.
- **Comment-driven redesign:** the owner approves a suggestion like "add a home office", and the agents rework the house live for every viewer.
- **Bring your own model:** pick Anthropic, OpenAI or Google and any model in Settings. Your API key is encrypted at rest and never sent back to the browser.

## How Supabase is used

| Feature | Use |
|---|---|
| **Auth** | Email/password sign-in with SSR cookie sessions (`@supabase/ssr`, `getClaims()` in the Next.js proxy) |
| **Postgres + RLS** | `houses`, `comments`, `likes`, `user_settings`. RLS on every table: anyone signed in can read houses and comments, only owners edit their houses or moderate comments, and each user's settings row is private to them. |
| **Realtime: Postgres Changes** | House status and spec updates, new comments, moderation state and like counts stream to every viewer |
| **Realtime: Presence** | The "Here now" list of people in the house |
| **Realtime: Broadcast** | Walk-mode positions at 10 Hz, rendered as avatars |

## How the agents work

1. A server action inserts the house (`status = generating`) and redirects immediately. The pipeline runs in Next.js `after()`.
2. **Architect** (`generateText` + `Output.object` with a zod schema, via the Vercel AI SDK) returns rooms, doors and windows on a meter grid.
3. **Interior designer** returns furniture from a fixed 12-item catalog, placed inside rooms.
4. The spec is validated and sanitized (unknown types are rejected, and out-of-room items dropped), then saved. Each step writes a status message to the row, so every viewer sees progress through Realtime.
5. A redesign sends the current spec plus the approved comment through the same pipeline. If it fails, the previous house stays visible and the owner can retry.

The 3D view is rendered with react-three-fiber from the JSON spec.

## Running locally

Requires Node 22+ and the Supabase CLI.

```bash
npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from your Supabase project,
# and set KEY_ENCRYPTION_SECRET to the output of: openssl rand -base64 32

supabase link --project-ref <your-project-ref>
supabase db push          # applies supabase/migrations

npm run dev               # http://localhost:3000
npm test                  # spec + encryption tests
```

In the Supabase dashboard, turn off **Authentication → Email → Confirm email** so new accounts can sign in right away.

Then sign up, open **Settings**, choose a provider and model, paste your API key, and describe a house.

## Stack

Next.js 16 (App Router, server actions), Supabase, Tailwind CSS v4, Vercel AI SDK v7, three.js with react-three-fiber and drei, zod.
