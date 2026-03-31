import React from "react";
import LearnXLogo from "./LearnXLogo.jsx";

const Navbar = ({ me }) => {
  const goTo = (path) => {
    window.location.href = path;
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  };

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-white/10 bg-slate-950/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
        <LearnXLogo />

        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <a href="/" className="transition-colors hover:text-white">
            Why LearnX?
          </a>
          <a href="/compiler" className="transition-colors hover:text-white">
            Compiler
          </a>
          <a href="/" className="transition-colors hover:text-white">
            How it works
          </a>
          <a href="/" className="transition-colors hover:text-white">
            Testimonials
          </a>
          <a href="/" className="transition-colors hover:text-white">
            FAQ
          </a>
        </nav>

        <div className="nav-right hidden items-center md:flex">
          {me && me.user ? (
            <>
              <span className="user-text">
                Hello, {me.user} 👋
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="logout-btn rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-slate-100 transition hover:border-white/40 hover:bg-white/5"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => goTo("/auth?tab=login")}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-slate-100 transition hover:border-white/40 hover:bg-white/5"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => goTo("/auth?tab=signup")}
                className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-white"
              >
                Sign up
              </button>
            </>
          )}
        </div>

        <div className="flex items-center md:hidden">
          <span className="text-xs text-slate-300">Menu</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

