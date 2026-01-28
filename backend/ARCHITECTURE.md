# KAIROS Architecture Document

## Human-in-the-Loop Financial Decision Engine

---

## Executive Summary

KAIROS is architected using a **Layered Architecture Pattern** (also called N-Tier Architecture) with explicit separation of concerns. This ensures testability, maintainability, scalability, and adherence to SOLID principles as defined by the CS3009 syllabus.

---

## TASK 1: LAYERED ARCHITECTURE JUSTIFICATION

### Architectural Style: Layered (Presentation → Business Logic → Data Access)

```
┌────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER (api/)                              │
│ FastAPI Route Handlers, Request/Response Models        │
├────────────────────────────────────────────────────────┤
│ BUSINESS LOGIC LAYER (domain/)                         │
│ Core Entities, Domain Services, Use Cases              │
├────────────────────────────────────────────────────────┤
│ SERVICE ABSTRACTION LAYER (services/)                  │
│ External Adapters (Binance, Perplexity), Repositories │
├────────────────────────────────────────────────────────┤
│ INFRASTRUCTURE LAYER (core/)                           │
│ Configuration, Logging, Dependency Injection           │
└────────────────────────────────────────────────────────┘
```

### Why Layered Architecture Fits CS3009's Component-Based Design Goal

1. **High Cohesion**
   - Each layer has a single, well-defined responsibility
   - Domain logic isolated from API concerns (SRP - Single Responsibility Principle)
   - Configuration centralized in `core/`

2. **Low Coupling**
   - Layers communicate through well-defined interfaces (abstract base classes)
   - Dependency Inversion Principle: Depend on abstractions, not concrete implementations
   - Services layer acts as boundary adapter (Adapter Pattern)
   - Domain logic is **framework-agnostic**

3. **Component-Based Design**
   - Each layer is a replaceable "component"
   - Services can be swapped (e.g., Binance → Coinbase via adapter)
   - API framework can change without affecting domain logic
   - Testable in isolation (unit tests don't require FastAPI server)

4. **SOLID Principles Enforcement**
   - **S**RP: Each class has one reason to change
   - **O**CP: Open for extension (new signals, new risk managers), closed for modification
   - **L**SP: Interfaces ensure behavioral contract
   - **I**SP: Small, focused interfaces (not bloated services)
   - **D**IP: Inject dependencies through constructors

---

## TASK 2: DOMAIN ANALYSIS - MVP ENTITIES

### Core Business Entities (Domain Models)

#### 1. **MarketAnalyzer**

- **Responsibility**: Compute technical indicators and market state
- **Inputs**: OHLCV candlestick data, symbol configuration
- **Outputs**: AnalysisResult (price, RSI, EMA, trend)
- **Methods**:
  - `analyze(symbol: str, lookback: int) -> AnalysisResult`
  - `calculate_rsi(prices: List[float]) -> float`
  - `calculate_ema(prices: List[float], period: int) -> float`
- **Dependencies**: None (domain-pure, no external calls)
- **Testing**: Pure unit tests, no mocks needed

#### 2. **SignalGenerator**

- **Responsibility**: Generate trading signals from market analysis
- **Inputs**: AnalysisResult from MarketAnalyzer, live news context
- **Outputs**: TradeSignal (action: BUY/SELL/HOLD, confidence: 0-1, reasoning)
- **Methods**:
  - `generate_signal(analysis: AnalysisResult, news_context: str) -> TradeSignal`
  - `_evaluate_technical_score(analysis: AnalysisResult) -> float`
  - `_evaluate_news_sentiment(context: str) -> float`
- **Dependencies**: MarketAnalyzer (injected)
- **Testing**: Mock MarketAnalyzer, test signal logic

#### 3. **RiskManager**

- **Responsibility**: Validate trade safety before execution
- **Inputs**: TradeSignal, current portfolio state, risk policy
- **Outputs**: RiskAssessment (approved: bool, max_position_size, warnings)
- **Methods**:
  - `assess(signal: TradeSignal, portfolio: Portfolio) -> RiskAssessment`
  - `calculate_max_position_size(account_balance: float, signal_confidence: float) -> float`
  - `check_drawdown_limit(portfolio: Portfolio) -> bool`
- **Dependencies**: Injected risk policy configuration
- **Testing**: Parametrized unit tests for edge cases

#### 4. **TradeExecutor**

- **Responsibility**: Execute approved trades (delegated to service layer)
- **Inputs**: RiskAssessment, execution strategy
- **Outputs**: ExecutionResult (success: bool, order_id, fill_price)
- **Methods**:
  - `execute(assessment: RiskAssessment, executor_service: ITradeExecutorService) -> ExecutionResult`
  - `validate_execution_parameters(assessment: RiskAssessment) -> bool`
- **Dependencies**: ITradeExecutorService (abstraction, implemented by external service)
- **Testing**: Mock executor service, test validation logic

#### 5. **Portfolio**

- **Responsibility**: Track current positions and account state
- **Inputs**: Positions, cash balance, historical trades
- **Outputs**: Portfolio state (value, drawdown %, risk metrics)
- **Methods**:
  - `add_position(symbol: str, quantity: float, entry_price: float)`
  - `close_position(symbol: str)`
  - `calculate_total_value(current_prices: Dict[str, float]) -> float`
  - `calculate_drawdown() -> float`
- **Dependencies**: None (domain entity)
- **Testing**: Value object pattern, immutable state tests

---

### Data Models (Value Objects)

```python
class AnalysisResult:
    symbol: str
    price: float
    rsi: float
    ema_200: float
    trend: str  # "BULLISH" | "BEARISH"

class TradeSignal:
    action: str  # "BUY" | "SELL" | "HOLD"
    confidence: float  # 0.0 to 1.0
    reasoning: str

class RiskAssessment:
    approved: bool
    max_position_size: float
    warnings: List[str]

class ExecutionResult:
    success: bool
    order_id: str
    fill_price: float
    timestamp: datetime
```

---

## TASK 3: PROJECT SCAFFOLDING STRUCTURE

### Directory Tree

```
/Users/apple/Developer/KAIROS/
│
├── core/
│   ├── __init__.py
│   ├── config.py                    # Environment config (Singleton)
│   ├── logging_config.py            # Logging setup (Singleton)
│   └── exceptions.py                # Custom domain exceptions
│
├── domain/
│   ├── __init__.py
│   ├── entities/
│   │   ├── __init__.py
│   │   ├── market_analyzer.py       # MarketAnalyzer class
│   │   ├── signal_generator.py      # SignalGenerator class
│   │   ├── risk_manager.py          # RiskManager class
│   │   ├── trade_executor.py        # TradeExecutor class
│   │   └── portfolio.py             # Portfolio entity
│   ├── models/
│   │   ├── __init__.py
│   │   ├── analysis_result.py       # AnalysisResult value object
│   │   ├── trade_signal.py          # TradeSignal value object
│   │   ├── risk_assessment.py       # RiskAssessment value object
│   │   └── execution_result.py      # ExecutionResult value object
│   └── services/
│       ├── __init__.py
│       ├── orchestrator.py          # Domain orchestration (use case coordinator)
│
├── services/
│   ├── __init__.py
│   ├── abstractions/
│   │   ├── __init__.py
│   │   ├── market_data_provider.py  # IMarketDataProvider (ABC)
│   │   ├── ai_context_provider.py   # IAIContextProvider (ABC)
│   │   └── trade_executor_service.py# ITradeExecutorService (ABC)
│   ├── binance/
│   │   ├── __init__.py
│   │   └── binance_market_data.py   # Binance adapter (implements IMarketDataProvider)
│   └── perplexity/
│       ├── __init__.py
│       └── perplexity_ai.py         # Perplexity adapter (implements IAIContextProvider)
│
├── api/
│   ├── __init__.py
│   ├── main.py                      # FastAPI app initialization
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── analysis.py              # GET /api/analysis/{symbol}
│   │   ├── signals.py               # GET /api/signals/{symbol}
│   │   └── execute.py               # POST /api/execute
│   └── models/
│       ├── __init__.py
│       ├── request_models.py        # Pydantic request DTOs
│       └── response_models.py       # Pydantic response DTOs
│
├── tests/
│   ├── __init__.py
│   ├── unit/
│   │   ├── __init__.py
│   │   ├── test_market_analyzer.py
│   │   ├── test_signal_generator.py
│   │   ├── test_risk_manager.py
│   │   └── test_portfolio.py
│   ├── integration/
│   │   ├── __init__.py
│   │   ├── test_orchestrator.py
│   │   └── test_api_endpoints.py
│   └── fixtures/
│       ├── __init__.py
│       └── sample_data.py
│
├── brain.py                         # Legacy prototype (for reference)
├── main.py                          # Application entry point
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment variables template
├── .gitignore                       # Git ignore rules
└── ARCHITECTURE.md                  # This file
```

---

## How This Structure Supports Unit Testing

### 1. **Domain Layer Testability** ✅

- **No external dependencies**: `MarketAnalyzer`, `RiskManager`, `Portfolio` are pure domain classes
- **No database access**: No ORM, no I/O
- **Fast tests**: Unit tests run in milliseconds
- **100% mockable**: Inject dependencies through constructors

```python
# Example: Test MarketAnalyzer (pure logic, no mocks needed)
def test_market_analyzer_bullish_detection():
    analyzer = MarketAnalyzer()
    prices = [100, 101, 102, 103, 104, 105]
    ema = analyzer.calculate_ema(prices, period=5)
    assert ema > 100  # Current price above EMA = bullish
```

### 2. **Service Abstraction Layer Testability** ✅

- **Adapter Pattern isolates external dependencies**
- Mock `IMarketDataProvider` and `IAIContextProvider`
- Test business logic without calling Binance API or Perplexity

```python
# Example: Test SignalGenerator with mocked data provider
def test_signal_generator_with_mock_market_data():
    mock_analyzer = Mock(spec=MarketAnalyzer)
    mock_analyzer.analyze.return_value = AnalysisResult(...)

    generator = SignalGenerator(mock_analyzer)
    signal = generator.generate_signal(analysis, "positive news")

    assert signal.action == "BUY"
    assert signal.confidence > 0.7
```

### 3. **API Layer Testability** ✅

- **Dependency Injection**: Route handlers receive domain orchestrator
- **FastAPI TestClient**: Test HTTP endpoints without running server
- **Request/Response DTOs**: Validate input/output contracts

```python
# Example: Test API endpoint
def test_analysis_endpoint(test_client, mock_orchestrator):
    response = test_client.get("/api/analysis/BTCUSDT")
    assert response.status_code == 200
    assert response.json()["trend"] in ["BULLISH", "BEARISH"]
```

### 4. **Dependency Injection** ✅

All external dependencies injected through constructors:

```python
# Clean dependency injection pattern
class SignalGenerator:
    def __init__(self, market_analyzer: MarketAnalyzer,
                 ai_provider: IAIContextProvider):
        self.market_analyzer = market_analyzer
        self.ai_provider = ai_provider

# Easy to test with mocks
mock_ai = Mock(spec=IAIContextProvider)
generator = SignalGenerator(analyzer, mock_ai)
```

### 5. **Test Organization** ✅

- `tests/unit/`: Fast tests for pure domain logic (should be 80%+ of tests)
- `tests/integration/`: Slower tests combining layers (10-15% of tests)
- `tests/fixtures/`: Reusable test data and mocks (20% of tests)

### 6. **Configuration Isolation** ✅

- `core/config.py` loads environment from `.env`
- Tests can override config without touching production
- Singleton pattern ensures single initialization

---

## Design Principles Applied

| Principle         | Implementation                                                |
| ----------------- | ------------------------------------------------------------- |
| **SRP**           | Each class has one reason to change                           |
| **OCP**           | Add new signals/risk managers without modifying existing code |
| **LSP**           | Adapters properly implement their interfaces                  |
| **ISP**           | Small, focused service interfaces                             |
| **DIP**           | Inject abstractions, not concrete implementations             |
| **High Cohesion** | Related functionality grouped in layers                       |
| **Low Coupling**  | Layer communication through interfaces                        |

---

## MVP Deliverables (Phase 1)

1. ✅ Domain entities implemented
2. ✅ Service abstractions (Binance, Perplexity adapters)
3. ✅ API routes (FastAPI)
4. ✅ Orchestrator use-case handler
5. ✅ Unit tests (>80% coverage for domain layer)
6. ✅ Integration tests (orchestrator → API)

---

## Future Extensions (Phase 2+)

- **Event-Driven Architecture**: Add Kafka/RabbitMQ for real-time signals
- **Repository Pattern**: Persist trading history to database
- **State Machine Pattern**: Formalize trade lifecycle
- **Strategy Pattern**: Support multiple risk policies
- **Observer Pattern**: Notify stakeholders of trades
