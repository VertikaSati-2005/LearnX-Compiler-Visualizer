from __future__ import annotations

from pathlib import Path

from flask import Flask, jsonify, redirect, render_template, request, session, url_for

from analyzer.complexity import analyze_complexity
from analyzer.parser import parse
from analyzer.tokenizer import tokenize, analyze_tokens

app = Flask(__name__)
app.secret_key = "timebound-mini-compiler-secret"

USERS_FILE = Path("users.txt")


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
    return redirect(url_for("dashboard"))


@app.get("/auth")
def auth_page():
    if _is_logged_in():
        return redirect(url_for("dashboard"))
    tab = (request.args.get("tab") or "login").strip().lower()
    active_tab = "signup" if tab == "signup" else "login"
    return render_template("auth.html", active_tab=active_tab)


@app.get("/signup")
def signup_page():
    return redirect(url_for("auth_page"))


@app.post("/signup")
def signup():
    username = (request.form.get("username") or "").strip()
    email = (request.form.get("email") or "").strip()
    password = (request.form.get("password") or "").strip()

    if not username or not email or not password:
        return render_template("auth.html", signup_error="All fields are required", active_tab="signup")

    users = _read_users()
    if any(u["email"].lower() == email.lower() for u in users):
        return render_template("auth.html", signup_error="Email already registered", active_tab="signup")

    _append_user(username, email, password)
    return render_template("auth.html", login_success="Signup successful. Please login.", active_tab="login")


@app.get("/login")
def login_page():
    return redirect(url_for("auth_page"))


@app.post("/login")
def login():
    email = (request.form.get("email") or "").strip()
    password = (request.form.get("password") or "").strip()

    users = _read_users()
    for user in users:
        if user["email"].lower() == email.lower() and user["password"] == password:
            session["user"] = user["username"]
            return redirect(url_for("dashboard"))

    return render_template("auth.html", login_error="Invalid credentials", active_tab="login")


@app.get("/dashboard")
def dashboard():
    username = session.get("user")
    return render_template("dashboard.html", username=username)


@app.get("/compiler")
def compiler():
    return render_template("compiler.html")


@app.get("/logout")
def logout():
    session.clear()
    return redirect(url_for("dashboard"))


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

