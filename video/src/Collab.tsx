import { AbsoluteFill, Composition, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import events from "./events.json";

const FPS = 30;
const INK = "#0b0f17";
const ACCENT = "#3ecf8e";
const font = "Inter, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

const at = (name: string) => {
  const e = (events as { name: string; t: number }[]).find((x) => x.name === name);
  if (!e) throw new Error(`missing event ${name}`);
  return e.t;
};

// Source ranges (seconds of the recording) and how long each should play on screen.
// A segment with a caption starts a beat; segments without one continue it, so the caption stays up
// across the cuts. Waits are cut to ~1.5 s of the agents working, then jump straight to the result.
type Seg = { from: number; to: number; seconds?: number; caption?: string; sub?: string };
const SEGS: Seg[] = [
  { from: at("start") + 0.5, to: at("design-clicked"), seconds: 9, caption: "Maya and Sam, two laptops, two accounts", sub: "Maya describes the home she wants." },
  { from: at("design-clicked"), to: at("design-clicked") + 2, caption: "Maya hits Design and Sam opens the link", sub: "Both watch the agents start building, live." },
  { from: at("friend-joined") + 1.5, to: at("friend-joined") + 3.5 },
  { from: at("built") - 0.3, to: at("built") + 4.5, caption: "The whole house lands for both", sub: "23 rooms, two storeys, a pool and 102 pieces of furniture." },
  { from: at("built") + 4.5, to: at("suggestion-posted") + 1, seconds: 9, caption: "Sam suggests an idea", sub: "“Add a hot tub and lounge chairs by the pool”" },
  { from: at("suggestion-posted") + 1, to: at("approved") + 1, seconds: 5, caption: "Maya sees it instantly and approves", sub: "Supabase Realtime pushes the suggestion to her screen." },
  { from: at("approved") + 1, to: at("approved") + 2.5, caption: "The agents rebuild it, live for both", sub: "A lounger now sits by the pool, in both windows." },
  { from: at("redesigned") - 0.3, to: at("redesigned") + 3 },
  { from: at("redesigned") + 3, to: at("chat-edit") + 1.5, seconds: 4, caption: "Quick edits from the build chat", sub: "“Make the living room walls sage green”, done in seconds." },
  { from: at("chat-done") - 0.3, to: at("chat-done") + 2 },
  { from: at("chat-done") + 2, to: at("end"), seconds: 8, caption: "Maya lifts the roof to look inside" },
];
const plan = SEGS.map((s) => {
  const src = s.to - s.from;
  const shown = Math.min(src, s.seconds ?? src);
  return { ...s, rate: src / shown, frames: Math.round(shown * FPS) };
});

const INTRO = 5 * FPS;
const OUTRO = 10 * FPS;
export const COLLAB_TOTAL = INTRO + plan.reduce((a, p) => a + p.frames, 0) + OUTRO;

const fade = (frame: number, d: number) => interpolate(frame, [0, 10, d - 10, d], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const Pane: React.FC<{ src: string; label: string; from: number; rate: number }> = ({ src, label, from, rate }) => (
  <div style={{ position: "relative", width: 948, height: 1066, borderRadius: 18, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
    <OffthreadVideo src={staticFile(src)} trimBefore={Math.round(from * FPS)} playbackRate={rate} muted style={{ width: "100%", height: "100%" }} />
    <div style={{ position: "absolute", left: 16, bottom: 16, padding: "8px 16px", borderRadius: 999, background: "rgba(11,15,23,0.85)", color: "white", fontFamily: font, fontSize: 24, fontWeight: 600 }}>
      {label}
    </div>
  </div>
);

const Caption: React.FC<{ title: string; sub?: string; duration: number; rate: number }> = ({ title, sub, duration, rate }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        position: "absolute",
        top: 30,
        left: "50%",
        transform: `translate(-50%, ${(1 - t) * -30}px)`,
        opacity: t * fade(frame, duration),
        maxWidth: 1500,
        padding: "22px 36px",
        borderRadius: 24,
        background: "rgba(11,15,23,0.9)",
        border: `2px solid ${ACCENT}`,
        color: "white",
        fontFamily: font,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 46, fontWeight: 800 }}>{title}</div>
      {sub && <div style={{ fontSize: 30, marginTop: 8, color: "rgba(255,255,255,0.85)" }}>{sub}</div>}
      {rate > 1.3 && <div style={{ fontSize: 22, marginTop: 8, color: ACCENT, fontWeight: 600 }}>{rate.toFixed(0)}× speed</div>}
    </div>
  );
};

const Title: React.FC<{ d: number; title: string; lines: string[]; kicker?: string }> = ({ d, title, lines, kicker }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#f7f5f0", justifyContent: "center", alignItems: "center", fontFamily: font, color: "#111827", opacity: fade(frame, d), textAlign: "center" }}>
      {kicker && <div style={{ fontSize: 32, fontWeight: 600, color: "#16a36a", letterSpacing: 3, textTransform: "uppercase" }}>{kicker}</div>}
      <div style={{ fontSize: 130, fontWeight: 800, letterSpacing: -3, marginTop: 12 }}>{title}</div>
      {lines.map((l) => (
        <div key={l} style={{ fontSize: 42, marginTop: 18, color: "#374151", maxWidth: 1500 }}>{l}</div>
      ))}
    </AbsoluteFill>
  );
};

// Where each segment starts in the video, and each caption beat spanning its continuation segments.
const starts = plan.map((_, i) => INTRO + plan.slice(0, i).reduce((a, p) => a + p.frames, 0));
const beats = plan.flatMap((p, i) => {
  if (!p.caption) return [];
  let end = i + 1;
  while (end < plan.length && !plan[end].caption) end++;
  const frames = plan.slice(i, end).reduce((a, q) => a + q.frames, 0);
  return [{ title: p.caption, sub: p.sub, rate: p.rate, from: starts[i], frames }];
});
const cursor = INTRO + plan.reduce((a, p) => a + p.frames, 0);

export const Collab: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Sequence durationInFrames={INTRO}>
        <Title d={INTRO} kicker="Supabase Select 2026 Hackathon" title="Homebrewer" lines={["Design and build a home together, live, with AI agents."]} />
      </Sequence>
      {plan.map((p, i) => (
        <Sequence key={i} from={starts[i]} durationInFrames={p.frames}>
          <AbsoluteFill style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 7 }}>
            <Pane src="owner.webm" label="Maya · owner" from={p.from} rate={p.rate} />
            <Pane src="friend.webm" label="Sam · friend" from={p.from} rate={p.rate} />
          </AbsoluteFill>
        </Sequence>
      ))}
      {beats.map((b) => (
        <Sequence key={b.title} from={b.from} durationInFrames={b.frames}>
          <Caption title={b.title} sub={b.sub} duration={b.frames} rate={b.rate} />
        </Sequence>
      ))}
      <Sequence from={cursor} durationInFrames={OUTRO}>
        <Title
          d={OUTRO}
          kicker="Built on Supabase"
          title="Homebrewer"
          lines={["Auth for owners and friends · Postgres + RLS for houses and suggestions", "Realtime for live builds, presence and walking together"]}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

export const CollabComposition = () => (
  <Composition id="HomebrewerCollab" component={Collab} durationInFrames={COLLAB_TOTAL} fps={FPS} width={1920} height={1080} />
);
