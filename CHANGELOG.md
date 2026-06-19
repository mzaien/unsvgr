# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-06-19

### Added

- **CLI flags**: `--dry-run` (preview without writing), `--watch` (auto-convert on file change), `--concurrency <n>` (parallel batch processing, default 4, max 16)
- **Dry-run support** in `convertTSXToSvgFolder()` — pass `{ dryRun: true }` to inspect output without filesystem writes
- **Watch mode** — uses `fs.watch` on the input directory, debounced at 200ms, re-runs conversion on `.ts`/`.tsx` changes (concurrency forced to 1)
- **Full SVG tag coverage** — all standard `react-native-svg` elements now convert correctly: `G`, `Defs`, `LinearGradient`, `RadialGradient`, `Stop`, `ClipPath`, `Pattern`, `Marker`, `Symbol`, `Use`, `Text`, `TSpan`, `TextPath`, `ForeignObject`, `Image`, `Polygon`, `Polyline`, `Line`, `Ellipse`
- **Static expression resolution** — template literals (`` `#${'FF0000'}` ``), ternary branches (`true ? '#F00' : '#0F0'`), and numeric brace expressions (`strokeWidth={2}`) resolve to their static values
- **Comprehensive test suite** — 40+ new tests covering: `discoverSvgSourceFiles`, `extractAllSvgComponents`, `svgContainsFilterOrMask`, `extractSVGContent`, `transformTSXToSVG`, `camelToKebabAttr`, `pascalComponentToSvgTag`, batch `convertTSXToSvgFolder` (dry-run, auto-create dir), full CLI integration via `runConversion` (valid file, nano flag, non-existent file, dry-run, directory scan)
- **Example icon fixtures** — `icons-shapes.tsx`, `icons-edge-cases.tsx`, `icons-advanced.tsx` covering every SVG element category

### Changed

- **CLI internals refactored** — monolithic action handler split into `runConversion()`, `processFileBatch()`, `startWatcher()` for testability and reuse

### Fixed

- **README contributing guide** — corrected repository URLs from old placeholder names to `github.com/mzaien/unsvgr`

## [0.0.4] - 2026-04-29

### Added

- Demo MP4 video to README
- `unsvgr-demo.mp4` asset

### Changed

- CLI argument resolution — positional `input` and `outputDir` now work alongside `--input` / `--output` flags

## [0.0.3] - 2026-04-27

### Added

- `--nano` flag — skip icons containing `<filter>`, `<mask>`, or `filter="..."` / `mask="..."` attributes
- **Expression fallback resolution** — aggressively resolves static JSX expressions (`||`, `??`, ternaries, imported constants) before writing SVG attributes

### Fixed

- Skips non-convertible SVGs with unresolved dynamic props instead of emitting broken output

## [0.0.2] - 2026-04-26

### Added

- `--help` CLI option

### Changed

- Published initial npm package

## [0.0.1] - 2026-04-25

### Added

- Initial release — convert `react-native-svg` TS/TSX icon components to static `.svg` string transforms
- CLI with `bun` runtime, `commander` for argument parsing
- Recursive directory scanning via `glob`
