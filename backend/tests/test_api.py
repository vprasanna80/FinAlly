import time

import pytest
from starlette.testclient import TestClient

from app import config
from app import llm as llm_module


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DB_PATH", tmp_path / "api_test.db")
    monkeypatch.setattr(llm_module, "LLM_MOCK", True)

    from app.main import app

    with TestClient(app) as test_client:
        time.sleep(0.2)  # let the background simulator seed initial prices
        yield test_client


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_get_watchlist_returns_seeded_tickers(client):
    resp = client.get("/api/watchlist")
    assert resp.status_code == 200
    tickers = {item["ticker"] for item in resp.json()["watchlist"]}
    assert tickers == {"AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "META", "JPM", "V", "NFLX"}
    for item in resp.json()["watchlist"]:
        assert "price" in item


def test_add_and_remove_watchlist_ticker(client):
    resp = client.post("/api/watchlist", json={"ticker": "pypl"})
    assert resp.status_code == 201
    assert resp.json()["ticker"] == "PYPL"

    resp = client.get("/api/watchlist")
    assert "PYPL" in {item["ticker"] for item in resp.json()["watchlist"]}

    resp = client.delete("/api/watchlist/PYPL")
    assert resp.status_code == 200

    resp = client.get("/api/watchlist")
    assert "PYPL" not in {item["ticker"] for item in resp.json()["watchlist"]}


def test_add_duplicate_watchlist_ticker_conflicts(client):
    client.post("/api/watchlist", json={"ticker": "PYPL"})
    resp = client.post("/api/watchlist", json={"ticker": "PYPL"})
    assert resp.status_code == 409


def test_remove_nonexistent_ticker_404(client):
    resp = client.delete("/api/watchlist/ZZZZ")
    assert resp.status_code == 404


def test_get_portfolio_initial_state(client):
    resp = client.get("/api/portfolio")
    assert resp.status_code == 200
    body = resp.json()
    assert body["cash_balance"] == 10000.0
    assert body["positions"] == []
    assert body["total_value"] == 10000.0


def test_trade_buy_and_sell_flow(client):
    watchlist = client.get("/api/watchlist").json()["watchlist"]
    aapl = next(item for item in watchlist if item["ticker"] == "AAPL")
    price = aapl["price"]

    resp = client.post("/api/portfolio/trade", json={"ticker": "AAPL", "quantity": 2, "side": "buy"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["trade"]["ticker"] == "AAPL"
    assert body["portfolio"]["cash_balance"] == pytest.approx(10000.0 - 2 * price)
    assert len(body["portfolio"]["positions"]) == 1

    resp = client.post("/api/portfolio/trade", json={"ticker": "AAPL", "quantity": 2, "side": "sell"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["portfolio"]["positions"] == []


def test_trade_insufficient_cash_400(client):
    resp = client.post(
        "/api/portfolio/trade", json={"ticker": "AAPL", "quantity": 1_000_000, "side": "buy"}
    )
    assert resp.status_code == 400
    assert "Insufficient cash" in resp.json()["detail"]


def test_trade_unknown_ticker_400(client):
    resp = client.post("/api/portfolio/trade", json={"ticker": "ZZZZ", "quantity": 1, "side": "buy"})
    assert resp.status_code == 400


def test_portfolio_history_populates_after_trade(client):
    resp = client.get("/api/portfolio/history")
    assert resp.json()["snapshots"] == []

    client.post("/api/portfolio/trade", json={"ticker": "AAPL", "quantity": 1, "side": "buy"})

    resp = client.get("/api/portfolio/history")
    assert len(resp.json()["snapshots"]) == 1


def test_chat_mock_buy_executes_trade(client):
    resp = client.post("/api/chat", json={"message": "buy 1 share of AAPL"})
    assert resp.status_code == 200
    body = resp.json()
    assert "message" in body
    assert len(body["actions"]["trades"]) == 1
    assert body["actions"]["trades"][0]["ticker"] == "AAPL"

    portfolio = client.get("/api/portfolio").json()
    assert len(portfolio["positions"]) == 1


def test_chat_persists_history(client):
    client.post("/api/chat", json={"message": "hello"})
    client.post("/api/chat", json={"message": "how is my portfolio doing?"})
    resp = client.post("/api/chat", json={"message": "hello again"})
    assert resp.status_code == 200
