"""
System Integration Test - Full End-to-End Cycle
Tests the complete orchestration workflow with real services.

Purpose: Verify that all components work together:
1. Binance adapter fetches real candles
2. MarketAnalyzer calculates indicators
3. SignalGenerator produces technical signal
4. Perplexity performs reality check
5. Orchestrator synthesizes final recommendation

Usage:
    python test_system.py

Environment:
    Requires .env with:
    - BINANCE_API_KEY
    - BINANCE_API_SECRET
    - PERPLEXITY_API_KEY
"""

import sys
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from core.logging_config import get_logger
from core.di_container import ServiceContainer

logger = get_logger(__name__)


def print_header(title: str):
    """Print formatted section header."""
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)


def print_section(title: str):
    """Print formatted subsection."""
    print(f"\n>>> {title}")


def print_result(label: str, value: any, color: str = ""):
    """Print formatted result."""
    print(f"    {label}: {value}")


def test_system_end_to_end():
    """Execute full end-to-end system test."""
    
    print_header("PHASE 4: SERVICE ORCHESTRATION - SYSTEM TEST")
    
    # Verify credentials
    print_section("Step 0: Verify Environment")
    
    binance_key = os.getenv("BINANCE_API_KEY")
    binance_secret = os.getenv("BINANCE_API_SECRET")
    perplexity_key = os.getenv("PERPLEXITY_API_KEY")
    
    if not binance_key:
        print("    ❌ BINANCE_API_KEY not set in .env")
        return False
    if not binance_secret:
        print("    ❌ BINANCE_API_SECRET not set in .env")
        return False
    if not perplexity_key:
        print("    ❌ PERPLEXITY_API_KEY not set in .env")
        return False
    
    print("    ✓ BINANCE_API_KEY set")
    print("    ✓ BINANCE_API_SECRET set")
    print("    ✓ PERPLEXITY_API_KEY set")
    
    # Initialize container
    print_section("Step 1: Initialize Service Container (DI)")
    
    try:
        container = ServiceContainer()
        print("    ✓ Service container initialized")
    except Exception as e:
        print(f"    ❌ Container initialization failed: {e}")
        return False
    
    # Get orchestrator
    print_section("Step 2: Get Orchestrator from Container")
    
    try:
        orchestrator = container.get_orchestrator()
        print("    ✓ Orchestrator retrieved")
        print(f"    - Market Provider: {orchestrator.market_provider.__class__.__name__}")
        print(f"    - AI Provider: {orchestrator.ai_provider.__class__.__name__}")
        print(f"    - Signal Generator: {orchestrator.signal_generator.__class__.__name__}")
    except Exception as e:
        print(f"    ❌ Failed to get orchestrator: {e}")
        return False
    
    # Run orchestrator
    print_section("Step 3: Execute Orchestrator for BTCUSDT")
    
    symbol = "BTCUSDT"
    print(f"    Symbol: {symbol}")
    print(f"    Interval: 4h")
    print(f"    Limit: 200 candles")
    
    try:
        print("\n    [Calling Orchestrator.get_trade_recommendation()...]")
        signal = orchestrator.get_trade_recommendation(
            symbol=symbol,
            interval="4h",
            limit=200,
        )
        print("    ✓ Orchestrator execution complete")
    except Exception as e:
        print(f"    ❌ Orchestrator failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Display results
    print_section("Step 4: Trade Recommendation Results")
    
    print_result("Action", f"{signal.action.value}")
    print_result("Confidence", f"{signal.confidence:.2%}")
    print_result("Technical Score", f"{signal.technical_score:.2f}")
    print_result("Sentiment Score", f"{signal.sentiment_score:.2f}")
    print_result("Timestamp", f"{signal.timestamp.isoformat()}")
    
    print("\n    Reasoning:")
    for line in signal.reasoning.split(" | "):
        print(f"      • {line}")
    
    # Verify results
    print_section("Step 5: Verification")
    
    checks = [
        ("Action is valid", signal.action.value in ["BUY", "SELL", "HOLD"]),
        ("Confidence 0-1", 0.0 <= signal.confidence <= 1.0),
        ("Technical score 0-1", 0.0 <= signal.technical_score <= 1.0),
        ("Sentiment score 0-1", 0.0 <= signal.sentiment_score <= 1.0),
        ("Reasoning provided", len(signal.reasoning) > 0),
        ("Timestamp valid", signal.timestamp is not None),
    ]
    
    all_passed = True
    for check_name, passed in checks:
        status = "✓" if passed else "✗"
        print(f"    {status} {check_name}")
        if not passed:
            all_passed = False
    
    # Summary
    print_header("TEST SUMMARY")
    
    if all_passed:
        print("    ✅ ALL CHECKS PASSED")
        print("\n    System is functioning correctly:")
        print("    • Adapters working (Binance + Perplexity)")
        print("    • Domain logic functional (MarketAnalyzer + SignalGenerator)")
        print("    • Orchestrator coordinating services")
        print("    • DI container wiring services")
        return True
    else:
        print("    ❌ SOME CHECKS FAILED")
        return False


if __name__ == "__main__":
    try:
        success = test_system_end_to_end()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
