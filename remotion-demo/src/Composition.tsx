import {
    AbsoluteFill,
    Easing,
    interpolate,
    spring,
    useCurrentFrame,
    useVideoConfig,
} from 'remotion';

const bg = '#0d1117';
const panel = '#161b22';
const panelSoft = '#1f2630';
const border = '#30363d';
const borderSoft = '#262c36';
const text = '#e6edf3';
const textMuted = '#8b949e';
const blue = '#58a6ff';
const yellow = '#d29922';

const topFilesBefore = [
    'components/',
    '  icon.tsx',
];
const topFilesAfter = [
    'components/',
    '  icon.tsx',
    '  svg/',
    '    CalendarIcon.svg',
    '    NotesIcon.svg',
    '    XIcon.svg',
];

const editorBefore = [
    'import Svg, { Path, SvgProps } from "react-native-svg";',
    '',
    'export function XIcon(props: SvgProps) {',
    '    return (',
    '        <Svg viewBox="0 0 12 12" {...props}>',
    '            <Path d="M11 1L1 11M1 1L11 11" />',
    '        </Svg>',
    '    );',
    '}',
];

const editorAfter = [
    '<svg width="12"',
    '    height="12"',
    '    viewBox="0 0 12 12"',
    '    fill="none"',
    '>',
    '    <path d="M11 1L1 11M1 1L11 11"',
    '        stroke="#9BA1A6"',
    '        stroke-width="2"',
    '        stroke-linecap="round"',
    '        stroke-linejoin="round"',
    '    />',
    '</svg>',
];

const terminalLines = [
    '$ bun ../index.ts -i components -o components/svg',
    'Scanning /example/components: 1 file(s)',
    'Wrote 3 file(s) to /example/components/svg:',
    '  CalendarIcon.svg (CalendarIcon)',
    '  NotesIcon.svg (NotesIcon)',
    '  XIcon.svg (XIcon)',
    'Done: 3 .svg file(s) total.',
];

const typing = (
    frame: number,
    fullText: string,
    start: number,
    charsPerFrame: number,
) => {
    const visible = Math.max(0, Math.floor((frame - start) * charsPerFrame));
    return fullText.slice(0, visible);
};

type Token = {
    text: string;
    color: string;
};

const codePalette = {
    plain: '#c9d1d9',
    keyword: '#ff7b72',
    type: '#79c0ff',
    string: '#a5d6ff',
    tag: '#7ee787',
    attr: '#d2a8ff',
    punct: '#8b949e',
};

const tsxKeywords = new Set(['import', 'from', 'export', 'function', 'return']);
const tsxTypes = new Set(['Svg', 'Path', 'SvgProps', 'XIcon']);

const tokenizeTsxLine = (line: string): Token[] => {
    const re =
        /(".*?")|(\bimport\b|\bfrom\b|\bexport\b|\bfunction\b|\breturn\b)|(\bSvgProps\b|\bSvg\b|\bPath\b|\bXIcon\b)|([{}()[\],.;]|<\/?|\/?>)/g;
    const out: Token[] = [];
    let last = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(line))) {
        if (m.index > last) {
            out.push({
                text: line.slice(last, m.index),
                color: codePalette.plain,
            });
        }
        const token = m[0];
        let color = codePalette.plain;
        if (m[1]) {
            color = codePalette.string;
        } else if (m[2] && tsxKeywords.has(token)) {
            color = codePalette.keyword;
        } else if (m[3] && tsxTypes.has(token)) {
            color = codePalette.type;
        } else if (m[4]) {
            color = codePalette.punct;
        }
        out.push({ text: token, color });
        last = re.lastIndex;
    }
    if (last < line.length) {
        out.push({ text: line.slice(last), color: codePalette.plain });
    }
    return out;
};

const tokenizeSvgLine = (line: string): Token[] => {
    const re = /(\/?>|<\/?|=)|("[^"]*")|(\bsvg\b|\bpath\b)|(\b[a-z-]+(?==))/g;
    const out: Token[] = [];
    let last = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(line))) {
        if (m.index > last) {
            out.push({
                text: line.slice(last, m.index),
                color: codePalette.plain,
            });
        }
        let color = codePalette.plain;
        if (m[1]) {
            color = codePalette.punct;
        } else if (m[2]) {
            color = codePalette.string;
        } else if (m[3]) {
            color = codePalette.tag;
        } else if (m[4]) {
            color = codePalette.attr;
        }
        out.push({ text: m[0], color });
        last = re.lastIndex;
    }
    if (last < line.length) {
        out.push({ text: line.slice(last), color: codePalette.plain });
    }
    return out;
};

const CodeBlock = ({
    lines,
    language,
}: {
    lines: string[];
    language: 'tsx' | 'svg';
}) => {
    const tokenizer = language === 'tsx' ? tokenizeTsxLine : tokenizeSvgLine;
    return (
        <div
            style={{
                fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: 17,
                lineHeight: 1.35,
                whiteSpace: 'pre',
            }}
        >
            {lines.map((line, lineIndex) => (
                <div key={`${language}-${lineIndex}-${line}`}>
                    {tokenizer(line).map((token, tokenIndex) => (
                        <span
                            key={`${language}-${lineIndex}-${tokenIndex}`}
                            style={{ color: token.color }}
                        >
                            {token.text}
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
};

const ActivityIcon = ({
    variant,
    active,
}: {
    variant: 'explorer' | 'search' | 'debug' | 'marketplace';
    active: boolean;
}) => {
    const stroke = active ? '#dbe6f3' : '#71839a';
    return (
        <div
            style={{
                width: 14,
                height: 14,
                position: 'relative',
                opacity: active ? 1 : 0.95,
            }}
        >
            {variant === 'explorer' ? (
                <>
                    <div
                        style={{
                            position: 'absolute',
                            inset: 1,
                            border: `2px solid ${stroke}`,
                            borderRadius: 2,
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            top: 2,
                            bottom: 2,
                            left: 6,
                            width: 2,
                            background: stroke,
                        }}
                    />
                </>
            ) : null}
            {variant === 'search' ? (
                <>
                    <div
                        style={{
                            position: 'absolute',
                            width: 8,
                            height: 8,
                            left: 1,
                            top: 1,
                            border: `2px solid ${stroke}`,
                            borderRadius: 999,
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            width: 6,
                            height: 2,
                            right: 0,
                            bottom: 1,
                            background: stroke,
                            transform: 'rotate(42deg)',
                            borderRadius: 2,
                        }}
                    />
                </>
            ) : null}
            {variant === 'debug' ? (
                <>
                    <div
                        style={{
                            position: 'absolute',
                            inset: 1,
                            border: `2px solid ${stroke}`,
                            borderRadius: 3,
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            left: 5,
                            top: 0,
                            width: 4,
                            height: 2,
                            background: stroke,
                            borderRadius: 2,
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            left: 5,
                            bottom: 0,
                            width: 4,
                            height: 2,
                            background: stroke,
                            borderRadius: 2,
                        }}
                    />
                </>
            ) : null}
            {variant === 'marketplace' ? (
                <>
                    <div
                        style={{
                            width: 10,
                            height: 10,
                            left: 2,
                            top: 2,
                            border: `2px solid ${stroke}`,
                            borderRadius: 2,
                            position: 'absolute',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            left: 6,
                            top: 2,
                            width: 2,
                            height: 10,
                            background: stroke,
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            left: 2,
                            top: 6,
                            width: 10,
                            height: 2,
                            background: stroke,
                        }}
                    />
                </>
            ) : null}
        </div>
    );
};

export const MyComposition = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const intro = spring({
        fps,
        frame,
        config: {
            damping: 150,
            stiffness: 210,
            mass: 0.74,
        },
    });
    const introTranslateY = interpolate(frame, [0, 26], [58, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.18, 1, 0.25, 1),
    });
    const introBlur = interpolate(frame, [0, 24], [15, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.18, 1, 0.25, 1),
    });
    const introGlow = interpolate(frame, [0, 20, 42], [0.46, 0.2, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    const introVignette = interpolate(frame, [0, 26], [0.55, 0.25], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    const introSweep = interpolate(frame, [0, 30], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    const treeRevealFrame = 110;
    const conversionStart = 136;
    const conversionProgress = interpolate(
        frame,
        [conversionStart, conversionStart + 92],
        [0, 1],
        {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.22, 1, 0.36, 1),
        },
    );

    const beforeOpacity = interpolate(conversionProgress, [0, 0.45], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    const afterOpacity = interpolate(conversionProgress, [0.45, 1], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    const terminalReveal = interpolate(frame, [35, 105], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    const terminalLinesCount = Math.floor(terminalReveal * terminalLines.length);

    const commandText = typing(
        frame,
        '$ bunx unsvgr -i components -o components/svg',
        16,
        1.7,
    );

    const showConvertedFiles = frame >= treeRevealFrame;
    const showXIconTab = frame >= treeRevealFrame + 40;
    const xIconHighlight = interpolate(
        frame,
        [treeRevealFrame + 4, treeRevealFrame + 34],
        [0, 1],
        {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.2, 0.9, 0.2, 1),
        },
    );
    const clickTravel = interpolate(
        frame,
        [treeRevealFrame + 4, treeRevealFrame + 40],
        [0, 1],
        {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.22, 1, 0.36, 1),
        },
    );
    const mouseOpacity = interpolate(
        frame,
        [treeRevealFrame - 2, treeRevealFrame + 4, treeRevealFrame + 40],
        [0, 1, 0],
        {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        },
    );
    const clickPulse = interpolate(
        frame,
        [treeRevealFrame + 40, treeRevealFrame + 46],
        [0, 1],
        {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        },
    );
    const beforeYOffset = interpolate(conversionProgress, [0, 1], [0, -14], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.2, 0.9, 0.2, 1),
    });
    const afterYOffset = interpolate(conversionProgress, [0, 1], [14, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.2, 0.9, 0.2, 1),
    });
    const beforeBlur = interpolate(conversionProgress, [0, 1], [0, 8], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    const afterBlur = interpolate(conversionProgress, [0, 1], [8, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    return (
        <AbsoluteFill
            style={{
                backgroundColor: bg,
                transform: `translateY(${introTranslateY}px) scale(${0.925 + intro * 0.075})`,
                opacity: 0.62 + intro * 0.38,
                filter: `blur(${introBlur}px)`,
                padding: 38,
                fontFamily:
                    'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background:
                        'radial-gradient(circle at 58% 18%, rgba(88,166,255,0.35), rgba(88,166,255,0) 42%)',
                    opacity: introGlow,
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background:
                        'linear-gradient(110deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 45%)',
                    opacity: introSweep,
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background:
                        'radial-gradient(circle at 50% 30%, transparent 30%, rgba(0,0,0,0.7) 100%)',
                    opacity: introVignette,
                }}
            />
            <div
                style={{
                    display: 'flex',
                    flex: 1,
                    border: `1px solid ${borderSoft}`,
                    borderRadius: 20,
                    overflow: 'hidden',
                    boxShadow:
                        '0 30px 90px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
                }}
            >
                <div
                    style={{
                        width: 64,
                        background: '#0f141b',
                        borderRight: `1px solid ${borderSoft}`,
                        padding: '14px 0',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 18,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: 6,
                        }}
                    >
                        <div
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: 999,
                                background: '#ff5f57',
                            }}
                        />
                        <div
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: 999,
                                background: '#febc2e',
                            }}
                        />
                        <div
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: 999,
                                background: '#28c840',
                            }}
                        />
                    </div>
                    {(
                        ['explorer', 'search', 'debug', 'marketplace'] as const
                    ).map(
                        (icon, idx) => (
                        <div
                            key={icon}
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: idx === 0 ? '#dbe6f3' : '#71839a',
                                background: idx === 0 ? '#1a2430' : 'transparent',
                                boxShadow:
                                    idx === 0
                                        ? 'inset 0 0 0 1px rgba(88,166,255,0.3)'
                                        : 'none',
                            }}
                        >
                            <ActivityIcon variant={icon} active={idx === 0} />
                        </div>
                    ),
                    )}
                </div>

                <div
                    style={{
                        width: 340,
                        background: panel,
                        borderRight: `1px solid ${borderSoft}`,
                        padding: '14px 14px 18px',
                        position: 'relative',
                    }}
                >
                    <div
                        style={{
                            color: textMuted,
                            fontSize: 13,
                            letterSpacing: 1.1,
                            marginBottom: 10,
                            fontWeight: 600,
                        }}
                    >
                        EXPLORER
                    </div>
                    <div
                        style={{
                            fontFamily:
                                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: 20,
                            lineHeight: 1.62,
                            color: text,
                        }}
                    >
                        {(showConvertedFiles ? topFilesAfter : topFilesBefore).map(
                            (line) => {
                                const isXIcon = line.trim() === 'XIcon.svg';
                                return (
                                    <div
                                        key={line}
                                        style={{
                                            whiteSpace: 'pre',
                                            borderRadius: 8,
                                            padding: '0 8px',
                                            margin: '1px 0',
                                            backgroundColor: isXIcon
                                                ? `rgba(88, 166, 255, ${0.08 + xIconHighlight * 0.25})`
                                                : 'transparent',
                                            color: isXIcon
                                                ? `rgba(230, 237, 243, ${0.86 + xIconHighlight * 0.14})`
                                                : text,
                                            boxShadow: isXIcon
                                                ? `inset 0 0 0 1px rgba(88, 166, 255, ${0.25 + xIconHighlight * 0.45})`
                                                : 'none',
                                        }}
                                    >
                                        {line}
                                    </div>
                                );
                            },
                        )}
                    </div>
                    {showConvertedFiles ? (
                        <>
                            <div
                                style={{
                                    position: 'absolute',
                                    left: 84 + clickTravel * 22,
                                    top: 108 + clickTravel * 138,
                                    opacity: mouseOpacity,
                                    fontSize: 31,
                                    lineHeight: 1,
                                    color: text,
                                    transform: 'rotate(-7deg)',
                                    filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.5))',
                                }}
                            >
                                👆
                            </div>
                            <div
                                style={{
                                    position: 'absolute',
                                    left: 112,
                                    top: 244,
                                    width: 16 + clickPulse * 34,
                                    height: 16 + clickPulse * 34,
                                    opacity: clickPulse > 0 ? 0.35 * (1 - clickPulse) : 0,
                                    borderRadius: 999,
                                    border: `2px solid ${blue}`,
                                    transform: `translate(-50%, -50%)`,
                                }}
                            />
                        </>
                    ) : null}
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        background: bg,
                    }}
                >
                    <div
                        style={{
                            height: 42,
                            borderBottom: `1px solid ${borderSoft}`,
                            display: 'flex',
                            alignItems: 'stretch',
                            background: '#0d1219',
                        }}
                    >
                        <div
                            style={{
                                minWidth: 102,
                                borderRight: `1px solid ${borderSoft}`,
                                background: '#121a23',
                                color: '#dde8f6',
                                fontSize: 16,
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0 14px',
                                fontWeight: 600,
                            }}
                        >
                            icon.tsx
                        </div>
                        {showXIconTab ? (
                            <div
                                style={{
                                    minWidth: 112,
                                    borderRight: `1px solid ${borderSoft}`,
                                    background: '#151f2b',
                                    color: '#cae3ff',
                                    fontSize: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0 14px',
                                    fontWeight: 600,
                                    boxShadow:
                                        'inset 0 2px 0 rgba(88,166,255,0.85)',
                                }}
                            >
                                XIcon.svg
                            </div>
                        ) : null}
                        <div style={{ flex: 1 }} />
                    </div>

                    <div
                        style={{
                            flex: 1,
                            padding: 14,
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                inset: 14,
                                opacity: beforeOpacity,
                                transform: `translateY(${beforeYOffset}px)`,
                                filter: `blur(${beforeBlur}px)`,
                            }}
                        >
                            <CodeBlock lines={editorBefore} language="tsx" />
                        </div>
                        <div
                            style={{
                                position: 'absolute',
                                inset: 14,
                                opacity: afterOpacity,
                                transform: `translateY(${afterYOffset}px)`,
                                filter: `blur(${afterBlur}px)`,
                            }}
                        >
                            <CodeBlock lines={editorAfter} language="svg" />
                        </div>
                    </div>

                    <div
                        style={{
                            height: 240,
                            borderTop: `1px solid ${borderSoft}`,
                            background: panelSoft,
                            padding: '14px 18px',
                            overflow: 'visible',
                        }}
                    >
                        <div
                            style={{
                                color: textMuted,
                                fontSize: 16,
                                marginBottom: 8,
                            }}
                        >
                            TERMINAL
                        </div>
                        <div
                            style={{
                                fontFamily:
                                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                fontSize: 18,
                                lineHeight: 1.35,
                                color: text,
                                whiteSpace: 'pre',
                            }}
                        >
                            <span style={{ color: yellow }}>{commandText}</span>
                            {'\n'}
                            {terminalLines
                                .slice(1, Math.max(1, terminalLinesCount))
                                .join('\n')}
                        </div>
                    </div>
                </div>
            </div>
        </AbsoluteFill>
    );
};
