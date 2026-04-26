#!/usr/bin/env bun

import { Command } from "commander";
import { globSync } from "glob";
import fs from "fs";
import path from "path";
import ts from "typescript";

/** Keep in sync with `react-native-svg` `elements` export (v15.15.3). */
const RNSVG_ELEMENT_TAGS = [
	"Circle",
	"ClipPath",
	"Defs",
	"Ellipse",
	"FeBlend",
	"FeColorMatrix",
	"FeComponentTransfer",
	"FeComposite",
	"FeConvolveMatrix",
	"FeDiffuseLighting",
	"FeDisplacementMap",
	"FeDistantLight",
	"FeDropShadow",
	"FeFlood",
	"FeFuncA",
	"FeFuncB",
	"FeFuncG",
	"FeFuncR",
	"FeGaussianBlur",
	"FeImage",
	"FeMerge",
	"FeMergeNode",
	"FeMorphology",
	"FeOffset",
	"FePointLight",
	"FeSpecularLighting",
	"FeSpotLight",
	"FeTile",
	"FeTurbulence",
	"Filter",
	"ForeignObject",
	"G",
	"Image",
	"Line",
	"LinearGradient",
	"Marker",
	"Mask",
	"Path",
	"Pattern",
	"Polygon",
	"Polyline",
	"RadialGradient",
	"Rect",
	"Stop",
	"Svg",
	"Symbol",
	"Text",
	"TextPath",
	"TSpan",
	"Use",
] as const;

const TAG_OVERRIDES: Record<string, string> = {
	TSpan: "tspan",
};

const ATTR_STAYS_CAMEL_IN_XML = new Set([
	"viewBox",
	"preserveAspectRatio",
	"gradientTransform",
	"gradientUnits",
	"spreadMethod",
	"patternTransform",
	"patternUnits",
	"patternContentUnits",
	"clipPathUnits",
	"primitiveUnits",
	"maskUnits",
	"maskContentUnits",
	"kernelMatrix",
	"kernelUnitLength",
	"stdDeviation",
	"numOctaves",
	"baseFrequency",
	"stitchTiles",
	"xChannelSelector",
	"yChannelSelector",
	"limitingConeAngle",
	"pointsAtX",
	"pointsAtY",
	"pointsAtZ",
	"azimuth",
	"elevation",
	"specularConstant",
	"specularExponent",
	"diffuseConstant",
	"surfaceScale",
	"pathLength",
	"startOffset",
	"lengthAdjust",
	"textLength",
	"refX",
	"refY",
	"markerUnits",
	"markerWidth",
	"markerHeight",
]);

const ATTR_ALIASES: Record<string, string> = {
	className: "class",
	xlinkHref: "xlink:href",
	xmlnsXlink: "xmlns:xlink",
};

const RNSVG_TAG_SET = new Set<string>(RNSVG_ELEMENT_TAGS as readonly string[]);

const MEMBER_EXPR =
	"[a-zA-Z_$][\\w$]*(?:(?:\\.|\\?\\.)[a-zA-Z_$][\\w$]*)+";

function findClosingBrace(s: string, openBraceIdx: number): number {
	if (s[openBraceIdx] !== "{") {
		return -1;
	}
	let depth = 1;
	let i = openBraceIdx + 1;
	let inString: '"' | "'" | null = null;
	let escape = false;
	while (i < s.length) {
		const c = s[i];
		if (inString) {
			if (escape) {
				escape = false;
				i++;
				continue;
			}
			if (c === "\\") {
				escape = true;
				i++;
				continue;
			}
			if (c === inString) {
				inString = null;
			}
			i++;
			continue;
		}
		if (c === '"' || c === "'") {
			inString = c;
			i++;
			continue;
		}
		if (c === "{") {
			depth++;
		} else if (c === "}") {
			depth--;
			if (depth === 0) {
				return i;
			}
		}
		i++;
	}
	return -1;
}

function skipQuotedString(s: string, start: number): number {
	const q = s[start];
	if (q !== '"' && q !== "'") {
		return -1;
	}
	let i = start + 1;
	let escape = false;
	while (i < s.length) {
		if (escape) {
			escape = false;
			i++;
			continue;
		}
		if (s[i] === "\\") {
			escape = true;
			i++;
			continue;
		}
		if (s[i] === q) {
			return i;
		}
		i++;
	}
	return -1;
}

function findJsxTagEnd(s: string, openAngle: number): number {
	if (s[openAngle] !== "<") {
		return -1;
	}
	let i = openAngle + 1;
	if (s[i] === "/") {
		i++;
	}
	while (i < s.length && /[A-Za-z0-9._:-]/.test(s[i])) {
		i++;
	}
	let inQuote: '"' | "'" | null = null;
	let escape = false;
	while (i < s.length) {
		const c = s[i];
		if (inQuote) {
			if (escape) {
				escape = false;
				i++;
				continue;
			}
			if (c === "\\") {
				escape = true;
				i++;
				continue;
			}
			if (c === inQuote) {
				inQuote = null;
			}
			i++;
			continue;
		}
		if (c === '"' || c === "'") {
			inQuote = c;
			i++;
			continue;
		}
		if (c === "{") {
			const end = findClosingBrace(s, i);
			if (end === -1) {
				return -1;
			}
			i = end + 1;
			continue;
		}
		if (c === ">") {
			return i;
		}
		i++;
	}
	return -1;
}

function stripKeyOrRefAttr(s: string, attr: "key" | "ref"): string {
	let out = s;
	const re = new RegExp(`\\s+\\b${attr}\\s*=`, "g");
	const cuts: { start: number; end: number }[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(out))) {
		const afterEq = m.index + m[0].length;
		const c = out[afterEq];
		let end: number;
		if (c === '"' || c === "'") {
			end = skipQuotedString(out, afterEq);
			if (end === -1) {
				continue;
			}
		} else if (c === "{") {
			end = findClosingBrace(out, afterEq);
			if (end === -1) {
				continue;
			}
		} else {
			continue;
		}
		cuts.push({ start: m.index, end: end + 1 });
	}
	cuts.sort((a, b) => b.start - a.start);
	for (const { start, end } of cuts) {
		out = out.slice(0, start) + out.slice(end);
	}
	return out;
}

function stripJsxSpreads(s: string): string {
	let out = s;
	let changed = true;
	while (changed) {
		changed = false;
		for (let i = 0; i < out.length; i++) {
			if (out[i] !== "{") {
				continue;
			}
			if (!/^\{\s*\.\.\./.test(out.slice(i, i + 12))) {
				continue;
			}
			let wsStart = i;
			while (wsStart > 0 && /\s/.test(out[wsStart - 1])) {
				wsStart--;
			}
			const end = findClosingBrace(out, i);
			if (end === -1) {
				continue;
			}
			out = out.slice(0, wsStart) + out.slice(end + 1);
			changed = true;
			break;
		}
	}
	return out;
}

function mapAttrNameInList(attrs: string): string {
	// open-tag parsing consumes the space after the tag name, so the first
	// attribute often starts flush (e.g. `clipPath="..."`) and must still match.
	const s = attrs.length > 0 && !/^\s/.test(attrs) ? ` ${attrs}` : attrs;
	return s.replace(
		/(\s+)(@?[\w.:-]+)=/g,
		(full: string, ws: string, rawName: string) => {
			const name = rawName.startsWith("@") ? rawName.slice(1) : rawName;
			const mapped = mapAttrName(name);
			if (mapped === rawName) {
				return full;
			}
			const at = rawName.startsWith("@") ? "@" : "";
			return `${ws}${at}${mapped}=`;
		},
	);
}

function transformSvgTagChunk(chunk: string): string {
	const t = chunk.trimStart();
	if (t.startsWith("<!--") || t.startsWith("<!") || t.startsWith("<?")) {
		return chunk;
	}

	const closeM = chunk.match(/^<\s*\/\s*([A-Za-z][\w.:-]*)\s*>/);
	if (closeM) {
		const raw = closeM[1];
		const nn = RNSVG_TAG_SET.has(raw) ? pascalComponentToSvgTag(raw) : raw;
		return `</${nn}>`;
	}

	const openM = chunk.match(/^<\s*([A-Za-z][\w.:-]*)\s*/);
	if (!openM) {
		return chunk;
	}
	const rawName = openM[1];
	const newName = RNSVG_TAG_SET.has(rawName)
		? pascalComponentToSvgTag(rawName)
		: rawName;
	const afterName = openM[0].length;
	const trimmedEnd = chunk.trimEnd();
	const isSelf = /\/>\s*$/.test(trimmedEnd);
	const slashPos = isSelf ? chunk.lastIndexOf("/>") : -1;
	if (isSelf && slashPos === -1) {
		return chunk;
	}
	const innerEnd = isSelf ? slashPos : chunk.lastIndexOf(">");
	const attrStr = chunk.slice(afterName, innerEnd);
	const newAttrs = mapAttrNameInList(attrStr);
	const gap = newAttrs.length > 0 && !/^\s/.test(newAttrs) ? " " : "";
	if (isSelf) {
		return `<${newName}${gap}${newAttrs}/>`;
	}
	return `<${newName}${gap}${newAttrs}>`;
}

function transformTagsAndAttrs(svgContent: string): string {
	let out = "";
	let i = 0;
	const n = svgContent.length;
	while (i < n) {
		const lt = svgContent.indexOf("<", i);
		if (lt === -1) {
			out += svgContent.slice(i);
			break;
		}
		out += svgContent.slice(i, lt);
		if (svgContent.startsWith("<!--", lt)) {
			const endComment = svgContent.indexOf("-->", lt + 4);
			if (endComment === -1) {
				out += svgContent[lt];
				i = lt + 1;
				continue;
			}
			out += svgContent.slice(lt, endComment + 3);
			i = endComment + 3;
			continue;
		}
		const tagEnd = findJsxTagEnd(svgContent, lt);
		if (tagEnd === -1) {
			out += svgContent[lt];
			i = lt + 1;
			continue;
		}
		const chunk = svgContent.slice(lt, tagEnd + 1);
		out += transformSvgTagChunk(chunk);
		i = tagEnd + 1;
	}
	return out;
}

function pascalComponentToSvgTag(component: string): string {
	if (TAG_OVERRIDES[component]) {
		return TAG_OVERRIDES[component];
	}
	return component.charAt(0).toLowerCase() + component.slice(1);
}

function camelToKebabAttr(s: string): string {
	return s
		.replace(/([a-z\d])([A-Z])/g, "$1-$2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();
}

function shouldSkipAttrName(name: string): boolean {
	if (name.includes("-")) {
		return true;
	}
	if (
		name === "xmlns" ||
		name.startsWith("xmlns:") ||
		name.startsWith("xml:") ||
		name.startsWith("xlink:") ||
		name.startsWith("data-") ||
		name.startsWith("aria-")
	) {
		return true;
	}
	return false;
}

function mapAttrName(name: string): string {
	if (shouldSkipAttrName(name)) {
		return name;
	}
	if (ATTR_ALIASES[name]) {
		return ATTR_ALIASES[name];
	}
	if (ATTR_STAYS_CAMEL_IN_XML.has(name)) {
		return name;
	}
	if (!/[A-Z]/.test(name)) {
		return name;
	}
	return camelToKebabAttr(name);
}

function stripReactAttributes(fragment: string): string {
	let s = stripKeyOrRefAttr(fragment, "key");
	s = stripKeyOrRefAttr(s, "ref");
	s = stripJsxSpreads(s);
	return s;
}

function coercePropsBraceExpressions(fragment: string): string {
	const M = MEMBER_EXPR;
	let s = fragment;
	let prev = "";
	for (let i = 0; i < 24 && s !== prev; i++) {
		prev = s;
		s = s.replace(
			new RegExp(`=\\{\\s*${M}\\s*\\?\\?\\s*(-?\\d+(?:\\.\\d+)?)\\s*\\}`, "g"),
			'="$1"',
		);
		s = s.replace(
			new RegExp(`=\\{\\s*${M}\\s*\\?\\?\\s*'([^']*)'\\s*\\}`, "g"),
			'="$1"',
		);
		s = s.replace(
			new RegExp(`=\\{\\s*${M}\\s*\\?\\?\\s*"([^"]*)"\\s*\\}`, "g"),
			'="$1"',
		);
		s = s.replace(
			new RegExp(`=\\{\\s*${M}\\s*\\|\\|\\s*(-?\\d+(?:\\.\\d+)?)\\s*\\}`, "g"),
			'="$1"',
		);
		s = s.replace(
			new RegExp(`=\\{\\s*${M}\\s*\\|\\|\\s*'([^']*)'\\s*\\}`, "g"),
			'="$1"',
		);
		s = s.replace(
			new RegExp(`=\\{\\s*${M}\\s*\\|\\|\\s*"([^"]*)"\\s*\\}`, "g"),
			'="$1"',
		);
		s = s.replace(
			new RegExp(
				`=\\{\\s*${M}\\s*\\?\\s*${M}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)\\s*\\}`,
				"g",
			),
			'="$1"',
		);
		s = s.replace(
			new RegExp(`=\\{\\s*${M}\\s*\\?\\s*${M}\\s*:\\s*'([^']*)'\\s*\\}`, "g"),
			'="$1"',
		);
		s = s.replace(
			new RegExp(`=\\{\\s*${M}\\s*\\?\\s*${M}\\s*:\\s*"([^"]*)"\\s*\\}`, "g"),
			'="$1"',
		);
	}
	s = s.replace(
		new RegExp(`\\s+([a-zA-Z][\\w.:-]*)=\\{\\s*${M}\\s*\\}`, "g"),
		"",
	);
	return s;
}

function splitTopLevelObjectEntries(objLiteral: string): string[] {
	const s = objLiteral.trim();
	if (!s.startsWith("{") || !s.endsWith("}")) {
		return [];
	}
	const body = s.slice(1, -1);
	const out: string[] = [];
	let start = 0;
	let depthBraces = 0;
	let depthBrackets = 0;
	let depthParens = 0;
	let inString: '"' | "'" | null = null;
	let escape = false;
	for (let i = 0; i < body.length; i++) {
		const c = body[i];
		if (inString) {
			if (escape) {
				escape = false;
				continue;
			}
			if (c === "\\") {
				escape = true;
				continue;
			}
			if (c === inString) {
				inString = null;
			}
			continue;
		}
		if (c === '"' || c === "'") {
			inString = c;
			continue;
		}
		if (c === "{") {
			depthBraces++;
			continue;
		}
		if (c === "}") {
			depthBraces--;
			continue;
		}
		if (c === "[") {
			depthBrackets++;
			continue;
		}
		if (c === "]") {
			depthBrackets--;
			continue;
		}
		if (c === "(") {
			depthParens++;
			continue;
		}
		if (c === ")") {
			depthParens--;
			continue;
		}
		if (
			c === "," &&
			depthBraces === 0 &&
			depthBrackets === 0 &&
			depthParens === 0
		) {
			const part = body.slice(start, i).trim();
			if (part) {
				out.push(part);
			}
			start = i + 1;
		}
	}
	const tail = body.slice(start).trim();
	if (tail) {
		out.push(tail);
	}
	return out;
}

function parseTopLevelKeyValue(
	entry: string,
): { key: string; value: string } | null {
	let inString: '"' | "'" | null = null;
	let escape = false;
	let depthBraces = 0;
	let depthBrackets = 0;
	let depthParens = 0;
	for (let i = 0; i < entry.length; i++) {
		const c = entry[i];
		if (inString) {
			if (escape) {
				escape = false;
				continue;
			}
			if (c === "\\") {
				escape = true;
				continue;
			}
			if (c === inString) {
				inString = null;
			}
			continue;
		}
		if (c === '"' || c === "'") {
			inString = c;
			continue;
		}
		if (c === "{") {
			depthBraces++;
			continue;
		}
		if (c === "}") {
			depthBraces--;
			continue;
		}
		if (c === "[") {
			depthBrackets++;
			continue;
		}
		if (c === "]") {
			depthBrackets--;
			continue;
		}
		if (c === "(") {
			depthParens++;
			continue;
		}
		if (c === ")") {
			depthParens--;
			continue;
		}
		if (
			c === ":" &&
			depthBraces === 0 &&
			depthBrackets === 0 &&
			depthParens === 0
		) {
			const rawKey = entry.slice(0, i).trim();
			const value = entry.slice(i + 1).trim();
			const keyMatch = /^(['"])?([A-Za-z_$][\w$-]*)\1?$/.exec(rawKey);
			if (!keyMatch) {
				return null;
			}
			return { key: keyMatch[2], value };
		}
	}
	return null;
}

function unquoteLiteral(s: string): string | undefined {
	const t = s.trim();
	if (/^-?\d+(?:\.\d+)?$/.test(t)) {
		return t;
	}
	const q = /^'([^']*)'$/.exec(t) ?? /^"([^"]*)"$/.exec(t);
	if (q) {
		return q[1];
	}
	return undefined;
}

function findNearestTsconfigDir(startDir: string): string | null {
	let cur = path.resolve(startDir);
	while (true) {
		const tsconfigPath = path.join(cur, "tsconfig.json");
		if (fs.existsSync(tsconfigPath)) {
			return cur;
		}
		const parent = path.dirname(cur);
		if (parent === cur) {
			return null;
		}
		cur = parent;
	}
}

function resolveImportTargetPath(
	sourceFilePath: string,
	importPath: string,
): string | null {
	const sourceDir = path.dirname(sourceFilePath);
	let base: string;
	if (importPath.startsWith("./") || importPath.startsWith("../")) {
		base = path.resolve(sourceDir, importPath);
	} else if (importPath.startsWith("@/")) {
		const tsconfigDir = findNearestTsconfigDir(sourceDir);
		if (!tsconfigDir) {
			return null;
		}
		base = path.resolve(tsconfigDir, importPath.slice(2));
	} else {
		return null;
	}
	const candidates = [
		base,
		`${base}.ts`,
		`${base}.tsx`,
		path.join(base, "index.ts"),
		path.join(base, "index.tsx"),
	];
	for (const c of candidates) {
		if (fs.existsSync(c) && fs.statSync(c).isFile()) {
			return c;
		}
	}
	return null;
}

type StaticLiteral =
	| string
	| number
	| boolean
	| null
	| StaticLiteral[]
	| { [k: string]: StaticLiteral };

type EvalState =
	| { kind: "known"; value: StaticLiteral }
	| { kind: "unknown" };

type SourceSymbols = {
	localConsts: Map<string, ts.Expression>;
	exportedConsts: Map<string, ts.Expression>;
	imports: Map<string, { sourcePath: string; importedName: string }>;
};

function known(value: StaticLiteral): EvalState {
	return { kind: "known", value };
}

function unknown(): EvalState {
	return { kind: "unknown" };
}

function isKnown(v: EvalState): v is { kind: "known"; value: StaticLiteral } {
	return v.kind === "known";
}

function toJsxAttrLiteral(v: StaticLiteral): string | undefined {
	if (typeof v === "string") {
		return v;
	}
	if (typeof v === "number") {
		if (!Number.isFinite(v)) {
			return undefined;
		}
		return String(v);
	}
	if (typeof v === "boolean") {
		return v ? "true" : "false";
	}
	if (v === null) {
		return "null";
	}
	return undefined;
}

function escapeAttrValue(s: string): string {
	return s.replace(/"/g, "&quot;");
}

function extractJsxExpressionBody(s: string, eqIdx: number): {
	start: number;
	end: number;
	body: string;
} | null {
	let i = eqIdx + 1;
	while (i < s.length && /\s/.test(s[i])) {
		i++;
	}
	if (s[i] !== "{") {
		return null;
	}
	const close = findClosingBrace(s, i);
	if (close === -1) {
		return null;
	}
	return {
		start: i,
		end: close,
		body: s.slice(i + 1, close).trim(),
	};
}

function replaceStaticJsxBraceAttributes(
	fragment: string,
	evaluateExpr: (expr: string) => StaticLiteral | undefined,
): string {
	let out = "";
	let i = 0;
	while (i < fragment.length) {
		const eq = fragment.indexOf("=", i);
		if (eq === -1) {
			out += fragment.slice(i);
			break;
		}
		out += fragment.slice(i, eq + 1);
		const parsed = extractJsxExpressionBody(fragment, eq);
		if (!parsed) {
			i = eq + 1;
			continue;
		}
		const value = evaluateExpr(parsed.body);
		if (value === undefined) {
			out += fragment.slice(parsed.start, parsed.end + 1);
		} else {
			const literal = toJsxAttrLiteral(value);
			if (literal === undefined) {
				out += fragment.slice(parsed.start, parsed.end + 1);
			} else {
				out += `"${escapeAttrValue(literal)}"`;
			}
		}
		i = parsed.end + 1;
	}
	return out;
}

function parseExpressionNode(expr: string): ts.Expression | null {
	const sf = ts.createSourceFile(
		"expr.ts",
		`(${expr});`,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	const stmt = sf.statements[0];
	if (!stmt || !ts.isExpressionStatement(stmt)) {
		return null;
	}
	if (!ts.isParenthesizedExpression(stmt.expression)) {
		return null;
	}
	return stmt.expression.expression;
}

function parseSourceSymbols(
	sourceFilePath: string,
	sourceText: string,
): SourceSymbols {
	const sf = ts.createSourceFile(
		sourceFilePath,
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		sourceFilePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
	const localConsts = new Map<string, ts.Expression>();
	const exportedConsts = new Map<string, ts.Expression>();
	const imports = new Map<string, { sourcePath: string; importedName: string }>();

	for (const stmt of sf.statements) {
		if (ts.isVariableStatement(stmt)) {
			const isConst =
				(stmt.declarationList.flags & ts.NodeFlags.Const) === ts.NodeFlags.Const;
			if (!isConst) {
				continue;
			}
			const isExported =
				stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ===
				true;
			for (const decl of stmt.declarationList.declarations) {
				if (!ts.isIdentifier(decl.name) || !decl.initializer) {
					continue;
				}
				localConsts.set(decl.name.text, decl.initializer);
				if (isExported) {
					exportedConsts.set(decl.name.text, decl.initializer);
				}
			}
			continue;
		}
		if (!ts.isImportDeclaration(stmt) || !stmt.importClause) {
			continue;
		}
		if (!ts.isStringLiteral(stmt.moduleSpecifier)) {
			continue;
		}
		const importSpec = stmt.moduleSpecifier.text;
		const resolvedPath = resolveImportTargetPath(sourceFilePath, importSpec);
		if (!resolvedPath) {
			continue;
		}
		const named = stmt.importClause.namedBindings;
		if (!named || !ts.isNamedImports(named)) {
			continue;
		}
		for (const el of named.elements) {
			const importedName = (el.propertyName ?? el.name).text;
			const localName = el.name.text;
			imports.set(localName, { sourcePath: resolvedPath, importedName });
		}
	}

	return { localConsts, exportedConsts, imports };
}

function boolValue(v: StaticLiteral): boolean {
	return !!v;
}

function binaryNumberOp(
	op: ts.SyntaxKind,
	l: number,
	r: number,
): StaticLiteral | undefined {
	switch (op) {
		case ts.SyntaxKind.PlusToken:
			return l + r;
		case ts.SyntaxKind.MinusToken:
			return l - r;
		case ts.SyntaxKind.AsteriskToken:
			return l * r;
		case ts.SyntaxKind.SlashToken:
			return r === 0 ? undefined : l / r;
		case ts.SyntaxKind.PercentToken:
			return r === 0 ? undefined : l % r;
		case ts.SyntaxKind.AsteriskAsteriskToken:
			return l ** r;
		case ts.SyntaxKind.LessThanToken:
			return l < r;
		case ts.SyntaxKind.LessThanEqualsToken:
			return l <= r;
		case ts.SyntaxKind.GreaterThanToken:
			return l > r;
		case ts.SyntaxKind.GreaterThanEqualsToken:
			return l >= r;
		default:
			return undefined;
	}
}

function evalBinary(
	op: ts.SyntaxKind,
	left: StaticLiteral,
	right: StaticLiteral,
): StaticLiteral | undefined {
	if (op === ts.SyntaxKind.PlusToken) {
		if (typeof left === "string" || typeof right === "string") {
			return `${left}${right}`;
		}
	}
	if (typeof left === "number" && typeof right === "number") {
		return binaryNumberOp(op, left, right);
	}
	switch (op) {
		case ts.SyntaxKind.EqualsEqualsToken:
		case ts.SyntaxKind.EqualsEqualsEqualsToken:
			return left === right;
		case ts.SyntaxKind.ExclamationEqualsToken:
		case ts.SyntaxKind.ExclamationEqualsEqualsToken:
			return left !== right;
		default:
			return undefined;
	}
}

function evaluateExpressionNode(
	node: ts.Expression,
	resolveIdentifier: (name: string) => EvalState,
): EvalState {
	if (ts.isParenthesizedExpression(node)) {
		return evaluateExpressionNode(node.expression, resolveIdentifier);
	}
	if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
		return known(node.text);
	}
	if (ts.isNumericLiteral(node)) {
		const n = Number(node.text);
		return Number.isFinite(n) ? known(n) : unknown();
	}
	if (node.kind === ts.SyntaxKind.TrueKeyword) {
		return known(true);
	}
	if (node.kind === ts.SyntaxKind.FalseKeyword) {
		return known(false);
	}
	if (node.kind === ts.SyntaxKind.NullKeyword) {
		return known(null);
	}
	if (ts.isIdentifier(node)) {
		return resolveIdentifier(node.text);
	}
	if (ts.isTemplateExpression(node)) {
		let out = node.head.text;
		for (const span of node.templateSpans) {
			const value = evaluateExpressionNode(span.expression, resolveIdentifier);
			if (!isKnown(value)) {
				return unknown();
			}
			const literal = toJsxAttrLiteral(value.value);
			if (literal === undefined) {
				return unknown();
			}
			out += literal;
			out += span.literal.text;
		}
		return known(out);
	}
	if (ts.isPrefixUnaryExpression(node)) {
		const inner = evaluateExpressionNode(node.operand, resolveIdentifier);
		if (!isKnown(inner)) {
			return unknown();
		}
		if (node.operator === ts.SyntaxKind.ExclamationToken) {
			return known(!boolValue(inner.value));
		}
		if (typeof inner.value !== "number") {
			return unknown();
		}
		if (node.operator === ts.SyntaxKind.PlusToken) {
			return known(+inner.value);
		}
		if (node.operator === ts.SyntaxKind.MinusToken) {
			return known(-inner.value);
		}
		return unknown();
	}
	if (ts.isConditionalExpression(node)) {
		const cond = evaluateExpressionNode(node.condition, resolveIdentifier);
		if (isKnown(cond)) {
			return boolValue(cond.value)
				? evaluateExpressionNode(node.whenTrue, resolveIdentifier)
				: evaluateExpressionNode(node.whenFalse, resolveIdentifier);
		}
		const fallback = evaluateExpressionNode(node.whenFalse, resolveIdentifier);
		return isKnown(fallback) ? fallback : unknown();
	}
	if (ts.isBinaryExpression(node)) {
		const op = node.operatorToken.kind;
		if (
			op === ts.SyntaxKind.BarBarToken ||
			op === ts.SyntaxKind.QuestionQuestionToken
		) {
			const left = evaluateExpressionNode(node.left, resolveIdentifier);
			if (isKnown(left)) {
				if (op === ts.SyntaxKind.BarBarToken && boolValue(left.value)) {
					return left;
				}
				if (op === ts.SyntaxKind.QuestionQuestionToken && left.value !== null) {
					return left;
				}
			}
			const right = evaluateExpressionNode(node.right, resolveIdentifier);
			return isKnown(right) ? right : unknown();
		}
		if (op === ts.SyntaxKind.AmpersandAmpersandToken) {
			const left = evaluateExpressionNode(node.left, resolveIdentifier);
			if (isKnown(left) && !boolValue(left.value)) {
				return left;
			}
			const right = evaluateExpressionNode(node.right, resolveIdentifier);
			return isKnown(right) ? right : unknown();
		}
		const left = evaluateExpressionNode(node.left, resolveIdentifier);
		const right = evaluateExpressionNode(node.right, resolveIdentifier);
		if (!isKnown(left) || !isKnown(right)) {
			return unknown();
		}
		const folded = evalBinary(op, left.value, right.value);
		return folded === undefined ? unknown() : known(folded);
	}
	if (ts.isObjectLiteralExpression(node)) {
		const out: { [k: string]: StaticLiteral } = {};
		for (const prop of node.properties) {
			if (ts.isPropertyAssignment(prop)) {
				const name = ts.isIdentifier(prop.name)
					? prop.name.text
					: ts.isStringLiteral(prop.name)
						? prop.name.text
						: null;
				if (!name) {
					return unknown();
				}
				const v = evaluateExpressionNode(prop.initializer, resolveIdentifier);
				if (!isKnown(v)) {
					return unknown();
				}
				out[name] = v.value;
				continue;
			}
			if (ts.isShorthandPropertyAssignment(prop)) {
				const v = resolveIdentifier(prop.name.text);
				if (!isKnown(v)) {
					return unknown();
				}
				out[prop.name.text] = v.value;
				continue;
			}
			return unknown();
		}
		return known(out);
	}
	if (ts.isArrayLiteralExpression(node)) {
		const out: StaticLiteral[] = [];
		for (const el of node.elements) {
			if (!ts.isExpression(el)) {
				return unknown();
			}
			const v = evaluateExpressionNode(el, resolveIdentifier);
			if (!isKnown(v)) {
				return unknown();
			}
			out.push(v.value);
		}
		return known(out);
	}
	if (ts.isPropertyAccessExpression(node)) {
		const target = evaluateExpressionNode(node.expression, resolveIdentifier);
		if (!isKnown(target) || target.value === null) {
			return unknown();
		}
		if (
			typeof target.value === "object" &&
			!Array.isArray(target.value) &&
			Object.hasOwn(target.value, node.name.text)
		) {
			return known(target.value[node.name.text]);
		}
		return unknown();
	}
	if (ts.isElementAccessExpression(node)) {
		const target = evaluateExpressionNode(node.expression, resolveIdentifier);
		const indexNode = node.argumentExpression;
		if (!isKnown(target) || !indexNode) {
			return unknown();
		}
		const idx = evaluateExpressionNode(indexNode, resolveIdentifier);
		if (!isKnown(idx)) {
			return unknown();
		}
		if (
			Array.isArray(target.value) &&
			typeof idx.value === "number" &&
			Number.isInteger(idx.value) &&
			idx.value >= 0 &&
			idx.value < target.value.length
		) {
			return known(target.value[idx.value]);
		}
		if (
			target.value &&
			typeof target.value === "object" &&
			!Array.isArray(target.value) &&
			typeof idx.value === "string" &&
			Object.hasOwn(target.value, idx.value)
		) {
			return known(target.value[idx.value]);
		}
		return unknown();
	}
	return unknown();
}

function buildExpressionLiteralResolver(
	sourceFilePath: string,
	tsxContent: string,
): (expr: string) => StaticLiteral | undefined {
	const symbolCache = new Map<string, SourceSymbols>();
	const evalCache = new Map<string, EvalState>();

	function getSymbols(filePath: string): SourceSymbols | null {
		const cached = symbolCache.get(filePath);
		if (cached) {
			return cached;
		}
		let source = "";
		try {
			source = fs.readFileSync(filePath, "utf8");
		} catch {
			return null;
		}
		const symbols = parseSourceSymbols(filePath, source);
		symbolCache.set(filePath, symbols);
		return symbols;
	}

	function resolveConst(
		filePath: string,
		name: string,
		allowNonExported: boolean,
		seen: Set<string>,
	): EvalState {
		const key = `${filePath}::${name}::${allowNonExported ? "local" : "export"}`;
		const cached = evalCache.get(key);
		if (cached) {
			return cached;
		}
		if (seen.has(key)) {
			return unknown();
		}
		seen.add(key);
		const symbols = getSymbols(filePath);
		if (!symbols) {
			const miss = unknown();
			evalCache.set(key, miss);
			return miss;
		}
		const localInit = allowNonExported
			? symbols.localConsts.get(name)
			: symbols.exportedConsts.get(name);
		if (localInit) {
			const evaluated = evaluateExpressionNode(localInit, (id: string) =>
				resolveIdentifier(filePath, id, seen),
			);
			evalCache.set(key, evaluated);
			return evaluated;
		}
		const imported = symbols.imports.get(name);
		if (imported) {
			const resolved = resolveConst(
				imported.sourcePath,
				imported.importedName,
				false,
				seen,
			);
			evalCache.set(key, resolved);
			return resolved;
		}
		const miss = unknown();
		evalCache.set(key, miss);
		return miss;
	}

	function resolveIdentifier(
		filePath: string,
		name: string,
		seen: Set<string>,
	): EvalState {
		return resolveConst(filePath, name, true, seen);
	}

	return (expr: string): StaticLiteral | undefined => {
		const node = parseExpressionNode(expr);
		if (!node) {
			return undefined;
		}
		const result = evaluateExpressionNode(node, (name: string) =>
			resolveIdentifier(sourceFilePath, name, new Set<string>()),
		);
		return isKnown(result) ? result.value : undefined;
	};
}

function coerceResolvableFallbacks(
	fragment: string,
	resolveExpr: (expr: string) => StaticLiteral | undefined,
): string {
	return replaceStaticJsxBraceAttributes(fragment, resolveExpr);
}

function coerceNumericBraceAttributes(fragment: string): string {
	return fragment.replace(/=\{\s*(-?\d+(?:\.\d+)?)\s*\}/g, '="$1"');
}

function transformTSXToSVG(
	tsxContent: string,
	resolveExpr?: (expr: string) => StaticLiteral | undefined,
): string {
	let result = stripReactAttributes(tsxContent);
	if (resolveExpr) {
		result = coerceResolvableFallbacks(result, resolveExpr);
	}
	result = coercePropsBraceExpressions(result);
	result = coerceNumericBraceAttributes(result);
	result = transformTagsAndAttrs(result);
	return result;
}

function extractBalancedSvgSubtree(tsxContent: string, searchFrom = 0): string {
	const tail = tsxContent.slice(searchFrom);
	const svgOpen = /<[Ss]vg\b/.exec(tail);
	if (!svgOpen || svgOpen.index === undefined) {
		return "";
	}
	const absStart = searchFrom + svgOpen.index;
	let depth = 0;
	const re = /<\/?[Ss]vg\b/g;
	re.lastIndex = absStart;
	let m: RegExpExecArray | null;
	while ((m = re.exec(tsxContent))) {
		const lt = m.index;
		const tagEnd = findJsxTagEnd(tsxContent, lt);
		if (tagEnd === -1) {
			return "";
		}
		const full = tsxContent.slice(lt, tagEnd + 1);
		const isClosing = /^<\s*\//.test(full);
		const isSelfClosing = /\/>\s*$/.test(full.trimEnd());
		if (isClosing) {
			if (depth === 1) {
				return tsxContent.slice(absStart, tagEnd + 1);
			}
			if (depth > 0) {
				depth--;
			}
			continue;
		}
		if (isSelfClosing && depth === 0) {
			return tsxContent.slice(absStart, tagEnd + 1);
		}
		if (!isSelfClosing) {
			depth++;
		}
	}
	return "";
}

function extractSVGContent(tsxContent: string): string {
	return extractBalancedSvgSubtree(tsxContent, 0);
}

const EXPORT_HEAD =
	/(?:^|\n)export\s+(?:default\s+function\s+(\w+)|function\s+(\w+)\s*\(|const\s+(\w+)\s*=)/g;

/** `export default Foo` / `export default Foo;` (not `export default function`). */
const EXPORT_DEFAULT_BINDING =
	/(?:^|\n)export\s+default\s+(?!function\s)(?!async\s+function\s)(?!class\s)(\w+)\b(?:\s*;)?/gm;

export type SvgComponentExport = {
	name: string;
	svgFragment: string;
};

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Start index of top-level `function Name` or `const Name =` (for default-export bindings). */
function findBindingDeclStart(tsxContent: string, name: string): number {
	const id = escapeRegExp(name);
	const reFn = new RegExp(`(?:^|\n)(?:async\\s+)?function\\s+${id}\\b\\s*\\(`);
	const reConst = new RegExp(`(?:^|\n)const\\s+${id}\\b\\s*=`);
	let best = -1;
	for (const re of [reFn, reConst]) {
		const hit = re.exec(tsxContent);
		if (hit) {
			let s = hit.index;
			if (tsxContent[s] === "\n") {
				s++;
			}
			if (best === -1 || s < best) {
				best = s;
			}
		}
	}
	return best;
}

function regionStartAfterNewline(
	tsxContent: string,
	matchIndex: number,
): number {
	if (tsxContent[matchIndex] === "\n") {
		return matchIndex + 1;
	}
	return matchIndex;
}

/** Naive `{`/`}` matcher; fine for flat `export default { A, B }` icon maps. */
function findMatchingBraceClose(s: string, openBraceIdx: number): number {
	if (s[openBraceIdx] !== "{") {
		return -1;
	}
	let depth = 1;
	for (let i = openBraceIdx + 1; i < s.length; i++) {
		const c = s[i];
		if (c === "{") {
			depth++;
		} else if (c === "}") {
			depth--;
			if (depth === 0) {
				return i;
			}
		}
	}
	return -1;
}

/** `export default { Foo, bar: Baz }` → `['Foo','Baz']` (shorthand + value side). */
function parseFlatObjectExportIds(body: string): string[] {
	const ids: string[] = [];
	const parts = body.split(",");
	for (const raw of parts) {
		const t = raw
			.trim()
			.replace(/\/\/[^\n]*/g, "")
			.trim();
		if (!t) {
			continue;
		}
		const shorthand = /^(\w+)$/.exec(t);
		if (shorthand) {
			ids.push(shorthand[1]);
			continue;
		}
		const kv = /^(\w+)\s*:\s*(\w+)$/.exec(t);
		if (kv) {
			ids.push(kv[2]);
		}
	}
	return ids;
}

function collectExportDefaultObjectRegions(
	tsxContent: string,
	regions: { name: string; start: number }[],
	seen: Set<string>,
): void {
	const m = /export\s+default\s*\{/.exec(tsxContent);
	if (!m || m.index === undefined) {
		return;
	}
	const open = m.index + m[0].length - 1;
	const close = findMatchingBraceClose(tsxContent, open);
	if (close === -1) {
		return;
	}
	const body = tsxContent.slice(open + 1, close);
	for (const name of parseFlatObjectExportIds(body)) {
		if (seen.has(name)) {
			continue;
		}
		const decl = findBindingDeclStart(tsxContent, name);
		if (decl === -1) {
			continue;
		}
		regions.push({ name, start: decl });
		seen.add(name);
	}
}

function extractAllSvgComponents(tsxContent: string): SvgComponentExport[] {
	const regions: { name: string; start: number }[] = [];
	const seen = new Set<string>();
	let m: RegExpExecArray | null;

	EXPORT_HEAD.lastIndex = 0;
	while ((m = EXPORT_HEAD.exec(tsxContent))) {
		const name = m[1] || m[2] || m[3];
		if (name) {
			regions.push({
				name,
				start: regionStartAfterNewline(tsxContent, m.index),
			});
			seen.add(name);
		}
	}

	EXPORT_DEFAULT_BINDING.lastIndex = 0;
	while ((m = EXPORT_DEFAULT_BINDING.exec(tsxContent))) {
		const name = m[1];
		if (!name || seen.has(name)) {
			continue;
		}
		const decl = findBindingDeclStart(tsxContent, name);
		if (decl === -1) {
			continue;
		}
		regions.push({ name, start: decl });
		seen.add(name);
	}

	collectExportDefaultObjectRegions(tsxContent, regions, seen);

	regions.sort((a, b) => a.start - b.start);

	const out: SvgComponentExport[] = [];
	const usedNames = new Map<string, number>();

	for (let i = 0; i < regions.length; i++) {
		const end =
			i + 1 < regions.length ? regions[i + 1].start : tsxContent.length;
		const slice = tsxContent.slice(regions[i].start, end);
		const svgFragment = extractSVGContent(slice);
		if (!svgFragment) {
			continue;
		}

		let baseName = regions[i].name;
		const n = (usedNames.get(baseName) ?? 0) + 1;
		usedNames.set(baseName, n);
		if (n > 1) {
			baseName = `${baseName}_${n}`;
		}

		out.push({ name: baseName, svgFragment });
	}

	return out;
}

function sanitizeSvgFileName(name: string): string {
	const s = name.replace(/[^\w.-]/g, "_");
	return s || "icon";
}

function svgContainsFilterOrMask(svg: string): boolean {
	if (/<\s*filter\b/i.test(svg) || /<\s*mask\b/i.test(svg)) {
		return true;
	}
	if (/\bmask\s*=\s*["']/i.test(svg)) {
		return true;
	}
	if (/\bfilter\s*=\s*["']/i.test(svg)) {
		return true;
	}
	return false;
}

function convertTSXToSVG(
	inputFilePath: string,
): { outputPath: string; svgContent: string } | null {
	try {
		const tsxContent = fs.readFileSync(inputFilePath, "utf8");
		const svgContent = extractSVGContent(tsxContent);
		const resolveExpr = buildExpressionLiteralResolver(inputFilePath, tsxContent);

		if (!svgContent) {
			console.error("Error: No SVG content found in the input file");
			return null;
		}

		const transformedContent = transformTSXToSVG(svgContent, resolveExpr);
		const inputDir = path.dirname(inputFilePath);
		const inputFilename = path.basename(
			inputFilePath,
			path.extname(inputFilePath),
		);
		const outputFilename = `${inputFilename}.svg`;
		const outputPath = path.join(inputDir, outputFilename);

		return { outputPath, svgContent: transformedContent };
	} catch (error) {
		console.error(
			`Error reading file ${inputFilePath}:`,
			error instanceof Error ? error.message : String(error),
		);
		return null;
	}
}

/** Files that contain a literal `<Svg` opening tag (react-native-svg). */
function discoverSvgSourceFiles(rootDir: string): string[] {
	const abs = path.resolve(rootDir);
	if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
		return [];
	}
	const slash = abs.replace(/\\/g, "/");
	const pattern = `${slash}/**/*.{ts,tsx}`;
	const files = globSync(pattern, {
		ignore: ["**/node_modules/**"],
		nodir: true,
	}) as string[];
	const out: string[] = [];
	for (const f of files.sort()) {
		try {
			const code = fs.readFileSync(f, "utf8");
			if (!/<\s*Svg\b/.test(code)) {
				continue;
			}
			out.push(path.resolve(f));
		} catch {
		}
	}
	return out;
}

function convertTSXToSvgFolder(
	inputFilePath: string,
	outputDir: string,
	options?: { nano?: boolean; filePrefix?: string },
): {
	outputDir: string;
	files: { outputPath: string; componentName: string }[];
	skippedNano: { componentName: string }[];
} | null {
	try {
		const tsxContent = fs.readFileSync(inputFilePath, "utf8");
		const components = extractAllSvgComponents(tsxContent);
		const resolveExpr = buildExpressionLiteralResolver(inputFilePath, tsxContent);

		if (components.length === 0) {
			console.error(
				"Error: No exported components with <Svg> found in the input file",
			);
			return null;
		}

		fs.mkdirSync(outputDir, { recursive: true });

		const files: { outputPath: string; componentName: string }[] = [];
		const skippedNano: { componentName: string }[] = [];
		const nano = options?.nano === true;
		const prefix = options?.filePrefix;

		for (const { name, svgFragment } of components) {
			const transformed = transformTSXToSVG(svgFragment, resolveExpr);
			if (nano && svgContainsFilterOrMask(transformed)) {
				console.error(`Skipped (nano: filter/mask): ${name}`);
				skippedNano.push({ componentName: name });
				continue;
			}
			const stem = prefix ? `${prefix}__${name}` : name;
			const fileName = `${sanitizeSvgFileName(stem)}.svg`;
			const outputPath = path.join(outputDir, fileName);
			fs.writeFileSync(outputPath, transformed, "utf8");
			files.push({ outputPath, componentName: name });
		}

		return { outputDir, files, skippedNano };
	} catch (error) {
		console.error(
			`Error converting ${inputFilePath}:`,
			error instanceof Error ? error.message : String(error),
		);
		return null;
	}
}

function main() {
	const program = new Command();

	program
		.name("svg-convert")
		.description(
			"Convert react-native-svg TSX to static .svg (string transforms).",
		)
		.usage("[options] [input] [outputDir]")
		.helpOption("-h, --help", "Display help for command")
		.addHelpText(
			"after",
			"\nExamples:\n  unsvgr icons.tsx ./out\n  unsvgr --input src/components/svgs --nano\n",
		)
		.argument(
			"[input]",
			"Input .tsx/.ts file or directory; omit to scan --input",
		)
		.argument(
			"[outputDir]",
			"Output directory; default is the same input file folder",
		)
		.option(
			"-i, --input <dir>",
			"When input is omitted: directory to scan for <Svg> sources",
			"src/components/svgs",
		)
		.option("-o, --output <dir>", "Output directory")
		.option(
			"--nano",
			"Skip filter/mask elements or mask=/filter= url attrs (font/nano)",
		)
		.action(
			(inputArg: string | undefined, outputDirArg: string | undefined) => {
				const opts = program.opts<{
					nano?: boolean;
					input?: string;
					output?: string;
				}>();
				const nano = opts.nano === true;
				const outputOptDir = opts.output ? path.resolve(opts.output) : undefined;
				const defaultRoot = path.resolve(
					process.cwd(),
					opts.input ?? "src/components/svgs",
				);

				let inputs: string[] = [];

				if (inputArg === undefined || inputArg === "") {
					inputs = discoverSvgSourceFiles(defaultRoot);
					if (inputs.length === 0) {
						console.error(`Error: No <Svg> sources found under ${defaultRoot}`);
						process.exit(1);
					}
					console.log(
						`Scanning ${defaultRoot}: ${inputs.length} file(s) with <Svg>`,
					);
				} else if (
					fs.existsSync(inputArg) &&
					fs.statSync(inputArg).isDirectory()
				) {
					inputs = discoverSvgSourceFiles(inputArg);
					if (inputs.length === 0) {
						console.error(
							`Error: No <Svg> sources found under ${path.resolve(inputArg)}`,
						);
						process.exit(1);
					}
					console.log(
						`Scanning ${path.resolve(inputArg)}: ${inputs.length} file(s)`,
					);
				} else {
					const ext = path.extname(inputArg).toLowerCase();
					if (ext !== ".tsx" && ext !== ".ts") {
						console.error(
							"Error: Input must be a .tsx / .ts file or a directory",
						);
						process.exit(1);
					}
					if (!fs.existsSync(inputArg)) {
						console.error(`Error: File not found: ${inputArg}`);
						process.exit(1);
					}
					inputs = [path.resolve(inputArg)];
				}

				const multi = inputs.length > 1;
				let exitCode = 0;
				let totalWrote = 0;
				let totalSkipped = 0;

				for (const inputFilePath of inputs) {
					const inputDir = path.dirname(inputFilePath);

					let outputDir: string;
					if (outputDirArg !== undefined) {
						outputDir = path.resolve(outputDirArg);
					} else if (outputOptDir !== undefined) {
						outputDir = outputOptDir;
					} else {
						outputDir = inputDir;
					}

					if (multi) {
						const rel = path.relative(process.cwd(), inputFilePath);
						console.log(`\n→ ${rel}`);
					}

					const batch = convertTSXToSvgFolder(inputFilePath, outputDir, {
						nano,
					});

					if (!batch) {
						exitCode = 1;
						continue;
					}

					const skipN = batch.skippedNano.length;
					const wroteN = batch.files.length;
					totalWrote += wroteN;
					totalSkipped += skipN;
					console.log(
						`Wrote ${wroteN} file(s)${nano && skipN > 0 ? `, skipped ${skipN} (nano: filter/mask)` : ""} to ${batch.outputDir}:`,
					);
					for (const f of batch.files) {
						console.log(
							`  ${path.basename(f.outputPath)} (${f.componentName})`,
						);
					}
				}

				if (multi) {
					console.log(
						`\nDone: ${totalWrote} .svg file(s) total${nano && totalSkipped > 0 ? `, ${totalSkipped} skipped (nano)` : ""}.`,
					);
				}

				if (exitCode !== 0) {
					process.exit(exitCode);
				}
			},
		);

	program.parse(process.argv);
}

if (require.main === module) {
	main();
}

export {
	convertTSXToSVG,
	convertTSXToSvgFolder,
	discoverSvgSourceFiles,
	coercePropsBraceExpressions,
	extractAllSvgComponents,
	extractBalancedSvgSubtree,
	extractSVGContent,
	svgContainsFilterOrMask,
	transformTSXToSVG,
	camelToKebabAttr,
	pascalComponentToSvgTag,
};
