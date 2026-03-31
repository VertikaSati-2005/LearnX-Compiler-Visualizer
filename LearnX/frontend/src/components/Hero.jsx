import React from "react";
import { motion } from "framer-motion";

const Hero = () => {
  const handleLaunch = () => {
    window.location.href = "/compiler";
  };

  return (
    <section className="flex flex-1 items-center justify-center px-6 pb-20 pt-16 lg:px-8 lg:pt-24">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: "easeOut" }}
        className="mx-auto flex max-w-4xl flex-col items-center text-center gap-8"
      >
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Static code intelligence
          </p>
          <h1 className="text-balance text-5xl font-bold tracking-tight text-slate-50 sm:text-6xl lg:text-7xl">
            Analyze Your Code Like a Pro
          </h1>
          <p className="mx-auto max-w-2xl text-balance text-lg text-slate-400">
            Understand how your code performs with real-time complexity insights. Detect inefficiencies,
            optimize logic, and master algorithms effortlessly.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={handleLaunch}
            className="rounded-full bg-[#00ffae] px-8 py-4 text-sm font-semibold text-black shadow-[0_0_40px_rgba(0,255,174,0.6)] transition-shadow hover:shadow-[0_0_80px_rgba(0,255,174,1)]"
          >
            Launch Compiler →
          </motion.button>

          <div className="space-y-2 text-sm text-slate-400">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500"> Real-time Analysis | Loop Detection | DSA Friendly</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-yellow-400">★★★★★</span>
            </div>
          </div>

          {/* Gradient / glow divider under rating */}
          <div className="relative mt-3 h-[2px] w-[840px] max-w-[96vw]">
            {/* sharp center line */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/90 to-transparent" />
            {/* soft white bloom around line */}
            <div className="absolute inset-0 blur-sm bg-gradient-to-r from-transparent via-white/45 to-transparent" />
            {/* broad green glow spread below */}
            <div className="absolute left-1/2 top-1/2 h-16 w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00ffae]/40 blur-3xl" />
            {/* deeper glow for long spread */}
            <div className="absolute left-1/2 top-[65%] h-24 w-[88%] -translate-x-1/2 rounded-full bg-[#00ffae]/20 blur-[56px]" />
          </div>
        </div>

        <motion.div
          aria-hidden="true"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none mt-10 h-40 w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900/40 shadow-[0_30px_100px_rgba(15,23,42,0.9)] backdrop-blur-xl"
        >
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18)_0%,_transparent_55%)]" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;

