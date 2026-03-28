from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List

from .parser import ParsedLine


ASSIGNMENT_RE = re.compile(
    r"""
    ^\s*
    (?:[A-Za-z_]\w*\s+)*          # optional type keywords (very rough)
    [A-Za-z_]\w*(\[[^\]]*\])?     # lhs identifier or array element
    \s*
    (?<![=!<>])=                  # a single '=' (not ==, !=, <=, >=)
    (?![=])                       # not '=='
    .*;
    \s*$
    """,
    re.VERBOSE,
)


@dataclass(frozen=True)
class LineComplexity:
    line_no: int
    line: str
    complexity: str
    loop_depth: int
    warning: str | None = None


def _big_o_from_exponent(exp: int) -> str:
    if exp <= 0:
        return "O(1)"
    if exp == 1:
        return "O(n)"
    return f"O(n^{exp})"


def analyze_complexity(
    parsed: List[ParsedLine], *, code: str | None = None
) -> tuple[List[LineComplexity], str]:
    """
    Line-by-line time complexity in a compiler-like listing:
    - Non-loop statements are treated as O(1) (intrinsic per-execution cost)
    - Loop headers are treated as O(n), O(n^2), ... based on nesting depth
    Overall complexity is the maximum loop exponent seen (or O(∞) if warned).
    """
    out: List[LineComplexity] = []
    max_exp = 0
    has_infinite = False
    has_log = False

    for pl in parsed:
        # Brace-only lines don't materially contribute to runtime work.
        if pl.is_brace_only:
            continue

        # Core mapping:
        # - Non-loop statements → O(1)
        # - Loop headers → O(n), O(n^2), ... by nesting depth
        # - Special case: binary search style while(low <= high) → O(log n)
        exp = 0
        complexity = "O(1)"

        if pl.is_loop_header:
            header = pl.text.replace(" ", "")
            # Very simple binary-search detector: while(low<=high) or while(high>=low)
            if header.startswith("while(") and (
                "low<=high" in header or "high>=low" in header
            ):
                complexity = "O(log n)"
                has_log = True
            else:
                exp = pl.loop_depth + 1
                complexity = _big_o_from_exponent(exp)

        # Infinite loops dominate.
        if pl.warning and "O(∞)" in pl.warning:
            has_infinite = True
            complexity = "O(∞)"

        if pl.is_loop_header and complexity != "O(log n)":
            max_exp = max(max_exp, exp)

        out.append(
            LineComplexity(
                line_no=pl.line_no,
                # Display the code exactly as the user typed it (indentation preserved).
                line=pl.raw,
                complexity=complexity,
                loop_depth=pl.loop_depth,
                warning=pl.warning,
            )
        )

    if has_infinite:
        loop_overall = "O(∞)"
    elif max_exp > 0:
        loop_overall = _big_o_from_exponent(max_exp)
    elif has_log:
        loop_overall = "O(log n)"
    else:
        loop_overall = "O(1)"

    # Optional enhanced heuristics using the full source text.
    # We only use it to improve the overall estimate; per-line complexity stays
    # based on your existing loop-depth logic.
    if code:
        heuristic_overall = _overall_from_heuristics(code, loop_overall)
        return out, heuristic_overall

    return out, loop_overall


def _overall_rank(big_o: str) -> float:
    # Higher means "worse" (choose max for overall).
    if big_o == "O(∞)":
        return 1e9
    if big_o.startswith("O(2^") or big_o == "O(2^n)" or big_o == "O(2ⁿ)":
        return 100
    if big_o == "O(1)":
        return 0
    if big_o == "O(log n)":
        return 1
    if big_o == "O(n)":
        return 2
    if big_o == "O(n log n)":
        return 3
    if big_o.startswith("O(n^"):
        # O(n^k) where k>=2
        try:
            k = int(big_o.split("^", 1)[1].rstrip(")"))
        except Exception:
            k = 2
        return 3 + max(0, k - 1)
    # Default conservative
    return 2


def _overall_from_heuristics(code: str, fallback: str) -> str:
    compact = code.replace(" ", "").replace("\t", "").replace("\n", "")

    # Binary-search style pattern
    binary_search = False
    if "while(low<=high)" in compact or "while(high>=low)" in compact:
        binary_search = True
    if re.search(r"while\s*\(\s*([a-zA-Z_]\w*)\s*<=\s*([a-zA-Z_]\w*)\s*\)", code):
        if "mid" in code and "low" in code and "high" in code:
            binary_search = True

    # Merge-sort / heap-sort patterns
    has_merge_sort = bool(re.search(r"(merge_sort|mergeSort|heapSort|heap_sort)", code, re.IGNORECASE))

    # Simple recursion detection:
    # - find a function name from a likely C signature
    # - count self calls
    fn_def = re.search(
        r"(?:int|void|float|double|char|long|short|unsigned|signed|bool)\s+([A-Za-z_]\w*)\s*\([^)]*\)\s*\{",
        code,
    )
    fn_name = fn_def.group(1) if fn_def else None
    self_call_count = 0
    if fn_name:
        call_re = re.compile(r"\b" + re.escape(fn_name) + r"\s*\(")
        self_call_count = len(call_re.findall(code))
        # subtract ~1 for the definition occurrence
        self_call_count = max(0, self_call_count - 1)

    # Candidate overall complexity from heuristics
    candidate = fallback
    if binary_search:
        candidate = "O(log n)"

    if has_merge_sort and _overall_rank(candidate) < _overall_rank("O(n log n)"):
        candidate = "O(n log n)"

    # Exponential recursion approximation (very rough, mirrors the idea from JS):
    # if self recursion branches heavily and we don't see merge/heap patterns,
    # assume exponential.
    if self_call_count >= 2 and not has_merge_sort:
        if _overall_rank(candidate) < _overall_rank("O(2^n)"):
            candidate = "O(2^n)"

    # Finally, pick the worse of fallback vs candidate.
    return candidate if _overall_rank(candidate) >= _overall_rank(fallback) else fallback

