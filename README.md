# AtCoder Statement Lens

AtCoder Statement Lens is a small Chrome extension that makes variables in
AtCoder problem statements easier to follow.

It preserves the original statement and adds lightweight visual highlighting:
hover a variable, and matching occurrences in the visible statement are
highlighted.

## Features

- Runs on `https://atcoder.jp/contests/*/tasks/*`.
- Highlights matching variable tokens on hover.
- Supports click-to-pin and `Escape` to clear.
- Detects simple variables such as `N`, `M`, `K`, and `X`.
- Detects indexed variables such as `A_i`, `B_i`, `S_i`, and `x_i`.
- Reads KaTeX TeX annotations to detect variables inside rendered formulas.
- Highlights whole formula regions when precise in-formula token mapping would
  be risky.
- Keeps sample input/output blocks out of the default highlight scope.

## Interaction Model

The first version is intentionally conservative.

- Hovering `A_i` highlights `A_i`.
- Hovering `A_i` does not highlight `A` or `i`.
- Hovering a standalone index such as `i` highlights `i` and variables ending
  in `_i`, such as `A_i`.
- Hovering a rendered formula highlights every discovered token in that formula
  as a group.

This is designed for quickly moving between the problem statement, constraints,
input format, and output description without replacing the original text.

## Install Locally

1. Open `chrome://extensions/` in Chrome.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select the `extension/` directory in this repository.
5. Open an AtCoder task page.

## Repository Layout

```text
extension/
  manifest.json
  content.js
  content.css
test/
  fixture_statement.html
docs/
  behavior.md
  dom_notes.md
  scaffold_manifest.md
```

## Development Notes

The extension is a content script only. It does not call external services, does
not generate explanations, and does not suggest solutions or strategies for
AtCoder problems.

For rendered math, the extension uses KaTeX annotations such as
`annotation[encoding="application/x-tex"]` for token discovery. It avoids
rewriting KaTeX's generated layout because that DOM is deeply nested and
layout-sensitive.

`test/fixture_statement.html` is a small manual fixture for checking the basic
DOM behavior outside AtCoder.

## Non-Goals

- AI Q&A.
- Problem summarization.
- Solution generation.
- Strategy or heuristic suggestions.
- Score optimization.
- Automatic submission support.

## License

MIT License.

Copyright (c) 2026 滝咲白菜 (Shirona Takizaki). See `LICENSE`.
