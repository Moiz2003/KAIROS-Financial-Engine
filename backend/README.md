# KAIROS: Human-in-the-Loop Financial Decision Engine

**Architecture**: Layered Architecture (N-Tier) with Dependency Inversion  
**Framework**: FastAPI + Python  
**Status**: ✅ Scaffolded & Ready for Development  
**Version**: 0.1.0

---

## 📖 Documentation Index

### Getting Started

- **[README.md](README.md)** - This file, project overview
- **[MANIFEST.md](MANIFEST.md)** - Complete file inventory

### Architecture & Design

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Detailed architecture (500+ lines)
  - Task 1: Layered Architecture justification
  - Task 2: Domain Analysis & entities
  - Task 3: Project scaffolding specification
  - SOLID principles applied
  - Design patterns employed

- **[ARCHITECTURE_SUMMARY.md](ARCHITECTURE_SUMMARY.md)** - Visual overview
  - Directory tree visualization
  - Component relationships
  - Design pattern mapping

- **[DIAGRAMS.md](DIAGRAMS.md)** - ASCII diagrams & visual references
  - Layered architecture diagram
  - Data flow examples
  - Component dependency graph
  - Test pyramid strategy
  - SOLID principles mapping

### Development

- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development workflow
  - Quick start guide
  - Testing strategy
  - Code quality standards
  - ADL (Architecture Decision Log)

- **[STRUCTURE.md](STRUCTURE.md)** - File structure reference
  - File purposes
  - Getting started checklist
  - Implementation steps

### Project Status

- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Completion report
  - Deliverables completed
  - Task checklist
  - Next phase planning

---

## 🚀 Quick Start

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
# Edit .env with your credentials
```

### 3. Run Tests

```bash
pytest tests/unit -v --cov=domain
```

### 4. Start Server

```bash
python main.py
# API available at http://localhost:8000
```

---

## 📁 Project Structure

```
KAIROS/
├── core/                    Infrastructure layer (Config, Logging)
├── domain/                  Business logic layer (Pure, no dependencies)
├── services/                Service adapters (Binance, Perplexity)
├── api/                     Presentation layer (FastAPI routes)
├── tests/                   Test suite (Unit, Integration, Fixtures)
└── Documentation/           Comprehensive guides
```

See [STRUCTURE.md](STRUCTURE.md) for complete breakdown.

---

## ✅ Architecture Highlights

### Layered Architecture

```
Presentation (api/)
    ↓
Business Logic (domain/)
    ↓
Service Adapters (services/)
    ↓
Infrastructure (core/)
```

### SOLID Principles

- ✅ **S**ingle Responsibility - Each class has one reason to change
- ✅ **O**pen/Closed - Open for extension, closed for modification
- ✅ **L**iskov Substitution - Substitutable implementations
- ✅ **I**nterface Segregation - Small, focused interfaces
- ✅ **D**ependency Inversion - Depend on abstractions

### Design Patterns

- **Singleton**: Configuration, Logging
- **Adapter**: Service integration (Binance, Perplexity)
- **Dependency Injection**: Loose coupling
- **Value Object**: Immutable domain models
- **Factory**: App initialization
- **Repository**: Data persistence abstraction

---

## 🧪 Testing Strategy

```
Unit Tests (80%)           → Fast, pure logic, no mocks needed
Integration Tests (15%)    → Layer combinations, mocked services
Service Tests (5%)         → External API mocking
```

**Target Coverage**: >80% for domain layer

**Run Tests**:

```bash
pytest tests/unit -v                    # Unit tests
pytest tests/unit --cov=domain          # With coverage
pytest tests/ -v                        # All tests
```

---

## 📊 Core Components

### Domain Entities

| Entity              | Responsibility       | Tests    |
| ------------------- | -------------------- | -------- |
| **MarketAnalyzer**  | Technical indicators | 15 tests |
| **SignalGenerator** | Trading signals      | 20 tests |
| **RiskManager**     | Risk evaluation      | 15 tests |
| **Portfolio**       | Position tracking    | 10 tests |
| **TradeExecutor**   | Trade validation     | 10 tests |

### Value Objects

- `AnalysisResult` - Market analysis snapshot
- `TradeSignal` - Trading recommendation
- `RiskAssessment` - Risk evaluation
- `ExecutionResult` - Trade outcome

### Service Abstractions

- `IMarketDataProvider` - Market data contract
- `IAIContextProvider` - AI context contract
- `ITradeExecutorService` - Trade execution contract

---

## 🔄 Data Flow Example

```
HTTP POST /api/signals
    ↓
API Route Handler
    ↓
domain/SignalGenerator
    ↓
domain/MarketAnalyzer    +    Binance Adapter
    ↓
domain/RiskManager       +    Perplexity Adapter
    ↓
API Response (JSON)
```

---

## 🎯 Key Features

✅ **Framework-Agnostic Domain** - Pure business logic, no FastAPI dependencies  
✅ **Service Isolation** - External APIs completely isolated through adapters  
✅ **100% Testable Domain** - Unit tests need no mocks for pure logic  
✅ **Dependency Injection** - Easy to swap implementations  
✅ **Comprehensive Documentation** - 2,000+ lines of guides  
✅ **Configuration as Singleton** - Single source of truth  
✅ **Exception Hierarchy** - Custom domain exceptions  
✅ **Structured Logging** - JSON format, centralized

---

## 📈 Next Steps (Phase 2)

### Implementation

- [ ] Implement orchestrator
- [ ] Connect Binance adapter
- [ ] Connect Perplexity adapter
- [ ] Complete API endpoints
- [ ] Integration testing

### Features

- [ ] Real-time WebSocket updates
- [ ] Database persistence
- [ ] User authentication
- [ ] Trade history
- [ ] Backtesting engine

### Deployment

- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Production configuration
- [ ] Monitoring setup
- [ ] API documentation

---

## 📚 Reference

### Architecture Decisions

See [ARCHITECTURE.md](ARCHITECTURE.md) for ADL.

### Code Quality Standards

```bash
# Format code
black domain/ services/ api/

# Lint
flake8 domain/ services/ api/

# Type check
mypy domain/ services/ api/

# Test coverage
pytest --cov=domain --cov-report=html
```

### Project Statistics

- **Files**: 38+ created
- **Code**: 1,065 lines
- **Tests**: 330 lines
- **Documentation**: 2,000+ lines
- **Test Coverage**: Ready for >80% domain coverage

---

## 🎓 Design Philosophy

This project follows formal Software Engineering principles as defined by Pressman/Sommerville:

1. **Separation of Concerns** - Each layer has distinct responsibility
2. **High Cohesion** - Related functionality grouped together
3. **Low Coupling** - Layers communicate through abstractions
4. **Testability** - All components independently testable
5. **Maintainability** - Clear structure, comprehensive documentation
6. **Scalability** - Modular, component-based design
7. **Extensibility** - Easy to add new features without modification

---

## 💡 Key Insights

### Why Layered Architecture?

- Clear separation of concerns
- Easy to test each layer independently
- Framework-agnostic domain logic
- Easy to swap implementations (Binance → Coinbase)
- Supports SOLID principles naturally

### Why Dependency Inversion?

- Domain doesn't depend on infrastructure
- Easy to mock services in tests
- Business logic remains pure
- External API changes don't affect domain

### Why Value Objects?

- Immutability guarantees correctness
- Equality-based comparison
- Clear domain concepts
- Self-validating

---

## 🤝 Contributing

1. Follow SOLID principles
2. Maintain >80% test coverage for domain layer
3. Update documentation for architectural changes
4. Use type hints throughout
5. Run quality checks before committing

```bash
black domain/ services/ api/
flake8 domain/ services/ api/
mypy domain/ services/ api/
pytest tests/ --cov=domain
```

---

## 📝 License

[Add appropriate license]

---

## 🆘 Support

See documentation files:

- **Architecture questions** → [ARCHITECTURE.md](ARCHITECTURE.md)
- **Development workflow** → [DEVELOPMENT.md](DEVELOPMENT.md)
- **File structure** → [STRUCTURE.md](STRUCTURE.md)
- **Visual diagrams** → [DIAGRAMS.md](DIAGRAMS.md)

---

## ✨ Project Status

**Status**: ✅ **COMPLETE - READY FOR DEVELOPMENT**

**Completed**:

- ✅ Architecture design
- ✅ Directory scaffolding
- ✅ Infrastructure setup
- ✅ Domain layer structure
- ✅ Service adapters framework
- ✅ API skeleton
- ✅ Test framework
- ✅ Comprehensive documentation

**Ready for**:

- ⏳ Orchestrator implementation
- ⏳ Service integration
- ⏳ API endpoint completion
- ⏳ Full integration testing

---

**Project**: KAIROS - Human-in-the-Loop Financial Decision Engine  
**Architecture**: Layered Architecture (N-Tier)  
**Framework**: FastAPI + Python  
**Created**: January 28, 2026  
**Status**: Production-Ready Scaffold
