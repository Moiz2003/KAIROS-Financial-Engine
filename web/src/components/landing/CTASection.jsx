import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function CTASection() {
  const navigate = useNavigate()

  return (
    <section id="cta" className="relative py-32 md:py-40 px-6 overflow-hidden">
      {/* Radial background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, #18181b 0%, #000000 100%)',
        }}
      />

      {/* Noise texture */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
        }}
      />

      {/* Ambient glows */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full pointer-events-none -z-10"
        style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />
      <div
        className="absolute left-1/3 top-1/3 w-[400px] h-[200px] rounded-full pointer-events-none -z-10"
        style={{ background: 'radial-gradient(ellipse, rgba(6,182,212,0.10) 0%, transparent 70%)', filter: 'blur(60px)' }}
      />

      <div className="mx-auto max-w-4xl text-center">
        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65 }}
          className="text-5xl md:text-6xl font-black text-white leading-tight"
        >
          Ready to Trade Like a Machine?
        </motion.h2>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-zinc-400 text-xl mt-5"
        >
          Join the closed beta. No credit card. No noise. Just edge.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.28 }}
          className="mt-10 flex flex-col items-center gap-4"
        >
          <motion.button
            whileHover={{
              scale: 1.07,
              boxShadow: '0 0 80px rgba(6,182,212,0.6), 0 0 40px rgba(124,58,237,0.4)',
              transition: { type: 'spring', stiffness: 280, damping: 16 },
            }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/signup')}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #8b5cf6, #34d399, #22d3ee)',
              backgroundSize: '300% 300%',
              boxShadow: '0 0 60px rgba(6,182,212,0.4), 0 0 120px rgba(124,58,237,0.2)',
            }}
            className="relative px-12 py-5 text-xl font-bold rounded-2xl text-white overflow-hidden"
          >
            {/* Shimmer sweep */}
            <motion.span
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
              }}
              animate={{ x: ['-120%', '120%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
            />
            <span className="relative">🚀 Launch Proving Grounds</span>
          </motion.button>

          <p className="text-zinc-600 text-sm mt-2">
            256-bit encrypted · Testnet only · Cancel anytime
          </p>
        </motion.div>

        {/* Social proof strip */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-6"
        >
          {[
            { icon: '🔒', label: '256-bit TLS' },
            { icon: '🧪', label: 'Testnet Sandboxed' },
            { icon: '⚡', label: '<200ms Latency' },
            { icon: '🤖', label: 'DeepSeek AI Powered' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-zinc-600 text-sm">
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
