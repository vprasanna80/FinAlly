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
- Dockerfile `CMD` calls `uvicorn` directly (via the venv on `PATH`), not `uv run uvicorn`.
  `uv run` re-syncs dependency groups against `pyproject.toml` on every invocation, which
  re-added the `dev` group (pytest etc.) at container start even though the build already
  ran `uv sync --frozen --no-dev`, adding startup latency and a runtime network dependency.
- `test/docker-compose.test.yml` names the app service `web`, not `app`. A bare single-label
  hostname `app` collides with Chrome's HSTS preload list for the `.app` gTLD, which forces
  HTTPS and breaks plain-HTTP navigation from the Playwright browser (`ERR_SSL_PROTOCOL_ERROR`).
- `crypto.randomUUID()` requires a secure context (HTTPS or `localhost`) and throws otherwise.
  The app is served over plain HTTP on arbitrary hostnames (e.g. inside Docker), so this was
  silently breaking chat message submission. Use `frontend/src/lib/id.ts`'s `generateId()`
  instead of `crypto.randomUUID()` anywhere a client-side id is needed.
- PowerShell `.ps1` scripts must stay pure ASCII. Windows PowerShell 5.1 reads scripts using
  the system ANSI code page unless a UTF-8 BOM is present, and a stray em-dash or other
  non-ASCII character silently corrupts string parsing elsewhere in the file.
- Playwright spec files are numbered (`00-`, `01-`, ...) to force deterministic execution
  order, since the suite runs against one shared backend/DB for the whole run (not per test).
