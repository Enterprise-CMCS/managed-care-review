---
title: Use pnpm as package manager
---
## ADR 0030 — Use pnpm as package manager

- Status: Decided
- Date: July 2024 (documented retroactively)

## Decision Drivers

-  Move off Yarn 1 which was EOL and lacked the cacheing improvements in later versions. We were saying multiple minute build times in CI.
-  Speedup build times in CI. Team pinpointed that the `yarn build` steps were part of the performance bottleneck.

## Considered Options

### 1 Stay with `yarn` and upgrade major version

Stay with [yarn](https://yarnpkg.com/) as our package manager

### 2 Move to `pnpm`

Move to pnpm as our package manager.

## Chosen Solution

Move to [pnpm](https://pnpm.io/). As part of this switch we removed both `yarn` and `lerna` as dependencies in our build tooling. We saw pnpm provided everything we needed to support existing workflows and

### Pros and Cons of the Alternatives
​
#### Stay with yarn and upgrade to Yarn 3
​
- `+` Keep our local and deploy build commands on the same tool
- `-` Still need to re-implement and retest deploys since major version bump

#### Move to pnpm

- `+` Faster build times by service and in deploy scripts
- `+` Allows us to also replace `lerna` and remove and additional dependency. The he package management tools and commands are robust enough to replace what the previous tool had provided
- `-` Dev team learns to use new comman



