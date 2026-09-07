import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const icons = [
  ["CalendarIcon", "calendar"],
  ["CircleRectEllipseIcon", "shapes"],
  ["ClipPathIcon", "clip"],
  ["ExportDefaultIcon", "check"],
  ["GradientIcon", "gradient"],
  ["GroupIcon", "group"],
  ["MarkerIcon", "marker"],
  ["NotesIcon", "notes"],
  ["PatternIcon", "pattern"],
  ["PolygonPolylineIcon", "polygon"],
  ["StaticOnlyIcon", "circle"],
  ["XIcon", "x"],
];

const fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";

const reveal = (
  frame: number,
  range: [number, number],
  easing = Easing.bezier(0.23, 1, 0.32, 1),
) =>
  interpolate(frame, range, [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

const Terminal = ({ frame }: { frame: number }) => {
  const typed = "$ bun build-icons-preview".slice(
    0,
    Math.floor(reveal(frame, [18, 66]) * "$ bun build-icons-preview".length),
  );
  const output = [
    "Font preview written to components/nanoicons/preview.html",
    "12 glyphs ready",
  ];
  return (
    <div
      style={{
        background: "#10141c",
        border: "1px solid #303949",
        borderRadius: 14,
        boxShadow: "0 24px 70px rgba(0,0,0,.35)",
        color: "#d7e0ed",
        fontFamily,
        fontSize: 22,
        lineHeight: 1.55,
        padding: "24px 28px",
        width: 760,
      }}
    >
      <div style={{ color: "#8b98aa", fontSize: 16, marginBottom: 12 }}>
        unsvgr / example
      </div>
      <div>
        <span style={{ color: "#8b5cf6" }}>$</span> {typed}
        <span style={{ opacity: frame % 18 < 9 ? 1 : 0 }}>▌</span>
      </div>
      {output.map((line, index) => (
        <div
          key={line}
          style={{
            color: index === 0 ? "#72d6a0" : "#91a1b5",
            opacity: reveal(frame, [72 + index * 8, 84 + index * 8]),
            transform: `translateY(${(1 - reveal(frame, [72 + index * 8, 84 + index * 8])) * 8}px)`,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
};

const IconVisual = ({ variant, color }: { variant: string; color: string }) => {
  const common = {
    fill: "none",
    stroke: color,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 5,
  };

  return (
    <svg height="42" viewBox="0 0 64 64" width="42">
      {variant === "calendar" ? (
        <path d="M16 8v10m32-10v10M10 24h44M15 14h34a5 5 0 0 1 5 5v31a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5V19a5 5 0 0 1 5-5Z" {...common} />
      ) : variant === "notes" ? (
        <path d="M12 45V19a7 7 0 0 1 7-7h17m-8 34h-9a7 7 0 0 1-7-7m17-3 13-13a6 6 0 0 1 8 8L37 44l-14 4 4-14Z" {...common} />
      ) : variant === "x" ? (
        <path d="m14 14 36 36M50 14 14 50" {...common} strokeWidth={8} />
      ) : variant === "check" ? (
        <path d="m12 34 13 13 27-29" {...common} />
      ) : variant === "shapes" ? (
        <>
          <circle cx="22" cy="23" fill={color} r="10" />
          <rect fill={color} height="20" opacity=".72" rx="4" width="20" x="32" y="32" />
          <ellipse cx="46" cy="17" fill={color} opacity=".45" rx="10" ry="6" />
        </>
      ) : variant === "polygon" ? (
        <path d="m12 16 14-5 5 15-14 5-5-15Zm26 28h14M38 44l8-13 8 13M12 52l40 8" {...common} />
      ) : variant === "group" ? (
        <>
          <circle cx="25" cy="25" fill={color} opacity=".8" r="13" />
          <path d="m19 19 12 12" {...common} />
          <rect fill={color} height="16" opacity=".5" rx="2" width="23" x="32" y="39" />
        </>
      ) : variant === "clip" ? (
        <path d="M12 12h40v40H12zM22 42l8-20 8 20M25 35h10" {...common} />
      ) : variant === "gradient" ? (
        <path d="M13 48 27 16l11 24 7-14 6 22" {...common} />
      ) : variant === "marker" ? (
        <path d="M32 53 18 38a14 14 0 1 1 20-20l8 8a14 14 0 0 1 0 20L32 53Z" {...common} />
      ) : variant === "pattern" ? (
        <path d="M12 12h16v16H12zM36 12h16v16H36zM12 36h16v16H12zM36 36h16v16H36z" {...common} />
      ) : (
        <circle cx="32" cy="32" fill={color} r="17" />
      )}
    </svg>
  );
};

const PreviewWindow = ({ frame }: { frame: number }) => {
  const entrance = reveal(frame, [132, 162]);
  const dark = frame < 240;
  const copied = frame >= 260 && frame < 320;
  const background = dark ? "#17181d" : "#f8fafc";
  const foreground = dark ? "#f4f6fb" : "#151923";
  const muted = dark ? "#a9b0bf" : "#687386";
  const card = dark ? "#22252d" : "#ffffff";
  const border = dark ? "#3b404d" : "#dbe1ea";

  return (
    <div
      style={{
        background,
        borderRadius: 18,
        boxShadow: "0 30px 90px rgba(0,0,0,.42)",
        color: foreground,
        opacity: entrance,
        overflow: "hidden",
        transform: `translateY(${(1 - entrance) * 36}px) scale(${0.96 + entrance * 0.04})`,
        width: 930,
      }}
    >
      <div
        style={{
          alignItems: "center",
          borderBottom: `1px solid ${border}`,
          display: "flex",
          justifyContent: "space-between",
          padding: "18px 24px",
        }}
      >
        <div style={{ fontSize: 27, fontWeight: 750 }}>Font preview</div>
        <div style={{ color: muted, fontFamily, fontSize: 15 }}>
          {dark ? "dark mode" : "light mode"} · {copied ? "copied!" : "click an icon"}
        </div>
      </div>
      <div style={{ padding: "24px 26px 30px" }}>
        <div style={{ color: muted, fontFamily, fontSize: 16, marginBottom: 16 }}>
          svg.ttf · 12 glyphs
        </div>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(6, 1fr)",
          }}
        >
          {icons.map(([name, variant], index) => {
            const cardEntrance = reveal(frame, [136 + index * 3, 148 + index * 3]);
            const selected = copied && index === 7;
            return (
              <div
                key={name}
                style={{
                  alignItems: "center",
                  background: selected ? (dark ? "#33285a" : "#eee8ff") : card,
                  border: `1px solid ${selected ? "#8b5cf6" : border}`,
                  borderRadius: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  justifyContent: "center",
                  minHeight: 106,
                  opacity: cardEntrance,
                  transform: `translateY(${(1 - cardEntrance) * 12}px)`,
                }}
              >
                <div
                  style={{
                    color: selected ? "#a78bfa" : foreground,
                    lineHeight: 1,
                  }}
                >
                  <IconVisual color={selected ? "#a78bfa" : foreground} variant={variant} />
                </div>
                <div
                  style={{
                    background: selected ? (dark ? "#8b5cf6" : "#e5d9ff") : "transparent",
                    borderRadius: 5,
                    color: selected ? (dark ? "#ffffff" : "#6d28d9") : muted,
                    fontFamily,
                    fontSize: 12,
                    padding: selected ? "4px 6px" : "4px 0",
                  }}
                >
                  {selected ? "Copied!" : name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const MyComposition = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = spring({
    fps,
    frame,
    config: { damping: 200, stiffness: 170, mass: 0.8 },
  });
  const phase = frame < 112 ? "terminal" : frame < 132 ? "transition" : "preview";
  const titleOpacity = reveal(frame, [0, 22]);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        background: "#0b0e14",
        color: "#f3f6fb",
        display: "flex",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          left: 82,
          opacity: titleOpacity,
          position: "absolute",
          top: 56,
          transform: `translateY(${(1 - titleOpacity) * 18}px)`,
        }}
      >
        <div style={{ color: "#8b5cf6", fontFamily, fontSize: 24, letterSpacing: 2 }}>
          UNSVGR · v0.2
        </div>
        <div style={{ fontSize: 42, fontWeight: 800, marginTop: 8 }}>
          From SVG components to a clickable font preview.
        </div>
      </div>
      <div
        style={{
          opacity: phase === "terminal" ? 1 : phase === "transition" ? 1 - reveal(frame, [112, 132]) : 0,
          position: "absolute",
          transform: `translateY(${intro * 0}px)`,
        }}
      >
        <Terminal frame={frame} />
      </div>
      <div
        style={{
          opacity: phase === "preview" ? 1 : 0,
          position: "absolute",
        }}
      >
        <PreviewWindow frame={frame} />
      </div>
      {frame >= 240 ? (
        <div
          style={{
            color: "#8b5cf6",
            fontFamily,
            fontSize: 18,
            opacity: reveal(frame, [240, 255]),
            position: "absolute",
            right: 86,
            top: 64,
          }}
        >
          {frame >= 260 ? "icon name copied" : "light / dark included"}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
