# AI Video Generation

A Next.js app that generates short videos through three provider APIs: Google Veo (via veo3gen), Runway and Luma. It covers ten models, shows only the options the selected model accepts, and prints a cost estimate before each run. Live at [aivideogeneration.thomasscheiber.com](https://aivideogeneration.thomasscheiber.com).

I built it to make hero-section and background clips for my own web projects.

Every generation is a billed call to the provider. The app never starts one on its own.

## Providers and models

This table mirrors `lib/video-providers.ts`. A provider reads the first variable in its list that is set.

| Provider | Models | Environment variables |
|----------|--------|-----------------------|
| Google Veo 3.1 via [veo3gen.app](https://www.imaginary.app/docs) | Veo 3.1 Fast, Veo 3.1 Quality, Veo 3.1 Lite | `VEO3_API_KEY` |
| [Runway API](https://docs.dev.runwayml.com/guides/models/) | Gen-4.5, Veo 3.1, Veo 3.1 Fast, Kling 4, Seedance 2.5, Wan 3 | `RUNWAYML_API_SECRET`, `RUNWAYML_API_KEY` |
| [Luma Agents API](https://docs.agents.lumalabs.ai/guides/videos/generation) | Ray 3.2 | `LUMA_AGENTS_API_KEY`, `LUMA_API_KEY` |

| Model | Provider | Durations | Aspect ratios | Resolutions | Audio | Price label |
|-------|----------|-----------|---------------|-------------|-------|-------------|
| Veo 3.1 Fast | veo3gen | 8s | 16:9, 9:16 | 720p, 1080p, 4k | yes | 6 to 22 credits/clip |
| Veo 3.1 Quality | veo3gen | 8s | 16:9, 9:16 | 720p, 1080p, 4k | yes | 13 to 38 credits/clip |
| Veo 3.1 Lite | veo3gen | 8s | 16:9, 9:16 | 720p, 1080p | yes | 2 to 5 credits/clip |
| Gen-4.5 | Runway | 2 to 10s | 16:9, 9:16 | 720p | no | $0.12/s |
| Veo 3.1 | Runway | 4, 6, 8s | 16:9, 9:16 | 720p, 1080p | yes | from $0.20/s |
| Veo 3.1 Fast | Runway | 4, 6, 8s | 16:9, 9:16 | 720p, 1080p | yes | from $0.10/s |
| Kling 4 | Runway | 3 to 30s | 16:9, 9:16, 1:1 | 720p, 1080p | no | from $0.157/s |
| Seedance 2.5 | Runway | 5, 10, 15, 20, 25, 30s | 16:9, 9:16, 1:1 | 720p, 1080p | yes | from $0.20/s |
| Wan 3 | Runway | 2 to 30s | 16:9, 9:16, 1:1 | 720p, 1080p | yes | from $0.05/s |
| Ray 3.2 | Luma | 5, 10s | 16:9, 9:16, 1:1, 4:3, 3:4, 21:9 | 720p, 1080p, 540p, 360p | no | 20 to 1200 credits/clip |

Every model accepts a start image, except that 10s Ray 3.2 clips cannot use one. Negative prompts work on the Veo models. Up to 4 variations per run, and each one is a separate billed generation.

## How it works

### The catalog drives the interface and the server

`lib/video-providers.ts` holds one entry per model: allowed durations, aspect ratios and resolutions, whether it supports audio, a start image or a negative prompt, and an `estimateCost` function. `components/VideoGenerator.tsx` renders only those options and resets a value when you switch to a model that does not accept it. `validateRequest` in `lib/video-provider-service.ts` checks every request against the same catalog before any provider is called, so a hand-written request cannot pick an unsupported combination.

Adding a model means adding an entry to the catalog. If its provider already has a runner in `video-provider-service.ts`, nothing else changes.

### Cost estimate

Each model carries its own pricing rule:

- Runway models multiply a per-second rate by the duration. Veo 3.1 and Veo 3.1 Fast have a higher rate with audio.
- veo3gen looks up credits per clip by model, resolution and audio in a table copied from the provider's docs.
- Luma looks up credits per clip by resolution and duration.

The UI multiplies the per-clip figure by the number of variations and shows it before you press Generate. After a run, the server sums the cost each provider reports (Runway credits at $0.01 each, veo3gen and Luma credits as returned) and the page shows it as "Reported cost". The estimate and the reported cost can differ, and several price labels in the catalog say "from".

### Provider calls and errors

Each provider has a runner that submits a job, then polls its status endpoint every 10 seconds for up to 10 minutes. The runners map onto the three provider APIs:

- veo3gen: `POST /api/generate`, then `GET /api/status/{taskId}`.
- Runway: `text_to_video` or `image_to_video`, then `GET /v1/tasks/{id}`. The pixel size sent depends on model, aspect ratio and resolution.
- Luma: `POST /generations`, then `GET /generations/{id}`.

Variations run in parallel with `Promise.allSettled`. If some fail, the route returns the clips that finished plus a warning such as "1 of 3 variations failed". If all fail, it returns the first failure.

HTTP errors from a provider become readable messages: 401 says to check the key, 402 says the account is out of credits, 429 says the rate limit was hit. Other statuses include the status code, followed by the first 500 characters of the provider's response body.

When a generation fails, the route answers with status 422. A comment in the route explains why: Cloudflare replaces 502 bodies from the origin with its own error page, which hides the reason (a bad key, no credits). Unexpected exceptions return a generic 500.

### Access and guest mode

Sign-in uses Better Auth with Google OAuth and a SQLite file through Node's built-in `node:sqlite`. `instrumentation.ts` creates or updates the auth tables when the server starts, so a new volume needs no migration step. `ALLOWED_EMAILS` is a comma-separated allowlist. Only allowlisted accounts can use the server's provider keys. If it is unset, any Google account is allowed, which is fine for local work and not for a public deployment.

Guest mode is on unless `GUEST_MODE` is `off`, `false`, `0` or `no`. A guest pastes a provider key into the "Your API keys" panel:

- The key is saved in the browser's localStorage under `aivideo.providerKeys.v1` (`lib/browser-keys.ts`).
- On Generate, the browser sends only the selected provider's key, in the `x-provider-api-key` header. The header must be visible ASCII and at most 512 characters.
- The route uses the key for that one request. It does not write it to the database and its log line records only "own key" or "server key".
- `/api/providers` reports which providers have a server key, and reports `false` for every provider unless the caller is an allowlisted member. A guest never gets a server key.

A visitor's key is still readable by anyone with access to that browser profile or by script on the page, so set a spending limit with each provider.

## Stack

Versions come from `package.json`.

- Next.js 16.4.6 (App Router), React 19.3.1, TypeScript 6.0.3
- Tailwind CSS 4.3.5 through `@tailwindcss/postcss`
- Better Auth 1.7.21
- ESLint 10 with `eslint-config-next`
- Bun as package manager (`bun.lock`), Node 22 at runtime (the version `nixpacks.toml` installs), because auth uses `node:sqlite`

TypeScript is held at 6.x. TypeScript 7 makes `typescript-eslint` throw at startup, so `bun run lint` fails until that package supports it.

## Run it locally

```bash
bun install
cp env.example .env.local
bun run dev
```

Fill in `.env.local` first. The variables in `env.example`:

| Variable | Purpose |
|----------|---------|
| `BETTER_AUTH_SECRET` or `AUTH_SECRET` | Signs sessions |
| `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` | Base URL, default `http://localhost:3000` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `ALLOWED_EMAILS` | Accounts allowed to use server keys |
| `GUEST_MODE` | Set to `off` to require sign-in |
| `AUTH_DB_PATH` | SQLite file, default `.better-auth.db` in the working directory |
| `VEO3_API_KEY`, `RUNWAYML_API_SECRET`, `LUMA_AGENTS_API_KEY` | Provider keys, see the table above |

Scripts: `bun run dev` (Next.js with Turbopack), `bun run build`, `bun run start`, `bun run lint`. The repo has no test suite.

`GET /api/health` returns `{"status":"ok"}` and needs no session.

## Deployment

`nixpacks.toml` installs Node 22 and Bun, runs `bun run build` and starts with `bunx next start -H 0.0.0.0`. Point `AUTH_DB_PATH` at a persistent volume, otherwise users and sessions are lost on each redeploy.

## License

MIT, see [LICENSE](LICENSE).

Anyone who uses the provider APIs through this app has to follow those providers' terms.
