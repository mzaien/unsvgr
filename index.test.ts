import { afterAll, describe, expect, test } from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { convertTSXToSVG } from './index';

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

    test('keeps unresolved dynamic expression as-is', () => {
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
        expect(out).not.toBeNull();
        const svg = out?.svgContent ?? '';
        expect(svg).toContain('stroke={props.color || getColor()}');
    });
});
