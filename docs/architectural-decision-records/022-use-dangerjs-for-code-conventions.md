---
title: Use DangerJS to enforce code conventions
---
## ADR 022 — Use DangerJS to enforce important code conventions

- Status: Decided
- Date: 4/12/2023

## Assumptions & Constraints

There are some important code conventions that go beyond maintainability or standardization concerns but impact the overall risk of a code change. For example, the team had an issue with a bad prisma migration that was difficult to roll back. We saw the need to enforce conventions on the migration files (ensuring migrations are wrapped in a transaction).

The team is interested in ways to enforce code conventions in these types of cases.

## Chosen Decision

Use DangerJS to enforce important code conventions on PRs.

## Considered Options
​
### Document important code conventions in a design doc
​
- `+` No code change
- `+` Avoid hindering developer workflow
- `-` No automation to ensure developers remember and implement the convention
- `-` Docs could fall out of sync

### Use precommit and linting tools

- `+` Follows existing pattern in the app (`lint-staged`)
- `±` Fast automation win
- `-` Individual developers can ignore the lint warnings or override them
- `-` Can slows developer workflow on commit, could triggers errors when not relevant (work is still in progress)

### Use DangerJS

- `+` Surface code convention issues in code review in a way that is high visibility on team
-  `+`  Github PRs are a good place for devs to discuss issues
- `+` If used sparingly, gives a targeted way to highlight important changes
- `±` Blocks merge of work close to the source
- `-` Third party tool with its own conventions, more effort to implement and adds to tooling in application
- `-` Makes PRs more noisy
