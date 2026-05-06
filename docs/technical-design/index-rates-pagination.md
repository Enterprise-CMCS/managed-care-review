# indexRatesPaginated pagination

`indexRatesPaginated` returns submitted rates using GraphQL cursor pagination. This differs from common REST pagination patterns because clients do not request page numbers or offsets. Instead, each response includes a cursor for the last record in the page. To fetch the next page, pass that cursor back as `after`.

Use `indexRatesPaginated` when a client needs the full submitted rate data but should not load the complete result set in a single response. The existing `indexRates` query remains available for non-paginated results.

## How pagination works

`indexRatesPaginated` accepts `IndexRatesPaginatedInput`.

- `pageSize`: optional number of rates per page to return. Defaults to 10 when omitted. Maximum is 150.
- `after`: optional opaque cursor from `pageInfo.endCursor`. Omit this for the first page.
- `stateCode`: optional state filter for CMS and admin users. State users are always limited to their own state.
- `rateIDs`: optional list of rate IDs to limit the result set.

The response uses a connection shape:

- `totalCount`: total number of matching submitted rates.
- `totalPages`: total number of pages based on `totalCount` and the requested `pageSize`.
- `edges`: list of rates. Each edge contains a `cursor` and a `node`.
- `pageInfo.hasNextPage`: `true` when there is another page available.
- `pageInfo.endCursor`: cursor to pass as `after` for the next page.

Cursors should be treated as black-box values. Clients should not decode, interpret, or construct them. When filters change, omit `after` and start again from the first page.

## Query

```graphql
query IndexRatesPaginated($input: IndexRatesPaginatedInput) {
    indexRatesPaginated(input: $input) {
        totalCount
        totalPages
        edges {
            cursor
            node {
                id
                stateCode
                consolidatedStatus
            }
        }
        pageInfo {
            hasNextPage
            endCursor
        }
    }
}
```

## Fetch the default first page

Calling the query with no input returns the first 10 matching rates.

```json
{}
```

You can also pass an empty input object.

```json
{
    "input": {}
}
```

## Fetch a larger first page

This fetches the first 50 rates instead of the default 10.

```json
{
    "input": {
        "pageSize": 50
    }
}
```

## Fetch the next page

Use the previous response's `pageInfo.endCursor` as `after` only when `pageInfo.hasNextPage` is `true`.

```json
{
    "input": {
        "pageSize": 50,
        "after": "string-end-cursor"
    }
}
```

Use the same filters when requesting the next page. Changing filters while reusing an old cursor can produce an invalid cursor error or skip records. Keeping `pageSize` consistent also keeps `totalPages` and UI expectations stable.

## Fetch with filters

CMS and admin users can filter by state and rate IDs. State users are scoped to their own state even when `stateCode` is provided.

First request:

```json
{
    "input": {
        "pageSize": 1,
        "rateIDs": ["7af9410d-9f9a-4bb7-a23f-2bf53b224be7", "35325f91-7f9a-4bf6-9d45-5d72575e8d37"],
        "stateCode": "MN"
    }
}
```

Next request:

```json
{
    "input": {
        "pageSize": 1,
        "rateIDs": ["7af9410d-9f9a-4bb7-a23f-2bf53b224be7", "35325f91-7f9a-4bf6-9d45-5d72575e8d37"],
        "stateCode": "MN",
        "after": "string-end-cursor"
    }
}
```

## Client loop example

This example shows the usual client pattern: request a page, process the returned `edges`, then continue while `hasNextPage` is true. The exact client type depends on the caller; the example assumes a client that can execute the generated `IndexRatesPaginatedDocument`.

```typescript
type IndexRatesPaginatedVariables = {
    input?: {
        pageSize?: number
        after?: string | null
        stateCode?: string
        rateIDs?: string[]
    }
}

type Rate = {
    id: string
}

type IndexRatesPaginatedResponse = {
    indexRatesPaginated: {
        edges: Array<{ node: Rate }>
        pageInfo: {
            hasNextPage: boolean
            endCursor: string | null
        }
    }
}

async function fetchAllSubmittedRates(graphqlClient: GraphQLClient) {
    const rates: Rate[] = []
    let after: string | null = null
    let hasNextPage = true

    while (hasNextPage) {
        const variables: IndexRatesPaginatedVariables = {
            input: {
                pageSize: 50,
                after,
            },
        }

        const response = await graphqlClient.request<IndexRatesPaginatedResponse>(
            IndexRatesPaginatedDocument,
            variables
        )

        rates.push(
            ...response.indexRatesPaginated.edges.map((edge) => edge.node)
        )

        hasNextPage = response.indexRatesPaginated.pageInfo.hasNextPage
        after = response.indexRatesPaginated.pageInfo.endCursor
    }

    return rates
}
```

## Error cases

- `pageSize` must be between 1 and 150.
- `after` must be a valid cursor returned from `indexRatesPaginated`.
- `after` must match a rate in the current result set, including the current filters.
