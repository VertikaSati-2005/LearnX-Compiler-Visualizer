import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";

function useInitialTab() {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = (params.get("tab") || "login").toLowerCase();
    return tab === "signup" ? "signup" : "login";
  }, []);
}

const AuthPage = ({ onAuthed }) => {
  const initialTab = useInitialTab();
  const [tab, setTab] = useState(initialTab);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const url = tab === "signup" ? "/api/signup" : "/api/login";
      const payload =
        tab === "signup" ? { username, email, password } : { email, password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Something went wrong");
      }

      if (typeof onAuthed === "function") onAuthed();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-1 items-center justify-center px-6 pb-20 pt-12 lg:px-8 lg:pt-16">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: "easeOut" }}
        className="w-full max-w-lg"
      >
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 shadow-[0_30px_100px_rgba(15,23,42,0.9)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16)_0%,_transparent_55%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-[-220px] flex justify-center">
            <motion.div
              aria-hidden="true"
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="h-[420px] w-[780px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(0,255,174,0.22)_0%,_rgba(0,255,174,0.12)_30%,_transparent_70%)] blur-[120px]"
            />
          </div>

          <div className="relative p-8">
            <div className="space-y-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                LearnX Compiler
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-50">
                {tab === "signup" ? "Create your account" : "Welcome back"}
              </h1>
              <p className="text-sm text-slate-400">
                {tab === "signup"
                  ? "Sign up to start analyzing your code instantly."
                  : "Login to continue with your dashboard."}
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <div className="inline-flex rounded-full border border-white/10 bg-slate-950/30 p-1 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setTab("login")}
                  className={[
                    "rounded-full px-4 py-2 text-xs font-semibold transition",
                    tab === "login"
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:text-white",
                  ].join(" ")}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setTab("signup")}
                  className={[
                    "rounded-full px-4 py-2 text-xs font-semibold transition",
                    tab === "signup"
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:text-white",
                  ].join(" ")}
                >
                  Sign up
                </button>
              </div>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {tab === "signup" ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">Username</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-white/20 focus:bg-slate-950/55"
                    placeholder="Enter name"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-white/20 focus:bg-slate-950/55"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-white/20 focus:bg-slate-950/55"
                  placeholder="••••••••"
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={busy}
                className="w-full rounded-full bg-[#00ffae] px-8 py-4 text-sm font-semibold text-black shadow-[0_0_40px_rgba(0,255,174,0.6)] transition-shadow hover:shadow-[0_0_80px_rgba(0,255,174,1)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Please wait..." : tab === "signup" ? "Create account" : "Login"}
              </motion.button>

              <div className="text-center text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => (window.location.href = "/")}
                  className="transition hover:text-slate-300"
                >
                  Back to dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default AuthPage;

