# Homebrewer

**Describe a home. Agents build it. Friends redesign it.**

Homebrewer turns a text prompt into a furnished 3D house you can walk through. Two AI agents work in sequence: an **architect** lays out rooms, doors and windows, then an **interior designer** furnishes every room. Share the link and visitors can join you inside the house, see each other move around, like it, and suggest changes. When the owner approves a suggestion, the agents redesign the house, and everyone in the room watches it happen live.

Built solo for the Supabase Select 2026 Hackathon.

**Live demo:** https://supabase-hackathon-eight.vercel.app
**Code:** https://github.com/michaelvqq/homebrewer

## What you can do

- **Prompt to house:** describe a home and get a furnished single-floor 3D model.
- **Furniture on/off:** see each room furnished or empty.
- **Walk mode:** first-person WASD walkthrough.
- **Build chat:** each house has its own chat in the left sidebar. Type "make the bedroom walls sage" or "add a plant by the window". A router agent decides whether that's an instant edit (add, remove or recolor) applied in milliseconds, or a full agent redesign.
- **Projects sidebar:** recent houses, pinning, and named groups, so the 3D viewport stays the main content.
- **Share by link, no login needed:** anyone with the link can view the house and walk through it. Signing in lets you like and comment. You see who's here, and their avatars move through the house in real time.
- **Pinned suggestions:** visitors click a spot in the 3D world and describe a change ("a reading chair here"). The pin and its room go to the agents as context.
- **Comment-driven redesign:** the owner approves a suggestion, and the agents rework the house live for every viewer.
- **Bring your own model:** pick Anthropic, OpenAI (including GPT-6 Astra) or Google and any model in Settings. Your API key is encrypted at rest (AES-256-GCM) and never sent back to the browser.
- **Demo keys:** if you haven't saved a key, the app falls back to shared demo keys when the host has configured them, so you can try it without any setup. Shared keys only run catalog models.

## How Supabase is used

| Feature | Use |
|---|---|
| **Auth** | Email/password sign-in with SSR cookie sessions (`@supabase/ssr`, `getClaims()` in the Next.js proxy) |
| **Postgres + RLS** | `houses`, `comments` (with optional pinned `pos_x`/`pos_z`/`room_id`), `likes`, `house_messages` (build chat) and `user_settings`. RLS on every table: anyone with the link, signed in or not, can read a house and its comments, only signed-in users can comment or like, only owners edit their houses or moderate comments, and each user's settings row is private to them. |
| **Realtime: Postgres Changes** | House status and spec updates, build-chat messages, new comments, moderation state and like counts stream to every viewer |
| **Realtime: Presence** | The "Here now" list of people in the house |
| **Realtime: Broadcast** | Walk-mode positions at 10 Hz, rendered as avatars |

## How the agents work

1. A server action inserts the house (`status = generating`) and redirects immediately. The pipeline runs in Next.js `after()`.
2. **Architect** (`generateText` + `Output.object` with a zod schema, via the Vercel AI SDK) returns rooms, doors and windows on a meter grid.
3. **Interior designer** returns furniture from a fixed 12-item catalog, placed inside rooms.
4. The spec is validated and sanitized (unknown types are rejected, and out-of-room items dropped), then saved. Each step writes a status message to the row, so every viewer sees progress through Realtime.
5. A redesign sends the current spec plus the approved comment through the same pipeline. If the comment is pinned, the agents also get the exact spot and its room. If the pipeline fails, the previous house stays visible and the owner can retry. Retry replays the latest change request (an approved comment or a build-chat edit) on the current house, and a house stuck in `generating` for over 5 minutes, for example after a killed serverless function, can be retried too.

**Routing for realtime building.** A build-chat message or an approved suggestion first goes to a router (`decide()` in `src/lib/ai/router.ts`, built on `Output.choice`). It picks one of: add furniture, remove furniture, recolor walls, recolor floor, or redesign the layout. The first four are deterministic edits to the spec (grid placement with no overlaps, near the pin when there is one) and show up for every viewer instantly. Only "redesign layout" runs the full two-agent pipeline. `decide()` is the single seam where a provider-native decisions endpoint can be plugged in.

The 3D view is rendered with react-three-fiber from the JSON spec.

## What's next

- Sign in with ChatGPT, so OpenAI users can build on their own subscription instead of an API key.
- OpenAI's Decisions API behind `decide()`, once it's available on our account.
- Multi-floor houses and a bigger furniture catalog.

## Running locally

Requires Node 22+ and the Supabase CLI.

```bash
git clone https://github.com/michaelvqq/homebrewer.git && cd homebrewer
npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from your Supabase project,
# and set KEY_ENCRYPTION_SECRET to the output of: openssl rand -base64 32
# Optional: SHARED_ANTHROPIC_API_KEY / SHARED_OPENAI_API_KEY / SHARED_GOOGLE_API_KEY give users without
# their own key a demo fallback.

supabase link --project-ref <your-project-ref>
supabase db push          # applies supabase/migrations

npm run dev               # http://localhost:3000
npm test                  # spec, edit, model-choice, sync and encryption tests
```

In the Supabase dashboard, turn off **Authentication → Email → Confirm email** so new accounts can sign in right away.

Then sign up and describe a house. Open **Settings** to choose a provider and model and paste your own API key, or skip it if the shared demo keys are set.

## Stack

Next.js 16 (App Router, server actions), Supabase, Tailwind CSS v4 with shadcn/ui, Vercel AI SDK v7, three.js with react-three-fiber and drei, zod.
