# Code Guidelines (Python)

A concise summary of Python style and practices drawn from **Google’s Python Style Guide**, **DeepMind** (Google-style), and **PEP 8**, adapted for the bills.bio agent codebase.

---

## 1. Sources

| Source | Notes |
|--------|--------|
| **Google Python Style Guide** | [google.github.io/styleguide/pyguide.html](https://google.github.io/styleguide/pyguide.html). Primary reference; covers language rules, style, types, docstrings, naming. |
| **DeepMind** | Follows Google’s style for Python. Projects like MuJoCo add: maximize consistency with existing code, keep names short where it helps, be sparing with horizontal space and generous with vertical, use American English in comments. |
| **PEP 8** | [pep8.org](https://pep8.org). Official style guide for Python; “code is read much more often than it is written.” Emphasizes readability and consistency. |

---

## 2. Formatting & Layout

- **Indentation**: 4 spaces. No tabs.
- **Line length**: Prefer ≤ 80 characters. Break at the highest syntactic level; use parentheses for implicit continuation. Long imports, URLs, or pathnames in comments may exceed 80.
- **Blank lines**: Two between top-level definitions (functions, classes). One between methods; one between class docstring and first method. Use single blank lines inside functions as needed.
- **Whitespace**: No space inside `()`, `[]`, `{}`. One space after `,`, `;`, `:`. No space before open paren/bracket for calls and indexing. No trailing whitespace. One space around `=`, comparisons, and Booleans; no space around `=` for keyword args except when a type annotation is present (`def f(x: int = 0)`).
- **Semicolons**: Do not use.
- **Parentheses**: Use sparingly; fine for tuple literals or line continuation. Do not wrap return or conditionals unnecessarily (`return foo`, not `return (foo)` unless it’s a tuple).
- **Trailing commas**: Use when the closing `]`, `)`, or `}` is on the next line (helps formatters and diffs).

---

## 3. Naming

- **Modules / packages**: `lower_with_under`. File extension `.py`; no dashes in filenames.
- **Classes / exceptions**: `CapWords`.
- **Functions / methods**: `lower_with_under()`.
- **Constants**: `CAPS_WITH_UNDER` (or `_CAPS_WITH_UNDER` for module-private).
- **Variables / parameters**: `lower_with_under`.
- **Internal (module- or class-private)**: Prefix with single underscore, e.g. `_helper()`, `_internal_var`. Double leading underscore (name mangling) is discouraged.
- **Avoid**: Single-character names except for obvious cases (e.g. `i`, `j`, `k` in short loops; `e` in `except`; `f` for file in `with`). No dashes in module names. No names that encode type (e.g. `id_to_name_dict`). No offensive terms.
- **Descriptive**: Prefer clarity over brevity; avoid ambiguous or project-specific abbreviations.

---

## 4. Imports

- **Order**: (1) `from __future__ import ...`, (2) standard library, (3) third-party, (4) local/application. Within each group, sort lexicographically (case-insensitive).
- **Style**: One import per line (except for `typing` / `collections.abc`, where multiple symbols on one line are explicitly allowed). Use `import x` for packages and modules; use `from x import y` when `x` is the package prefix and `y` is the **module** name (not individual classes/functions—use `module.Class` in code). Use `from x import y as z` to avoid collision, shorten a long name, or when `y` conflicts with a parameter name; use `import y as z` only for standard abbreviations (e.g. `import numpy as np`).
- **Path**: Use full package names; do not use relative imports. Even within the same package, use the full package name so it is clear what is being imported and to avoid duplicate imports.

---

## 5. Type Annotations

- **Use**: Annotate public APIs and code that is error-prone or hard to understand. At least function parameters and return types.
- **Style**: Prefer modern syntax: `str | None`, `list[int]`, `tuple[str, int]`. Use `X | None` rather than implicit `= None` for optional parameters. For generic types, specify type parameters (e.g. `Sequence[int]`, not bare `Sequence`).
- **Forward references**: Use `from __future__ import annotations` or string quotes for forward refs (e.g. `"MyClass"`).
- **Defaults**: Use space around `=` only when both type and default are present: `def f(a: int = 0) -> int:`.
- **Abstract types**: Prefer `collections.abc` (e.g. `Sequence`, `Mapping`) for parameters when you don’t need a concrete type.

---

## 6. Docstrings & Comments

- **Docstrings**: Use `"""..."""` (PEP 257). One-line summary (≤ 80 chars) ending with a period; then blank line; then details. Required for public API, non-trivial size, or non-obvious logic.
- **Sections**: For functions/methods, use **Args:**, **Returns:** (or **Yields:** for generators), **Raises:** when they add information. Do not document in **Raises:** exceptions raised when the caller violates the API (e.g. bad arguments). Match existing style in the file (descriptive vs imperative: “Fetches …” vs “Fetch …”).
- **Classes**: One-line summary of what the class represents (not "Class that …"). Exception subclasses: describe what the exception represents, not when it is raised. Document public attributes in an **Attributes:** section if useful.
- **Comments**: Explain *why* or non-obvious *what*; assume the reader knows Python. Use proper punctuation and grammar. For TODOs, use `# TODO: reference - description` (e.g. bug/issue link, hyphen, then short description). Avoid TODOs that refer to a person or team.
- **Overridden methods**: May omit a docstring if decorated with `@override` (from `typing` or `typing_extensions`), unless the override materially refines the contract.
- **Modules**: Every file should start with a module docstring describing contents and usage; add license boilerplate if required by the project.
- **Language**: American English in comments and docstrings.

---

## 7. Language & Safety

- **Exceptions**: Use built-in types where appropriate (e.g. `ValueError` for bad arguments). Don’t use `assert` for preconditions that affect behavior (asserts can be disabled). Prefer narrow `except` clauses; avoid bare `except:` or broad `except Exception` unless re-raising or isolating and logging. Minimize code inside `try`/`except`; use `finally` for cleanup.
- **Defaults**: Do not use mutable default arguments (`def f(a, b=[])`). Use `None` and assign inside the function, or an immutable default (e.g. `()`).
- **Truthiness**: Prefer implicit false where clear: `if items:`, `if not items:`. For “value present or not” use `if x is None:` / `if x is not None:`. Always use `if x is None:` or `if x is not None:` to check for None. Never compare a boolean to `False` with `==`; use `if not x:`. To distinguish `False` from `None`, use `if not x and x is not None:`. For sequences, `if seq:` / `if not seq:` rather than `len(seq) == 0`. For values known to be integers (not the result of `len()`), comparing to `0` is fine.
- **Iteration**: Prefer default iterators: `for key in d:`, `for line in file:`, `for k, v in d.items():`. Don’t mutate a container while iterating.
- **Strings**: Use f-strings, `%`, or `.format()`; avoid building strings with `+` in loops (use list + `''.join()` or `io.StringIO`). Be consistent with quote style in a file.
- **Logging**: For logging functions that take a pattern string: pass a string literal with %-placeholders as the first argument and values as subsequent arguments (e.g. `logger.info('Value: %s', x)`), not an f-string—so loggers can store the pattern and avoid rendering when not needed.
- **Error messages**: Exception or log messages should (1) precisely match the actual error condition, (2) make interpolated values clearly identifiable, and (3) be easy to grep or parse; avoid assumptions that might be wrong.
- **Resources**: Use `with` for files, sockets, and other stateful resources so they are closed explicitly.
- **Global state**: Avoid mutable global state. If needed, make it module-internal (single underscore) and document why.
- **Lambdas / comprehensions**: OK for one-liners. Prefer a named function when the lambda would span multiple lines or exceed ~60–80 characters. Prefer generator expressions over `map`/`filter` with lambda. For common operations (e.g. multiplication), use the `operator` module (e.g. `operator.mul`) instead of lambda. Comprehensions: avoid multiple `for` clauses or complex filters; use a regular loop for readability when needed.
- **Decorators**: Use when they add clear value; avoid heavy or I/O-dependent logic at import time. Prefer module-level functions over `staticmethod`; use `classmethod` only for constructors or class-level coordination.
- **Power features**: Avoid custom metaclasses, reflection, `__del__` for cleanup, and similar unless necessary. Prefer straightforward code.

---

## 8. Functions & Structure

- **Length**: Prefer small, focused functions. If a function exceeds about 40 lines, consider splitting. No hard limit.
- **Main**: If a file is meant to be executed, put main logic in a `main()` and guard with `if __name__ == "__main__": main()` so the module is importable without running main. Only the main executable file needs a shebang: `#!/usr/bin/env python3` (per PEP 394). Avoid top-level code that runs on import (calls, object creation) unless intended.
- **Nesting**: Avoid nesting functions/classes just to hide them; use a single underscore at module level so they can still be tested.
- **Unused arguments**: To satisfy a required signature (e.g. callback, interface), delete the unused variable at the start of the function and add a short comment (e.g. `del arg  # Unused.`). Do not use `_` or `unused_` prefix as the only way to suppress warnings; the delete + comment pattern is preferred (Google style).

---

## 9. Tools (for this project)

- **Linting**: Run a linter (e.g. `pylint`, `ruff`, or `pyflakes`) and fix or explicitly suppress only when justified; use inline comments (e.g. `# pylint: disable=invalid-name`) with a brief reason if needed.
- **Formatting**: Use an auto-formatter for consistency (e.g. **Black** or **Pyink**). Config should align with the guidelines above (e.g. line length 80 if that’s the project choice).
- **Type checking**: Use a static checker (e.g. **pytype**, **mypy**) in CI or pre-commit; annotate public API and critical paths first.

---

## 10. For the bills.bio agent

- **Style**: Follow this document and PEP 8; when in doubt, match existing code in the same file or module.
- **Consistency**: Prefer consistency with the current codebase for details not specified here (e.g. comment style, docstring tense). Don’t use “consistency” to block clearly better patterns.
- **Agent code**: Keep the agent loop, tools, and prompts easy to follow: short functions, clear names, and docstrings for public tools and the main run loop. Type-annotate tool signatures and message types. Use the same formatting and naming in both `agent/` and `tools/`.
- **New code**: Prefer type annotations, docstrings for public APIs, and explicit resource handling (`with`, clear error handling). Prefer readability over cleverness.

---

## 11. References

- [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html) — primary source; cross-checked for imports, exceptions, type annotations, docstrings (Args/Returns/Raises), logging, error messages, truthiness, comprehensions, trailing commas, main/shebang, and naming.
- [PEP 8 – Style Guide for Python Code](https://peps.python.org/pep-0008/)
- [PEP 257 – Docstring Conventions](https://peps.python.org/pep-0257/)
- [DeepMind / MuJoCo style notes](https://github.com/google-deepmind/mujoco) (CONTRIBUTING / STYLEGUIDE where present)

**Google alignment:** This doc was verified against the official Google Python Style Guide (google.github.io/styleguide/pyguide.html). Key practices adopted: full-package imports (no relative), no mutable default args, explicit `X | None` for optional params, space around `=` only when type + default present, Raises not for API violations, logging with pattern string + args (not f-string), error messages precise and grep-friendly, truthiness rules (None check, no `== False`), comprehensions avoid multiple `for` clauses, operator module over lambda for common ops, unused-arg suppression via `del` + comment, module docstring and optional license, shebang only on main executable, `@override` for overridden methods.

This document is the single reference for Python code style and practices in the bills.bio agent; update it when the project adopts new conventions or tools.
