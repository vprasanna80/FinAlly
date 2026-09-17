# FinAlly — AI Trading Workstation

A visually dense, Bloomberg-style trading terminal that streams live (simulated) market
data, lets you trade a virtual $10,000 portfolio, and ships with an AI copilot that can
analyze your positions and execute trades for you in natural language.

Runs as a single Docker container on one port — no login, no signup, no external
database to stand up.

See [`SPEC.md`](./SPEC.md) for the full product specification and [`planning/PLAN.md`](./planning/PLAN.md)
for implementation notes and gotchas.

## Features

- **Live price streaming** over Server-Sent Events, with green/red flash animations and
  per-ticker sparklines accumulated on the client since page load
- **Market simulator** — correlated geometric Brownian motion across tickers with
  occasional event shocks — or real data via the Massive (Polygon.io) API
- **Simulated trading** — market orders only, instant fill, no fees, fractional shares
- **Portfolio visualization** — a P&L-colored treemap heatmap, a portfolio value chart,
  and a positions table with live unrealized P&L
- **AI chat assistant** ("FinAlly") that can analyze your portfolio and execute trades or
  manage your watchlist through natural language, via LiteLLM → OpenRouter (Cerebras
  inference) with structured outputs

## Quick Start

Requires [Docker](https://www.docker.com/) (Desktop or Engine) running locally.

```bash
# macOS / Linux
./scripts/start_mac.sh

# Windows (PowerShell)
.\scripts\start_windows.ps1
```

This builds the image on first run, starts the container, and opens
**http://localhost:8000** in your browser. Stop it with the matching `stop_*` script —
your data persists in a named Docker volume (`finally-data`) across restarts.

Without a script:

```bash
cp .env.example .env
docker compose up --build
```

### Enabling live AI chat

The app works out of the box with a deterministic **mock** chat mode (`LLM_MOCK=true`).
To use the real AI assistant, add your [OpenRouter](https://openrouter.ai/) API key to
`.env`:

```bash
OPENROUTER_API_KEY=sk-or-...
LLM_MOCK=false
```

then restart the container. Optionally set `MASSIVE_API_KEY` to stream real market data
from [Massive/Polygon.io](https://polygon.io/) instead of the built-in simulator.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Docker Container (port 8000)                    │
│                                                   │
│  FastAPI (Python/uv)                             │
│  ├── /api/*          REST endpoints              │
│  ├── /api/stream/*   SSE streaming               │
│  └── /*              Static file serving         │
│                      (Next.js export)            │
│                                                   │
│  SQLite database (volume-mounted)                │
│  Background task: market data polling/sim        │
└─────────────────────────────────────────────────┘
```

- **Frontend**: Next.js (TypeScript, App Router), built as a static export, served by
  FastAPI — one origin, one port, no CORS
- **Backend**: FastAPI, managed as a [uv](https://docs.astral.sh/uv/) project
- **Database**: SQLite at `db/finally.db`, lazily created and seeded on first run
- **Real-time data**: Server-Sent Events (`EventSource`) — simple, one-way, reconnects
  automatically
- **AI**: LiteLLM → OpenRouter (`openai/gpt-oss-120b` via Cerebras), structured JSON
  output for trades and watchlist changes, auto-executed

## Project Structure

```
FinAlly/
├── frontend/       Next.js TypeScript app (static export)
├── backend/        FastAPI uv project — routes, market data, portfolio logic, LLM chat
├── planning/       Implementation notes and decisions
├── scripts/        start/stop scripts (mac + Windows)
├── test/           Playwright E2E suite + docker-compose.test.yml
├── db/             Runtime volume mount point for finally.db
├── Dockerfile      Multi-stage build (Node → Python)
├── docker-compose.yml
└── .env.example
```

## Development

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
uv run pytest
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000, proxying nothing — point it at a running backend
npm run build    # static export to frontend/out
npm run lint
npm test         # Vitest + React Testing Library
```

### End-to-end tests

Runs the full app in a container plus a Playwright container against it, with
`LLM_MOCK=true` for fast, deterministic runs:

```bash
cd test
npm install
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENROUTER_API_KEY` | for live chat | — | OpenRouter API key for the AI assistant |
| `MASSIVE_API_KEY` | no | unset | Enables real market data via Massive/Polygon.io; simulator is used otherwise |
| `LLM_MOCK` | no | `false` | `true` returns deterministic mock chat responses (used in dev/E2E) |

## Tech Stack

Next.js · TypeScript · Tailwind CSS · Recharts · FastAPI · Python · SQLite · uv ·
LiteLLM · OpenRouter/Cerebras · Docker · Playwright · Vitest · pytest
