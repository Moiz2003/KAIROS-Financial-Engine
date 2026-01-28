# KAIROS Architecture Summary

## Complete Directory Tree & Component Design

---

## 📁 Final Project Structure

```
/Users/apple/Developer/KAIROS/
│
├── 🔧 INFRASTRUCTURE & CONFIG (core/)
│   ├── __init__.py
│   ├── config.py                    # Singleton: Environment configuration
│   ├── logging_config.py            # Singleton: Centralized logging
│   └── exceptions.py                # Custom domain exceptions
│
├── 💼 BUSINESS LOGIC (domain/)
│   ├── __init__.py
│   │
│   ├── models/                      # VALUE OBJECTS (Immutable)
│   │   └── __init__.py
│   │       ├── AnalysisResult       # Market snapshot
│   │       ├── TradeSignal          # Trading recommendation
│   │       ├── RiskAssessment       # Risk evaluation
│   │       └── ExecutionResult      # Trade outcome
│   │
│   ├── entities/                    # DOMAIN ENTITIES (Business Logic)
│   │   └── __init__.py
│   │       ├── MarketAnalyzer       # Pure technical analysis
│   │       └── Portfolio            # Position tracking
│   │
│   └── services/                    # DOMAIN SERVICES (Complex Logic)
│       └── __init__.py
│           ├── SignalGenerator      # Generate trading signals
│           ├── RiskManager          # Evaluate risk
│           └── TradeExecutor        # Validate trades
│
├── 🔌 SERVICE ADAPTERS (services/)
│   ├── __init__.py
│   │
│   ├── abstractions/                # INTERFACE CONTRACTS
│   │   └── __init__.py
│   │       ├── IMarketDataProvider  # Market data contract
│   │       ├── IAIContextProvider   # AI context contract
│   │       └── ITradeExecutorService# Trade execution contract
│   │
│   ├── binance/                     # ADAPTER: Binance API
│   │   └── __init__.py
│   │       └── BinanceMarketData    # Implements IMarketDataProvider
│   │
│   └── perplexity/                  # ADAPTER: Perplexity AI
│       └── __init__.py
│           └── PerplexityAI         # Implements IAIContextProvider
│
├── 🌐 API LAYER (api/)
│   ├── __init__.py                  # FastAPI app factory
│   │
│   ├── models/                      # DTO REQUEST/RESPONSE
│   │   └── __init__.py
│   │       ├── AnalysisRequest      # Request DTO
│   │       ├── AnalysisResponse     # Response DTO
│   │       └── ... (other DTOs)
│   │
│   └── routes/                      # ROUTE HANDLERS
│       └── __init__.py
│           ├── GET  /api/health     # Health check
│           ├── POST /api/analysis   # Market analysis
│           ├── POST /api/signals    # Trading signals
│           └── POST /api/execute    # Execute trade
│
├── 🧪 TESTS (tests/)
│   ├── __init__.py
│   │
│   ├── unit/                        # PURE LOGIC TESTS (~80%)
│   │   ├── __init__.py              # Test fixtures
│   │   ├── test_market_analyzer.py
│   │   └── test_signal_generator.py
│   │
│   ├── integration/                 # LAYER INTEGRATION (~15%)
│   │   ├── __init__.py
│   │   ├── test_orchestrator.py
│   │   └── test_api_endpoints.py
│   │
│   └── fixtures/                    # SHARED TEST DATA
│       └── __init__.py              # Sample data, factories
│
├── 📋 CONFIG FILES
│   ├── requirements.txt             # Python dependencies
│   ├── .env.example                 # Environment template
│   ├── .gitignore                   # Git ignore rules
│   ├── pytest.ini                   # PyTest configuration
│   └── setup.cfg                    # Project configuration
│
├── 📚 DOCUMENTATION
│   ├── ARCHITECTURE.md              # (THIS FILE - Full Architecture)
│   └── DEVELOPMENT.md               # Development guide
│
├── 🚀 ENTRY POINTS
│   ├── main.py                      # Run FastAPI server
│   └── brain.py                     # Legacy prototype (reference)
│
└── 📖 ADDITIONAL DOCS
    └── (Add API documentation, design diagrams, etc.)
```

---

## 🏗️ Layered Architecture Pattern

```
┌─────────────────────────────────────────────────────────┐
│ PRESENTATION (API Layer)                                │
│ ├─ FastAPI Routes/Controllers                           │
│ ├─ Request/Response DTOs                                │
│ └─ HTTP Contract Validation (Pydantic)                  │
│                                                          │
│ Dependencies: Domain Services, Domain Models             │
└─────────────────────────────────────────────────────────┘
                        ↓ (Depends On)
┌─────────────────────────────────────────────────────────┐
│ BUSINESS LOGIC (Domain Layer)                           │
│ ├─ Entities (MarketAnalyzer, Portfolio)                 │
│ ├─ Services (SignalGenerator, RiskManager)              │
│ ├─ Models (AnalysisResult, TradeSignal)                 │
│ └─ No external dependencies (Pure logic)                │
│                                                          │
│ Dependencies: None (Framework-agnostic)                 │
└─────────────────────────────────────────────────────────┘
                        ↓ (Depends On)
┌─────────────────────────────────────────────────────────┐
│ SERVICE ADAPTERS (Services Layer)                       │
│ ├─ Abstractions (IMarketDataProvider, IAIContextProvider)│
│ ├─ Binance Adapter (market data)                        │
│ ├─ Perplexity Adapter (AI context)                      │
│ └─ Repository Pattern (data persistence)                │
│                                                          │
│ Dependencies: External APIs (Binance, Perplexity)       │
└─────────────────────────────────────────────────────────┘
                        ↓ (Depends On)
┌─────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE (Core Layer)                             │
│ ├─ Configuration Management (Singleton)                 │
│ ├─ Logging Setup (Singleton)                            │
│ ├─ Exception Hierarchy                                  │
│ └─ Dependency Injection Container                       │
│                                                          │
│ Dependencies: Python Standard Library                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Entities & Responsibilities

### 1. **MarketAnalyzer** 📊

```python
class MarketAnalyzer:
    # Pure technical analysis (no I/O)
    - calculate_rsi(prices, period) -> float
    - calculate_ema(prices, period) -> float
    - determine_trend(price, ema) -> str
```

- **Responsibility**: Compute technical indicators
- **Dependencies**: None
- **Testing**: Pure unit tests, no mocks needed
- **Principle**: Single Responsibility (SRP)

### 2. **SignalGenerator** 🎚️

```python
class SignalGenerator:
    # Generate trading signals from analysis
    - generate_signal(analysis, sentiment) -> TradeSignal
    - _calculate_technical_score(analysis) -> float
    - _calculate_sentiment_score(sentiment) -> float
```

- **Responsibility**: Convert analysis into actionable signals
- **Dependencies**: None (injected dependencies optional)
- **Testing**: Mock-friendly, test signal logic
- **Principle**: Single Responsibility (SRP)

### 3. **RiskManager** ⚠️

```python
class RiskManager:
    # Evaluate trade risk before execution
    - assess(signal, account_balance) -> RiskAssessment
    - _calculate_max_position_size(...) -> float
    - _calculate_risk_score(...) -> float
```

- **Responsibility**: Validate trade safety
- **Dependencies**: Risk policy (injected)
- **Testing**: Parametrized tests for edge cases
- **Principle**: Policy Injection (Dependency Injection)

### 4. **Portfolio** 💰

```python
class Portfolio:
    # Track positions and account state
    - add_position(symbol, quantity, price)
    - close_position(symbol, exit_price) -> pnl
    - get_total_value(prices) -> float
    - calculate_drawdown() -> float
```

- **Responsibility**: Position tracking
- **Dependencies**: None
- **Testing**: Value object pattern
- **Principle**: Value Object Pattern

### 5. **TradeExecutor** ✅

```python
class TradeExecutor:
    # Validate and prepare trades
    - validate_execution(assessment, quantity) -> bool
    - create_execution_result(...) -> ExecutionResult
```

- **Responsibility**: Trade validation
- **Dependencies**: ITradeExecutorService (abstract)
- **Testing**: Validation logic easily testable
- **Principle**: Dependency Inversion (DIP)

---

## 🔐 Service Abstractions (Interfaces)

### **IMarketDataProvider** (Market Data Contract)

```python
@abstractmethod
def get_klines(symbol, interval, limit) -> List[List]: ...
def get_current_price(symbol) -> float: ...
```

**Implementations**:

- `BinanceMarketData` (Live Binance API)
- `MockMarketData` (For testing)
- `CoinbaseMarketData` (Future alternative)

### **IAIContextProvider** (AI Context Contract)

```python
@abstractmethod
def get_news_sentiment(topic, context) -> str: ...
def get_reasoning(symbol, context) -> str: ...
```

**Implementations**:

- `PerplexityAI` (Live Perplexity API)
- `MockAI` (For testing)
- `OpenAIProvider` (Future alternative)

### **ITradeExecutorService** (Trade Execution Contract)

```python
@abstractmethod
def execute_trade(symbol, action, quantity, price) -> ExecutionResult: ...
def get_account_balance() -> Dict[str, float]: ...
```

**Implementations**:

- `BinanceExecutor` (Live trading)
- `MockExecutor` (Simulation)
- `PaperTrading` (Paper trading)

---

## 🧪 Testing Strategy

### Test Pyramid 📈

```
        /\
       /  \  SLOW (5%)
      /────\ Integration + E2E
     /      \
    /────────\
   /          \  MEDIUM (15%)
  /────────────\ Integration tests
 /              \
/────────────────\
                    FAST (80%)
                 Unit tests (Domain)
```

### Unit Tests (Domain Layer)

```python
# 80% of tests - FAST
pytest tests/unit -v --tb=short

# Test pure logic with NO external dependencies
def test_market_analyzer_rsi():
    analyzer = MarketAnalyzer()  # No mocks needed
    rsi = analyzer.calculate_rsi(prices, period=14)
    assert 0 <= rsi <= 100
```

### Integration Tests (Layer Combinations)

```python
# 15% of tests - MEDIUM SPEED
pytest tests/integration -v

# Test layers working together with mocked services
def test_signal_generation_pipeline():
    analyzer = MarketAnalyzer()
    generator = SignalGenerator(analyzer)

    analysis = AnalysisResult(...)
    signal = generator.generate_signal(analysis)

    assert signal.action in [BUY, SELL, HOLD]
```

### Service Tests (External Dependencies)

```python
# 5% of tests - SLOW (mark with @pytest.mark.slow)
pytest tests/integration/test_external_services.py -v

# Mock external services
def test_with_mocked_binance():
    mock_binance = Mock(spec=IMarketDataProvider)
    service = Orchestrator(market_data=mock_binance)
```

---

## 🎓 SOLID Principles Application

| Principle | Implementation                              | Example                                                          |
| --------- | ------------------------------------------- | ---------------------------------------------------------------- |
| **SRP**   | One reason to change per class              | `MarketAnalyzer` only calculates indicators                      |
| **OCP**   | Open for extension, closed for modification | Add new `MLStrategy` without modifying base                      |
| **LSP**   | Substitutable implementations               | `BinanceMarketData` ↔ `MockMarketData`                           |
| **ISP**   | Segregated interfaces                       | `IMarketDataProvider` separate from `IAIContextProvider`         |
| **DIP**   | Depend on abstractions                      | Domain depends on `IMarketDataProvider`, not `BinanceMarketData` |

---

## 📐 Design Patterns Used

| Pattern                  | Location                            | Purpose                                    |
| ------------------------ | ----------------------------------- | ------------------------------------------ |
| **Singleton**            | `Config`, `LoggingConfig`           | Single instance across app                 |
| **Adapter**              | `BinanceMarketData`, `PerplexityAI` | Adapt external APIs to internal interfaces |
| **Dependency Injection** | All layer interactions              | Loose coupling, testability                |
| **Value Object**         | `AnalysisResult`, `TradeSignal`     | Immutable, comparable domain concepts      |
| **Factory**              | `api/main.py`                       | Create configured FastAPI app              |
| **Strategy**             | `SignalGenerator` strategies        | Different signal algorithms (future)       |
| **Repository**           | `services/` layer                   | Data persistence abstraction               |

---

## 🔄 Data Flow Example: Market Analysis → Trade Signal

```
HTTP Request
    ↓
┌─────────────────────────────────────────┐
│ api/routes/analysis.py                  │
│ POST /api/signals {symbol: "BTCUSDT"}   │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ domain/services/orchestrator.py         │
│ orchestrate_signal_generation()         │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ services/abstractions/                  │
│ market_data_provider.get_klines()       │ ──→ [Abstraction]
│ ai_provider.get_news_sentiment()        │ ──→ [Abstraction]
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ services/binance/BinanceMarketData      │
│ services/perplexity/PerplexityAI        │
│ (Actual API calls)                      │ ──→ External APIs
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ domain/entities/MarketAnalyzer          │
│ calculate_rsi()                         │
│ calculate_ema()                         │
│ determine_trend()                       │
│ → AnalysisResult                        │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ domain/services/SignalGenerator         │
│ generate_signal(analysis, sentiment)    │
│ → TradeSignal                           │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ domain/services/RiskManager             │
│ assess(signal, account_balance)         │
│ → RiskAssessment                        │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ api/models/SignalResponse               │
│ Convert to HTTP response                │
└─────────────────────────────────────────┘
    ↓
HTTP Response: 200 OK {signal, confidence, ...}
```

---

## 🚀 Quick Commands

```bash
# Setup
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run tests
pytest tests/unit -v --cov=domain
pytest tests/integration -v

# Check code quality
black domain/ services/ api/
flake8 domain/ services/ api/
mypy domain/ services/ api/

# Run API server
python main.py

# Test API
curl http://localhost:8000/api/health
curl -X POST http://localhost:8000/api/analysis \
  -H "Content-Type: application/json" \
  -d '{"symbol": "BTCUSDT"}'
```

---

## ✅ Architecture Checklist

- ✅ **Layered Architecture** (Presentation → Business → Services → Infrastructure)
- ✅ **High Cohesion** (Each class has single responsibility)
- ✅ **Low Coupling** (Layers communicate through abstractions)
- ✅ **SOLID Principles** (All five principles applied)
- ✅ **Testable Design** (Unit tests require no mocks for domain layer)
- ✅ **Dependency Injection** (All dependencies explicitly injected)
- ✅ **Value Objects** (Immutable, comparable data models)
- ✅ **Adapter Pattern** (External service integration)
- ✅ **Singleton Pattern** (Configuration and logging)
- ✅ **Component-Based** (Replaceable layers)

---

## 📖 Next Steps

1. **Implement** orchestrator that coordinates all services
2. **Integrate** with Binance API (after testing with mocks)
3. **Implement** database persistence (SQLAlchemy)
4. **Add** authentication (JWT)
5. **Deploy** to production (Docker, Kubernetes)
6. **Monitor** with Prometheus/Grafana

---

## 📚 References

- **Pressman & Sommerville**: Software Engineering fundamentals
- **SOLID Principles**: Martin (2008)
- **Layered Architecture**: Microsoft, Sam Newman
- **Domain-Driven Design**: Eric Evans
- **Testing Pyramid**: Mike Cohn
