import { createContext, useContext, useState } from 'react'

const ProModeContext = createContext(null)

export function ProModeProvider({ children }) {
  const [isProMode, setIsProMode] = useState(() => {
    try { return localStorage.getItem('kairos_pro_mode') === 'true' } catch { return false }
  })
  // 'pro' | 'standard' | null  — which splash is currently playing
  const [activeTransition, setActiveTransition] = useState(null)

  const toggleProMode = () => {
    if (isProMode) {
      // PRO → STANDARD: play standard splash, then flip state
      setActiveTransition('standard')
    } else {
      // STANDARD → PRO: play pro splash, then flip state
      setActiveTransition('pro')
    }
  }

  const onProTransitionComplete = () => {
    setActiveTransition(null)
    setIsProMode(true)
    try { localStorage.setItem('kairos_pro_mode', 'true') } catch {}
  }

  const onStandardTransitionComplete = () => {
    setActiveTransition(null)
    setIsProMode(false)
    try { localStorage.setItem('kairos_pro_mode', 'false') } catch {}
  }

  return (
    <ProModeContext.Provider value={{
      isProMode,
      toggleProMode,
      activeTransition,
      onProTransitionComplete,
      onStandardTransitionComplete,
    }}>
      {children}
    </ProModeContext.Provider>
  )
}

export function useProMode() {
  const ctx = useContext(ProModeContext)
  if (!ctx) throw new Error('useProMode must be inside <ProModeProvider>')
  return ctx
}
