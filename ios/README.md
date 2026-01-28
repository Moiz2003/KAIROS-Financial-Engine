# KAIROS iOS Frontend

**AI Financial Engine for High-Frequency Traders**

## 🎯 Project Overview

KAIROS is an iOS application designed with deep HCI principles for high-frequency traders operating in high-stress, time-critical environments. The interface prioritizes **glanceability** (< 0.1 second comprehension), **error prevention**, and **cognitive load reduction**.

## 📁 Project Structure

```
KAIROS/
├── MarketData.swift       # Data model with HCI-aware properties
├── APIService.swift       # Network layer with state machine feedback
├── ContentView.swift      # Main UI with cyberpunk aesthetic
└── HCI_ANALYSIS.md        # Detailed design justification
```

## 🚀 Getting Started

### Prerequisites

- Xcode 15.0+
- iOS 17.0+
- Backend API running at `http://127.0.0.1:8000`

### Running the App

1. **Start the Backend** (if not already running):

   ```bash
   # Navigate to your backend directory
   python main.py  # or uvicorn main:app --reload
   ```

2. **Open in Xcode**:

   ```bash
   open KAIROS.xcodeproj
   ```

3. **Build and Run**:
   - Select a simulator or connected device
   - Press `Cmd + R` or click the Run button

## 🎨 Key HCI Features

### 1. Pre-Attentive Processing

- **BUY signals**: Cyan/Blue (64pt font)
- **SELL signals**: Orange (64pt font)
- Users can identify actions in < 0.1 seconds without reading text

### 2. Error Prevention

- Low confidence warning banner (< 70%)
- Visual + textual warnings before risky trades
- Risk level categorization (Low/Moderate/High/Critical)

### 3. Fitts's Law Optimization

- Large "SCAN MARKET" button (64pt height)
- Positioned in thumb zone (bottom of screen)
- Full-width tap target

### 4. Accessibility

- **Color-blind safe palette**: Cyan (not green) + Orange (not red)
- VoiceOver support with semantic labels
- Sufficient contrast ratios (WCAG AA compliant)

### 5. Shneiderman's Golden Rules

- ✅ Consistency (unified card design)
- ✅ Informative feedback (state machine)
- ✅ Error handling (clear messages + retry)
- ✅ Reversal of actions (reset capability)
- ✅ User control (manual refresh only)

## 🔧 Configuration

### Change Backend URL

Edit `APIService.swift`:

```swift
private let baseURL = "http://127.0.0.1:8000"  // Change to production URL
```

### Adjust Timeout

Edit `APIService.swift`:

```swift
private let timeoutInterval: TimeInterval = 15.0  // Seconds
```

## 📊 API Contract

The app expects this JSON response from `/analyze?symbol=AAPL`:

```json
{
  "action": "BUY",
  "confidence": 85.5,
  "technical_score": 82.0,
  "sentiment_score": 89.0,
  "reasoning": "Strong bullish momentum with positive sentiment..."
}
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Tap "SCAN MARKET" → Loading state appears
- [ ] Success state shows BUY/SELL signal prominently
- [ ] Low confidence (< 70%) triggers warning banner
- [ ] Network error shows retry button
- [ ] VoiceOver navigation works smoothly
- [ ] Works in grayscale mode (accessibility test)

### Unit Testing (Future)

```swift
// Example test
func testLowConfidenceWarning() {
    let data = MarketData(action: "BUY", confidence: 65, ...)
    XCTAssertTrue(data.requiresCautionWarning)
}
```

## 📖 Documentation

See [HCI_ANALYSIS.md](HCI_ANALYSIS.md) for:

- Detailed design rationale
- Cognitive science principles applied
- Accessibility considerations
- Fitts's Law calculations
- Future enhancement roadmap

## 🎓 HCI Course Alignment

This project demonstrates mastery of:

- **The Human** (Visual perception, memory limitations)
- **Interaction Design** (Shneiderman's 8 Golden Rules)
- **Accessibility** (Universal design, WCAG standards)
- **Performance** (Fitts's Law, pre-attentive processing)

## 🔮 Future Enhancements

1. **Haptic Feedback**: Strong haptic on low confidence
2. **Multi-Symbol Support**: Switch between tickers
3. **Historical Data**: Past predictions vs. actual results
4. **Gesture Navigation**: Swipe-to-refresh
5. **Adaptive Layout**: iPad support with split view

## 📝 License

Educational project for HCI Course demonstration.

## 👥 Credits

- **Design Framework**: SwiftUI
- **HCI Principles**: Dix et al., Shneiderman, Norman
- **Target User**: High-Frequency Traders

---

**Built with ❤️ and HCI Theory**  
_Because good design is invisible, but bad design costs millions._
