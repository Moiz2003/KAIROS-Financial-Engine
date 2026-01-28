# KAIROS Project Structure - Complete Reference

## 📦 Scaffolded Directory Tree

```
KAIROS/
├── 📄 brain.py                          [LEGACY] Original prototype
├── 📄 main.py                           [ENTRY POINT] Start FastAPI server
│
├── 🎯 DOCUMENTATION
│   ├── ARCHITECTURE.md                  [Detailed architecture guide]
│   ├── ARCHITECTURE_SUMMARY.md          [Visual summary]
│   ├── DEVELOPMENT.md                   [Development workflow]
│   └── STRUCTURE.md                     [This file]
│
├── 🔧 CONFIGURATION
│   ├── requirements.txt                 [Python dependencies]
│   ├── .env.example                     [Environment template]
│   ├── .gitignore                       [Git ignore rules]
│   ├── pytest.ini                       [PyTest configuration]
│   └── setup.cfg                        [Project metadata]
│
├── 📁 core/                             ⭐ INFRASTRUCTURE LAYER
│   ├── __init__.py
│   ├── config.py                        → Singleton pattern: Configuration
│   ├── logging_config.py                → Singleton pattern: Logging
│   └── exceptions.py                    → Custom exception hierarchy
│
├── 📁 domain/                           ⭐ BUSINESS LOGIC LAYER (Pure)
│   ├── __init__.py
│   │
│   ├── models/                          VALUE OBJECTS (Immutable)
│   │   └── __init__.py
│   │       • AnalysisResult             (Market analysis snapshot)
│   │       • TradeSignal                (Trading recommendation)
│   │       • RiskAssessment             (Risk evaluation)
│   │       • ExecutionResult            (Trade outcome)
│   │       • TrendType enum
│   │       • TradeAction enum
│   │
│   ├── entities/                        DOMAIN ENTITIES (Business Rules)
│   │   └── __init__.py
│   │       • MarketAnalyzer             (Technical indicators)
│   │       • Portfolio                  (Position tracking)
│   │       • Principle: SRP, No I/O
│   │
│   └── services/                        DOMAIN SERVICES (Complex Logic)
│       ├── __init__.py
│       ├── orchestrator.py              (Coordinate domain operations)
│       ├── risk_manager.py              (Risk evaluation logic)
│       └── Principle: Policy Injection
│
├── 📁 services/                         ⭐ SERVICE ADAPTERS LAYER
│   ├── __init__.py
│   │
│   ├── abstractions/                    SERVICE CONTRACTS (Interfaces)
│   │   └── __init__.py
│   │       • IMarketDataProvider        (Market data abstraction)
│   │       • IAIContextProvider         (AI context abstraction)
│   │       • ITradeExecutorService      (Trade execution abstraction)
│   │       • Principle: Dependency Inversion
│   │
│   ├── binance/                         ADAPTER: Binance API
│   │   └── __init__.py
│   │       • BinanceMarketData          (Implements IMarketDataProvider)
│   │       • Adapter Pattern: API isolation
│   │
│   └── perplexity/                      ADAPTER: Perplexity AI
│       └── __init__.py
│           • PerplexityAI               (Implements IAIContextProvider)
│           • Adapter Pattern: API isolation
│
├── 📁 api/                              ⭐ PRESENTATION LAYER (HTTP)
│   ├── __init__.py                      (FastAPI app factory)
│   │
│   ├── models/                          REQUEST/RESPONSE DTOs
│   │   └── __init__.py
│   │       • AnalysisRequest            (Pydantic)
│   │       • SignalRequest              (Pydantic)
│   │       • ExecuteTradeRequest        (Pydantic)
│   │       • AnalysisResponse           (Pydantic)
│   │       • SignalResponse             (Pydantic)
│   │       • RiskAssessmentResponse     (Pydantic)
│   │       • ExecutionResponse          (Pydantic)
│   │       • ErrorResponse              (Pydantic)
│   │
│   └── routes/                          ROUTE HANDLERS (Controllers)
│       └── __init__.py
│           • GET  /api/health           (Health check)
│           • POST /api/analysis         (Market analysis)
│           • POST /api/signals          (Trading signals)
│           • POST /api/execute          (Execute trade)
│           • Principle: Thin controllers
│
└── 📁 tests/                            ⭐ TESTING LAYER
    ├── __init__.py
    │
    ├── unit/                            UNIT TESTS (80% - Fast)
    │   ├── __init__.py
    │   ├── test_market_analyzer.py
    │   │   • test_calculate_rsi_basic
    │   │   • test_calculate_rsi_overbought
    │   │   • test_calculate_ema_basic
    │   │   • test_determine_trend_bullish
    │   │   • (No external dependencies)
    │   │
    │   ├── test_signal_generator.py
    │   │   • test_generate_bullish_buy_signal
    │   │   • test_generate_bearish_sell_signal
    │   │   • test_sentiment_score_calculation
    │   │   • (Fast, pure logic tests)
    │   │
    │   └── Principle: 100% domain logic coverage
    │
    ├── integration/                     INTEGRATION TESTS (15% - Medium)
    │   ├── __init__.py
    │   ├── test_orchestrator.py
    │   │   • Test layers working together
    │   │   • Mock external services
    │   │
    │   └── test_api_endpoints.py
    │       • Test HTTP endpoints
    │       • TestClient from FastAPI
    │
    └── fixtures/                        SHARED TEST DATA (5%)
        └── __init__.py
            • SAMPLE_PRICES
            • SAMPLE_ANALYSIS
            • SAMPLE_BUY_SIGNAL
            • SAMPLE_SELL_SIGNAL
```

---

## 🎯 Quick Reference: File Purposes

### Infrastructure Layer (`core/`)

| File                | Purpose                             | Pattern             |
| ------------------- | ----------------------------------- | ------------------- |
| `config.py`         | Load/validate environment variables | Singleton           |
| `logging_config.py` | Centralized logging setup           | Singleton           |
| `exceptions.py`     | Custom domain exceptions            | Exception Hierarchy |

### Business Logic Layer (`domain/`)

| File                       | Purpose                    | Pattern           |
| -------------------------- | -------------------------- | ----------------- |
| `models/__init__.py`       | Immutable value objects    | Value Object      |
| `entities/__init__.py`     | Domain business entities   | Pure Domain Logic |
| `services/orchestrator.py` | Coordinate domain services | Domain Service    |
| `services/risk_manager.py` | Risk evaluation rules      | Domain Service    |

### Service Adapter Layer (`services/`)

| File                       | Purpose                   | Pattern       |
| -------------------------- | ------------------------- | ------------- |
| `abstractions/__init__.py` | Service contracts         | Interface/ABC |
| `binance/__init__.py`      | Binance API integration   | Adapter       |
| `perplexity/__init__.py`   | Perplexity AI integration | Adapter       |

### Presentation Layer (`api/`)

| File                 | Purpose                 | Pattern      |
| -------------------- | ----------------------- | ------------ |
| `__init__.py`        | FastAPI app factory     | Factory      |
| `models/__init__.py` | Request/response models | DTO/Pydantic |
| `routes/__init__.py` | HTTP route handlers     | Controller   |

### Testing Layer (`tests/`)

| File           | Purpose                 | Strategy             |
| -------------- | ----------------------- | -------------------- |
| `unit/`        | Fast pure logic tests   | No mocks needed      |
| `integration/` | Layer integration tests | With mocked services |
| `fixtures/`    | Shared test data        | Factory/Fixtures     |

---

## 📊 Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│ api/                (HTTP Layer)                             │
│ • routes → handles requests                                  │
│ • models → DTOs                                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ↓ imports
┌─────────────────────────────────────────────────────────────┐
│ domain/                (Pure Business Logic)                 │
│ • entities → MarketAnalyzer, Portfolio                       │
│ • services → SignalGenerator, RiskManager                    │
│ • models → AnalysisResult, TradeSignal, etc.                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ↓ depends on abstractions
┌─────────────────────────────────────────────────────────────┐
│ services/              (Adapter Layer)                       │
│ • abstractions → IMarketDataProvider, IAIContextProvider     │
│ • binance → BinanceMarketData adapter                        │
│ • perplexity → PerplexityAI adapter                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ↓ imports
┌─────────────────────────────────────────────────────────────┐
│ core/              (Infrastructure)                          │
│ • config → Configuration (Singleton)                         │
│ • logging_config → Logging (Singleton)                       │
│ • exceptions → Exception hierarchy                           │
└─────────────────────────────────────────────────────────────┘
                  │
                  ↓ imports
        Python Standard Library
        External APIs (Binance, Perplexity)
```

---

## 🚀 Getting Started

### 1. Setup Environment

```bash
cd /Users/apple/Developer/KAIROS
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure API Keys

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Run Tests

```bash
# Unit tests (fast)
pytest tests/unit -v --tb=short

# With coverage
pytest tests/unit --cov=domain --cov-report=html

# Integration tests
pytest tests/integration -v
```

### 4. Run API Server

```bash
python main.py
# Server runs on http://localhost:8000
```

### 5. Test API

```bash
# Health check
curl http://localhost:8000/api/health

# Market analysis
curl -X POST http://localhost:8000/api/analysis \
  -H "Content-Type: application/json" \
  -d '{"symbol": "BTCUSDT", "interval": "4h", "limit": 100}'
```

---

## 🧪 Testing Strategy

```
Total Tests: ~100 tests
├── Unit Tests (80 tests)
│   ├── MarketAnalyzer (15 tests)
│   ├── Portfolio (10 tests)
│   ├── SignalGenerator (20 tests)
│   ├── RiskManager (15 tests)
│   └── Exceptions (10 tests)
│
├── Integration Tests (15 tests)
│   ├── Orchestrator (8 tests)
│   └── API Endpoints (7 tests)
│
└── Service Tests (5 tests)
    ├── BinanceMarketData (2 tests)
    └── PerplexityAI (3 tests)

Total Coverage Goal: >80% for domain layer
```

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Current)

- ✅ Layered architecture scaffolding
- ✅ Core infrastructure (config, logging, exceptions)
- ✅ Domain entities and services
- ✅ Service abstractions
- ✅ API routes skeleton
- ✅ Unit test framework

### Phase 2: Integration (Next)

- [ ] Implement orchestrator
- [ ] Integrate Binance adapter
- [ ] Integrate Perplexity adapter
- [ ] Complete API routes
- [ ] Integration tests
- [ ] Error handling

### Phase 3: Features (Future)

- [ ] User authentication (JWT)
- [ ] Database persistence
- [ ] Trade history
- [ ] Portfolio management API
- [ ] WebSocket real-time updates
- [ ] Backtesting engine

### Phase 4: Production

- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Monitoring (Prometheus/Grafana)
- [ ] API documentation (Swagger)
- [ ] Deployment (AWS/GCP/Azure)

---

## 🎓 Design Principles Applied

### SOLID Principles

- **S**RP: Each class has one reason to change
- **O**CP: Open for extension, closed for modification
- **L**SP: Substitutable implementations
- **I**SP: Segregated interfaces
- **D**IP: Depend on abstractions, not implementations

### Architectural Principles

- **High Cohesion**: Related functionality grouped together
- **Low Coupling**: Layers communicate through abstractions
- **Separation of Concerns**: Clear responsibility boundaries
- **Dependency Inversion**: Inject dependencies through constructors
- **DRY**: Don't Repeat Yourself

### Design Patterns

- **Singleton**: Configuration and logging
- **Adapter**: External service integration
- **Dependency Injection**: Loose coupling
- **Value Object**: Immutable domain models
- **Repository**: Data persistence abstraction
- **Factory**: App creation and initialization

---

## 📚 Key Metrics

| Metric                | Target                             | Purpose                          |
| --------------------- | ---------------------------------- | -------------------------------- |
| Domain Layer Coverage | >80%                               | Ensure core logic is tested      |
| Unit Test Speed       | <5s                                | Fast feedback during development |
| Coupling              | Low                                | Easy to swap implementations     |
| Cohesion              | High                               | Clear responsibilities           |
| Test Ratio            | 80/15/5 (unit/integration/service) | Balanced test pyramid            |

---

## 🔗 Cross-References

- **ARCHITECTURE.md**: Detailed architecture and rationale
- **ARCHITECTURE_SUMMARY.md**: Visual summary with diagrams
- **DEVELOPMENT.md**: Development workflow and guidelines
- **SOLID Principles**: [Martin (2008)](https://en.wikipedia.org/wiki/SOLID)
- **Layered Architecture**: [Microsoft Docs](https://docs.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures)

---

## ✅ Ready for Development!

The KAIROS project is now properly scaffolded with:

- ✅ Clear separation of concerns
- ✅ SOLID principles applied
- ✅ Testable architecture
- ✅ Production-ready structure
- ✅ Comprehensive documentation

**Next Step**: Implement the orchestrator to tie everything together!
