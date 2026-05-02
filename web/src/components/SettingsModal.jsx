import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  SlidersHorizontal,
  Bell,
  Key,
  Moon,
  Zap,
  Globe,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  Flame,
} from 'lucide-react'
import { useProMode } from '../context/ProModeContext'

const TABS = [
  { id: 'general',     label: 'General',     icon: SlidersHorizontal },
  { id: 'preferences', label: 'Preferences', icon: Bell              },
  { id: 'api_keys',    label: 'API Keys',    icon: Key               },
]

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'border-emerald-500 bg-emerald-500' : 'border-white/10 bg-white/5'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function SettingRow({ icon: Icon, label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3.5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/8 bg-white/5">
          <Icon className="h-3.5 w-3.5 text-neutral-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-200">{label}</p>
          {description && (
            <p className="text-[11px] text-neutral-600 truncate">{description}</p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function ApiKeyField({ label, placeholder }) {
  const [value, setValue] = useState('')
  const [visible, setVisible] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    if (!value.trim()) return
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 pr-10 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition focus:border-emerald-500/50 focus:bg-white/[0.07] focus:ring-1 focus:ring-emerald-500/20 font-mono"
          />
          <button
            onClick={() => setVisible(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 transition"
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <motion.button
          onClick={handleSave}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            saved
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              : 'bg-white/5 text-neutral-300 border border-white/8 hover:bg-white/10'
          }`}
        >
          {saved ? <CheckCircle className="h-3.5 w-3.5" /> : null}
          {saved ? 'Saved' : 'Save'}
        </motion.button>
      </div>
    </div>
  )
}

export default function SettingsModal({ open, onClose }) {
  const { isProMode, toggleProMode } = useProMode()
  const [activeTab, setActiveTab] = useState('general')
  const [darkMode, setDarkMode] = useState(true)
  const [compactMode, setCompactMode] = useState(false)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [priceAlerts, setPriceAlerts] = useState(true)
  const [tradeConfirmations, setTradeConfirmations] = useState(true)
  const [aiInsights, setAiInsights] = useState(false)
  const [timezone, setTimezone] = useState('UTC')
  const [currency, setCurrency] = useState('USD')

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            className="relative z-10 flex w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/80 shadow-2xl shadow-black/80 backdrop-blur-2xl"
            style={{ maxHeight: 'calc(100vh - 2rem)' }}
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Ambient gradient */}
            <div className="pointer-events-none absolute -top-24 right-1/4 h-48 w-48 rounded-full bg-violet-500/15 blur-[80px]" />

            {/* Sidebar tabs */}
            <div className="flex w-44 flex-shrink-0 flex-col border-r border-white/5 bg-white/[0.02] p-3">
              <div className="mb-4 px-2 pt-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-neutral-600">
                  Settings
                </p>
              </div>
              <nav className="flex flex-col gap-1">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      activeTab === id
                        ? 'bg-white/8 text-neutral-100 font-semibold'
                        : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-300 font-medium'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
                <h2 className="text-base font-bold text-neutral-100">
                  {TABS.find(t => t.id === activeTab)?.label}
                </h2>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-white/5 hover:text-neutral-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <AnimatePresence mode="wait">
                  {activeTab === 'general' && (
                    <motion.div
                      key="general"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-3"
                    >
                      <SettingRow icon={Moon} label="Dark Mode" description="Use the dark theme across the app">
                        <Toggle checked={darkMode} onChange={setDarkMode} />
                      </SettingRow>
                      <SettingRow icon={Zap} label="Compact Mode" description="Reduce spacing for denser information">
                        <Toggle checked={compactMode} onChange={setCompactMode} />
                      </SettingRow>

                      {/* Pro Mode — premium feature gate */}
                      <motion.div
                        animate={{
                          boxShadow: isProMode
                            ? '0 0 0 1px rgba(239,68,68,0.45), 0 0 28px 4px rgba(239,68,68,0.18)'
                            : '0 0 0 1px rgba(255,255,255,0.04)',
                        }}
                        transition={{ duration: 0.35 }}
                        className={`rounded-xl overflow-hidden ${isProMode ? 'border border-red-600/40' : 'border border-white/5'}`}
                      >
                        <div
                          className={`flex items-center justify-between gap-4 px-4 py-3.5 transition-colors duration-300 ${
                            isProMode ? 'bg-red-950/40' : 'bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition-colors duration-300 ${
                              isProMode ? 'border-red-500/40 bg-red-500/15' : 'border-white/8 bg-white/5'
                            }`}>
                              <Flame className={`h-3.5 w-3.5 transition-colors duration-300 ${isProMode ? 'text-red-400' : 'text-neutral-400'}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-semibold transition-colors duration-300 ${isProMode ? 'text-red-300' : 'text-neutral-200'}`}>
                                  Pro Mode
                                </p>
                                {isProMode && (
                                  <motion.span
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-red-400"
                                  >
                                    ACTIVE
                                  </motion.span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-600 truncate">
                                {isProMode ? 'Advanced Terminal · DeepSeek AI Targets · Full risk controls' : 'Unlock advanced terminal with AI-powered targets'}
                              </p>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <button
                              role="switch"
                              aria-checked={isProMode}
                              onClick={toggleProMode}
                              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-300 ease-in-out focus:outline-none ${
                                isProMode ? 'border-red-500 bg-red-500' : 'border-white/10 bg-white/5'
                              }`}
                            >
                              <motion.span
                                animate={{ x: isProMode ? 16 : 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                className={`pointer-events-none inline-block h-4 w-4 rounded-full shadow transition-colors duration-300 ${
                                  isProMode ? 'bg-red-100' : 'bg-white'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                        {isProMode && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="border-t border-red-900/40 bg-red-950/20 px-4 py-2.5"
                          >
                            <p className="text-[10px] text-red-400/70">
                              Advanced Terminal is active. Navigate to the Terminal to access Limit, DCA, TP/SL controls and DeepSeek AI target suggestions.
                            </p>
                          </motion.div>
                        )}
                      </motion.div>

                      <div className="space-y-2 pt-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Timezone
                        </label>
                        <select
                          value={timezone}
                          onChange={e => setTimezone(e.target.value)}
                          className="w-full rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-sm text-neutral-200 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 cursor-pointer"
                        >
                          <option value="UTC">UTC (Coordinated Universal Time)</option>
                          <option value="America/New_York">Eastern Time (ET)</option>
                          <option value="America/Chicago">Central Time (CT)</option>
                          <option value="America/Los_Angeles">Pacific Time (PT)</option>
                          <option value="Europe/London">London (GMT/BST)</option>
                          <option value="Asia/Karachi">Pakistan (PKT)</option>
                          <option value="Asia/Tokyo">Tokyo (JST)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Display Currency
                        </label>
                        <select
                          value={currency}
                          onChange={e => setCurrency(e.target.value)}
                          className="w-full rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-sm text-neutral-200 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 cursor-pointer"
                        >
                          <option value="USD">USD — US Dollar</option>
                          <option value="EUR">EUR — Euro</option>
                          <option value="GBP">GBP — British Pound</option>
                          <option value="PKR">PKR — Pakistani Rupee</option>
                          <option value="JPY">JPY — Japanese Yen</option>
                        </select>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'preferences' && (
                    <motion.div
                      key="preferences"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-3"
                    >
                      <SettingRow icon={Bell} label="Push Notifications" description="Receive alerts in your browser">
                        <Toggle checked={pushNotifications} onChange={setPushNotifications} />
                      </SettingRow>
                      <SettingRow icon={Zap} label="Price Alerts" description="Notify when targets are hit">
                        <Toggle checked={priceAlerts} onChange={setPriceAlerts} />
                      </SettingRow>
                      <SettingRow icon={Shield} label="Trade Confirmations" description="Confirm before executing trades">
                        <Toggle checked={tradeConfirmations} onChange={setTradeConfirmations} />
                      </SettingRow>
                      <SettingRow icon={Globe} label="AI Market Insights" description="Daily AI-generated briefings">
                        <Toggle checked={aiInsights} onChange={setAiInsights} />
                      </SettingRow>

                      <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-3 mt-2">
                        <p className="text-xs text-amber-400/80">
                          Push notifications require browser permission. Settings are stored locally and will
                          be backed by a user preferences API in a future release.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'api_keys' && (
                    <motion.div
                      key="api_keys"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-5"
                    >
                      <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3">
                        <p className="text-xs font-semibold text-cyan-400 mb-0.5">Testnet Mode Active</p>
                        <p className="text-[11px] text-neutral-500">
                          API keys are used for live market data only. All trades execute on the virtual
                          paper-trading engine — no real funds are at risk.
                        </p>
                      </div>

                      <ApiKeyField
                        label="Binance API Key"
                        placeholder="Enter your Binance API key…"
                      />
                      <ApiKeyField
                        label="Binance Secret Key"
                        placeholder="Enter your Binance secret key…"
                      />
                      <ApiKeyField
                        label="DeepSeek API Key"
                        placeholder="Enter your DeepSeek API key…"
                      />

                      <p className="text-[11px] text-neutral-700">
                        Keys are stored encrypted at rest. Never share your secret key with anyone.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
