# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-06-19

### Added

- **Remotion demo project** (`remotion-demo/`) — a standalone video demo built with Remotion showcasing unsvgr's conversion workflow
- `unsvgr-demo.mp4` — recorded demo video asset

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
