import React from "react";

/**
 * Brand mark: </> + graph nodes (complexity / analysis) — neon #00ffcc.
 */
export function LogoMark({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Graph / analysis nodes */}
      <path
        d="M9 29.5h6M17 29.5h6M25 29.5h6"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="12" cy="29.5" r="2" fill="currentColor" fillOpacity="0.9" />
      <circle cx="20" cy="29.5" r="2" fill="currentColor" fillOpacity="0.5" />
      <circle cx="28" cy="29.5" r="2" fill="currentColor" fillOpacity="0.9" />
      <text
        x="20"
        y="23"
        textAnchor="middle"
        fill="currentColor"
        className="logo-mark-code"
      >
        {"</>"}
      </text>
    </svg>
  );
}

export default function LearnXLogo() {
  return (
    <a href="/" className="logo" aria-label="LearnX Compiler — Home">
      <span className="logo-icon">
        <LogoMark className="logo-svg text-[#00ffcc]" />
      </span>
      <span className="logo-text">
        <span className="logo-title">LearnX</span>
        <span className="logo-sub">Compiler</span>
      </span>
    </a>
  );
}
