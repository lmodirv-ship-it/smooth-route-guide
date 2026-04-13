# Contributing / Local Setup

## Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 8 (`npm i -g pnpm`)

## Quick Start

```bash
pnpm bootstrap        # install deps
pnpm dev              # start dev server on :5173
```

## Running Tests

```bash
pnpm test             # unit tests (vitest)
pnpm test:e2e:install # install Playwright browsers (first time only)
pnpm test:e2e         # end-to-end tests
```

## CI Notes

- **Playwright browsers**: Run `pnpm dlx playwright install --with-deps chromium` in your CI pipeline before `pnpm test:e2e`. This installs ~300 MB of browser binaries. Only `chromium` is needed (not `firefox`/`webkit`) to keep image size small.
- **Lockfile**: `pnpm-lock.yaml` is committed. Always use `pnpm install --frozen-lockfile` in CI.
- **Package manager enforcement**: The `preinstall` script rejects `npm install` / `yarn install` with an error message.
