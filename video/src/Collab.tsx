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
type Seg = { from: number; to: number; seconds?: number; caption: string; sub?: string };
const SEGS: Seg[] = [
  { from: at("start") + 0.5, to: at("design-clicked"), seconds: 9, caption: "Maya and Sam, two laptops, two accounts", sub: "Maya describes the home she wants." },
  { from: at("design-clicked"), to: at("friend-joined") + 2, caption: "Maya hits Design", sub: "The architect agent starts planning live." },
  { from: at("friend-joined") + 2, to: at("built"), seconds: 22, caption: "Sam opens the link and joins", sub: "Both watch the agents build every room, storey and yard in realtime." },
  { from: at("built"), to: at("suggestion-posted") + 1, seconds: 10, caption: "Sam suggests an idea", sub: "“Add a hot tub and lounge chairs by the pool”" },
  { from: at("suggestion-posted") + 1, to: at("approved") + 1, seconds: 6, caption: "Maya sees it instantly and approves", sub: "Supabase Realtime pushes the suggestion to her screen." },
  { from: at("approved") + 1, to: at("redesigned") + 2, seconds: 14, caption: "The agents build it, live for both", sub: "Every change lands in Postgres and streams to everyone in the house." },
  { from: at("redesigned") + 2, to: at("chat-done") + 1.5, seconds: 10, caption: "Quick edits from the build chat", sub: "“Make the living room walls sage green”" },
  { from: at("chat-done") + 1.5, to: at("end"), seconds: 8, caption: "Maya lifts the roof to look inside" },
];
const plan = SEGS.map((s) => {
  const src = s.to - s.from;
  const shown = Math.min(src, s.seconds ?? src);
  return { ...s, rate: src / shown, frames: Math.round(shown * FPS) };
});

const INTRO = 4 * FPS;
const OUTRO = 8 * FPS;
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

export const Collab: React.FC = () => {
  let cursor = INTRO;
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Sequence durationInFrames={INTRO}>
        <Title d={INTRO} kicker="Supabase Select 2026 Hackathon" title="Homebrewer" lines={["Design and build a home together, live, with AI agents."]} />
      </Sequence>
      {plan.map((p) => {
        const from = cursor;
        cursor += p.frames;
        return (
          <Sequence key={p.caption} from={from} durationInFrames={p.frames}>
            <AbsoluteFill style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 7 }}>
              <Pane src="owner.webm" label="Maya · owner" from={p.from} rate={p.rate} />
              <Pane src="friend.webm" label="Sam · friend" from={p.from} rate={p.rate} />
            </AbsoluteFill>
            <Caption title={p.caption} sub={p.sub} duration={p.frames} rate={p.rate} />
          </Sequence>
        );
      })}
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
