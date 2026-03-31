import React, { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import CompilerPage from "./pages/CompilerPage.jsx";

const App = () => {
  const location = useLocation();
  const isCompiler = location.pathname === "/compiler";
  const [me, setMe] = useState({ loading: true, user: null });

  useEffect(() => {
    let cancelled = false;
    fetch("/get-user")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const username = data && data.username ? data.username : null;
        setMe({ loading: false, user: username });
      })
      .catch(() => {
        if (cancelled) return;
        setMe({ loading: false, user: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={`bg-[#020617] text-slate-100 font-sans antialiased ${
        isCompiler
          ? "flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden"
          : "min-h-screen"
      }`}
    >
      <div
        className={`relative isolate ${isCompiler ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "overflow-hidden"}`}
      >
        {/* Neon bottom glow — hidden on compiler to avoid layout noise */}
        {!isCompiler ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-[-260px] z-0 flex justify-center"
            aria-hidden="true"
          >
            <div className="h-[480px] w-[960px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(0,255,174,0.25)_0%,_rgba(0,255,174,0.15)_30%,_transparent_70%)] blur-[120px]" />
          </div>
        ) : null}

        <div
          className={`relative z-10 flex flex-col ${isCompiler ? "min-h-0 flex-1 overflow-hidden" : "min-h-screen"}`}
        >
          <Navbar me={me} />
          <div className={isCompiler ? "flex min-h-0 flex-1 flex-col overflow-hidden" : ""}>
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Hero />} />
                <Route path="/auth" element={<AuthPage onAuthed={() => (window.location.href = "/")} />} />
                <Route path="/compiler" element={<CompilerPage me={me} />} />
              </Routes>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

