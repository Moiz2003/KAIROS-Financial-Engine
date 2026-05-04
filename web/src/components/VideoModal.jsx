import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function VideoModal({ isOpen, onClose }) {
    const videoRef = useRef(null)
    const [hasEnded, setHasEnded] = useState(false)

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setHasEnded(false)
            // Prevent body scroll
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    // Auto-dismiss when video ends
    const handleEnded = () => {
        setHasEnded(true)
        // Small delay so the user sees the end frame briefly
        setTimeout(() => {
            onClose()
        }, 600)
    }

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown)
        }
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                >
                    {/* Close button — top-right, always visible */}
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: 0.15 }}
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/60 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                        aria-label="Close video"
                    >
                        <X size={22} />
                    </motion.button>

                    {/* Video container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-5xl mx-4 aspect-video rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl"
                        style={{
                            boxShadow: '0 0 60px rgba(6,182,212,0.15), 0 0 120px rgba(124,58,237,0.08)',
                        }}
                    >
                        <video
                            ref={videoRef}
                            src="/demo/KAIROS-demo.mp4"
                            className="w-full h-full object-cover"
                            autoPlay
                            controls
                            playsInline
                            onEnded={handleEnded}
                        >
                            Your browser does not support the video tag.
                        </video>

                        {/* Subtle gradient overlay at bottom for polish */}
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
