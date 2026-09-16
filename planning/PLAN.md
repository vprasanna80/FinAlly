# FinAlly — Build Plan

See `../SPEC.md` for the full product/architecture specification. This file tracks
implementation decisions made while building it.

## Status

- [x] Repo scaffolding, git init, env files
- [x] Backend: db schema + lazy init/seed
- [x] Backend: market data (simulator + Massive interface) + price cache + SSE
- [x] Backend: portfolio logic + routes
- [x] Backend: watchlist routes
- [x] Backend: LLM chat integration (LiteLLM/OpenRouter, mock mode)
- [x] Backend: health route, app wiring, static serving
- [x] Backend: unit tests (pytest)
- [x] Frontend: Next.js scaffold, dark theme, SSE client
- [x] Frontend: watchlist, chart, heatmap, P&L chart, positions table, trade bar, chat panel
- [x] Frontend: unit tests
- [x] Docker: multi-stage Dockerfile, docker-compose.yml
- [x] Scripts: start/stop for mac + windows
- [x] E2E: Playwright suite + test docker-compose

## Notes / Deviations

- Database path is controlled by `FINALLY_DB_PATH` env var (defaults to `../db/finally.db`
  relative to `backend/`, i.e. the repo-root `db/` directory), so the same code works in
  dev (`uv run uvicorn`) and in the container (`/app/db/finally.db`).
- LLM mock mode parses the user's message for buy/sell verbs + a ticker-looking token to
  produce a plausible structured response deterministically, so E2E tests can assert on it.
