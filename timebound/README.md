<<<<<<< HEAD
# Time-Bound Mini Compiler

Static, line-by-line time complexity analysis for **C-like code** (no execution).

## Run

```bash
cd project
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Open the app at `http://127.0.0.1:5000/`.

## API

`POST /analyze`

Request body:

```json
{ "code": "int i=0; for(i=0;i<n;i++){ i++; }" }
```

Response body:

```json
{
  "lines": [
    { "line_no": 1, "line": "int i=0;", "complexity": "O(1)", "loop_depth": 0 }
  ],
  "overall_complexity": "O(n)"
}
```

## Notes

- Best results with brace-delimited loops.
- Single-line loops without braces are approximated as a one-line body.

=======
# Time-Bound-Mini-Complier
Time Bound Mini Complier tool will statically analyze the code without executing it and display the estimated time complexity for each individual line. By visually mapping complexity to specific code constructs such as assignments, loops, and nested loops, students will be able to better understand performance implications.
>>>>>>> fdcd4281606b7c5988655c1b7ce2ccdfa6f0fdd9
