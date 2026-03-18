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
}
`;

function badgeClass(complexity) {
  if (complexity === "O(1)") return "green";
  if (complexity === "O(n)" || complexity === "O(log n)") return "yellow";
  return "red";
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function prettyComplexity(c) {
  // Convert O(n^2) -> O(n²) for display (keeps backend JSON simple).
  return String(c)
    .replace("O(n^2)", "O(n²)")
    .replace("O(n^3)", "O(n³)")
    .replace("O(n^4)", "O(n⁴)");
}

async function analyzeCode(code) {
  const res = await fetch("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return await res.json();
}

function renderOutput(data) {
  const output = document.getElementById("output");
  output.innerHTML = "";

  const overall = document.getElementById("overallComplexity");
  overall.textContent = data && data.success ? prettyComplexity(data.overall_complexity || "—") : "—";
  overall.className = `badge ${badgeClass(overall.textContent)}`;

  if (!data || data.success === false) {
    const line = data && data.line ? data.line : "?";
    const msg = data && data.error ? data.error : "Unknown error";
    output.appendChild(el("div", "error", `❌ Error (Line ${line}): ${msg}`));
    return;
  }

  if (!data.lines || data.lines.length === 0) {
    output.appendChild(el("div", "empty", "No analyzable lines found."));
    return;
  }

  // Token summary at top
  if (data.tokens) {
    const ts = data.tokens;
    const kinds = ts.by_type ? Object.keys(ts.by_type) : [];
    const kindsText =
      kinds.length > 0
        ? kinds
            .map((k) => `${k} (${ts.by_type[k]})`)
            .join(", ")
        : "none";
    const box = el(
      "div",
      "token-summary",
      `Tokens: ${ts.total}  •  Types: ${kindsText}`
    );
    output.appendChild(box);
  }

  let prev = null;
  for (const item of data.lines) {
    if (prev !== null && item.number > prev + 1) {
      output.appendChild(el("div", "spacer", ""));
    }

    if (item.warning) {
      output.appendChild(el("div", "warning", `⚠️ Warning (Line ${item.number}): ${item.warning}`));
    }

    const row = el("div", "term-row");
    const ln = el("span", "term-ln", `Line ${item.number}: `);
    const code = el("span", "term-code", item.code);
    const arrow = el("span", "term-arrow", " → ");
    const comp = prettyComplexity(item.complexity);
    const badge = el("span", `term-comp ${badgeClass(comp)}`, comp);

    row.appendChild(ln);
    row.appendChild(code);
    row.appendChild(arrow);
    row.appendChild(badge);
    output.appendChild(row);
    prev = item.number;
  }
}

function setBusy(busy) {
  const btn = document.getElementById("analyzeBtn");
  btn.disabled = busy;
  btn.textContent = busy ? "Analyzing..." : "Analyze";
}

window.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("codeInput");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const fillSampleBtn = document.getElementById("fillSampleBtn");

  fillSampleBtn.addEventListener("click", () => {
    input.value = SAMPLE;
    input.focus();
  });

  async function run() {
    setBusy(true);
    try {
      const data = await analyzeCode(input.value || "");
      renderOutput(data);
    } catch (e) {
      const output = document.getElementById("output");
      output.innerHTML = "";
      output.appendChild(el("div", "empty", `Error: ${e.message || e}`));
      const overall = document.getElementById("overallComplexity");
      overall.textContent = "—";
      overall.className = "badge";
    } finally {
      setBusy(false);
    }
  }

  analyzeBtn.addEventListener("click", run);

  input.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") {
      e.preventDefault();
      run();
    }
  });
});

