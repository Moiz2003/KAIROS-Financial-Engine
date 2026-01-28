# KAIROS Architecture - Visual Diagrams

## 1️⃣ Layered Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│ FastAPI | HTTP Routes | Pydantic DTOs | Request/Response   │
│                                                              │
│  GET /api/health            POST /api/signals               │
│  POST /api/analysis         POST /api/execute               │
└──────────────────────────┬──────────────────────────────────┘
                           │ Depends On
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                       │
│  Pure Domain Logic | No External Dependencies               │
│                                                              │
│  • MarketAnalyzer (Technical indicators)                    │
│  • SignalGenerator (Signal recommendations)                 │
│  • RiskManager (Risk evaluation)                            │
│  • Portfolio (Position tracking)                            │
│  • TradeExecutor (Trade validation)                         │
│                                                              │
│  Models: AnalysisResult, TradeSignal, RiskAssessment       │
└──────────────────────────┬──────────────────────────────────┘
                           │ Depends On Abstractions
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   SERVICE ADAPTER LAYER                      │
│  Adapter Pattern | Dependency Inversion                     │
│                                                              │
│  Abstractions:                                              │
│  ┌─ IMarketDataProvider                                    │
│  ├─ IAIContextProvider                                     │
│  └─ ITradeExecutorService                                  │
│                                                              │
│  Implementations:                                           │
│  ┌─ BinanceMarketData → Real Binance API                   │
│  ├─ PerplexityAI → Real Perplexity API                     │
│  └─ MockServices → Testing                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │ Imports
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                         │
│  Configuration | Logging | Exception Handling              │
│                                                              │
│  • Config (Singleton) → Environment variables              │
│  • LoggingConfig (Singleton) → Centralized logging         │
│  • Exception Hierarchy → Custom exceptions                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ Data Flow: Analysis → Signal → Risk → Execute

```
┌──────────────────────────────────────────────────────────────────┐
│ HTTP REQUEST: POST /api/signals                                  │
│ Body: { "symbol": "BTCUSDT", "include_news": true }              │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ↓
        ┌──────────────────────────────────────┐
        │   api/routes/signals.py              │
        │   Route Handler (Thin Controller)    │
        └──────────────────┬───────────────────┘
                           │
                           ↓
        ┌──────────────────────────────────────┐
        │   domain/services/orchestrator.py    │
        │   Orchestrate Domain Operations      │
        └──────────────────┬───────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                    │
        ↓                                    ↓
┌──────────────────────────┐    ┌──────────────────────────┐
│ services/abstractions/   │    │ services/abstractions/   │
│ IMarketDataProvider      │    │ IAIContextProvider       │
│ get_klines()             │    │ get_news_sentiment()     │
└──────────────┬───────────┘    └──────────┬───────────────┘
               │                           │
               ↓                           ↓
        ┌──────────────────┐      ┌──────────────────┐
        │ Binance API      │      │ Perplexity API   │
        │ get_klines()     │      │ Sentiment        │
        └────────┬─────────┘      └────────┬─────────┘
                 │                         │
                 └──────────────┬──────────┘
                                ↓
        ┌──────────────────────────────────────┐
        │ domain/entities/                     │
        │ MarketAnalyzer                       │
        │ • calculate_rsi()                    │
        │ • calculate_ema()                    │
        │ • determine_trend()                  │
        │ → AnalysisResult                     │
        └──────────────────┬───────────────────┘
                           │
                           ↓
        ┌──────────────────────────────────────┐
        │ domain/services/                     │
        │ SignalGenerator                      │
        │ • generate_signal()                  │
        │ → TradeSignal                        │
        └──────────────────┬───────────────────┘
                           │
                           ↓
        ┌──────────────────────────────────────┐
        │ domain/services/                     │
        │ RiskManager                          │
        │ • assess()                           │
        │ → RiskAssessment                     │
        └──────────────────┬───────────────────┘
                           │
                           ↓
        ┌──────────────────────────────────────┐
        │ api/models/                          │
        │ SignalResponse (DTO)                 │
        │ Convert to HTTP response             │
        └──────────────────┬───────────────────┘
                           │
                           ↓
    ┌─────────────────────────────────────────────┐
    │ HTTP RESPONSE: 200 OK                       │
    │ {                                           │
    │   "action": "BUY",                          │
    │   "confidence": 0.75,                       │
    │   "reasoning": "Bullish trend detected",    │
    │   "technical_score": 0.78,                  │
    │   "sentiment_score": 0.70,                  │
    │   "timestamp": "2026-01-28T..."             │
    │ }                                           │
    └─────────────────────────────────────────────┘
```

---

## 3️⃣ Component Dependency Diagram

```
                    ┌─────────────────┐
                    │   tests/        │
                    │  Verify All     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ↓                    ↓                    ↓
    ┌────────┐          ┌────────┐          ┌────────┐
    │  unit/ │          │ integ/ │          │fixture │
    │ (80%)  │          │ (15%)  │          │  (5%)  │
    └────┬───┘          └───┬────┘          └────┬───┘
         │                  │                    │
         └──────────────────┼────────────────────┘
                            │
                            ↓
                      ┌─────────────┐
                      │    api/     │
                      │  Thin       │
                      │  Controllers│
                      └──────┬──────┘
                             │
         ┌───────────────────┴───────────────────┐
         │                                       │
         ↓                                       ↓
    ┌─────────────┐                    ┌─────────────────┐
    │  models/    │                    │   routes/       │
    │    DTOs     │                    │   Handlers      │
    └──────┬──────┘                    └────────┬────────┘
           │                                    │
           └────────────────┬────────────────────┘
                            │
                            ↓
                      ┌──────────────┐
                      │   domain/    │
                      │ Pure Logic   │
                      │ Framework    │
                      │ Agnostic     │
                      └──────┬───────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ↓                    ↓                    ↓
   ┌────────┐           ┌────────┐          ┌────────┐
   │entities│           │ models │          │services│
   │ Logic  │           │ Value  │          │Complex │
   │        │           │Objects │          │Logic   │
   └────┬───┘           └────┬───┘          └────┬───┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ↓
                      ┌──────────────┐
                      │  services/   │
                      │  Adapters &  │
                      │  Contracts   │
                      └──────┬───────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ↓                    ↓                    ↓
  ┌──────────┐       ┌──────────────┐      ┌──────────┐
  │abstractions      │  binance/    │      │perplexity│
  │ Interfaces│      │  Real API    │      │ Real API │
  └──────────┘       └──────────────┘      └──────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ↓
                   ┌──────────────────┐
                   │ Binance.com      │
                   │ Perplexity.ai    │
                   │ External APIs    │
                   └──────────────────┘
```

---

## 4️⃣ SOLID Principles Mapping

```
┌──────────────────────────────────────────────────────────────┐
│ S - Single Responsibility Principle                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  MarketAnalyzer    →  Only calculates indicators            │
│  SignalGenerator   →  Only generates signals                │
│  RiskManager       →  Only evaluates risk                   │
│  Portfolio         →  Only tracks positions                 │
│  Config            →  Only manages configuration            │
│  Logger            →  Only handles logging                  │
│                                                              │
│  ✅ Each class has exactly one reason to change             │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ O - Open/Closed Principle                                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Open for extension:                                         │
│  • Add RSIStrategy without modifying SignalGenerator        │
│  • Add MACDStrategy without touching existing code          │
│  • Add CoinbaseAdapter without changing business logic      │
│                                                              │
│  Closed for modification:                                    │
│  • Core domain logic remains stable                         │
│  • Existing tests still pass                                │
│  • No changes to abstractions                               │
│                                                              │
│  ✅ Extension via inheritance/composition, not modification │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ L - Liskov Substitution Principle                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  IMarketDataProvider implementations:                        │
│  • BinanceMarketData                                        │
│  • MockMarketData                                           │
│  • CoinbaseMarketData (future)                              │
│                                                              │
│  All are substitutable without breaking domain logic        │
│  ✅ Consumers don't care about implementation               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ I - Interface Segregation Principle                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Segregated interfaces:                                      │
│  • IMarketDataProvider  {get_klines(), get_current_price()} │
│  • IAIContextProvider   {get_news_sentiment(), ...}          │
│  • ITradeExecutor       {execute_trade(), get_balance()}    │
│                                                              │
│  ✅ Clients depend only on methods they use                 │
│  ✅ No fat interfaces with unused methods                   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ D - Dependency Inversion Principle                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Dependency hierarchy:                                       │
│                                                              │
│  domain/services/SignalGenerator                            │
│           ↑                                                  │
│           │ depends on                                       │
│           │                                                  │
│  services/abstractions/IMarketDataProvider                  │
│           ↑                                                  │
│           │ implemented by                                   │
│           │                                                  │
│  services/binance/BinanceMarketData                         │
│                                                              │
│  ✅ High-level modules depend on abstractions               │
│  ✅ Low-level modules depend on abstractions                │
│  ✅ Both depend on abstractions, NOT on concrete classes    │
└──────────────────────────────────────────────────────────────┘
```

---

## 5️⃣ Test Pyramid Strategy

```
                          /\
                         /  \
                        /────\         SLOW TESTS (5%)
                       /      \       - External API calls
                      /────────\     - Real database
                     /          \    - Integration fixtures
                    /────────────\
                   /              \   MEDIUM TESTS (15%)
                  /────────────────\ - Layer integration
                 /                  \- Mocked services
                /────────────────────\- API endpoints
               /                      \
              /────────────────────────\
             /                          \  FAST TESTS (80%)
            /────────────────────────────\- Pure domain logic
           /                              \- No mocks needed
          /────────────────────────────────\- <5s total
```

**Test Distribution:**

```
Unit Tests (80 tests)          → 80%
├── Market Analyzer (15)
├── Signal Generator (20)
├── Risk Manager (15)
├── Portfolio (15)
└── Exceptions (15)

Integration Tests (15 tests)    → 15%
├── Orchestrator (8)
└── API Endpoints (7)

Service Tests (5 tests)         → 5%
├── Binance Adapter (2)
└── Perplexity Adapter (3)

Total: ~100 tests
Target Coverage: >80% domain layer
```

---

## 6️⃣ Adapter Pattern for External Services

```
┌─────────────────────────────────────────────────────────────┐
│ Domain Layer (Pure Business Logic)                          │
│                                                              │
│  Domain Services expect:                                     │
│  • IMarketDataProvider interface                            │
│  • IAIContextProvider interface                             │
│  • ITradeExecutorService interface                          │
└──────────────────────┬──────────────────────────────────────┘
                       │ depends on abstractions
                       │ (Dependency Inversion)
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ↓              ↓              ↓
   ┌────────────┐ ┌────────────┐ ┌────────────┐
   │ Abstract   │ │ Abstract   │ │ Abstract   │
   │IMarketData │ │ IAIContext │ │ITradeExecut│
   │Provider    │ │ Provider   │ │orService   │
   └────┬───────┘ └────┬───────┘ └────┬───────┘
        │              │              │
        │ implemented  │ implemented  │ implemented
        │ by           │ by           │ by
        │              │              │
   ┌────▼──────┐  ┌────▼──────┐  ┌────▼──────────┐
   │ Binance   │  │ Perplexity│  │ Trade Service │
   │ Adapter   │  │ Adapter   │  │ Adapter       │
   │ (Real API)│  │(Real API) │  │ (Real/Mock)   │
   └────┬──────┘  └────┬──────┘  └────┬──────────┘
        │              │              │
        │ calls        │ calls        │ calls
        │              │              │
   ┌────▼──────┐  ┌────▼──────┐  ┌────▼──────────┐
   │ Binance   │  │ Perplexity│  │ Exchange      │
   │ API       │  │ API       │  │ API           │
   │ (Ext)     │  │ (Ext)     │  │ (Ext)         │
   └───────────┘  └───────────┘  └───────────────┘

Key Benefits:
✅ Adapters isolate external API changes
✅ Business logic doesn't know about specific APIs
✅ Easy to swap implementations (for testing or migration)
✅ Single Responsibility: Adapter handles translation
```

---

## 7️⃣ Configuration & Singleton Pattern

```
┌─────────────────────────────────────────────────────────────┐
│ Application Startup                                         │
└─────────────────────────────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────────────────────────┐
│ core/config.py (Singleton Pattern)                         │
│                                                              │
│ class Config:                                               │
│     _instance = None                                        │
│     _initialized = False                                    │
│                                                              │
│     def __new__(cls):                                       │
│         if cls._instance is None:                           │
│             cls._instance = super().__new__(cls)            │
│         return cls._instance                                │
│                                                              │
│ config = Config()  # First call: Creates instance          │
│ config = Config()  # Second call: Returns same instance    │
└─────────────────────────────────────────────────────────────┘
           │
           ↓ (single global instance)
      ┌────────┐
      │config  │
      └────────┘
       │      │      │
    ┌──▼─┐ ┌──▼─┐ ┌──▼──┐
    │ api│ │ dns│ │ srv │  All access same config
    └────┘ └────┘ └─────┘

Benefits:
✅ Single initialization
✅ No duplicate API clients
✅ Consistent configuration across app
✅ Thread-safe (Python GIL)
```

---

## Summary

These diagrams illustrate:

1. **4-Layer Architecture** - Clear separation of concerns
2. **Data Flow** - How requests traverse the system
3. **Component Dependencies** - How modules relate
4. **SOLID Principles** - Applied throughout architecture
5. **Testing Strategy** - Test pyramid approach
6. **Adapter Pattern** - External service isolation
7. **Singleton Pattern** - Configuration management
