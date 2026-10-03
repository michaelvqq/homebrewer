import { AbsoluteFill, Composition, Easing, Img, interpolate, Series, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

const FPS = 30;
const s = (seconds: number) => Math.round(seconds * FPS);

const INK = "#111827";
const PAPER = "#f7f5f0";
const ACCENT = "#3ecf8e"; // Supabase green
const font = "Inter, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

// Fades every scene in and out so cuts feel soft.
const useFade = (duration: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [0, 10, duration - 10, duration], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};

const Caption: React.FC<{ title: string; body?: string; step?: string }> = ({ title, body, step }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 8, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        bottom: 80,
        maxWidth: 1100,
        padding: "36px 44px",
        borderRadius: 28,
        background: "rgba(17, 24, 39, 0.85)",
        color: "white",
        fontFamily: font,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 40}px)`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}
    >
      {step && <div style={{ fontSize: 26, fontWeight: 600, color: ACCENT, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>{step}</div>}
      <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
      {body && <div style={{ fontSize: 34, lineHeight: 1.35, marginTop: 16, color: "rgba(255,255,255,0.85)" }}>{body}</div>}
    </div>
  );
};

// A screenshot with a slow Ken Burns push toward `focus` (0-1 coordinates).
const Shot: React.FC<{ src: string; duration: number; focus?: [number, number]; to?: number; children?: React.ReactNode }> = ({
  src,
  duration,
  focus = [0.4, 0.5],
  to = 1.18,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = useFade(duration);
  const scale = interpolate(frame, [0, duration], [1.04, to], { easing: Easing.inOut(Easing.quad) });
  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%` }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      {children}
    </AbsoluteFill>
  );
};

const Card: React.FC<{ duration: number; kicker?: string; title: string; lines?: string[]; big?: boolean }> = ({ duration, kicker, title, lines = [], big }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = useFade(duration);
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, opacity, justifyContent: "center", alignItems: "center", fontFamily: font, color: INK }}>
      <div style={{ maxWidth: 1500, textAlign: "center" }}>
        {kicker && <div style={{ fontSize: 34, fontWeight: 600, color: "#16a36a", letterSpacing: 3, textTransform: "uppercase" }}>{kicker}</div>}
        <div style={{ fontSize: big ? 150 : 84, fontWeight: 800, letterSpacing: big ? -4 : -1, lineHeight: 1.05, marginTop: 20 }}>{title}</div>
        {lines.map((line, i) => {
          const t = spring({ frame: frame - 15 - i * 12, fps, config: { damping: 200 } });
          return (
            <div key={line} style={{ fontSize: 42, lineHeight: 1.4, marginTop: i === 0 ? 40 : 14, color: "#374151", opacity: t, transform: `translateY(${(1 - t) * 24}px)` }}>
              {line}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Stack: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = useFade(duration);
  const items = [
    ["Auth", "Sign in to build; anyone with the link can visit a house"],
    ["Postgres + RLS", "Houses, suggestions and chat live in tables behind row-level security"],
    ["Realtime", "Every rebuild and every visitor shows up live for everyone in the house"],
    ["Bring your own model", "Claude, GPT or Gemini: pick a model, use your key or the demo key"],
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity, fontFamily: font, color: "white", padding: 120, justifyContent: "center" }}>
      <div style={{ fontSize: 34, fontWeight: 600, color: ACCENT, letterSpacing: 3, textTransform: "uppercase" }}>Built on Supabase</div>
      <div style={{ fontSize: 80, fontWeight: 800, marginTop: 16, marginBottom: 50 }}>Real auth. Real data. Live.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {items.map(([title, body], i) => {
          const t = spring({ frame: frame - 10 - i * 8, fps, config: { damping: 200 } });
          return (
            <div key={title} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, padding: 36, opacity: t, transform: `scale(${0.95 + 0.05 * t})` }}>
              <div style={{ fontSize: 44, fontWeight: 700, color: ACCENT }}>{title}</div>
              <div style={{ fontSize: 32, marginTop: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.35 }}>{body}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const SCENES: { d: number; el: (d: number) => React.ReactNode }[] = [
  { d: s(5), el: (d) => <Card duration={d} kicker="Supabase Select 2026 Hackathon" title="Homebrewer" lines={["Describe a home. AI agents build it in 3D."]} big /> },
  {
    d: s(7),
    el: (d) => (
      <Shot src="01-landing.png" duration={d} focus={[0.5, 0.4]}>
        <Caption step="1 · Describe" title="One sentence is enough" body="“Build a 2 story house with a backyard pool.”" />
      </Shot>
    ),
  },
  {
    d: s(9),
    el: (d) => (
      <Shot src="02-two-storey-roof.png" duration={d} focus={[0.4, 0.55]}>
        <Caption step="2 · Agents build" title="The entire house" body="An architect agent plans every storey, the yards and the roof. A designer agent furnishes it." />
      </Shot>
    ),
  },
  {
    d: s(7),
    el: (d) => (
      <Shot src="03-two-storey-inside.png" duration={d} focus={[0.4, 0.45]}>
        <Caption step="3 · Explore" title="Lift the roof off" body="Every layer toggles with an animation: roof, upstairs, ground floor." />
      </Shot>
    ),
  },
  {
    d: s(8),
    el: (d) => (
      <Shot src="04-ground-floor-cutaway.png" duration={d} focus={[0.45, 0.4]} to={1.3}>
        <Caption title="Floor by floor" body="Stair halls line up between storeys. Hide the upper floor to see the ground floor plan." />
      </Shot>
    ),
  },
  {
    d: s(6),
    el: (d) => (
      <Shot src="05-upstairs.png" duration={d} focus={[0.45, 0.4]} to={1.28}>
        <Caption title="Then walk it" body="Switch to Walk mode and stroll through any floor in first person." />
      </Shot>
    ),
  },
  {
    d: s(8),
    el: (d) => (
      <Card
        duration={d}
        kicker="Smarter agents"
        title="Design rules from real houses"
        lines={["Room sizes, zoning, circulation, windows and yards,", "learned from vetted real homes.", "No walking through a bedroom to reach the kitchen."]}
      />
    ),
  },
  { d: s(4), el: (d) => <Shot src="06-house-roof.png" duration={d}><Caption title="Lofts" /></Shot> },
  { d: s(4), el: (d) => <Shot src="07-house-roof.png" duration={d}><Caption title="Cabins" /></Shot> },
  { d: s(4), el: (d) => <Shot src="08-house-roof.png" duration={d}><Caption title="Family homes" /></Shot> },
  {
    d: s(7),
    el: (d) => (
      <Shot src="09-house-inside.png" duration={d} focus={[0.4, 0.45]} to={1.3}>
        <Caption title="Furnished room by room" body="Beds against walls, clear walkways, front yards and backyards." />
      </Shot>
    ),
  },
  {
    d: s(8),
    el: (d) => (
      <Card
        duration={d}
        kicker="Built together, live"
        title="Share a link. Build with friends."
        lines={["See who else is in the house.", "Pin a suggestion anywhere, chat with the build agent,", "and watch it redesign live for everyone."]}
      />
    ),
  },
  { d: s(9), el: (d) => <Stack duration={d} /> },
  { d: s(5), el: (d) => <Card duration={d} title="Homebrewer" lines={["Homes, brewed by agents."]} big /> },
];

export const TOTAL = SCENES.reduce((a, sc) => a + sc.d, 0);

export const Demo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK }}>
    <Series>
      {SCENES.map((sc, i) => (
        <Series.Sequence key={i} durationInFrames={sc.d}>
          {sc.el(sc.d)}
        </Series.Sequence>
      ))}
    </Series>
  </AbsoluteFill>
);

export const MyComposition = () => (
  <Composition id="HomebrewerDemo" component={Demo} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
);
