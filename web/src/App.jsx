import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import MarketPage from './pages/MarketPage'
import PortfolioPage from './pages/PortfolioPage'
import IntelligencePage from './pages/IntelligencePage'
import TerminalPage from './pages/TerminalPage'
import TradeHistoryPage from './pages/TradeHistoryPage'
import LandingPage from './pages/LandingPage'
import SidebarLayout from './components/SidebarLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { ProModeProvider } from './context/ProModeContext'
import ProModeTransition from './components/ProModeTransition'

// ── App with routing ──
function App() {
  return (
    <ProModeProvider>
      <ProModeTransition />
      <BrowserRouter>
        <Routes>
          <Route path="/"       element={<LandingPage />} />
          <Route path="/login"  element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Protected dashboard shell */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <SidebarLayout />
              </ProtectedRoute>
            }
          >
            {/* Default: redirect /dashboard → /dashboard/market */}
            <Route index element={<Navigate to="market" replace />} />
            <Route path="market"       element={<MarketPage />} />
            <Route path="portfolio"    element={<PortfolioPage />} />
            <Route path="intelligence" element={<IntelligencePage />} />
            <Route path="terminal"     element={<TerminalPage />} />
            <Route path="history"      element={<TradeHistoryPage />} />
          </Route>

          <Route path="*" element={<LandingPage />} />
        </Routes>
      </BrowserRouter>
    </ProModeProvider>
  )
}

export default App
