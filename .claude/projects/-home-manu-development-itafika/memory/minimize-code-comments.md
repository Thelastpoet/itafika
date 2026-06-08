---
name: minimize-code-comments
description: User wants minimal code comments — no narration or spec citations in code
metadata:
  type: feedback
---

Keep comments in code to a minimum. Do not add explanatory comments that narrate what the code does or cite specs/docs inline (e.g. `// Phase 1 quote math (spec/data/SCHEMA.md):`). Let the code be self-documenting; reserve comments for genuinely non-obvious intent.

**Why:** The user explicitly asked for this after reviewing the @itafika/core quote engine.

**How to apply:** When writing or editing code in this repo, omit docblocks/inline comments unless something is truly surprising. Put rationale in commit messages or ADRs, not in the source.
