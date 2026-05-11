# AGENTS.md

Guidance for AI coding agents working in this repository.

## Skills

The `skills/` directory contains structured references that agents should load when relevant to the task at hand.

- **`skills/skill-api/SKILL.md`** — context for building or modifying features in `services/app-api/`. Covers the contract/rate data model (two-tier schema, derived status, parent-vs-linked rates), the parse pipeline, submit/unlock/resubmit/withdraw mechanics, and authorization patterns. Read this before touching the API or data layer.

## How to use

When given a task, check the `skills/` directory for a relevant skill and read its `SKILL.md`. The `SKILL.md` will indicate which `references/*.md` files to read for the specific subtask.
