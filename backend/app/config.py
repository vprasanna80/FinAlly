import os
from pathlib import Path

from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_DIR.parent / ".env")

DEFAULT_USER_ID = "default"
DEFAULT_CASH_BALANCE = 10000.0

# ticker -> realistic seed price
DEFAULT_TICKERS: dict[str, float] = {
    "AAPL": 190.0,
    "GOOGL": 175.0,
    "MSFT": 420.0,
    "AMZN": 185.0,
    "TSLA": 250.0,
    "NVDA": 130.0,
    "META": 560.0,
    "JPM": 215.0,
    "V": 275.0,
    "NFLX": 680.0,
}

DB_PATH = Path(os.environ.get("FINALLY_DB_PATH", str(_BACKEND_DIR.parent / "db" / "finally.db")))

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
MASSIVE_API_KEY = os.environ.get("MASSIVE_API_KEY", "")
LLM_MOCK = os.environ.get("LLM_MOCK", "false").lower() == "true"

LLM_MODEL = "openrouter/openai/gpt-oss-120b"
