#!/usr/bin/env python3
"""Verify a rebuilt PDF against the four defects. Exit 1 on any failure."""
import sys, fitz

def check(path, big_pt=15.0):
    d = fitz.open(path); fails = []
    for pno, pg in enumerate(d, 1):
        rows = {}
        for b in pg.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                for s in l["spans"]:
                    if s["text"].strip():
                        rows.setdefault(round(s["bbox"][1] / 2) * 2, []).append(s)
        for y, spans in rows.items():
            spans.sort(key=lambda s: s["bbox"][0])
            for a, b in zip(spans, spans[1:]):
                gap = b["bbox"][0] - a["bbox"][2]
                if gap < -0.6:
                    fails.append(f"D2 p{pno}: {a['text'][-20:]!r} overlaps {b['text'][:20]!r} by {-gap:.1f}pt")
            big = [s for s in spans if s["size"] >= big_pt]
            small = [s for s in spans if s["size"] < big_pt]
            if big and small:
                fails.append(f"D1 p{pno}: heading {big[0]['text'][:28]!r} shares a line with {small[0]['text'][:28]!r}")
        mx = max((b[2] for b in pg.get_text("blocks")), default=0)
        if mx > pg.rect.width - 10:
            fails.append(f"MARGIN p{pno}: text reaches x={mx:.1f}")
    links = [l["uri"] for pg in d for l in pg.get_links() if l.get("uri")]
    if not links:
        fails.append("D3: no hyperlinks embedded")
    print(f"{path.split('/')[-1]}: {d.page_count} pages, {len(links)} links")
    for u in sorted(set(links)):
        print(f"    link -> {u}")
    if fails:
        print(f"  FAIL ({len(fails)}):")
        for f in fails[:20]: print("   ", f)
        return False
    print("  PASS — no inline headings, no overlapping spans, no margin overflow")
    return True

if __name__ == "__main__":
    sys.exit(0 if all(check(p) for p in sys.argv[1:]) else 1)
