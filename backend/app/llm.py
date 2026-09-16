import json
import re
from typing import Literal

import litellm
from pydantic import BaseModel

from app.config import DEFAULT_TICKERS, LLM_MOCK, LLM_MODEL, OPENROUTER_API_KEY

SYSTEM_PROMPT = """You are FinAlly, an AI trading assistant embedded in a simulated \
trading terminal. The user has a virtual cash balance and a portfolio of positions; \
all trades are simulated with fake money, so there is zero real-world risk.

Your job:
- Analyze portfolio composition, risk concentration, and P&L when asked.
- Suggest trades with clear, data-driven reasoning.
- Execute trades immediately when the user asks for one or agrees to a suggestion \
  (there is no confirmation step - if you include a trade in your response, it executes).
- Proactively manage the watchlist (add/remove tickers) when it helps the user.
- Be concise and data-driven. No filler, no disclaimers about being an AI.
- Always respond with a single valid JSON object matching the required schema.

You will be given the user's current portfolio context (cash, positions, watchlist, \
total value) before their message. Use it to ground your analysis and trade decisions."""


class TradeAction(BaseModel):
    ticker: str
    side: Literal["buy", "sell"]
    quantity: float


class WatchlistChangeAction(BaseModel):
    ticker: str
    action: Literal["add", "remove"]


class ChatResponseSchema(BaseModel):
    message: str
    trades: list[TradeAction] = []
    watchlist_changes: list[WatchlistChangeAction] = []


async def get_chat_response(
    history: list[dict], user_message: str, portfolio_context: str
) -> ChatResponseSchema:
    if LLM_MOCK:
        return _mock_response(user_message, portfolio_context)

    messages = [{"role": "system", "content": f"{SYSTEM_PROMPT}\n\n{portfolio_context}"}]
    messages.extend({"role": h["role"], "content": h["content"]} for h in history)
    messages.append({"role": "user", "content": user_message})

    response = await litellm.acompletion(
        model=LLM_MODEL,
        messages=messages,
        api_key=OPENROUTER_API_KEY,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "chat_response",
                "schema": ChatResponseSchema.model_json_schema(),
                "strict": True,
            },
        },
        extra_body={"provider": {"order": ["cerebras"], "allow_fallbacks": True}},
    )
    content = response.choices[0].message.content

    try:
        return ChatResponseSchema.model_validate(json.loads(content))
    except (json.JSONDecodeError, ValueError):
        return ChatResponseSchema(
            message=content or "Sorry, I couldn't process that response.",
            trades=[],
            watchlist_changes=[],
        )


def _extract_ticker(message: str) -> str | None:
    upper = message.upper()
    for ticker in DEFAULT_TICKERS:
        if re.search(rf"\b{ticker}\b", upper):
            return ticker
    match = re.search(r"\b([A-Z]{2,5})\b", message)
    return match.group(1) if match else None


def _mock_response(user_message: str, portfolio_context: str) -> ChatResponseSchema:
    """Deterministic mock used when LLM_MOCK=true, for fast/free/reproducible dev and E2E tests."""
    text = user_message.lower()
    qty_match = re.search(r"(\d+(?:\.\d+)?)\s*shares?", text)
    quantity = float(qty_match.group(1)) if qty_match else 1.0
    ticker = _extract_ticker(user_message)

    if ticker and "buy" in text:
        return ChatResponseSchema(
            message=f"Buying {quantity:g} shares of {ticker} as requested.",
            trades=[TradeAction(ticker=ticker, side="buy", quantity=quantity)],
        )
    if ticker and "sell" in text:
        return ChatResponseSchema(
            message=f"Selling {quantity:g} shares of {ticker} as requested.",
            trades=[TradeAction(ticker=ticker, side="sell", quantity=quantity)],
        )
    if ticker and ("watch" in text or "add" in text) and "remove" not in text:
        return ChatResponseSchema(
            message=f"Added {ticker} to your watchlist.",
            watchlist_changes=[WatchlistChangeAction(ticker=ticker, action="add")],
        )
    if ticker and "remove" in text:
        return ChatResponseSchema(
            message=f"Removed {ticker} from your watchlist.",
            watchlist_changes=[WatchlistChangeAction(ticker=ticker, action="remove")],
        )
    if "portfolio" in text or "doing" in text or "performance" in text:
        return ChatResponseSchema(
            message=f"Here's a quick look at your portfolio:\n\n{portfolio_context}"
        )
    return ChatResponseSchema(
        message=(
            "I'm FinAlly, your AI trading assistant (mock mode). Ask me to analyze your "
            "portfolio or execute a trade, e.g. 'buy 5 shares of AAPL'."
        )
    )
