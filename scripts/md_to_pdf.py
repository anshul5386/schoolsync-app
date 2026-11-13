#!/usr/bin/env python3
"""Convert APP_GUIDE.md to a print-friendly PDF (uses Chrome headless on macOS)."""
import re
import subprocess
import sys
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parents[1]
MD = ROOT / "APP_GUIDE.md"
HTML = ROOT / "APP_GUIDE.print.html"
PDF = ROOT / "APP_GUIDE.pdf"

CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

STYLE = """
@page { margin: 18mm 16mm; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.55;
  color: #1a1a1a;
  max-width: 42em;
  margin: 0 auto;
  padding: 0 0.5em;
}
h1 { font-size: 22pt; color: #0B2545; border-bottom: 2px solid #0B2545; padding-bottom: 0.3em; }
h2 { font-size: 14pt; color: #0B2545; margin-top: 1.4em; page-break-after: avoid; }
h3 { font-size: 12pt; margin-top: 1.1em; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 10pt; }
th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
th { background: #f0f4f8; }
pre, code { font-family: Menlo, Monaco, "Courier New", monospace; font-size: 9pt; }
pre {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 10px;
  white-space: pre-wrap;
  word-break: break-word;
  page-break-inside: avoid;
}
.mermaid-note {
  background: #eef6ff;
  border-left: 4px solid #2563eb;
  padding: 8px 12px;
  margin: 1em 0;
  font-size: 10pt;
}
hr { border: none; border-top: 1px solid #ddd; margin: 1.5em 0; }
a { color: #2563eb; text-decoration: none; }
ul, ol { padding-left: 1.4em; }
.title-meta { color: #666; font-size: 10pt; margin-bottom: 1.5em; }
"""


def preprocess_mermaid(text: str) -> str:
    def repl(match: re.Match) -> str:
        body = match.group(1).strip()
        preview = body[:200] + ("…" if len(body) > 200 else "")
        return (
            "\n\n> **Diagram (flow chart):** "
            "The full interactive version is in `APP_GUIDE.md` under the same section. "
            f"Summary:\n>\n```\n{preview}\n```\n\n"
        )

    return re.sub(r"```mermaid\s*\n(.*?)```", repl, text, flags=re.DOTALL)


def main() -> int:
    if not MD.is_file():
        print(f"Missing {MD}", file=sys.stderr)
        return 1

    raw = MD.read_text(encoding="utf-8")
    raw = preprocess_mermaid(raw)
    body = markdown.markdown(
        raw,
        extensions=["tables", "fenced_code", "sane_lists", "toc"],
    )
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Easool Mobile App — Developer Guide</title>
<style>{STYLE}</style>
</head>
<body>
<p class="title-meta">Easool · schoolsync-app · Generated from APP_GUIDE.md</p>
{body}
</body>
</html>
"""
    HTML.write_text(html, encoding="utf-8")

    if not CHROME.is_file():
        print(f"Chrome not found at {CHROME}. Open {HTML} and Print → Save as PDF.", file=sys.stderr)
        return 2

    url = HTML.as_uri()
    cmd = [
        str(CHROME),
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={PDF}",
        url,
    ]
    subprocess.run(cmd, check=True, timeout=120)
    print(f"Wrote {PDF}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
