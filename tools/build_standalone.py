"""app/kachisuji-lab.html（Claudeのアーティファクト用の本文）を、
ブラウザで直接開ける1枚のHTML（dist/kachisuji-lab.html）に包む。

使い方:  python3 tools/build_standalone.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "app" / "kachisuji-lab.html"
OUT = ROOT / "dist" / "kachisuji-lab.html"

HEAD = (
    '<!doctype html><html lang="ja"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    "<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);"
    "padding-bottom:env(safe-area-inset-bottom,0px)}"
    "body{margin:0;font:14px system-ui,-apple-system,sans-serif}"
    "img{max-width:100%}[hidden]{display:none!important}</style></head><body>"
)
TAIL = "</body></html>\n"


def main() -> None:
    body = SRC.read_text(encoding="utf-8")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(HEAD + body + TAIL, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
