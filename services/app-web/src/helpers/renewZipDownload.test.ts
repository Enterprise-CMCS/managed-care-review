import {
    ApolloClient,
    ApolloLink,
    InMemoryCache,
    Observable,
    gql,
} from '@apollo/client'
import { renewZipDownload } from './renewZipDownload'

const query = gql`
    query Package($id: ID!) {
        package(id: $id) {
            id
            downloadUrl
            s3Key
        }
    }
`

describe('renewZipDownload', () => {
    it('refetches only the active authorized query containing the matching package id', async () => {
        const requests: string[] = []
        const client = new ApolloClient({
            cache: new InMemoryCache(),
            link: new ApolloLink(
                (operation) =>
                    new Observable((observer) => {
                        const id = operation.variables.id as string
                        requests.push(id)
                        observer.next({
                            data: {
                                package: {
                                    id,
                                    s3Key: `zips/${id}`,
                                    downloadUrl: `https://example.com/${id}/${requests.length}`,
                                },
                            },
                        })
                        observer.complete()
                    })
            ),
        })
        const matching = client.watchQuery({
            query,
            variables: { id: 'matching' },
        })
        const unrelated = client.watchQuery({
            query,
            variables: { id: 'unrelated' },
        })
        const subscriptions = [matching.subscribe({}), unrelated.subscribe({})]
        await Promise.all([matching.refetch(), unrelated.refetch()])
        requests.length = 0
        const url = await renewZipDownload(client, 'matching')
        expect(requests).toEqual(['matching'])
        expect(url).toBe('https://example.com/matching/1')
        requests.length = 0
        await expect(renewZipDownload(client, 'absent')).rejects.toThrow(
            'Download unavailable'
        )
        expect(requests).toEqual([])
        subscriptions.forEach((subscription) => subscription.unsubscribe())
        client.stop()
    })
})

it('propagates authorization/refetch failures without signing or reconstructing a ZIP URL', async () => {
    const request = vi.fn()
    const client = new ApolloClient({
        cache: new InMemoryCache(),
        link: new ApolloLink(
            () =>
                new Observable((observer) => {
                    request()
                    observer.error(new Error('Not authorized'))
                })
        ),
    })
    client.writeQuery({
        query,
        variables: { id: 'zip' },
        data: {
            package: {
                id: 'zip',
                s3Key: 'zips/zip',
                downloadUrl: 'https://example.com/stale',
            },
        },
    })
    const subscription = client
        .watchQuery({ query, variables: { id: 'zip' } })
        .subscribe({})
    await expect(renewZipDownload(client, 'zip')).rejects.toThrow(
        'Not authorized'
    )
    expect(request).toHaveBeenCalledTimes(1)
    subscription.unsubscribe()
    client.stop()
})
