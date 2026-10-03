# Homecraft: design spec

Supabase Select 2026 hackathon, solo. Deadline 5 PM Pacific, Oct 3, 2026. Working name "Homecraft" (renamable).

## Goal

Prompt an AI agent pipeline to design a furnished single-floor house rendered in 3D. Share it by link; visitors like, comment and join live. When the owner approves a comment, the agents redesign the house from it and everyone in the room sees the change happen in realtime.

**Hero demo (protect this above all):** a second user comments "add a home office", the owner approves, the agent status streams live, and the house updates for both browsers.

## Success criteria

- Live URL with real Supabase auth and real data.
- A 2-3 minute two-browser demo: prompt → house → toggle furniture → walk → comment → approve → live redesign, with both avatars visible.
- Supabase used meaningfully: Auth, Postgres + RLS, Realtime (postgres_changes + presence + broadcast).

## Non-goals

Multi-floor houses, free-form meshes, a public gallery, invited co-owners, mobile walk mode, edge functions, automated test suites.

## HouseSpec (agent output, validated with zod before saving)

Single floor, meters, origin at the house's corner, x right, z forward.

- `rooms[]`: `id`, `name`, `x`, `z`, `width`, `depth`, `wallColor`, `floorColor` (hex). Axis-aligned rectangles that do not overlap.
- `doors[]`: `roomId`, `wall` (`n|s|e|w`), `offset` (m along that wall), `width`.
- `windows[]`: same shape as doors.
- `furniture[]`: `id`, `type`, `roomId`, `x`, `z` (house coordinates), `rotation` (degrees, multiples of 90), `color` (hex, optional).
- Furniture catalog (fixed, ~12): `bed`, `sofa`, `table`, `chair`, `desk`, `toilet`, `bathtub`, `counter`, `fridge`, `bookshelf`, `plant`, `rug`. Each type has fixed dimensions in code; the renderer draws it from boxes and cylinders.

## Agent pipeline

Runs server-side in a server action through the Vercel AI SDK `generateObject`, so one code path covers every provider.

1. **Architect**: input is the prompt (and, for a redesign, the current spec plus the approved comment). Outputs `rooms`, `doors` and `windows`.
2. **Interior designer**: input is the architect output plus the prompt or comment. Outputs `furniture` using only catalog types, placed inside rooms.

Before each step, the action writes `status = 'generating'` and a `status_message` ("Architect is laying out rooms…", "Interior designer is furnishing…") to the house row, so every viewer sees progress through realtime. On success it saves the spec, sets `status = 'ready'` and increments `version`. On failure it sets `status = 'error'` with a message and keeps the previous spec; the owner gets a retry button.

The house owner's saved provider, model and key are used for both creation and redesigns.

## Model settings (bring your own key)

- A settings panel lets the user pick a provider (Anthropic, OpenAI, Google), a model from a curated list for that provider (plus a custom model ID field), and an API key for that provider.
- Keys are encrypted with AES-256-GCM using `KEY_ENCRYPTION_SECRET` (server-only env) and stored in `user_settings`. A key is never sent back to the client; the panel shows only "key saved ••••last4".
- One key per provider, so switching models within a provider needs no new key.
- Generating without a key for the selected provider gives a clear "add your API key in Settings" error.

## Database (RLS on every table)

- `houses`: `id uuid pk`, `owner_id uuid → auth.users`, `title`, `prompt`, `spec jsonb null`, `status text check in (generating, ready, error)`, `status_message text`, `version int default 0`, `created_at`, `updated_at`.
  RLS: authenticated users can select; insert/update only where `owner_id = auth.uid()`.
- `comments`: `id`, `house_id → houses`, `author_id → auth.users`, `author_name`, `body` (1-500 chars), `status text check in (pending, approved, rejected, applied)`, `created_at`.
  RLS: authenticated users can select; insert where `author_id = auth.uid()` and status is `pending`; update only by the owner of the parent house.
- `likes`: `house_id`, `user_id`, pk on both.
  RLS: authenticated users can select; insert/delete only their own.
- `user_settings`: `user_id pk → auth.users`, `provider`, `model`, `keys jsonb` (provider → ciphertext).
  RLS: select/insert/update only their own row.
- Realtime publication: `houses`, `comments`, `likes`.

## Realtime

On `/h/[id]`, one channel `house:{id}` carries:
- postgres_changes on `houses` (that id), `comments` (that house_id) and `likes` (that house_id);
- presence (user id, display name, color) for the viewer list;
- broadcast `pos` events (x, z, yaw) about 10 times a second while in walk mode, rendered as colored capsule avatars.

## Pages

- `/login`: done.
- `/`: your houses plus a "describe your house" prompt box. Creating inserts a `generating` row, redirects to `/h/[id]` immediately, and runs the pipeline.
- `/h/[id]`: a 3D canvas with an orbit/walk toggle (walk = pointer lock + WASD, 1.7 m eye height, no collision) and a furniture on/off toggle. The side panel holds the agent status, like button and count, viewer list, comments (post; Approve/Reject for the owner) and a share-link copy button.
- Settings: a modal reachable from the header.

## Stack

Next.js 16 (App Router, server actions), Supabase (`@supabase/ssr`), Tailwind v4, `@react-three/fiber` + `@react-three/drei`, Vercel AI SDK (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`), zod. Deployed to Vercel with a hosted Supabase project.

## Verification

- A zod parse of a real agent output against the HouseSpec schema.
- A manual two-browser run of the whole hero demo on the deployed URL before submitting.
