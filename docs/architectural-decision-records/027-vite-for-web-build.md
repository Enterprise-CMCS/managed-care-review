---
title: Use Vite for web builds and bundling
---
## ADR 027 — Use Vite for web builds and bundling

- Status: Decided
- Date: 07/05/2024

## Decision Drivers
- ease of migration from Create React App
- follow patterns of other applications in MACPRO

## Constraints

This is just a decision about what we use in app-web for build and bundling. Handling of JS assets in other services will not be covered
​

## Considered Options

### Option 1

Stay with Create React App. https://create-react-app.dev/

### Option 2

Move to Vite. https://vitejs.dev/

### Option 3

Move to Next.js. https://nextjs.org/

## Chosen Solution

Describe what the decision is and some high level information about why it was chosen without rehashing all pros/cons.

### Pros and Cons of the Alternatives
​
#### Stay with Create React App
​
- `+` No change short term
- `-` CRA is not meant to support the customization required in a mature production application. Use of this tool has already  blocked our USWDS upgrade as well as our cross-service imports work. We have looked into options like 1. ejecting and 2. using craco  to access the webpack configuration, but we have always found these solutions to be incorrect.
- `-` CRA has spotty maintenance and mixed messages around the future of the tool (specific plans are [still in flux](https://github.com/reactjs/react.dev/pull/5487#issuecomment-1409720741)). We have also noticed  [React docs no longer recommend the use of CRA](https://react.dev/learn/start-a-new-react-project). It is very likely that MC-Review and all other CMS quickstart tools will need to migrate off.


#### Vite

- `+` Another MACPRO team (MDCT) has already implemented (switching off CRA to Vite). We can follow patterns already documented in CMS.
- `+` Lightweight solution. Similar use case and intent as  create react app - Vite builds and bundles react code, the developer picks their tooling for everything else.
- `-` Will likely have to switch over jest tests to vitest

#### Next.js

- `+` There is a CRA to Next migration tool available
- `-` / `+` Next is a fully fledged web framework, not just a build tool. This means it is opinionated on how files are organized in the codebase and how things like routing, authentication, and interaction with third-party APis are set up.
- `-`  Actual code change to follow Next pattern would be a larger lift than the other two options. We would have to move several file folders around and entirely re-implement routing and links within the application.
