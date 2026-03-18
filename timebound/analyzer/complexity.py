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


def analyze_complexity(parsed: List[ParsedLine]) -> tuple[List[LineComplexity], str]:
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
        overall = "O(∞)"
    elif max_exp > 0:
        overall = _big_o_from_exponent(max_exp)
    elif has_log:
        overall = "O(log n)"
    else:
        overall = "O(1)"
    return out, overall

