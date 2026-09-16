import pytest

from app.llm import ChatResponseSchema, _mock_response, get_chat_response


def test_mock_response_buy_extracts_ticker_and_quantity():
    resp = _mock_response("buy 5 shares of AAPL", "Cash balance: $10000.00")
    assert len(resp.trades) == 1
    assert resp.trades[0].ticker == "AAPL"
    assert resp.trades[0].side == "buy"
    assert resp.trades[0].quantity == 5.0


def test_mock_response_sell_extracts_ticker():
    resp = _mock_response("sell 2 shares of TSLA please", "context")
    assert resp.trades[0].ticker == "TSLA"
    assert resp.trades[0].side == "sell"
    assert resp.trades[0].quantity == 2.0


def test_mock_response_defaults_quantity_to_one():
    resp = _mock_response("buy AAPL", "context")
    assert resp.trades[0].quantity == 1.0


def test_mock_response_watchlist_add():
    resp = _mock_response("add PYPL to my watchlist", "context")
    assert resp.watchlist_changes[0].ticker == "PYPL"
    assert resp.watchlist_changes[0].action == "add"


def test_mock_response_watchlist_remove():
    resp = _mock_response("remove NFLX from my watchlist", "context")
    assert resp.watchlist_changes[0].ticker == "NFLX"
    assert resp.watchlist_changes[0].action == "remove"


def test_mock_response_portfolio_question_echoes_context():
    resp = _mock_response("how is my portfolio doing?", "Cash balance: $10000.00")
    assert "Cash balance" in resp.message
    assert resp.trades == []


def test_mock_response_generic_fallback():
    resp = _mock_response("hello there", "context")
    assert resp.trades == []
    assert resp.watchlist_changes == []
    assert "FinAlly" in resp.message


@pytest.mark.asyncio
async def test_get_chat_response_uses_mock_when_llm_mock_enabled(monkeypatch):
    import app.llm as llm_module

    monkeypatch.setattr(llm_module, "LLM_MOCK", True)
    resp = await get_chat_response([], "buy 1 share of AAPL", "context")
    assert isinstance(resp, ChatResponseSchema)
    assert resp.trades[0].ticker == "AAPL"


def test_chat_response_schema_parses_valid_json():
    data = {
        "message": "Buying AAPL",
        "trades": [{"ticker": "AAPL", "side": "buy", "quantity": 10}],
        "watchlist_changes": [{"ticker": "PYPL", "action": "add"}],
    }
    parsed = ChatResponseSchema.model_validate(data)
    assert parsed.message == "Buying AAPL"
    assert parsed.trades[0].quantity == 10


def test_chat_response_schema_defaults_optional_fields():
    parsed = ChatResponseSchema.model_validate({"message": "hi"})
    assert parsed.trades == []
    assert parsed.watchlist_changes == []


def test_chat_response_schema_rejects_invalid_side():
    with pytest.raises(ValueError):
        ChatResponseSchema.model_validate(
            {"message": "hi", "trades": [{"ticker": "AAPL", "side": "hold", "quantity": 1}]}
        )
