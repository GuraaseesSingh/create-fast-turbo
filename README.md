# create-fast-turbo

A cross-platform CLI tool to quickly scaffold a TurboRepo monorepo with pre-configured templates.
Sole purpose was to speed up setup build turborepo.
INSTALL: https://www.npmjs.com/package/create-fast-turbo

## Features

- **Cross-platform**: Windows, macOS, Linux support
- **Package Manager Support**: npm, pnpm, yarn
- **Symlink Handling**: Proper Windows symlink support without EPERM errors
- **Smart Filtering**: Excludes node_modules, .git, build artifacts
- **Workspace Configuration**: Auto-configures workspace references
- **Complete Template**: Includes apps (web, docs) and packages (ui, eslint-config, typescript-config)

## Quick Start

```bash
# Install globally
npm install -g create-fast-turbo

# Create a new project
create-fast-turbo my-awesome-app

# Start developing
cd my-awesome-app
pnpm dev
```

## Installation

```bash
npm install -g create-fast-turbo
```

## Usage

```bash
# Basic usage (uses pnpm by default)
create-fast-turbo my-project

# Specify package manager
create-fast-turbo my-project --npm
create-fast-turbo my-project --pnpm
create-fast-turbo my-project --yarn

# Interactive mode
create-fast-turbo

# Help
create-fast-turbo --help
```

## What Gets Created

```
my-project/
├── apps/
│   ├── web/                 # Next.js web app
│   └── docs/                # Next.js docs site
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── eslint-config/       # ESLint config
│   └── typescript-config/   # TypeScript config
├── package.json
├── turbo.json
└── tsconfig.json
```

## Premium Features

- **Instant Scaffolding**: Project appears immediately, no waiting
- **Background Installation**: Dependencies install in background
- **Professional UI**: Beautiful spinners and progress indicators
- **Smart Defaults**: Uses pnpm by default, no prompts needed
- **Command-line Arguments**: Full CLI argument support

## Technical Details

### Cross-Platform Compatibility
- **Windows**: Handles symlinks without EPERM errors
- **macOS/Linux**: Native symlink support
- Uses `fs-extra` for robust file operations

### Smart File Filtering
Automatically excludes:
- `node_modules/`, `.git/`
- Build artifacts (`.next/`, `.turbo/`, `dist/`, `out/`)
- Cache dirs (`.vercel/`, `.cache/`)
- Environment files (`*.env*`)
- Lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)

### Package Manager Configuration
- **npm**: Creates `package-lock.json`, removes pnpm config
- **pnpm**: Keeps `pnpm-workspace.yaml`
- **yarn**: Creates workspace config in `package.json`

### Workspace References
All internal dependencies use `workspace:*`:
```json
{
  "dependencies": {
    "@repo/ui": "workspace:*",
    "@repo/eslint-config": "workspace:*"
  }
}
```

## Development

### Setup
```bash
git clone https://github.com/GuraaseesSingh/create-fast-turbo
cd create-fast-turbo
npm install
npm link
```

### Testing
```bash
# Test with different package managers
create-fast-turbo test-project --npm
create-fast-turbo test-project --pnpm
create-fast-turbo test-project --yarn

# Test interactive mode
create-fast-turbo

# Test help
create-fast-turbo --help
```

## Troubleshooting

1. **Permission Errors on Windows**: CLI handles symlinks properly
2. **Template Not Found**: Ensure `templates/basic` directory exists
3. **Package Manager Issues**: CLI auto-configures workspace files

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open Pull Request

## License

ISC License

## Author

**Guraasees Singh Taneja**
- Twitter: [@Guraasees_Singh](https://twitter.com/Guraasees_Singh)
- GitHub: [@GuraaseesSingh](https://github.com/GuraaseesSingh)

## Support

If this tool helps you:
- Star the repository
- Report bugs
- Suggest features
- Share with others
