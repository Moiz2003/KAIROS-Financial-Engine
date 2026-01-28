# KAIROS Monorepo Setup Guide

## Project Structure

```
KAIROS/
├── backend/                    # Python FastAPI backend (ACTIVE)
│   ├── api/                   # FastAPI routes
│   ├── core/                  # Core utilities
│   ├── domain/                # Business logic
│   ├── services/              # External integrations
│   ├── tests/                 # Test suite
│   ├── main.py                # Server entry point
│   ├── requirements.txt        # Python dependencies
│   ├── .env                   # Configuration
│   └── *.md                   # Documentation
│
├── ios/                        # iOS app (Planned)
├── android/                    # Android app (Planned)
├── venv/                       # Python virtual environment (root level)
└── README.md                   # Main project documentation
```

## Getting Started - Backend

### 1. Activate Virtual Environment

```bash
source venv/bin/activate
```

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Set Environment Variables

```bash
# Copy template
cp .env.example .env

# Edit .env with your keys:
# - BINANCE_API_KEY
# - BINANCE_API_SECRET
# - PERPLEXITY_API_KEY
```

### 4. Run the Server

```bash
python main.py
```

Server runs at `http://localhost:8000`

### 5. Access API Documentation

```
http://localhost:8000/docs          (Swagger UI)
http://localhost:8000/redoc         (ReDoc)
```

## Running Tests

```bash
# All tests
pytest

# Specific test
pytest tests/unit/test_domain_logic.py

# With coverage
pytest --cov=domain --cov=services

# System test (full flow)
python test_system.py

# Execution test (trade orders)
python test_execution.py
```

## API Usage Examples

### Market Analysis

```bash
curl http://localhost:8000/api/analyze/BTCUSDT
```

Response:

```json
{
  "action": "BUY",
  "confidence": 0.78,
  "reasoning": "Technical: ...",
  "technical_score": 0.85,
  "sentiment_score": 0.7,
  "timestamp": "2026-01-28T18:00:00"
}
```

### Trade Execution

```bash
curl -X POST http://localhost:8000/api/trade \
  -H "Content-Type: application/json" \
  -d '{"symbol": "BTCUSDT", "action": "BUY"}'
```

Response:

```json
{
  "success": true,
  "order_id": "TEST-1234567890",
  "symbol": "BTCUSDT",
  "action": "BUY",
  "quantity": 0.001,
  "fill_price": 95000.0,
  "timestamp": "2026-01-28T18:00:00"
}
```

## Important Notes

### Virtual Environment

- Located at ROOT level (`/venv`) to avoid duplication
- Shared across all backend projects
- Do NOT move or delete

### Configuration

- `.env` file is NOT committed to git
- Copy from `.env.example`
- Keep sensitive keys private

### Testing

- Unit tests (30 passing): `tests/unit/`
- Integration tests (18 ready): `tests/integration/`
- System tests: `test_system.py`
- Execution tests: `test_execution.py`

### Git

- Root `.gitignore` updated for monorepo
- Backend files in `backend/`
- iOS/Android coming soon

## Environment Variables

Required:

```bash
BINANCE_API_KEY=...              # Binance API key
BINANCE_API_SECRET=...           # Binance API secret
PERPLEXITY_API_KEY=...           # Perplexity API key
BINANCE_TESTNET=true             # Use testnet (true/false)
```

Optional:

```bash
CRYPTO_SYMBOL=BTCUSDT            # Default trading pair
KLINE_INTERVAL=4h                # Default candle interval
API_HOST=0.0.0.0                 # API host
API_PORT=8000                     # API port
LOG_LEVEL=INFO                    # Logging level
```

## Troubleshooting

### Import Errors

```bash
# Make sure you're in backend directory
cd backend

# Test imports
python -c "from api import app; print('OK')"
```

### Dependency Issues

```bash
# Upgrade pip
pip install --upgrade pip

# Reinstall requirements
pip install -r requirements.txt --force-reinstall
```

### API Key Errors

```bash
# Verify .env file exists and is configured
cat .env

# Check BINANCE_TESTNET setting
# For testing: BINANCE_TESTNET=true
# For production: BINANCE_TESTNET=false
```

## Next Steps

1. **Backend Testing**: Run `python test_execution.py`
2. **iOS Development**: Start in `ios/` folder
3. **Android Development**: Start in `android/` folder

## Project Status

- ✅ Phase 1-5: Backend complete
- 🚀 Phase 6: Persistence layer (planned)
- ⏳ Phase 7: Risk management (planned)
- ⏳ Phase 8: UI/Dashboard (planned)
- 📱 iOS app (planned)
- 📱 Android app (planned)

---

For detailed documentation, see:

- `backend/ARCHITECTURE.md` - Architecture overview
- `backend/DEVELOPMENT.md` - Development guide
- `backend/PHASE_*.md` - Implementation details
