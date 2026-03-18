from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Literal, Optional

from .tokenizer import CodeLine


BlockKind = Literal["loop", "block"]


LOOP_HEADER_RE = re.compile(r"^\s*(for|while)\s*\(")
FOR_VALID_RE = re.compile(r"^\s*for\s*\(\s*[^;]*;\s*[^;]*;\s*[^)]*\)\s*(\{)?\s*$")
WHILE_TRUE_RE = re.compile(r"^\s*while\s*\(\s*true\s*\)\s*(\{)?\s*$", re.IGNORECASE)
FOR_EMPTY_RE = re.compile(r"^\s*for\s*\(\s*;\s*;\s*\)\s*(\{)?\s*$")

# Simple if / else headers so they are not treated as invalid statements.
IF_HEADER_RE = re.compile(r"^\s*if\s*\([^)]*\)\s*\{?\s*$")
ELSE_IF_HEADER_RE = re.compile(r"^\s*else\s+if\s*\([^)]*\)\s*\{?\s*$")
ELSE_HEADER_RE = re.compile(r"^\s*else\s*\{?\s*$")
# Allow style `} else {` and `} else if (...) {` on one line as well.
TRAILING_ELSE_RE = re.compile(r"^\s*}\s*else(\s+if\s*\([^)]*\))?\s*\{?\s*$")

# Very small "supported statement" set (student-friendly on purpose):
# - declarations: int i; / int i = 0; / int arr[100], n, i, key;
# - assignments: sum = sum + 1;
# - increments: i++; / ++i;
# - function call-ish: foo(...);
# We keep these patterns intentionally loose so common C snippets pass.
DECL_RE = re.compile(
    r"""^\s*
    (?:[A-Za-z_]\w*\s+)+      # type and qualifiers
    .*
    ;\s*$
    """,
    re.VERBOSE,
)
ASSIGN_RE = re.compile(
    r"^\s*[A-Za-z_]\w*(\[[^\]]*\])?\s*=\s*.*;\s*$"
)
INCDEC_RE = re.compile(r"^\s*(?:\+\+|--)?\s*[A-Za-z_]\w*\s*(?:\+\+|--)?\s*;\s*$")
CALL_RE = re.compile(r"^\s*[A-Za-z_]\w*\s*\([^;]*\)\s*;\s*$")

# Very simple C-style function header detector, e.g.:
# int main() {        // with brace
# int main(int n) {   // with params
FUNC_HEADER_RE = re.compile(
    r"""^\s*
    (?:[A-Za-z_]\w*\s+)+   # return type (and qualifiers)
    [A-Za-z_]\w*           # function name
    \s*\([^)]*\)\s*        # parameter list
    \{?\s*$                # optional '{' on same line
    """,
    re.VERBOSE,
)


@dataclass(frozen=True)
class Issue:
    kind: Literal["error", "warning"]
    line_no: int
    message: str


@dataclass(frozen=True)
class ParsedLine:
    line_no: int
    raw: str
    text: str
    loop_depth: int  # number of currently-active loops affecting this line
    is_loop_header: bool
    is_brace_only: bool
    warning: Optional[str] = None


def _count_braces(s: str) -> tuple[int, int]:
    # Extremely simple: counts { and } characters in the line after comment stripping.
    return s.count("{"), s.count("}")


@dataclass(frozen=True)
class ParseResult:
    lines: List[ParsedLine]
    errors: List[Issue]
    warnings: List[Issue]


def _is_supported_statement(s: str) -> bool:
    return bool(DECL_RE.match(s) or ASSIGN_RE.match(s) or INCDEC_RE.match(s) or CALL_RE.match(s))


def parse(lines: List[CodeLine]) -> ParseResult:
    """
    Produce a per-line loop depth using a light-weight brace-based approximation:
    - Detects `for(...)` and `while(...)` as loop headers.
    - Uses `{` and `}` to open/close loop bodies when present.
    - If a loop header has no `{`, assumes a single-statement body on the next
      non-empty line.
    """
    stack: List[BlockKind] = []
    loop_depth = 0
    pending_loop: bool = False

    parsed: List[ParsedLine] = []
    errors: List[Issue] = []
    warnings: List[Issue] = []

    for cl in lines:
        text = cl.text

        is_loop_header = bool(LOOP_HEADER_RE.match(text))
        opens, closes = _count_braces(text)
        stripped = text.strip()
        is_brace_only = stripped in ("{", "}")

        # ---------- Error detection (lightweight, line-based) ----------
        # 1) Invalid for loop syntax
        if stripped.startswith("for"):
            if not FOR_VALID_RE.match(text):
                errors.append(Issue("error", cl.line_no, "Invalid 'for' loop syntax"))

        # 2) Missing semicolon for non-loop, non-brace, non-header statements
        # We keep this simple: any such line without ';' is an error.
        if (
            not is_loop_header
            and not is_brace_only
            and not FUNC_HEADER_RE.match(text)
            and not IF_HEADER_RE.match(text)
            and not ELSE_IF_HEADER_RE.match(text)
            and not ELSE_HEADER_RE.match(text)
            and not TRAILING_ELSE_RE.match(text)
        ):
            if not stripped.endswith(";"):
                # Don't report semicolon error for lines that are *only* opening/closing brace + code,
                # because we don't support multi-statement per line anyway.
                errors.append(Issue("error", cl.line_no, "Missing semicolon ';'"))
            else:
                # 3) Unknown statements (only when semicolon exists so we don't double-report)
                if not _is_supported_statement(text) and "}" not in text and "{" not in text:
                    errors.append(Issue("error", cl.line_no, "Unsupported or invalid statement"))

        # 4) Infinite loop warnings
        warning_text: Optional[str] = None
        if WHILE_TRUE_RE.match(text):
            warning_text = "Possible infinite loop → O(∞)"
            warnings.append(Issue("warning", cl.line_no, warning_text))
        elif stripped.startswith("for") and FOR_EMPTY_RE.match(text):
            warning_text = "Possible infinite loop → O(∞)"
            warnings.append(Issue("warning", cl.line_no, warning_text))

        # If we previously saw a loop header without `{`, then either:
        # - a `{` on this line starts the loop body (common style: header + next-line `{`)
        # - otherwise, this line is treated as the single-statement loop body.
        single_stmt_body_depth = 0
        if pending_loop:
            if opens > 0:
                # This line (often just "{") is not considered part of the loop body yet.
                # We'll open the loop when processing braces below.
                pass
            else:
                single_stmt_body_depth = 1
                pending_loop = False

        effective_depth = loop_depth + single_stmt_body_depth

        parsed.append(
            ParsedLine(
                line_no=cl.line_no,
                raw=cl.raw,
                text=cl.text,
                loop_depth=effective_depth,
                is_loop_header=is_loop_header,
                is_brace_only=is_brace_only,
                warning=warning_text,
            )
        )

        # Update state after recording line (so header line isn't treated as inside itself).
        if is_loop_header:
            # If there is an opening brace on the same line, treat it as loop body start.
            if opens > 0:
                stack.append("loop")
                loop_depth += 1
                opens -= 1
            else:
                pending_loop = True

        # Handle remaining opening braces.
        for _ in range(opens):
            if pending_loop:
                stack.append("loop")
                loop_depth += 1
                pending_loop = False
            else:
                stack.append("block")

        # Handle closing braces.
        for _ in range(closes):
            if stack:
                kind = stack.pop()
                if kind == "loop":
                    loop_depth = max(0, loop_depth - 1)
            else:
                # Unmatched closing brace
                errors.append(Issue("error", cl.line_no, "Unmatched closing brace '}'"))

    # Unmatched opening braces at EOF
    if stack:
        # Report at the last seen line for simplicity.
        last_line = parsed[-1].line_no if parsed else 1
        errors.append(Issue("error", last_line, "Missing closing brace '}'"))

    return ParseResult(lines=parsed, errors=errors, warnings=warnings)

