# Contributing to loophaus

Thank you for your interest in contributing to **loophaus**! This guide covers
everything you need to get started.

## Prerequisites

| Tool    | Version  |
| ------- | -------- |
| Node.js | >= 20    |
| npm     | >= 9     |

## Setup

```bash
git clone https://github.com/vcz-Gray/loophaus.git
cd loophaus
npm install
npm test
```

## Development

```bash
# Type-check without emitting
npm run typecheck

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Adding a Command

1. Create a Markdown spec in `commands/<your-command>.md`.
2. Register the command in `bin/loophaus.ts`.
3. Add tests in `tests/`.
4. Run `npm test` and `npm run typecheck` to verify.

## Adding a Platform

1. Create an installer at `platforms/<platform>/installer.mjs`.
2. Register the platform in `bin/loophaus.ts`.
3. Add tests in `tests/`.
4. Run `npm test` and `npm run typecheck` to verify.

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix     | Purpose                   |
| ---------- | ------------------------- |
| `feat:`    | New feature               |
| `fix:`     | Bug fix                   |
| `refactor:`| Code refactoring          |
| `docs:`    | Documentation only        |
| `test:`    | Adding/updating tests     |
| `chore:`   | Maintenance, deps, config |

## Pull Request Checklist

Before opening a PR, please ensure:

- [ ] `npm test` passes
- [ ] `npm run typecheck` passes (0 errors)
- [ ] `npm run build` succeeds
- [ ] `CHANGELOG.md` updated (if user-facing change)
- [ ] `README.md` updated (if applicable)

## Branching

- Features: `feature/<task-id>-<description>`
- Fixes: `fix/<task-id>-<description>`
- Hotfixes: `hotfix/<description>`

## Code Style

- TypeScript strict mode is enabled.
- Use ES modules (`import`/`export`).
- Keep functions small and focused.
- Write descriptive variable names.

## Reporting Issues

Use the [GitHub issue templates](https://github.com/vcz-Gray/loophaus/issues/new/choose)
to report bugs or request features.

## Response Time

- **Pull requests** are reviewed within **72 hours**.
- If your PR needs changes, please address feedback promptly so we can merge
  quickly.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
