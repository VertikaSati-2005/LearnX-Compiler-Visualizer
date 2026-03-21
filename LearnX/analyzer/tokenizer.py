from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List
import re


@dataclass(frozen=True)
class CodeLine:
    line_no: int
    raw: str
    text: str  # trimmed + comments removed


def _strip_line_comment(s: str) -> str:
    idx = s.find("//")
    if idx == -1:
        return s
    return s[:idx]


def tokenize(code: str) -> List[CodeLine]:
    """
    Split code into non-empty lines, trimming whitespace and removing // and /* */ comments.
    The tokenizer is intentionally simple and does not attempt full C parsing.
    """
    lines = code.splitlines()

    out: List[CodeLine] = []
    in_block_comment = False

    for i, raw in enumerate(lines, start=1):
        s = raw

        # Handle /* ... */ across lines in a simple stateful way.
        j = 0
        cleaned_parts: List[str] = []
        while j < len(s):
            if in_block_comment:
                end = s.find("*/", j)
                if end == -1:
                    j = len(s)
                else:
                    in_block_comment = False
                    j = end + 2
            else:
                start = s.find("/*", j)
                if start == -1:
                    cleaned_parts.append(s[j:])
                    j = len(s)
                else:
                    cleaned_parts.append(s[j:start])
                    in_block_comment = True
                    j = start + 2

        s = "".join(cleaned_parts)
        s = _strip_line_comment(s).strip()

        # Skip empty lines and preprocessor directives like #include, #define, etc.
        if not s or s.startswith("#"):
            continue

        out.append(CodeLine(line_no=i, raw=raw.rstrip("\n"), text=s))

    return out


# ------------------ Token statistics (for UI) ------------------

_TOKEN_PATTERN = re.compile(
    r"[A-Za-z_]\w*|\d+|==|!=|<=|>=|&&|\|\||[+\-*/%=&|<>!]=?|[(){}\[\];,]"
)

_KEYWORDS = {
    "int",
    "float",
    "double",
    "char",
    "void",
    "for",
    "while",
    "if",
    "else",
    "return",
    "break",
    "continue",
}

_OPERATORS = {
    "+",
    "-",
    "*",
    "/",
    "%",
    "=",
    "==",
    "!=",
    "<",
    ">",
    "<=",
    ">=",
    "&&",
    "||",
    "!",
}

_PUNCT = {"(", ")", "{", "}", "[", "]", ";", ",",}


def _classify_token(tok: str) -> str:
    if tok in _KEYWORDS:
        return "keyword"
    if tok in _OPERATORS:
        return "operator"
    if tok in _PUNCT:
        return "punctuation"
    if tok.isdigit():
        return "number"
    if re.match(r"^[A-Za-z_]\w*$", tok):
        return "identifier"
    return "other"


def analyze_tokens(code: str) -> Dict[str, object]:
    """
    Lightweight token statistics for UI:
    - total number of tokens
    - counts per token kind (keyword, identifier, number, operator, punctuation, other)
    """
    lines = tokenize(code)
    counts: Dict[str, int] = {}
    total = 0

    for cl in lines:
        for tok in _TOKEN_PATTERN.findall(cl.text):
            kind = _classify_token(tok)
            counts[kind] = counts.get(kind, 0) + 1
            total += 1

    return {"total": total, "by_type": counts}

