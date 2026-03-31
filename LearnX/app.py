from __future__ import annotations

import re
from pathlib import Path

from flask import Flask, jsonify, redirect, render_template, request, send_from_directory, session, url_for

from analyzer.complexity import analyze_complexity
from analyzer.parser import parse
from analyzer.tokenizer import tokenize, analyze_tokens

app = Flask(__name__)
app.secret_key = "timebound-mini-compiler-secret"

USERS_FILE = Path("users.txt")


def _complexity_to_tn(complexity: str) -> str:
    """Human-readable T(n) term for terminal display (paired with Big-O)."""
    if not complexity:
        return "?"
    s = "".join(str(complexity).split())
    if s == "O(1)":
        return "1"
    if s.startswith("O(log"):
        return "log n"
    if s == "O(n)":
        return "n"
    compact = s.lower()
    if "nlog" in compact or s == "O(nlogn)":
        return "n log n"
    m = re.match(r"O\(n\^(\d+)\)", s)
    if m:
        return f"n^{m.group(1)}"
    if "∞" in str(complexity) or s == "O(∞)":
        return "∞"
    if "2^n" in s or "2ⁿ" in str(complexity):
        return "2^n"
    return s


def _read_users() -> list[dict[str, str]]:
    users: list[dict[str, str]] = []
    if not USERS_FILE.exists():
        USERS_FILE.touch()
        return users

    with USERS_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            row = line.strip()
            if not row:
                continue
            parts = row.split(",", 2)
            if len(parts) != 3:
                continue
            username, email, password = parts
            users.append(
                {
                    "username": username.strip(),
                    "email": email.strip(),
                    "password": password.strip(),
                }
            )
    return users


def _append_user(username: str, email: str, password: str) -> None:
    if not USERS_FILE.exists():
        USERS_FILE.touch()
    with USERS_FILE.open("a", encoding="utf-8") as f:
        f.write(f"{username},{email},{password}\n")


def _is_logged_in() -> bool:
    return "user" in session


@app.get("/")
def index():
    """
    Serve the built React dashboard shell.
    The compiled app lives in frontend/dist and is treated as the main UI.
    """
    return send_from_directory("frontend/dist", "index.html")


@app.get("/assets/<path:filename>")
def react_assets(filename: str):
    """
    Serve static assets emitted by the React build (JS/CSS).
    These are referenced from the built index.html as /assets/...
    """
    return send_from_directory("frontend/dist/assets", filename)


@app.get("/auth")
def auth_page():
    # React handles the auth UI.
    return send_from_directory("frontend/dist", "index.html")


@app.get("/signup")
def signup_page():
    # Back-compat: old /signup route now renders React.
    return send_from_directory("frontend/dist", "index.html")


@app.post("/signup")
def signup():
    # Use /api/signup for React. Keep this endpoint working for compatibility.
    payload = request.get_json(silent=True) or request.form or {}
    username = (payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip()
    password = (payload.get("password") or "").strip()

    if not username or not email or not password:
        return jsonify({"success": False, "error": "All fields are required"}), 400

    users = _read_users()
    if any(u["email"].lower() == email.lower() for u in users):
        return jsonify({"success": False, "error": "Email already registered"}), 409

    _append_user(username, email, password)
    session["user"] = username
    return jsonify({"success": True, "user": username})


@app.get("/login")
def login_page():
    # Back-compat: old /login route now renders React.
    return send_from_directory("frontend/dist", "index.html")


@app.post("/login")
def login():
    payload = request.get_json(silent=True) or request.form or {}
    email = (payload.get("email") or "").strip()
    password = (payload.get("password") or "").strip()

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required"}), 400

    users = _read_users()
    for user in users:
        if user["email"].lower() == email.lower() and user["password"] == password:
            session["user"] = user["username"]
            return jsonify({"success": True, "user": user["username"]})

    return jsonify({"success": False, "error": "Invalid credentials"}), 401


@app.get("/dashboard")
def dashboard():
    # Back-compat: any old links to /dashboard should show the React dashboard.
    return send_from_directory("frontend/dist", "index.html")


@app.get("/compiler")
def compiler():
    # React handles the compiler frontend.
    return send_from_directory("frontend/dist", "index.html")


@app.get("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))


@app.get("/api/me")
def api_me():
    return jsonify({"user": session.get("user")})


@app.get("/get-user")
def get_user():
    if "user" in session:
        return jsonify({"username": session["user"]})
    return jsonify({"username": None})


@app.post("/api/login")
def api_login():
    return login()


@app.post("/api/signup")
def api_signup():
    return signup()


@app.post("/api/logout")
def api_logout():
    session.clear()
    return jsonify({"success": True})


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

    lines, overall = analyze_complexity(result.lines, code=code)
    overall_tn = _complexity_to_tn(overall)

    return jsonify(
        {
            "success": True,
            "tokens": token_stats,
            "overall_complexity": overall,
            "overall_t_n": overall_tn,
            "lines": [
                {
                    "number": lc.line_no,
                    "code": lc.line,
                    "complexity": lc.complexity,
                    "t_n": _complexity_to_tn(lc.complexity),
                    **({"warning": lc.warning} if lc.warning else {}),
                }
                for lc in lines
            ],
        }
    )


if __name__ == "__main__":
    app.run(debug=True)

