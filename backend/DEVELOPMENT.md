# KAIROS Project Setup & Development Guide

## Quick Start

### 1. Clone and Setup

```bash
cd /Users/apple/Developer/KAIROS
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Run Tests

```bash
pytest tests/unit -v --cov=domain
```

### 4. Run API Server

```bash
python main.py
```

### 5. Test API

```bash
curl http://localhost:8000/api/health
```

---

## Project Structure Reference

### `core/`

**Singleton Infrastructure**

- `config.py`: Configuration management (Singleton)
- `logging_config.py`: Centralized logging (Singleton)
- `exceptions.py`: Custom domain exceptions

**Why Singleton?**

- Configuration should exist once across entire app
- Logging infrastructure should be initialized once
- Prevents duplicate API client connections

### `domain/`

**Pure Business Logic (Framework-Agnostic)**

- `models/`: Value objects (immutable, comparable)
  - `AnalysisResult`: Market analysis snapshot
  - `TradeSignal`: Trading recommendation
  - `RiskAssessment`: Risk evaluation
  - `ExecutionResult`: Trade outcome record
- `entities/`: Domain entities (core business objects)
  - `MarketAnalyzer`: Technical indicators
  - `Portfolio`: Position tracking
- `services/`: Domain services (complex business logic)
  - `SignalGenerator`: Signal generation rules
  - `RiskManager`: Risk evaluation logic

**Why Separate from External Concerns?**

- Tests don't require mocks for pure logic
- Can swap FastAPI for gRPC without changing domain
- Clear separation: **What** vs **How**

### `services/`

**External Service Adapters (Adapter Pattern)**

- `abstractions/`: Interfaces defining contracts
  - `IMarketDataProvider`: Market data contract
  - `IAIContextProvider`: AI context contract
  - `ITradeExecutorService`: Trade execution contract
- `binance/`: Binance API adapter
- `perplexity/`: Perplexity AI adapter

**Why Adapters?**

- Isolate external API changes
- Easy to swap implementations (Coinbase for Binance)
- Business logic depends on abstractions, not implementations

### `api/`

**FastAPI HTTP Layer (Presentation)**

- `models/`: Request/Response DTOs
- `routes/`: Route handlers
- `__init__.py`: App factory

**Why Thin Controllers?**

- HTTP concerns separated from business logic
- Easy to test business logic without FastAPI
- API layer is replaceable (could use gRPC/GraphQL)

### `tests/`

**Organized by Testing Strategy**

- `unit/`: Fast tests for pure domain logic (~80% of tests)
  - No external dependencies
  - No database access
  - Run in milliseconds
- `integration/`: Slower tests combining layers (~15%)
  - Test orchestrator with mocked services
  - Test API endpoints with test client
- `fixtures/`: Shared test data and factories

---

## Testing Strategy

### Unit Tests (80%)

```python
# Fast, pure logic tests
def test_market_analyzer_rsi():
    analyzer = MarketAnalyzer()  # No mocks needed
    rsi = analyzer.calculate_rsi([100, 101, 102, ...])
    assert 0 <= rsi <= 100
```

### Integration Tests (15%)

```python
# Test layers working together
def test_signal_generation_with_analysis():
    analyzer = MarketAnalyzer()
    generator = SignalGenerator(analyzer)
    analysis = analyzer.analyze(...)
    signal = generator.generate_signal(analysis)
    assert signal.action in [BUY, SELL, HOLD]
```

### Service Tests (5%)

```python
# Mock external services
def test_market_analysis_with_mocked_binance():
    mock_binance = Mock(spec=IMarketDataProvider)
    mock_binance.get_klines.return_value = [[...], ...]

    orchestrator = Orchestrator(market_data=mock_binance)
    result = orchestrator.analyze("BTCUSDT")
```

---

## SOLID Principles Applied

### Single Responsibility Principle (SRP)

- `MarketAnalyzer`: Only calculates indicators
- `SignalGenerator`: Only generates signals
- `RiskManager`: Only evaluates risk
- Each class has **one reason to change**

### Open/Closed Principle (OCP)

- Open for extension: Add new signal strategies without modifying existing code
- Closed for modification: Existing code remains stable
- **Example**: Add `RSIStrategy`, `MACDStrategy` without touching base logic

### Liskov Substitution Principle (LSP)

- All `IMarketDataProvider` implementations behave correctly
- Can swap `BinanceMarketData` for `MockMarketData` seamlessly

### Interface Segregation Principle (ISP)

- `IMarketDataProvider` only has market methods
- `IAIContextProvider` only has AI methods
- Clients depend only on methods they use

### Dependency Inversion Principle (DIP)

- Domain services depend on abstractions (`IMarketDataProvider`)
- Not on concrete implementations (`BinanceMarketData`)
- High-level policies don't depend on low-level details

---

## Running Tests

### Run all unit tests

```bash
pytest tests/unit -v
```

### Run with coverage

```bash
pytest tests/unit --cov=domain --cov-report=html
```

### Run specific test

```bash
pytest tests/unit/test_market_analyzer.py::TestMarketAnalyzer::test_calculate_rsi_basic -v
```

### Run integration tests

```bash
pytest tests/integration -v
```

---

## Development Workflow

1. **Write test first** (TDD)

   ```bash
   pytest tests/unit/test_new_feature.py -v
   ```

2. **Implement domain logic** (no FastAPI, no Binance API)

   ```python
   # domain/entities/new_entity.py
   class NewEntity:
       def method(self): ...
   ```

3. **Create adapter if needed** (external service)

   ```python
   # services/adapters/new_adapter.py
   class NewAdapter(INewInterface):
       def method(self): ...
   ```

4. **Add API route** (thin controller)

   ```python
   # api/routes/new_route.py
   @app.get("/api/resource")
   async def get_resource():
       ...
   ```

5. **Test end-to-end** (integration test)
   ```bash
   pytest tests/integration -v
   ```

---

## Code Quality Standards

### Style

```bash
black domain/ services/ api/ --line-length=100
```

### Linting

```bash
flake8 domain/ services/ api/ --max-line-length=100
```

### Type Checking

```bash
mypy domain/ services/ api/ --strict
```

### Test Coverage

```bash
pytest --cov=domain --cov-report=term-missing
```

**Target**: >80% coverage for domain layer

---

## Architecture Decision Log (ADL)

| Decision                 | Rationale                           | Trade-offs                                        |
| ------------------------ | ----------------------------------- | ------------------------------------------------- |
| **Layered Architecture** | Clear separation of concerns        | Might need refactoring for event-driven scale     |
| **Singleton for Config** | Single source of truth              | Limited flexibility if needing per-request config |
| **Adapter Pattern**      | Easy service swapping               | Additional indirection layer                      |
| **Value Objects**        | Immutability guarantees correctness | Extra object creation                             |
| **Dependency Injection** | Testability, loose coupling         | More constructor parameters                       |

---

## Next Steps (Phase 2)

- [ ] Add authentication (JWT)
- [ ] Implement database persistence (SQLAlchemy)
- [ ] Add event sourcing (audit trail)
- [ ] Deploy to production (Docker, K8s)
- [ ] Add monitoring (Prometheus, Grafana)
- [ ] Implement caching (Redis)
