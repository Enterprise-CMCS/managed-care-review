---
title: Calculating contract and Rate Change History
---

## Contract and Rates Types and Naming Conventions

## Overview

Data types and naming conventions will be discussed by the area of the code where it is used.

## `app-api`

### Prisma types

Uses suffix `Type`. Imported directly from `@prisma/client`

### New Domain models (guaranteed by Zod)

Uses suffix `Type`. Imported from `services/app-api/src/domain-models/contractAndRates/*types.ts`

### OG Domain models (not attached to specific validator, free floating types)
Uses suffix `Type`. Imported from `services/app-api/src/domain-models/contractAndRates` root
`DomainType

## Internal types
use prefix `_` to clarify that these types should not be exported or used beyond the scope of the file
e.g. `_ContractRevisionType`

### Data parse functions (take prisma type and return domain type, parsed by Zod)

