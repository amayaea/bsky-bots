# Gemini CLI Instruction Context: bsky-bots

## Project Overview

This project is a TypeScript-based monorepo (using Yarn Workspaces) for BlueSky bots. It consists of multiple bot services and a shared `common` package for interacting with the AT Protocol (BlueSky API).

### Architecture

- **`common/`**: Shared library (`@bsky-bots/common`) containing the `BskyClient` wrapper for the AT Protocol.
- **`bots/`**: Directory containing individual bot services:
  - **`is-alive/`**: Checks Wikipedia to see if a specific person (e.g., Joe Biden) is still alive and posts the status.
  - **`sotd/`**: "Song of the Day" bot that interacts with Spotify and BlueSky.
  - **`fantasy-bball/`**: Fantasy Baseball bot using MLB Stats API and SportsDataIO.
- **`scripts/`**: Shell scripts for building and deploying to Google Cloud.

### Technologies

- **Language**: TypeScript
- **Runtime**: Node.js (v22+)
- **API**: `@atproto/api` (BlueSky/AT Protocol)
- **Containerization**: Docker & Docker Compose
- **Build Tool**: Yarn 4.6.0 (Berry) with Workspaces

## Building and Running

### Prerequisites

- Node.js v22 or higher
- Yarn 4.x
- Docker (optional, for containerized execution)

### Setup

```bash
yarn install
yarn husky init
```

### Building

Build all workspaces from the root:

```bash
yarn build
```

### Running Locally

You can run individual bots using the root scripts:

- `yarn start:alive`: Starts the `is-alive` bot.
- `yarn start:sotd`: Starts the `sotd` bot.
- `yarn start:fbb`: Starts the `fantasy-bball` bot.

Bots require a `.env` file in their respective directories or the root with the following variables:

- `BLUESKY_USERNAME`
- `BLUESKY_PASSWORD`
- `TEST_BOT_USERNAME` (for dev mode)
- `TEST_BOT_PASSWORD` (for dev mode)
- Bot-specific keys (e.g., `SPOTIFY_CLIENT_ID`, `SPORTSDATAIO_API_KEY`)

### Docker

To build and run all bots using Docker Compose:

```bash
yarn docker:deploy
```

## Development Conventions

### Coding Style

- **Formatting**: Prettier is used for consistent formatting. Run `yarn prettier` to format the codebase.
- **Linting**: ESLint is configured with TypeScript support. Run `yarn lint` to check for issues.
- **Imports**: Avoid unused imports; `eslint-plugin-unused-imports` is active.
- **Typing**: Strict TypeScript is preferred. Ensure new modules have proper type definitions.

### Shared Logic

All BlueSky-related interactions should be implemented or extended in `common/src/bskyClient.ts` to ensure consistency across all bots. Use `@bsky-bots/common` to import shared utilities.

### Git Workflow

- Husky and `lint-staged` are used to run ESLint and Prettier on changed files before each commit.
- Do not commit `.env` files or sensitive credentials.

### Troubleshooting Builds

If `docker build` fails with TypeScript errors related to missing modules (e.g., `mlb-stats-api`):

1. Ensure the dependency is listed in the workspace's `package.json`.
2. Verify the `Dockerfile` correctly copies the workspace and its dependencies.
3. Use `yarn build` at the root to check for cross-workspace dependency issues.
