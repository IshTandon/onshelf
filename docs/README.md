# Documents

The two PDFs submitted for the take-home, and the source they are generated from.

| File | What it is |
|---|---|
| `OnShelf_Fynd_PGM_Submission.pdf` | The submission: strategy note, metrics, cost, privacy, and the decision record. 7 pages. |
| `OnShelf_Appendix_Work_Record.pdf` | How AI was used, the prompt log, and what did not work. 5 pages. |
| `source/` | Markdown, stylesheets and the build script the PDFs come from. |

The prompt record also lives in [`../prompt-record/`](../prompt-record) — `session-log.md`
carries every prompt from the build session verbatim, with the commit each one produced.

## Rebuilding

```bash
pip install weasyprint markdown-it-py pymupdf
cd docs/source && python3 build.py          # writes both PDFs into docs/
python3 docs/source/verify.py docs/*.pdf    # checks them
```

`verify.py` asserts the four things that were wrong in the first generated version and are
easy to reintroduce: a section heading rendered inline inside a paragraph, a text span
overlapping the one before it, text running past the right margin, and hyperlinks that were
drawn as text but never emitted as link objects. It exits non-zero on any of them.

## Keeping the documents and the prototype honest

The documents quote the prototype in specific terms — the scripted times, the aisle numbers,
the rupee figures. Those are claims a reader can check in one click, so when the generator or
the screens change, re-read §5 of the submission and the closing note of the appendix before
shipping. One claim in §1, "failed writes stay visible", describes the production design and
is deliberately not built here: there is no inventory service in a client-side prototype for a
write to fail against.
