# Homecraft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a deployed app where AI agents design a furnished 3D house from a prompt, and visitors' approved comments trigger live redesigns seen by everyone in the room.

**Architecture:** Next.js 16 server actions run a two-step agent pipeline (architect → interior designer) through the Vercel AI SDK with the owner's own encrypted key, writing a validated `HouseSpec` JSON to Supabase. The house page renders the spec with react-three-fiber and subscribes to one Supabase Realtime channel for row changes, presence and avatar positions.

**Tech Stack:** Next.js 16.3.8, React 19.2, Supabase (`@supabase/ssr`, hosted project `oeuvejmpcdszhkufrlqh`), Tailwind v4, zod 4, `ai@7` + `@ai-sdk/{anthropic,openai,google}@4`, `@react-three/fiber@9`, `@react-three/drei@10`, `three@0.186`.

**Spec:** `docs/superpowers/specs/2026-10-03-homecraft-design.md`

**Time budget:** hard deadline 5:00 PM Pacific today. Tasks are ordered so every completed prefix is demoable. Testing is one schema test plus a manual two-browser run (per spec), so steps are build/typecheck/manual-verify, not TDD.

## Global Constraints

- Deadline 5 PM Pacific, Oct 3, 2026; deploy by 4:45.
- RLS enabled on every `public` table; authorization never uses `user_metadata`.
- No service-role/secret key in any client code; `NEXT_PUBLIC_` only for URL + publishable key.
- Every server action self-authorizes with `getCurrentUser()` from `src/lib/auth.ts`, validates input with zod `.safeParse`, returns `ActionResult`.
- Env read only through `src/lib/env.ts` (server-only vars in a separate `serverEnv`).
- Next 16: `proxy.ts` not middleware; no `export const dynamic`.
- API keys never returned to the client; UI shows only last 4 characters.
- Desktop only; single floor; furniture limited to the 12 catalog types.

## Review Focus

1. **Owner has no key for their selected provider** → creation/redesign fails fast with "Add your API key in Settings", house goes to `error`, not stuck in `generating`. (Task 4 step: check before calling the model.)
2. **Model returns furniture outside any room or an unknown type** → zod rejects unknown types; out-of-room items are dropped by `sanitizeSpec`, not rendered floating. (Task 2 test.)
3. **Non-owner tries to approve a comment or edit a house** → RLS blocks it and the action returns `unauthorized`. (Task 1 policy + Task 4 owner check.)
4. **Redesign fails midway** → previous spec stays visible, status `error` with retry. (Task 4: never write `spec` until both steps succeed.)
5. **Viewer opens a house still generating** → page shows status message and an empty lot, then the house appears via realtime without reload. (Task 6.)

---

### Task 1: Database schema, RLS, realtime (hosted)

**Files:**
- Create: `supabase/migrations/<timestamp>_homecraft.sql` (via `supabase migration new homecraft`)

**Interfaces:**
- Produces: tables `houses`, `comments`, `likes`, `user_settings` exactly as below; generated types in `src/lib/supabase/database.types.ts`.

- [ ] **Step 1:** `supabase link --project-ref oeuvejmpcdszhkufrlqh` (needs the user's `supabase login` + DB password), then `supabase migration new homecraft`.
- [ ] **Step 2:** Write this SQL into the new migration:

```sql
create table public.houses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  prompt text not null check (char_length(prompt) between 1 and 1000),
  spec jsonb,
  status text not null default 'generating' check (status in ('generating','ready','error')),
  status_message text,
  version int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.houses (owner_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(body) between 1 and 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected','applied')),
  created_at timestamptz not null default now()
);
create index on public.comments (house_id);

create table public.likes (
  house_id uuid not null references public.houses(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (house_id, user_id)
);

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  provider text not null default 'anthropic' check (provider in ('anthropic','openai','google')),
  model text not null default 'claude-sonnet-5-5',
  keys jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.houses enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.user_settings enable row level security;

create policy "houses readable by signed-in users" on public.houses for select to authenticated using (true);
create policy "owners insert houses" on public.houses for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "owners update houses" on public.houses for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owners delete houses" on public.houses for delete to authenticated using (owner_id = (select auth.uid()));

create policy "comments readable by signed-in users" on public.comments for select to authenticated using (true);
create policy "users post pending comments" on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'pending');
create policy "house owners moderate comments" on public.comments for update to authenticated
  using (exists (select 1 from public.houses h where h.id = house_id and h.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.houses h where h.id = house_id and h.owner_id = (select auth.uid())));

create policy "likes readable by signed-in users" on public.likes for select to authenticated using (true);
create policy "users add own like" on public.likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users remove own like" on public.likes for delete to authenticated using (user_id = (select auth.uid()));

create policy "own settings select" on public.user_settings for select to authenticated using (user_id = (select auth.uid()));
create policy "own settings insert" on public.user_settings for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own settings update" on public.user_settings for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.houses, public.comments, public.likes;
```

- [ ] **Step 3:** `supabase db push` and confirm it applies. Run `supabase db advisors` if the CLI supports it (upgrade CLI if < 2.81.3, otherwise skip).
- [ ] **Step 4:** `supabase gen types typescript --linked > src/lib/supabase/database.types.ts`; pass `<Database>` to both `createClient` helpers.
- [ ] **Step 5:** Commit `feat: homecraft schema with RLS and realtime`.

### Task 2: HouseSpec contract and furniture catalog

**Files:**
- Create: `src/lib/house/spec.ts`, `src/lib/house/catalog.ts`, `src/lib/house/spec.test.ts`

**Interfaces:**
- Produces:
  - `FURNITURE_TYPES` (readonly tuple of the 12 types), `type FurnitureType`
  - `CATALOG: Record<FurnitureType, { w: number; d: number; h: number; color: string }>` (meters; w along x before rotation)
  - zod schemas `roomSchema`, `openingSchema`, `furnitureSchema`, `layoutSchema` (rooms/doors/windows), `furnishingSchema` (furniture), `houseSpecSchema` (all four)
  - `type HouseSpec = z.infer<typeof houseSpecSchema>`
  - `sanitizeSpec(spec: HouseSpec): HouseSpec` — drops doors/windows/furniture whose `roomId` doesn't exist and furniture whose (x,z) is outside its room.

```ts
// src/lib/house/catalog.ts
export const FURNITURE_TYPES = ["bed","sofa","table","chair","desk","toilet","bathtub","counter","fridge","bookshelf","plant","rug"] as const;
export type FurnitureType = (typeof FURNITURE_TYPES)[number];
export const CATALOG: Record<FurnitureType, { w: number; d: number; h: number; color: string }> = {
  bed: { w: 1.6, d: 2.1, h: 0.55, color: "#e8e2d6" },
  sofa: { w: 2.0, d: 0.9, h: 0.8, color: "#6b7a8f" },
  table: { w: 1.6, d: 0.9, h: 0.75, color: "#8b5e3c" },
  chair: { w: 0.5, d: 0.5, h: 0.9, color: "#8b5e3c" },
  desk: { w: 1.4, d: 0.7, h: 0.75, color: "#a07850" },
  toilet: { w: 0.4, d: 0.7, h: 0.8, color: "#f5f5f5" },
  bathtub: { w: 0.8, d: 1.7, h: 0.6, color: "#f5f5f5" },
  counter: { w: 2.4, d: 0.6, h: 0.9, color: "#d9d4cc" },
  fridge: { w: 0.8, d: 0.7, h: 1.8, color: "#cfd4d9" },
  bookshelf: { w: 1.0, d: 0.35, h: 1.9, color: "#7a5230" },
  plant: { w: 0.5, d: 0.5, h: 1.1, color: "#3f7d4e" },
  rug: { w: 2.0, d: 1.4, h: 0.02, color: "#b5654a" },
};
```

```ts
// src/lib/house/spec.ts
import { z } from "zod";
import { FURNITURE_TYPES } from "./catalog";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const roomSchema = z.object({
  id: z.string().min(1), name: z.string().min(1),
  x: z.number(), z: z.number(), width: z.number().min(1.5).max(20), depth: z.number().min(1.5).max(20),
  wallColor: hex, floorColor: hex,
});
export const openingSchema = z.object({
  roomId: z.string(), wall: z.enum(["n","s","e","w"]), offset: z.number().min(0), width: z.number().min(0.6).max(4),
});
export const furnitureSchema = z.object({
  id: z.string(), type: z.enum(FURNITURE_TYPES), roomId: z.string(),
  x: z.number(), z: z.number(), rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  color: hex.optional(),
});
export const layoutSchema = z.object({
  rooms: z.array(roomSchema).min(1).max(12), doors: z.array(openingSchema), windows: z.array(openingSchema),
});
export const furnishingSchema = z.object({ furniture: z.array(furnitureSchema).max(80) });
export const houseSpecSchema = layoutSchema.extend(furnishingSchema.shape);
export type HouseSpec = z.infer<typeof houseSpecSchema>;

export function sanitizeSpec(spec: HouseSpec): HouseSpec {
  const rooms = new Map(spec.rooms.map((r) => [r.id, r]));
  const inside = (f: HouseSpec["furniture"][number]) => {
    const r = rooms.get(f.roomId);
    return !!r && f.x >= r.x && f.x <= r.x + r.width && f.z >= r.z && f.z <= r.z + r.depth;
  };
  return {
    rooms: spec.rooms,
    doors: spec.doors.filter((d) => rooms.has(d.roomId)),
    windows: spec.windows.filter((w) => rooms.has(w.roomId)),
    furniture: spec.furniture.filter(inside),
  };
}
```

- [ ] **Step 1:** Write the two files above.
- [ ] **Step 2:** Test (`node --test` via `npx tsx --test src/lib/house/spec.test.ts`): a valid sample spec parses; a spec with furniture type `"piano"` fails to parse; `sanitizeSpec` drops a chair at x outside its room and a door with unknown `roomId`.
- [ ] **Step 3:** Run it; expect pass. Commit `feat: HouseSpec schema and furniture catalog`.

### Task 3: 3D house viewer (parallelizable, depends only on Task 2)

**Files:**
- Create: `src/components/house/house-scene.tsx` (client), `src/components/house/furniture.tsx`, `src/components/house/walls.tsx`, `src/components/house/walk-controls.tsx`, `src/components/house/avatars.tsx`

**Interfaces:**
- Consumes: `HouseSpec`, `CATALOG`, `FurnitureType` from Task 2.
- Produces:

```ts
export type Avatar = { id: string; name: string; color: string; x: number; z: number; yaw: number };
export function HouseScene(props: {
  spec: HouseSpec | null;          // null → empty lot (grass plane)
  showFurniture: boolean;
  mode: "orbit" | "walk";
  avatars: Avatar[];               // other users; render capsule + floating name
  onMove?: (pos: { x: number; z: number; yaw: number }) => void; // called ≤10/s in walk mode
}): JSX.Element
```

- [ ] **Step 1:** `npm i three @react-three/fiber @react-three/drei && npm i -D @types/three`.
- [ ] **Step 2:** Build the scene: ground plane; per room a floor plane (`floorColor`) and four 2.6 m walls (`wallColor`, 0.1 m thick) with gaps cut for doors (full-height gap) and windows (wall split into below-sill 0.9 m, above-head 2.1 m segments around a translucent pane). Center the house at origin. Ambient + directional light with shadows. Orbit mode: `OrbitControls` targeting house center, camera above at 45°, no ceiling. Room name labels via drei `Text` floating at 2.8 m in orbit mode only.
- [ ] **Step 3:** Furniture: each type is a small group of boxes/cylinders sized by `CATALOG` (e.g., bed = base box + pillow box; plant = pot cylinder + sphere; chair = seat + back), rotated by `rotation` degrees, colored by `color ?? CATALOG[type].color`. Hidden when `showFurniture` is false.
- [ ] **Step 4:** Walk mode: drei `PointerLockControls` + WASD keyboard movement at 3 m/s, eye height 1.7 m, start at the first door or house center. Throttle `onMove` to 100 ms.
- [ ] **Step 5:** Avatars: capsule (radius 0.25, height 1.2) colored by avatar color plus drei `Text` name billboard, positioned at x/z, rotated by yaw, lerped toward new positions.
- [ ] **Step 6:** Verify with a temporary `/dev/scene` page rendering a hardcoded sample spec (3 rooms, 10 furniture items, one fake avatar) in both modes; delete the page after verification. `npm run build` passes. Commit `feat: 3D house scene with walk mode and avatars`.

### Task 4: Model settings (BYO key) and agent pipeline

**Files:**
- Modify: `src/lib/env.ts` (add `serverEnv` with `KEY_ENCRYPTION_SECRET`, 32+ chars, server-only)
- Create: `src/lib/ai/models.ts`, `src/lib/ai/crypto.ts`, `src/lib/ai/pipeline.ts`, `src/app/settings/actions.ts`, `src/components/settings-dialog.tsx`, `src/app/h/actions.ts`

**Interfaces:**
- Consumes: Task 1 tables, Task 2 schemas, `getCurrentUser()`.
- Produces:
  - `PROVIDERS = { anthropic: {label, models: string[]}, openai: {...}, google: {...} }`; `type Provider`. Verify current model IDs against the installed `@ai-sdk/*` packages' type unions; Anthropic: `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-4-5-20251001`.
  - `encryptKey(plain: string): string` / `decryptKey(cipher: string): string` (AES-256-GCM, `iv.tag.ciphertext` base64, key = sha256 of `KEY_ENCRYPTION_SECRET`).
  - `getSettingsView(): Promise<{ provider; model; savedKeys: Record<Provider, string | null> /* last4 */ }>`; action `saveSettings(input: unknown): Promise<ActionResult>` (provider, model, optional apiKey).
  - `runPipeline(args: { supabase; houseId: string; userId: string; prompt: string; current?: HouseSpec; change?: string }): Promise<void>` — loads owner settings, decrypts key (missing → set `status='error'`, `status_message='Add your API key in Settings'`, return), updates status message per step, calls the model twice with structured output (`layoutSchema` then `furnishingSchema`), merges, `sanitizeSpec`, writes `spec`, `status='ready'`, `version+1`. Any thrown error → `status='error'` + short message; `spec` untouched.
  - Actions in `src/app/h/actions.ts`: `createHouse(prev, formData)` (insert, then `after(() => runPipeline(...))` from `next/server` so the redirect is immediate, redirect to `/h/[id]`), `retryHouse(houseId)`, `postComment(houseId, body)`, `moderateComment(commentId, decision: 'approve'|'reject')` (approve → status `approved`, run pipeline with `change = body`, then mark `applied`), `toggleLike(houseId)`. Each returns `ActionResult` per the server-actions skill.

- [ ] **Step 1:** `npm i ai @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/google`. Read `node_modules/ai` docs/types for the v7 structured-output API (`generateText` + `Output.object({ schema })` or `generateObject`) and use whichever is current.
- [ ] **Step 2:** Write models/crypto/settings action + dialog (provider select, model select + custom input, password field for the key showing "saved ••••last4"). Header button opens it.
- [ ] **Step 3:** Write pipeline with these prompts: Architect system prompt explains the coordinate system, non-overlapping rooms sharing walls, realistic sizes (bedroom 3-4.5 m, bathroom 2-3 m, living 4-6 m), at least one door per room, an exterior front door, windows on exterior walls, colors as hex. Interior designer system prompt lists catalog types with their dimensions and requires each item inside its room's bounds with 0.3 m clearance, against walls where sensible, rotation in 90° steps. Redesign prompts include the current spec JSON and "Apply this change requested by a visitor: <comment>. Keep everything else as similar as possible."
- [ ] **Step 4:** Add `KEY_ENCRYPTION_SECRET` to `.env.local` (`openssl rand -base64 32`) and `.env.example` (empty). Build passes. Commit `feat: BYO-key model settings and agent pipeline`.

### Task 5: Home page and house page with realtime

**Files:**
- Modify: `src/app/page.tsx`, `src/app/layout.tsx` (title "Homecraft", header with Settings + sign out)
- Create: `src/app/h/[id]/page.tsx`, `src/app/h/[id]/house-room.tsx` (client), `src/lib/realtime/use-house-room.ts`, `src/components/house/comments-panel.tsx`

**Interfaces:**
- Consumes: Tasks 2-4.
- Produces: `useHouseRoom({ houseId, me: {id, name} })` → `{ house, comments, likeCount, likedByMe, viewers: {id,name,color}[], avatars: Avatar[], sendMove(pos) }`. Initial data passed from the server page; subscribes to channel `house:{id}` with `postgres_changes` on houses (`id=eq.`), comments and likes (`house_id=eq.`), presence (`track({id,name,color})`), broadcast event `pos`. Color is a hash of user id to one of 8 hues.

- [ ] **Step 1:** Home: signed-out → hero + sign-in link; signed-in → prompt form (title + description textarea, example chips like "Cozy 2-bed cottage with an open kitchen") calling `createHouse`, and a grid of your houses (title, status, version).
- [ ] **Step 2:** House page server component: `getCurrentUser()` (redirect to `/login?next=` if none), load house + comments + like count; render `HouseRoom`. If not found → `notFound()`.
- [ ] **Step 3:** `HouseRoom`: left = `HouseScene` (full height), top-left overlay toggles (Furniture on/off, Orbit/Walk with "click to look, WASD to move, Esc to exit" hint), status pill showing `status_message` with a pulse while generating; right panel (360 px) = title, share-link copy button, like button + count, viewers list with color dots, comments list with status badges, owner-only Approve/Reject on pending comments, comment box, owner-only Retry when status is `error`.
- [ ] **Step 4:** Manual verify in two browsers (two accounts): create house → watch status → toggle furniture → walk → second user comments → owner approves → both see status stream and the new house; avatars visible in walk mode. Commit `feat: house page with realtime comments, likes, presence`.

### Task 6: Deploy and submission materials

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** README: one-paragraph description, Supabase features used, how to run (`npm i`, `.env.local` vars, `supabase db push`, `npm run dev`), and how the agent pipeline works.
- [ ] **Step 2:** Deploy to Vercel from the GitHub repo with env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `KEY_ENCRYPTION_SECRET`. Set Supabase Auth Site URL + redirect URL to the Vercel domain. If email confirmation would slow judges down, turn it off in the Supabase dashboard (Auth → Providers → Email).
- [ ] **Step 3:** Run the two-browser hero demo on the deployed URL. Make the repo public or share it with judges. Commit `docs: README for submission` and push.
