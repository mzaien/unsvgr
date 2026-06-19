import { afterAll, describe, expect, test } from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
    convertTSXToSVG,
    convertTSXToSvgFolder,
    discoverSvgSourceFiles,
    extractAllSvgComponents,
    extractSVGContent,
    svgContainsFilterOrMask,
    transformTSXToSVG,
    camelToKebabAttr,
    pascalComponentToSvgTag,
    coercePropsBraceExpressions,
    runConversion,
} from './index';

const tempRoots: string[] = [];

function makeTempDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unsvgr-'));
    tempRoots.push(dir);
    return dir;
}

function write(filePath: string, content: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
}

afterAll(() => {
    for (const dir of tempRoots) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

describe('convertTSXToSVG aggressive literal fallback resolution', () => {
    test('resolves fully static icons (no dynamic props)', () => {
        const root = makeTempDir();
        write(
            path.join(root, 'icon.tsx'),
            [
                "import Svg, { Circle, Path } from 'react-native-svg';",
                'export function StaticIcon() {',
                '    return (',
                "        <Svg viewBox=\"0 0 12 12\" fill=\"none\">",
                "            <Circle cx=\"6\" cy=\"6\" r=\"5\" fill=\"#FFD700\" />",
                "            <Path d=\"M3 6L5 8L9 4\" stroke=\"#333\" strokeWidth={2} />",
                '        </Svg>',
                '    );',
                '}',
            ].join('\n'),
        );
        const out = convertTSXToSVG(path.join(root, 'icon.tsx'));
        expect(out).not.toBeNull();
        const svg = out?.svgContent ?? '';
        expect(svg).toContain('fill="#FFD700"');
        expect(svg).toContain('stroke="#333"');
        expect(svg).toContain('stroke-width="2"');
    });

    test('resolves static template literal expressions', () => {
        const root = makeTempDir();
        write(
            path.join(root, 'icon.tsx'),
            [
                "import Svg, { Circle, Path } from 'react-native-svg';",
                'export function TemplateIcon(props: any) {',
                '    return (',
                "        <Svg viewBox=\"0 0 12 12\" fill=\"none\">",
                "            <Circle cx=\"6\" cy=\"6\" r=\"5\" fill={`#${'FF0000'}`} />",
                "            <Path d=\"M3 6L5 8L9 4\" stroke={`hsl(0, 100%, ${50}%)`} strokeWidth={2} />",
                '        </Svg>',
                '    );',
                '}',
            ].join('\n'),
        );
        const out = convertTSXToSVG(path.join(root, 'icon.tsx'));
        expect(out).not.toBeNull();
        const svg = out?.svgContent ?? '';
        expect(svg).toContain('fill="#FF0000"');
        expect(svg).toContain('stroke="hsl(0, 100%, 50%)"');
    });

    test('resolves static ternary expressions', () => {
        const root = makeTempDir();
        write(
            path.join(root, 'icon.tsx'),
            [
                "import Svg, { Circle, Path } from 'react-native-svg';",
                'export function TernaryIcon(props: any) {',
                '    return (',
                "        <Svg viewBox=\"0 0 12 12\" fill=\"none\">",
                "            <Circle cx=\"6\" cy=\"6\" r=\"5\" fill={true ? '#FF0000' : '#00FF00'} />",
                "            <Path d=\"M3 6L5 8L9 4\" stroke={1 > 0 ? '#333' : '#666'} strokeWidth={2} />",
                '        </Svg>',
                '    );',
                '}',
            ].join('\n'),
        );
        const out = convertTSXToSVG(path.join(root, 'icon.tsx'));
        expect(out).not.toBeNull();
        const svg = out?.svgContent ?? '';
        expect(svg).toContain('fill="#FF0000"');
        expect(svg).toContain('stroke="#333"');
    });

    test('resolves local const, imported object path, ternary, and template literal fallbacks', () => {
        const root = makeTempDir();
        write(
            path.join(root, 'theme.ts'),
            [
                "const tintColorDark = '#fff';",
                'export const Colors = {',
                '    dark: {',
                "        icon: '#9BA1A6',",
                '        tint: tintColorDark,',
                '    },',
                '};',
            ].join('\n'),
        );
        write(
            path.join(root, 'icon.tsx'),
            [
                "import Svg, { Path } from 'react-native-svg';",
                "import { Colors } from './theme';",
                "const defaultColor = '#FCFCFC';",
                "const palette = { primary: 'A1B2C3' };",
                'export function CalendarIcon(props: any) {',
                '    return (',
                '        <Svg viewBox="0 0 20 22" fill="none">',
                '            <Path',
                "                d='M1 1L5 5'",
                '                stroke={props.color || defaultColor}',
                '                fill={props.fill ?? Colors.dark.icon}',
                '                opacity={props.opacity || (1 - 0.2)}',
                '                markerStart={props.marker ? props.marker : `#${palette.primary}`}',
                '            />',
                '        </Svg>',
                '    );',
                '}',
            ].join('\n'),
        );

        const out = convertTSXToSVG(path.join(root, 'icon.tsx'));
        expect(out).not.toBeNull();
        const svg = out?.svgContent ?? '';
        expect(svg).toContain('stroke="#FCFCFC"');
        expect(svg).toContain('fill="#9BA1A6"');
        expect(svg).toContain('opacity="0.8"');
        expect(svg).toContain('marker-start="#A1B2C3"');
    });

    test('skips unresolved dynamic expression as non-convertible', () => {
        const root = makeTempDir();
        write(
            path.join(root, 'icon.tsx'),
            [
                "import Svg, { Path } from 'react-native-svg';",
                'const defaultColor = "#FCFCFC";',
                'function getColor() { return defaultColor; }',
                'export function XIcon(props: any) {',
                '    return (',
                '        <Svg viewBox="0 0 12 12" fill="none">',
                '            <Path',
                "                d='M1 1L11 11'",
                '                stroke={props.color || getColor()}',
                '            />',
                '        </Svg>',
                '    );',
                '}',
            ].join('\n'),
        );

        const out = convertTSXToSVG(path.join(root, 'icon.tsx'));
        expect(out).toBeNull();
    });

    test('reports non-convertible icon names and reasons in batch output', () => {
        const root = makeTempDir();
        const outputDir = path.join(root, 'out');
        write(
            path.join(root, 'icons.tsx'),
            [
                "import Svg, { Path } from 'react-native-svg';",
                'const defaultColor = "#FCFCFC";',
                'function getColor() { return defaultColor; }',
                'export function CheckIcon() {',
                '    return (',
                '        <Svg viewBox="0 0 12 12" fill="none">',
                "            <Path d='M1 1L11 11' stroke='#FCFCFC' />",
                '        </Svg>',
                '    );',
                '}',
                'export function XIcon(props: any) {',
                '    return (',
                '        <Svg viewBox="0 0 12 12" fill="none">',
                '            <Path',
                "                d='M1 1L11 11'",
                '                stroke={props.color || getColor()}',
                '            />',
                '        </Svg>',
                '    );',
                '}',
            ].join('\n'),
        );

        const out = convertTSXToSvgFolder(path.join(root, 'icons.tsx'), outputDir);
        expect(out).not.toBeNull();
        expect(out?.files).toEqual([
            {
                outputPath: path.join(outputDir, 'CheckIcon.svg'),
                componentName: 'CheckIcon',
            },
        ]);
        expect(out?.skippedNonConvertible).toEqual([
            {
                componentName: 'XIcon',
                reason: 'unresolved dynamic expression: props.color || getColor()',
            },
        ]);
    });
});

describe('discoverSvgSourceFiles', () => {
    test('returns empty for non-existent dir', () => {
        expect(discoverSvgSourceFiles('/nonexistent/path/xyz')).toEqual([]);
    });

    test('returns empty for empty dir', () => {
        const root = makeTempDir();
        expect(discoverSvgSourceFiles(root)).toEqual([]);
    });

    test('finds files containing <Svg>', () => {
        const root = makeTempDir();
        write(
            path.join(root, 'icon.tsx'),
            "import Svg, { Path } from 'react-native-svg';\nexport function Icon() { return (<Svg viewBox=\"0 0 12 12\"><Path d=\"M1 1\" /></Svg>); }",
        );
        write(
            path.join(root, 'not-icon.tsx'),
            "export function Foo() { return <div>hello</div>; }",
        );
        const results = discoverSvgSourceFiles(root);
        expect(results.length).toBe(1);
        expect(results[0]).toContain('icon.tsx');
    });

    test('excludes files without <Svg>', () => {
        const root = makeTempDir();
        write(path.join(root, 'a.tsx'), 'const x = 1;');
        write(path.join(root, 'b.ts'), 'export default {}');
        expect(discoverSvgSourceFiles(root)).toEqual([]);
    });

    test('scans recursively', () => {
        const root = makeTempDir();
        write(
            path.join(root, 'sub', 'icon.tsx'),
            "import Svg, { Path } from 'react-native-svg';\nexport function Icon() { return (<Svg viewBox=\"0 0 12 12\"><Path d=\"M1 1\" /></Svg>); }",
        );
        const results = discoverSvgSourceFiles(root);
        expect(results.length).toBe(1);
    });
});

describe('extractAllSvgComponents', () => {
    test('extracts named function export with Svg', () => {
        const tsx = "import Svg, { Path } from 'react-native-svg';\nexport function Foo() { return (<Svg viewBox=\"0 0 12 12\"><Path d=\"M1 1\" /></Svg>); }";
        const result = extractAllSvgComponents(tsx);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Foo');
        expect(result[0].svgFragment).toContain('<Svg');
    });

    test('extracts default function export', () => {
        const tsx = "import Svg, { Path } from 'react-native-svg';\nexport default function Bar() { return (<Svg viewBox=\"0 0 12 12\"><Path d=\"M1 1\" /></Svg>); }";
        const result = extractAllSvgComponents(tsx);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Bar');
    });

    test('extracts export default binding', () => {
        const tsx = "import Svg, { Path } from 'react-native-svg';\nconst Foo = () => (<Svg viewBox=\"0 0 12 12\"><Path d=\"M1 1\" /></Svg>);\nexport default Foo;";
        const result = extractAllSvgComponents(tsx);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Foo');
    });

    test('extracts multiple components', () => {
        const tsx = "import Svg, { Path } from 'react-native-svg';\nexport function A() { return (<Svg viewBox=\"0 0 12 12\"><Path d=\"M1 1\" /></Svg>); }\nexport function B() { return (<Svg viewBox=\"0 0 12 12\"><Path d=\"M2 2\" /></Svg>); }";
        const result = extractAllSvgComponents(tsx);
        expect(result).toHaveLength(2);
        expect(result.map((c: { name: string }) => c.name)).toContain('A');
        expect(result.map((c: { name: string }) => c.name)).toContain('B');
    });

    test('skips components without Svg', () => {
        const tsx = "export function NoSvg() { return <div>hello</div>; }";
        const result = extractAllSvgComponents(tsx);
        expect(result).toHaveLength(0);
    });

    test('extracts export default object pattern icons', () => {
        const tsx = [
            "import Svg, { Rect, Path } from 'react-native-svg';",
            "const defaultColor = '#FCFCFC';",
            'export const IconA = () => (',
            "    <Svg viewBox=\"0 0 12 12\" fill=\"none\">",
            "        <Rect x=\"1\" y=\"1\" width=\"10\" height=\"10\" fill={defaultColor} rx={2} />",
            '    </Svg>',
            ');',
            'export const IconB = () => (',
            "    <Svg viewBox=\"0 0 12 12\" fill=\"none\">",
            "        <Path d=\"M4 6L6 8\" stroke=\"#333\" strokeWidth={2} />",
            '    </Svg>',
            ');',
            'export default { IconA, IconB };',
        ].join('\n');
        const result = extractAllSvgComponents(tsx);
        expect(result).toHaveLength(2);
        expect(result.map((c: { name: string }) => c.name)).toContain('IconA');
        expect(result.map((c: { name: string }) => c.name)).toContain('IconB');
    });
});

describe('svgContainsFilterOrMask', () => {
    test('detects filter tag', () => {
        expect(svgContainsFilterOrMask('<filter><feGaussianBlur /></filter>')).toBe(true);
    });

    test('detects mask tag', () => {
        expect(svgContainsFilterOrMask('<mask id="m"><rect /></mask>')).toBe(true);
    });

    test('detects mask attribute', () => {
        expect(svgContainsFilterOrMask('<rect mask="url(#clip)" />')).toBe(true);
    });

    test('detects filter attribute', () => {
        expect(svgContainsFilterOrMask('<rect filter="url(#blur)" />')).toBe(true);
    });

    test('returns false for clean SVG', () => {
        expect(svgContainsFilterOrMask('<path d="M1 1" />')).toBe(false);
    });
});

describe('extractSVGContent', () => {
    test('extracts basic SVG', () => {
        const result = extractSVGContent('<Svg viewBox="0 0 12 12"><Path d="M1 1" /></Svg>');
        expect(result).toContain('<Svg');
        expect(result).toContain('</Svg>');
    });

    test('returns empty string when no SVG', () => {
        expect(extractSVGContent('const x = 1;')).toBe('');
    });

    test('extracts self-closing SVG', () => {
        const result = extractSVGContent('<Svg viewBox="0 0 12 12" />');
        expect(result).toContain('Svg');
    });
});

describe('transformTSXToSVG', () => {
    test('strips key attribute', () => {
        const result = transformTSXToSVG('<Path key="1" d="M1 1" />');
        expect(result).not.toContain('key=');
    });

    test('strips ref attribute', () => {
        const result = transformTSXToSVG('<Path ref={myRef} d="M1 1" />');
        expect(result).not.toContain('ref=');
    });

    test('strips spread attributes', () => {
        const result = transformTSXToSVG('<Path {...props} d="M1 1" />');
        expect(result).not.toContain('{...props}');
    });

    test('maps className to class', () => {
        const result = transformTSXToSVG('<Svg className="icon" viewBox="0 0 12 12" />');
        expect(result).toContain('class=');
        expect(result).not.toContain('className=');
    });

    test('maps camelCase to kebab-case', () => {
        const result = transformTSXToSVG('<Path strokeWidth={2} d="M1 1" />');
        expect(result).toContain('stroke-width=');
    });

    test('keeps viewBox as camelCase', () => {
        const result = transformTSXToSVG('<Svg viewBox="0 0 12 12" />');
        expect(result).toContain('viewBox=');
    });

    test('coerces numeric brace attributes', () => {
        const result = transformTSXToSVG('<Path width={42} d="M1 1" />');
        expect(result).toContain('width="42"');
    });
});

describe('convertTSXToSvgFolder batch', () => {
    test('single component produces one file', () => {
        const root = makeTempDir();
        const out = path.join(root, 'out');
        write(
            path.join(root, 'icon.tsx'),
            "import Svg, { Path } from 'react-native-svg';\nexport function Icon() { return (<Svg viewBox=\"0 0 12 12\"><Path d=\"M1 1\" /></Svg>); }",
        );
        const result = convertTSXToSvgFolder(path.join(root, 'icon.tsx'), out);
        expect(result).not.toBeNull();
        expect(result?.files).toHaveLength(1);
        expect(result?.files[0].componentName).toBe('Icon');
    });

    test('multiple components produce correct count', () => {
        const root = makeTempDir();
        const out = path.join(root, 'out');
        write(
            path.join(root, 'icons.tsx'),
            "import Svg, { Path } from 'react-native-svg';\nexport function A() { return (<Svg viewBox=\"0 0 12 12\"><Path d=\"M1 1\" /></Svg>); }\nexport function B() { return (<Svg viewBox=\"0 0 12 12\"><Path d=\"M2 2\" /></Svg>); }",
        );
        const result = convertTSXToSvgFolder(path.join(root, 'icons.tsx'), out);
        expect(result?.files).toHaveLength(2);
    });

    test('auto-creates output directory', () => {
        const root = makeTempDir();
        const out = path.join(root, 'deep', 'nested', 'out');
        write(
            path.join(root, 'icon.tsx'),
            "import Svg, { Path } from 'react-native-svg';\nexport function Icon() { return (<Svg viewBox=\"0 0 12 12\"><Path d=\"M1 1\" /></Svg>); }",
        );
        convertTSXToSvgFolder(path.join(root, 'icon.tsx'), out);
        expect(fs.existsSync(out)).toBe(true);
    });
});

describe('utility functions', () => {
    test('camelToKebabAttr converts correctly', () => {
        expect(camelToKebabAttr('strokeWidth')).toBe('stroke-width');
        expect(camelToKebabAttr('strokeLinecap')).toBe('stroke-linecap');
    });

    test('pascalComponentToSvgTag converts correctly', () => {
        expect(pascalComponentToSvgTag('Circle')).toBe('circle');
        expect(pascalComponentToSvgTag('TSpan')).toBe('tspan');
        expect(pascalComponentToSvgTag('G')).toBe('g');
        expect(pascalComponentToSvgTag('Path')).toBe('path');
    });
});

describe('convertTSXToSvgFolder dry-run', () => {
    test('dry-run does not write files', () => {
        const root = makeTempDir();
        const out = path.join(root, 'dryout');
        write(
            path.join(root, 'icon.tsx'),
            "import Svg, { Path } from 'react-native-svg';\nexport function Icon() { return (<Svg viewBox=\"0 0 12 12\"><Path d=\"M1 1\" /></Svg>); }",
        );
        const result = convertTSXToSvgFolder(path.join(root, 'icon.tsx'), out, { dryRun: true });
        expect(result).not.toBeNull();
        expect(result?.files).toHaveLength(1);
        expect(result?.files[0].componentName).toBe('Icon');
        expect(fs.existsSync(result!.files[0].outputPath)).toBe(false);
        expect(fs.existsSync(out)).toBe(false);
    });
});

describe('CLI integration via runConversion', () => {
    test('converts a valid input file', async () => {
        const root = makeTempDir();
        const out = path.join(root, 'out');
        write(
            path.join(root, 'icon.tsx'),
            "import Svg, { Path } from 'react-native-svg';\nexport function Icon() { return (<Svg viewBox=\"0 0 12 12\"><Path d=\"M1 1\" /></Svg>); }",
        );
        const exitCode = await runConversion(path.join(root, 'icon.tsx'), out, {
            nano: false, dryRun: false, concurrency: 4,
        });
        expect(exitCode).toBe(0);
        expect(fs.existsSync(path.join(out, 'Icon.svg'))).toBe(true);
    });

    test('nano flag skips filter/mask icons', async () => {
        const root = makeTempDir();
        const out = path.join(root, 'out');
        write(
            path.join(root, 'icon.tsx'),
            [
                "import Svg, { Path, Defs, Filter } from 'react-native-svg';",
                "export function Icon() { return (<Svg viewBox=\"0 0 12 12\"><Defs><Filter id=\"f\"><feGaussianBlur /></Filter></Defs><Path filter=\"url(#f)\" d=\"M1 1\" /></Svg>); }",
            ].join('\n'),
        );
        const exitCode = await runConversion(path.join(root, 'icon.tsx'), out, {
            nano: true, dryRun: false, concurrency: 4,
        });
        expect(exitCode).toBe(0);
        expect(fs.existsSync(path.join(out, 'Icon.svg'))).toBe(false);
    });

    test('non-existent file returns exit code 1', async () => {
        const exitCode = await runConversion('/nonexistent/file.tsx', undefined, {
            nano: false, dryRun: false, concurrency: 4,
        });
        expect(exitCode).toBe(1);
    });

    test('dry-run does not write files', async () => {
        const root = makeTempDir();
        const out = path.join(root, 'out');
        write(
            path.join(root, 'icon.tsx'),
            "import Svg, { Path } from 'react-native-svg';\nexport function Icon() { return (<Svg viewBox=\"0 0 12 12\"><Path d=\"M1 1\" /></Svg>); }",
        );
        const exitCode = await runConversion(path.join(root, 'icon.tsx'), out, {
            nano: false, dryRun: true, concurrency: 4,
        });
        expect(exitCode).toBe(0);
        expect(fs.existsSync(path.join(out, 'Icon.svg'))).toBe(false);
    });

    test('directory scan finds svg sources', async () => {
        const root = makeTempDir();
        const out = path.join(root, 'out');
        write(
            path.join(root, 'icon.tsx'),
            "import Svg, { Path } from 'react-native-svg';\nexport function Icon() { return (<Svg viewBox=\"0 0 12 12\"><Path d=\"M1 1\" /></Svg>); }",
        );
        write(
            path.join(root, 'no-svg.tsx'),
            "export function NoSvg() { return <div>not svg</div>; }",
        );
        const exitCode = await runConversion(root, out, {
            nano: false, dryRun: false, concurrency: 4, input: root,
        });
        expect(exitCode).toBe(0);
        expect(fs.existsSync(path.join(out, 'Icon.svg'))).toBe(true);
        expect(fs.existsSync(path.join(out, 'NoSvg.svg'))).toBe(false);
    });
});

describe('full SVG element tag conversion', () => {
    test('converts basic shape tags (circle, rect, ellipse, polygon, polyline, line)', () => {
        const root = makeTempDir();
        write(
            path.join(root, 'icon.tsx'),
            [
                "import Svg, { Circle, Rect, Ellipse, Polygon, Polyline, Line } from 'react-native-svg';",
                'export function ShapesIcon(props: any) {',
                '    return (',
                "        <Svg viewBox=\"0 0 100 100\" fill=\"none\">",
                "            <Circle cx=\"30\" cy=\"30\" r=\"20\" fill=\"#FF0000\" />",
                "            <Rect x=\"10\" y=\"10\" width=\"50\" height=\"30\" rx=\"5\" ry=\"3\" fill=\"#00FF00\" />",
                "            <Ellipse cx=\"50\" cy=\"80\" rx=\"30\" ry=\"10\" fill=\"#0000FF\" />",
                "            <Polygon points=\"10,10 30,10 20,30\" fill=\"#FFD700\" stroke=\"#000\" strokeWidth={1} />",
                "            <Polyline points=\"40,40 60,40 50,60\" fill=\"none\" stroke=\"#333\" strokeWidth={1.5} />",
                "            <Line x1=\"10\" y1=\"70\" x2=\"90\" y2=\"90\" stroke=\"#666\" strokeWidth={2} />",
                '        </Svg>',
                '    );',
                '}',
            ].join('\n'),
        );
        const out = convertTSXToSVG(path.join(root, 'icon.tsx'));
        expect(out).not.toBeNull();
        const svg = out?.svgContent ?? '';
        expect(svg).toContain('<circle');
        expect(svg).toContain('<rect');
        expect(svg).toContain('<ellipse');
        expect(svg).toContain('<polygon');
        expect(svg).toContain('<polyline');
        expect(svg).toContain('<line');
        expect(svg).toContain('stroke-width="1"');
        expect(svg).toContain('stroke-width="1.5"');
        expect(svg).toContain('stroke-width="2"');
        expect(svg).toContain('fill="none"');
        expect(svg).toContain('points=');
    });

    test('converts G group tags with transform and opacity', () => {
        const root = makeTempDir();
        write(
            path.join(root, 'icon.tsx'),
            [
                "import Svg, { G, Circle, Rect, Path } from 'react-native-svg';",
                'export function GroupIcon(props: any) {',
                '    return (',
                "        <Svg viewBox=\"0 0 100 100\" fill=\"none\">",
                "            <G transform=\"translate(10, 10)\" opacity={0.8}>",
                "                <Circle cx=\"20\" cy=\"20\" r=\"15\" fill=\"#FF6347\" />",
                "                <Path d=\"M10 10L30 30\" stroke=\"#000\" strokeWidth={2} />",
                '            </G>',
                "            <G opacity={0.5}>",
                "                <Rect x=\"60\" y=\"60\" width=\"30\" height=\"20\" fill=\"#4682B4\" />",
                '            </G>',
                '        </Svg>',
                '    );',
                '}',
            ].join('\n'),
        );
        const out = convertTSXToSVG(path.join(root, 'icon.tsx'));
        expect(out).not.toBeNull();
        const svg = out?.svgContent ?? '';
        expect(svg).toContain('<g');
        expect(svg).toContain('transform="translate(10, 10)"');
        expect(svg).toContain('opacity="0.8"');
        expect(svg).toContain('</g>');
    });

    test('converts gradient definitions (Defs, LinearGradient, RadialGradient, Stop)', () => {
        const root = makeTempDir();
        write(
            path.join(root, 'icon.tsx'),
            [
                "import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle } from 'react-native-svg';",
                'export function GradientIcon(props: any) {',
                '    return (',
                "        <Svg viewBox=\"0 0 100 100\" fill=\"none\">",
                '            <Defs>',
                "                <LinearGradient id=\"g1\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\" gradientTransform=\"rotate(45)\">",
                "                    <Stop offset=\"0%\" stopColor=\"#FF0000\" stopOpacity=\"1\" />",
                "                    <Stop offset=\"100%\" stopColor=\"#0000FF\" stopOpacity=\"0.5\" />",
                '                </LinearGradient>',
                "                <RadialGradient id=\"g2\" cx=\"50%\" cy=\"50%\" r=\"50%\" gradientUnits=\"objectBoundingBox\">",
                "                    <Stop offset=\"0%\" stopColor=\"#00FF00\" />",
                '                </RadialGradient>',
                '            </Defs>',
                "            <Rect x=\"10\" y=\"10\" width=\"80\" height=\"35\" fill=\"url(#g1)\" rx=\"5\" />",
                "            <Circle cx=\"50\" cy=\"75\" r=\"20\" fill=\"url(#g2)\" />",
                '        </Svg>',
                '    );',
                '}',
            ].join('\n'),
        );
        const out = convertTSXToSVG(path.join(root, 'icon.tsx'));
        expect(out).not.toBeNull();
        const svg = out?.svgContent ?? '';
        expect(svg).toContain('<defs>');
        expect(svg).toContain('<linearGradient');
        expect(svg).toContain('<radialGradient');
        expect(svg).toContain('<stop');
        expect(svg).toContain('gradientTransform=');
        expect(svg).toContain('gradientUnits=');
        expect(svg).toContain('stop-color=');
        expect(svg).toContain('stop-opacity=');
    });

    test('converts ClipPath tag', () => {
        const root = makeTempDir();
        write(
            path.join(root, 'icon.tsx'),
            [
                "import Svg, { Defs, ClipPath, Circle, Rect } from 'react-native-svg';",
                'export function ClipIcon(props: any) {',
                '    return (',
                "        <Svg viewBox=\"0 0 100 100\" fill=\"none\">",
                '            <Defs>',
                "                <ClipPath id=\"clip1\" clipPathUnits=\"userSpaceOnUse\">",
                "                    <Circle cx=\"50\" cy=\"50\" r=\"40\" />",
                '                </ClipPath>',
                '            </Defs>',
                "            <Rect x=\"0\" y=\"0\" width=\"100\" height=\"100\" fill=\"#FFD700\" clipPath=\"url(#clip1)\" />",
                '        </Svg>',
                '    );',
                '}',
            ].join('\n'),
        );
        const out = convertTSXToSVG(path.join(root, 'icon.tsx'));
        expect(out).not.toBeNull();
        const svg = out?.svgContent ?? '';
        expect(svg).toContain('<clipPath');
        expect(svg).toContain('clipPathUnits=');
        expect(svg).toContain('clip-path=');
    });

    test('converts Pattern tag with pattern attributes', () => {
        const root = makeTempDir();
        write(
            path.join(root, 'icon.tsx'),
            [
                "import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';",
                'export function PatternIcon(props: any) {',
                '    return (',
                "        <Svg viewBox=\"0 0 100 100\" fill=\"none\">",
                '            <Defs>',
                "                <Pattern id=\"pat1\" width=\"20\" height=\"20\" patternUnits=\"userSpaceOnUse\" patternContentUnits=\"userSpaceOnUse\" patternTransform=\"rotate(45)\">",
                "                    <Circle cx=\"10\" cy=\"10\" r=\"5\" fill=\"#FF6347\" />",
                '                </Pattern>',
                '            </Defs>',
                "            <Rect x=\"10\" y=\"10\" width=\"80\" height=\"80\" fill=\"url(#pat1)\" rx=\"5\" />",
                '        </Svg>',
                '    );',
                '}',
            ].join('\n'),
        );
        const out = convertTSXToSVG(path.join(root, 'icon.tsx'));
        expect(out).not.toBeNull();
        const svg = out?.svgContent ?? '';
        expect(svg).toContain('<pattern');
        expect(svg).toContain('patternUnits=');
        expect(svg).toContain('patternContentUnits=');
        expect(svg).toContain('patternTransform=');
    });

    test('converts Marker tag and marker attributes', () => {
        const root = makeTempDir();
        write(
            path.join(root, 'icon.tsx'),
            [
                "import Svg, { Defs, Marker, Path, Line } from 'react-native-svg';",
                'export function MarkerIcon(props: any) {',
                '    return (',
                "        <Svg viewBox=\"0 0 100 100\" fill=\"none\">",
                '            <Defs>',
                "                <Marker id=\"arrow\" markerWidth=\"10\" markerHeight=\"10\" refX=\"9\" refY=\"3\" orient=\"auto\" markerUnits=\"strokeWidth\">",
                "                    <Path d=\"M0,0 L0,6 L9,3 z\" fill=\"#000\" />",
                '                </Marker>',
                '            </Defs>',
                "            <Line x1=\"10\" y1=\"50\" x2=\"80\" y2=\"50\" stroke=\"#333\" strokeWidth={2} markerEnd=\"url(#arrow)\" />",
                '        </Svg>',
                '    );',
                '}',
            ].join('\n'),
        );
        const out = convertTSXToSVG(path.join(root, 'icon.tsx'));
        expect(out).not.toBeNull();
        const svg = out?.svgContent ?? '';
        expect(svg).toContain('<marker');
        expect(svg).toContain('markerWidth=');
        expect(svg).toContain('markerHeight=');
        expect(svg).toContain('refX=');
        expect(svg).toContain('refY=');
        expect(svg).toContain('markerUnits=');
        expect(svg).toContain('orient=');
        expect(svg).toContain('marker-end=');
    });

    test('converts Symbol and Use tags', () => {
        const root = makeTempDir();
        write(
            path.join(root, 'icon.tsx'),
            [
                "import Svg, { Defs, Symbol, Use, Polygon } from 'react-native-svg';",
                'export function SymbolIcon(props: any) {',
                '    return (',
                "        <Svg viewBox=\"0 0 100 100\" fill=\"none\">",
                '            <Defs>',
                "                <Symbol id=\"star\" viewBox=\"0 0 20 20\" width=\"20\" height=\"20\">",
                "                    <Polygon points=\"10,1 13,7 20,8 15,13\" fill=\"#FFD700\" />",
                '                </Symbol>',
                '            </Defs>',
                "            <Use href=\"#star\" x=\"10\" y=\"10\" />",
                '        </Svg>',
                '    );',
                '}',
            ].join('\n'),
        );
        const out = convertTSXToSVG(path.join(root, 'icon.tsx'));
        expect(out).not.toBeNull();
        const svg = out?.svgContent ?? '';
        expect(svg).toContain('<symbol');
        expect(svg).toContain('<use');
        expect(svg).toContain('href=');
        expect(svg).toContain('viewBox=');
    });

    test('converts Text, TSpan, and TextPath tags', () => {
        const root = makeTempDir();
        write(
            path.join(root, 'icon.tsx'),
            [
                "import Svg, { Defs, Path, Text, TSpan, TextPath } from 'react-native-svg';",
                'export function TextIcon(props: any) {',
                '    return (',
                "        <Svg viewBox=\"0 0 200 200\" fill=\"none\">",
                '            <Defs>',
                "                <Path id=\"tp1\" d=\"M10 100 Q 100 20, 190 100\" fill=\"none\" />",
                '            </Defs>',
                "            <Text x=\"20\" y=\"40\" fontSize=\"16\" fill=\"#333\" fontFamily=\"Arial\" fontWeight=\"bold\">",
                '                Hello<TSpan dx="5" dy="5">World</TSpan>',
                '            </Text>',
                '            <TextPath href="#tp1" fontSize="14" fill="#666" startOffset="50%" textAnchor="middle">Curved</TextPath>',
                '        </Svg>',
                '    );',
                '}',
            ].join('\n'),
        );
        const out = convertTSXToSVG(path.join(root, 'icon.tsx'));
        expect(out).not.toBeNull();
        const svg = out?.svgContent ?? '';
        expect(svg).toContain('<text');
        expect(svg).toContain('<tspan');
        expect(svg).toContain('<textPath');
        expect(svg).toContain('font-size=');
        expect(svg).toContain('font-family=');
        expect(svg).toContain('font-weight=');
        expect(svg).toContain('startOffset=');
        expect(svg).toContain('text-anchor=');
        expect(svg).toContain('href=');
    });

    test('converts ForeignObject and Image tags', () => {
        const root = makeTempDir();
        write(
            path.join(root, 'icon.tsx'),
            [
                "import Svg, { ForeignObject, Image, Text, Rect } from 'react-native-svg';",
                'export function ForeignIcon(props: any) {',
                '    return (',
                "        <Svg viewBox=\"0 0 100 100\" fill=\"none\">",
                "            <Rect x=\"10\" y=\"10\" width=\"80\" height=\"80\" fill=\"#EEE\" rx=\"8\" />",
                "            <ForeignObject x=\"20\" y=\"20\" width=\"60\" height=\"30\">",
                "                <Text x=\"25\" y=\"35\" fontSize=\"10\" fill=\"#333\">Hello</Text>",
                '            </ForeignObject>',
                "            <Image x=\"30\" y=\"60\" width=\"40\" height=\"30\" href=\"https://example.com/img.png\" />",
                '        </Svg>',
                '    );',
                '}',
            ].join('\n'),
        );
        const out = convertTSXToSVG(path.join(root, 'icon.tsx'));
        expect(out).not.toBeNull();
        const svg = out?.svgContent ?? '';
        expect(svg).toContain('<foreignObject');
        expect(svg).toContain('<image');
        expect(svg).toContain('href=');
    });
});
