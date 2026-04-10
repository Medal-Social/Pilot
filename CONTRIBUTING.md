# Contributing to Pilot

Thanks for your interest in contributing to Pilot!

## Getting Started

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Build all packages: `pnpm build`
4. Run tests: `pnpm test`

## Development

```bash
pnpm dev          # Start CLI in watch mode
pnpm test         # Run tests
pnpm lint         # Check code style
pnpm lint:fix     # Auto-fix code style
```

## Project Structure

```
packages/
  cli/              # Main CLI package (@medalsocial/pilot)
  plugins/
    kit/            # Machine management plugin
    sanity/         # CMS plugin
    pencil/         # Design tools plugin
```

## Pull Requests

- Create a feature branch from `main`
- Write tests for new functionality
- Ensure all tests pass before submitting
- Follow existing code conventions (TypeScript strict, Biome linting)

## Code Style

- TypeScript strict mode, no `any`
- Single quotes, 2-space indent, trailing commas ES5
- Use `import type` for type-only imports
- Use structured logger instead of `console.log`

## Reporting Issues

Use [GitHub Issues](https://github.com/Medal-Social/pilot/issues) to report bugs or request features.
