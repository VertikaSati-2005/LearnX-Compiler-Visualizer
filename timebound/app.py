from __future__ import annotations

from flask import Flask, jsonify, render_template, request

from analyzer.complexity import analyze_complexity
from analyzer.parser import parse
from analyzer.tokenizer import tokenize, analyze_tokens

app = Flask(__name__)


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/analyze")
def analyze():
    payload = request.get_json(silent=True) or request.form
    code = (payload.get("code") if payload else None) or ""

    tokenized = tokenize(code)
    token_stats = analyze_tokens(code)
    result = parse(tokenized)

    # Stop analysis on first error (compiler-style).
    if result.errors:
        first = result.errors[0]
        return jsonify({"success": False, "error": first.message, "line": first.line_no})

    lines, overall = analyze_complexity(result.lines)

    return jsonify(
        {
            "success": True,
            "tokens": token_stats,
            "lines": [
                {
                    "number": lc.line_no,
                    "code": lc.line,
                    "complexity": lc.complexity,
                    **({"warning": lc.warning} if lc.warning else {}),
                }
                for lc in lines
            ],
            "overall_complexity": overall,
        }
    )


if __name__ == "__main__":
    app.run(debug=True)

