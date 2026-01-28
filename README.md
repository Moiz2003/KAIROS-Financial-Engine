# KAIROS: AI Financial Engine

> An intelligent, multi-platform financial decision system combining real-time market analysis with AI-powered insights.

## 📦 Monorepo Structure

This project is organized as a monorepo with the following structure:

```
KAIROS/
├── backend/              # Python FastAPI backend
│   ├── api/             # FastAPI routes and endpoints
│   ├── core/            # Core configuration, DI, exceptions
│   ├── domain/          # Domain models and business logic
│   ├── services/        # External service adapters (Binance, Perplexity)
│   ├── tests/           # Unit and integration tests
│   ├── main.py          # Application entry point
│   ├── requirements.txt  # Python dependencies
│   ├── .env             # Environment configuration
│   ├── pytest.ini       # Pytest configuration
│   └── *.md             # Backend documentation
│
├── ios/                 # iOS mobile app (SwiftUI)
│   └── (Coming soon)
│
├── android/             # Android mobile app (Kotlin)
│   └── (Coming soon)
│
└── README.md            # This file
```

## 🚀 Backend (Python FastAPI)

The backend is a production-ready financial analysis engine that combines:

- **Real-time market data** from Binance
- **Advanced technical analysis** (RSI, EMA, trend detection)
- **AI-powered insights** from Perplexity
- **Trade execution** via Binance test orders
- **RESTful API** for frontend integration

### Quick Start

```bash
# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py

# Run tests
pytest tests/
```

### API Endpoints

```bash
# Market Analysis
GET /api/analyze/{symbol}

# Trade Execution
POST /api/trade

# Health Check
GET /health
```

## 📱 Mobile Platforms

### iOS (SwiftUI)

Coming soon - SwiftUI app for iOS 15+

### Android (Kotlin)

Coming soon - Jetpack Compose app for Android 9+

## 🏗️ Architecture

### 5 Phases (Complete)

1. **Phase 1** ✅ - Architecture & Scaffolding (39 files, 3,347 lines)
2. **Phase 2** ✅ - Domain Logic (SignalGenerator, 30 unit tests)
3. **Phase 3** ✅ - Service Adapters (BinanceAdapter, PerplexityAdapter)
4. **Phase 4** ✅ - Service Orchestration (TradeOrchestrator, DI Container)
5. **Phase 5** ✅ - Trade Execution (TradeExecutor, POST /api/trade)

### Design Patterns

- **Facade Pattern** - TradeOrchestrator simplifies complex workflows
- **Dependency Injection** - ServiceContainer manages all service dependencies
- **Adapter Pattern** - Binance/Perplexity adapters isolate external APIs
- **Factory Pattern** - ServiceContainer creates services
- **Singleton Pattern** - Single orchestrator instance per app

## 📋 Features

### Market Analysis

- Real-time candle data from Binance
- Technical indicators: RSI, EMA, Trend detection
- "Sniper Strategy" signal generation
- Confidence scoring (0-1)

### AI Insights

- News sentiment analysis via Perplexity
- Market reasoning generation
- Reality checks on technical signals

### Trade Execution

- Safe test order execution (no real funds)
- Position sizing (0.001 BTC MVP)
- Bid/ask tracking
- Order status monitoring

### API

- RESTful endpoints
- Pydantic request/response validation
- Comprehensive error handling
- JSON logging

## 🔧 Technology Stack

### Backend

- **Framework**: FastAPI
- **Server**: Uvicorn
- **Market Data**: Binance Connector
- **AI**: Perplexity API
- **Testing**: Pytest
- **Documentation**: Pydantic + OpenAPI

### Frontend (Planned)

- **iOS**: SwiftUI, Combine
- **Android**: Kotlin, Jetpack Compose

## ⚙️ Configuration

Environment variables (see `backend/.env`):

```bash
# Binance API
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
BINANCE_TESTNET=true  # Use testnet for testing

# Perplexity AI
PERPLEXITY_API_KEY=your_key

# Trading
CRYPTO_SYMBOL=BTCUSDT
KLINE_INTERVAL=4h

# API Server
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4
```

## 📊 Testing

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=domain --cov=services

# Run specific test file
pytest tests/unit/test_domain_logic.py

# End-to-end execution test
python test_execution.py
```

## 📚 Documentation

- [Architecture Overview](backend/ARCHITECTURE.md)
- [Phase 1 - Architecture](backend/ARCHITECTURE_SUMMARY.md)
- [Phase 3 - Adapters](backend/PHASE_3_ADAPTERS.md)
- [Phase 4 - Orchestration](backend/PHASE_4_ORCHESTRATION.md)
- [Phase 5 - Execution](backend/PHASE_5_EXECUTION.md)
- [Development Guide](backend/DEVELOPMENT.md)

## 🔐 Security

- API keys loaded from `.env` (never committed)
- Test mode by default (no real fund execution)
- Exception wrapping for transparent error handling
- Input validation on all endpoints

## 📈 Next Phases

- **Phase 6** - Persistence & Trade History (database)
- **Phase 7** - Risk Management & Portfolio Tracking
- **Phase 8** - Dashboard & UI

## 📝 License

MIT

## 👥 Contributing

See [Development Guide](backend/DEVELOPMENT.md) for contribution guidelines.

---

**Status**: Production-ready backend | Mobile apps coming soon
