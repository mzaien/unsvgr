# unsvgr

Convert `react-native-svg` TS/TSX icon components into static `.svg` files.

## Install

```bash
bun install unsvgr
- or
bunx unsvgr
```

## CLI

The package exposes a bin:

```bash
unsvgr
```

## Usage

```bash
unsvgr [input] [outputDir] [options]
```

### Arguments

- `input` (optional): `.ts`/`.tsx` file or directory.
  - If omitted, the CLI scans `--input`.
- `outputDir` (optional): output folder for generated SVG files.
  - If omitted, defaults to the same folder as each input file.

### Options

- `-i, --input <dir>`  
  Directory to scan when `input` argument is omitted.  
  Default: `src/components/svgs`

- `-o, --output <dir>`  
  Output directory (same meaning as positional `outputDir`).

- `--nano`  
  Skip icons that contain filter/mask features:
  - `<filter>` or `<mask>` tags
  - `filter="..."` or `mask="..."` attributes

## Output behavior

- Converts all exported components that contain `<Svg>...</Svg>`.
- File name format: `<ComponentName>.svg`
- When scanning multiple files, all generated files are written to the selected output directory.
- Logs each generated file and component name.

## Examples

### 1) Convert one file to same folder

```bash
unsvgr example/components/icon.tsx
```

### 2) Convert one file to explicit folder

```bash
unsvgr example/components/icon.tsx example/components/svg
```

### 3) Convert one file using `--output`

```bash
unsvgr example/components/icon.tsx --output example/components/svg
```

### 4) Scan a directory recursively for files containing `<Svg>`

```bash
unsvgr example/components
```

### 5) Omit input and use default scan folder

```bash
unsvgr
```

### 6) Omit input and provide custom scan folder

```bash
unsvgr --input example/components
```

### 7) Use nano-safe mode

```bash
unsvgr example/components/icon.tsx example/components/svg --nano
```

## Expression fallback resolution

The converter aggressively resolves static JSX fallback expressions before writing SVG attributes, including:

- local constants (`defaultColor`)
- imported object paths (`Colors.dark.icon`)
- `||`, `??`, ternary fallback branches
- static template/string/number expressions

If an expression cannot be resolved deterministically, it is left unchanged.

## Contributing

```bash
git clone <repo-url>
cd rnsvg-to-svg
bun install
```

### Run tests

```bash
bun test
```

### Develop against example app

```bash
cd example
bun install
bun run convert-svg
```

### Common contribution workflow

1. Add or update fixture icons in `example/components`.
2. Run `bun run convert-svg` in `example`.
3. Add/update tests in `index.test.ts`.
4. Run `bun test` at repo root.
