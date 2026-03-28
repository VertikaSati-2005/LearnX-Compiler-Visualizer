import React, { useEffect, useMemo, useRef, useState } from "react";

const SAMPLE = `int sum = 0;
int i = 0;
int j = 0;

for(i = 0; i < n; i++) {
  sum = sum + i;
}

for(i = 0; i < n; i++) {
  for(j = 0; j < n; j++) {
    sum = sum + i + j;
  }
}`;

const TOKEN_LABELS = [
  ["identifier", "Identifiers"],
  ["keyword", "Keywords"],
  ["number", "Numbers"],
  ["operator", "Operators"],
  ["punctuation", "Punctuation"],
  ["separator", "Separators"],
];

function prettyComplexity(c) {
  return String(c)
    .replace("O(n^2)", "O(n²)")
    .replace("O(n^3)", "O(n³)")
    .replace("O(n^4)", "O(n⁴)");
}

function complexityTone(c) {
  if (c === "O(1)") return "text-emerald-300 border-emerald-400/30 bg-emerald-500/10";
  if (c === "O(n)" || c === "O(log n)" || c === "O(n log n)") {
    return "text-yellow-300 border-yellow-400/30 bg-yellow-500/10";
  }
  return "text-red-300 border-red-400/30 bg-red-500/10";
}

function buildTerminalText(data) {
  if (!data || !data.success) return "";
  const oc = prettyComplexity(data.overall_complexity || "—");
  const otn = data.overall_t_n != null ? String(data.overall_t_n) : "—";
  const header = [
    "learnx-compiler — analysis",
    `Overall: ${oc}    T(n) = ${otn}`,
    "─".repeat(56),
    "",
  ];
  const lines = Array.isArray(data.lines) ? data.lines : [];
  const body = lines.map((item) => {
    const comp = prettyComplexity(item.complexity);
    const tn = item.t_n != null ? String(item.t_n) : "—";
    return `Line ${item.number} → ${comp}, T(n)=${tn}`;
  });
  return [...header, ...body].join("\n");
}

const CompilerPage = ({ me }) => {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [rightTab, setRightTab] = useState("analysis");

  const lineRef = useRef(null);
  const taRef = useRef(null);

  const lineCount = useMemo(() => Math.max(1, code.split("\n").length), [code]);

  const overall = useMemo(() => {
    if (!data || !data.success) return "—";
    return prettyComplexity(data.overall_complexity || "—");
  }, [data]);

  useEffect(() => {
    document.body.classList.add("compiler-no-scroll");
    return () => document.body.classList.remove("compiler-no-scroll");
  }, []);

  useEffect(() => {
    if (!me || me.loading) return;
    if (!me.user) {
      window.location.href = "/auth?tab=login";
    }
  }, [me]);

  const onEditorScroll = (e) => {
    const el = e.currentTarget;
    if (lineRef.current) lineRef.current.scrollTop = el.scrollTop;
  };

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || `HTTP ${res.status}`);
      }
      setData(payload);
    } catch (e) {
      setData(null);
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const terminalBody = useMemo(() => {
    if (error) return `Error: ${error}`;
    if (data && data.success === false) {
      return `Parse error (line ${data.line ?? "?"}): ${data.error ?? "Unknown"}`;
    }
    if (data && data.success) return buildTerminalText(data);
    return `$ Run Analyze to print line complexity and T(n) estimates.\n$ Overall complexity will appear after a successful parse.`;
  }, [data, error]);

  const tabBtn = (id, label) => (
    <button
      type="button"
      role="tab"
      aria-selected={rightTab === id}
      onClick={() => setRightTab(id)}
      className={`rounded-t-lg px-4 py-2.5 text-xs font-medium transition-colors duration-200 ${
        rightTab === id
          ? "border-b-2 border-[#00ffcc] text-[#00ffcc] shadow-[0_0_12px_rgba(0,255,204,0.2)]"
          : "border-b-2 border-transparent text-slate-500 hover:text-slate-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section className="compiler-workspace flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 pb-2 pt-3 md:px-4">
      {/* Toolbar */}
      <div className="compiler-toolbar shrink-0 rounded-2xl border border-white/10 bg-slate-900/50 px-3 py-2.5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl md:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 hidden text-sm font-semibold text-slate-200 sm:inline">Compiler</span>
            <button
              type="button"
              onClick={() => setCode(SAMPLE)}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-[#00ffcc]/50 hover:bg-white/10 md:px-4"
            >
              Load sample
            </button>
            <button
              type="button"
              onClick={run}
              disabled={busy}
              className="rounded-xl bg-[#00ffcc] px-4 py-2 text-xs font-semibold text-slate-950 shadow-[0_0_28px_rgba(0,255,204,0.45)] transition hover:shadow-[0_0_40px_rgba(0,255,204,0.75)] disabled:cursor-not-allowed disabled:opacity-60 md:px-5"
            >
              {busy ? "Analyzing…" : "Analyze"}
            </button>
          </div>
          <div
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold md:px-4 md:text-xs ${complexityTone(overall)}`}
            title="Overall complexity"
          >
            Overall: {overall}
          </div>
        </div>
      </div>

      {/* Editor | RHS tabs — 50/50 on md+; stacked on small screens; internal scroll only */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden md:flex-row md:gap-3">
        {/* LHS — code editor */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0e14] shadow-[inset_0_1px_0_rgba(0,255,204,0.08)] md:min-w-0 md:basis-1/2 md:max-w-[50%]">
          <div className="flex shrink-0 items-center justify-between border-b border-white/5 bg-slate-950/80 px-3 py-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">Editor</span>
            <span className="text-[10px] text-slate-600">.c</span>
          </div>
          <div className="relative flex min-h-0 flex-1">
            <div
              ref={lineRef}
              className="hidden-scrollbar w-11 shrink-0 overflow-y-auto overflow-x-hidden border-r border-white/5 bg-[#06080c] py-2 pr-1.5 text-right font-mono text-[11px] leading-[1.5rem] text-slate-600 select-none md:w-12 md:text-[12px] md:leading-6"
              aria-hidden
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={taRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={onEditorScroll}
              spellCheck={false}
              placeholder="Paste C-like code here…"
              className="min-h-0 w-full min-w-0 flex-1 resize-none overflow-y-auto bg-[#0d1117] py-2 pr-2 pl-2 font-mono text-[12px] leading-[1.5rem] text-slate-100 caret-[#00ffcc] outline-none placeholder:text-slate-600 md:text-[13px] md:leading-6"
            />
          </div>
        </div>

        {/* RHS — tabbed panel */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 shadow-[0_20px_80px_rgba(15,23,42,0.65)] backdrop-blur-md md:min-w-0 md:basis-1/2 md:max-w-[50%]">
          <div
            className="flex shrink-0 items-end gap-0 border-b border-white/10 bg-[#0a0e14]/95 px-1 pt-1"
            role="tablist"
          >
            {tabBtn("analysis", "Analysis")}
            {tabBtn("terminal", "Terminal")}
            {tabBtn("tokenizer", "Tokenizer")}
          </div>

          {/* Single scroll region per visible tab */}
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#06080a]">
            {rightTab === "analysis" && (
              <div className="p-3">
                {error ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}

                {!error && (!data || (data.success && (!data.lines || data.lines.length === 0))) ? (
                  <div className="rounded-xl border border-white/10 bg-[#020617]/60 px-3 py-3 text-sm text-slate-500">
                    Run Analyze to see per-line complexity.
                  </div>
                ) : null}

                {data && data.success === false ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    Line {data.line || "?"}: {data.error || "Unknown error"}
                  </div>
                ) : null}

                <div className="space-y-2 pr-1">
                  {data &&
                    data.success &&
                    Array.isArray(data.lines) &&
                    data.lines.map((item) => {
                      const comp = prettyComplexity(item.complexity);
                      return (
                        <div
                          key={`${item.number}-${item.code}`}
                          className="rounded-xl border border-white/10 bg-[#020617]/70 p-3"
                        >
                          {item.warning ? (
                            <div className="mb-2 rounded-lg border border-yellow-400/30 bg-yellow-500/10 px-2 py-1 text-xs text-yellow-200">
                              Warning (Line {item.number}): {item.warning}
                            </div>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-mono text-slate-500">Line {item.number}:</span>
                            <span className="font-mono text-slate-200">{item.code}</span>
                            <span className="text-slate-600">→</span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${complexityTone(comp)}`}
                            >
                              {comp}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {rightTab === "terminal" && (
              <div className="bg-[#050608] p-3 font-mono text-[11px] leading-relaxed text-slate-400">
                <pre className="whitespace-pre-wrap">{terminalBody}</pre>
              </div>
            )}

            {rightTab === "tokenizer" && (
              <div className="p-3">
                <TokenizerContent data={data} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

function TokenizerContent({ data }) {
  if (!data || !data.success || !data.tokens) {
    return (
      <p className="text-sm text-slate-600">
        Run a successful Analyze to view token counts and identifier/keyword lists.
      </p>
    );
  }
  const t = data.tokens;
  const counts = t.counts || t.by_type || {};

  return (
    <div className="space-y-4 text-slate-400">
      <p className="text-sm text-[#00ffcc] drop-shadow-[0_0_10px_rgba(0,255,204,0.35)]">
        Total tokens: <span className="font-medium text-slate-100">{t.total ?? 0}</span>
      </p>
      {TOKEN_LABELS.map(([key, label]) => {
        const list = Array.isArray(t[key]) ? t[key] : [];
        const n = counts[key] ?? 0;
        return (
          <div key={key} className="rounded-lg border border-white/5 bg-[#0d1117]/80 p-3">
            <div className="mb-2 font-semibold text-slate-200 drop-shadow-[0_0_8px_rgba(0,255,204,0.2)]">
              {label} <span className="font-normal text-slate-500">({n})</span>
            </div>
            {list.length === 0 ? (
              <p className="text-slate-600">—</p>
            ) : (
              <p className="font-mono text-sm leading-relaxed text-slate-300">
                {list.join(", ")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default CompilerPage;
