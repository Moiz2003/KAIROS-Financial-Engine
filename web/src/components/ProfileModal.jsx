import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ImageIcon, FileText, Save, CheckCircle, AlertCircle, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function ProfileModal({ open, onClose }) {
  const { user, updateProfile } = useAuth()

  const [avatarUrl, setAvatarUrl] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null) // 'success' | 'error' | null
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    if (open && user) {
      setAvatarUrl(user.avatar_url ?? '')
      setBio(user.bio ?? '')
      setStatus(null)
      setImgError(false)
    }
  }, [open, user])

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? 'U')

  const handleSave = async () => {
    setSaving(true)
    setStatus(null)
    try {
      await updateProfile({ bio: bio.trim(), avatar_url: avatarUrl.trim() })
      setStatus('success')
      setTimeout(() => { setStatus(null); onClose() }, 1200)
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

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
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/80 shadow-2xl shadow-black/80 backdrop-blur-2xl"
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Ambient gradient */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[80px]" />

            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-neutral-600">
                  Account
                </p>
                <h2 className="text-base font-bold text-neutral-100">Edit Profile</h2>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-white/5 hover:text-neutral-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-6">
              {/* Avatar preview */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {avatarUrl && !imgError ? (
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      onError={() => setImgError(true)}
                      className="h-20 w-20 rounded-full border-2 border-emerald-500/40 object-cover shadow-lg shadow-emerald-500/10"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/10 bg-gradient-to-br from-emerald-400 to-cyan-500 text-xl font-bold text-neutral-950 shadow-lg">
                      {initials}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-neutral-800">
                    <User className="h-3 w-3 text-neutral-400" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-neutral-200">{user?.name || '—'}</p>
                  <p className="text-xs text-neutral-600">{user?.email}</p>
                </div>
              </div>

              {/* Avatar URL */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <ImageIcon className="h-3 w-3" />
                  Avatar URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={e => { setAvatarUrl(e.target.value); setImgError(false) }}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition focus:border-emerald-500/50 focus:bg-white/[0.07] focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <FileText className="h-3 w-3" />
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                  maxLength={280}
                  placeholder="A short bio about yourself…"
                  className="w-full resize-none rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition focus:border-emerald-500/50 focus:bg-white/[0.07] focus:ring-1 focus:ring-emerald-500/20"
                />
                <p className="text-right text-[10px] text-neutral-700">{bio.length}/280</p>
              </div>

              {/* Status feedback */}
              <AnimatePresence>
                {status && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${
                      status === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {status === 'success'
                      ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                    {status === 'success' ? 'Profile updated successfully' : 'Failed to save. Try again.'}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 px-6 py-4">
              <motion.button
                onClick={handleSave}
                disabled={saving}
                whileHover={{ scale: saving ? 1 : 1.02 }}
                whileTap={{ scale: saving ? 1 : 0.97 }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-2.5 text-sm font-semibold text-neutral-950 shadow-lg shadow-emerald-500/20 transition disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save Changes'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
