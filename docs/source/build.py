#!/usr/bin/env python3
"""Rebuild the OnShelf PDFs from markdown.

Fixes the four defects the original generator produced:
  D1  section headings rendered inline inside a paragraph -> block-level headings
  D2  inline pill labels overlapped the following text    -> no lateral padding
  D3  no /Annots link objects emitted at all              -> real <a> elements
  D4  GOAL/PROMPT labels butted against their values      -> inline-block + margin
"""
import re, sys, pathlib
from markdown_it import MarkdownIt
from weasyprint import HTML, CSS

HERE = pathlib.Path(__file__).resolve().parent


def split_frontmatter(text):
    meta = {}
    if text.startswith("---\n"):
        end = text.index("\n---\n", 3)
        for line in text[4:end].splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip().strip('"')
        text = text[end + 5:]
    return meta, text


def expand_containers(text):
    out, stack = [], []
    for line in text.split("\n"):
        m = re.match(r"^:::\s*([A-Za-z][\w-]*)\s*$", line)
        if m:
            stack.append(m.group(1))
            out += [f'<div class="{m.group(1)}">', ""]
        elif line.strip() == ":::" and stack:
            stack.pop()
            out += ["", "</div>", ""]
        else:
            out.append(line)
    return "\n".join(out)


def render(md_path, out_path, css_paths):
    meta, body = split_frontmatter(md_path.read_text())
    md = MarkdownIt("commonmark", {"html": True})
    md.enable("table")
    html_body = md.render(expand_containers(body))
    html_body = html_body.replace("<p><div", "<div").replace("</div></p>", "</div>")

    masthead = ""
    if meta.get("doctitle"):
        masthead = ('<div class="masthead">'
                    f'<span class="title">{meta["doctitle"]}</span>'
                    f'<span class="subtitle">{meta.get("subtitle","")}</span>'
                    f'<span class="byline">{meta.get("byline","")}</span></div>')

    doc = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
           f'<title>{meta.get("doctitle","")}</title></head><body>'
           f"{masthead}{html_body}</body></html>")
    (HERE / (out_path.stem + ".html")).write_text(doc)
    HTML(string=doc, base_url=str(HERE)).write_pdf(
        out_path, stylesheets=[CSS(filename=str(p)) for p in css_paths])
    print(f"  wrote {out_path}")


if __name__ == "__main__":
    OUT = HERE.parent  # docs/
    targets = [
        (HERE / "submission.md", OUT / "OnShelf_Fynd_PGM_Submission.pdf",
         [HERE / "paper.css"]),
        (HERE / "appendix.md", OUT / "OnShelf_Appendix_Work_Record.pdf",
         [HERE / "paper.css", HERE / "appendix.css"]),
    ]
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for src, dst, css in targets:
        if only and only not in src.name:
            continue
        if src.exists():
            render(src, dst, [c for c in css if c.exists()])
