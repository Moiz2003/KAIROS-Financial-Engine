"""External adapters package."""

from .news_adapter import (
	CoinDeskNewsAdapter,
	CryptoPanicAdapter,
	FreeNewsAPIAdapter,
	get_news_provider,
)

__all__ = [
	"CryptoPanicAdapter",
	"FreeNewsAPIAdapter",
	"CoinDeskNewsAdapter",
	"get_news_provider",
]
