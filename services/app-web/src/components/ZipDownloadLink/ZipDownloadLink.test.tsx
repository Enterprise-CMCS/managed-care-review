import {
    ApolloClient,
    ApolloLink,
    InMemoryCache,
    Observable,
    gql,
} from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { mockContractPackageSubmitted } from '@mc-review/mocks'
import { renderWithProviders } from '../../testHelpers'
import { ZipDownloadLink } from './ZipDownloadLink'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

describe('zip download link', () => {
    const contract = mockContractPackageSubmitted()

    it('renders without errors', () => {
        renderWithProviders(
            <ZipDownloadLink
                type={'CONTRACT'}
                documentZipPackages={
                    contract.packageSubmissions[0].contractRevision
                        .documentZipPackages!
                }
                documentCount={2}
            />
        )

        expect(screen.getByTestId('zipDownloadLink')).toBeInTheDocument()
    })

    it('renders the correct text for contracts', () => {
        renderWithProviders(
            <ZipDownloadLink
                type={'RATE'}
                documentZipPackages={
                    contract.packageSubmissions[0].rateRevisions[0]
                        .documentZipPackages!
                }
                documentCount={2}
            />
        )

        expect(
            screen.getByText('Download rate documents (2 files)')
        ).toBeInTheDocument()
    })

    it('renders the correct text for rates', () => {
        renderWithProviders(
            <ZipDownloadLink
                type={'CONTRACT'}
                documentZipPackages={
                    contract.packageSubmissions[0].contractRevision
                        .documentZipPackages!
                }
                documentCount={2}
            />
        )

        expect(
            screen.getByText('Download contract documents (2 files)')
        ).toBeInTheDocument()
    })

    it('renders singular version of document', () => {
        renderWithProviders(
            <ZipDownloadLink
                type={'CONTRACT'}
                documentZipPackages={
                    contract.packageSubmissions[0].contractRevision
                        .documentZipPackages!
                }
                documentCount={1}
            />
        )

        //'files' here should be singular not plural
        expect(
            screen.getByText('Download contract documents (1 file)')
        ).toBeInTheDocument()
    })
})

it('renews expired ZIP links only via the authorized parent query, without an S3 provider', async () => {
    const expired =
        'https://example.com/zip?X-Amz-Date=20200101T000000Z&X-Amz-Expires=900&X-Amz-Signature=secret'
    const zipPackage = {
        id: 'zip-id',
        createdAt: new Date(),
        s3URL: 's3://bucket/zips/contracts/zip-id',
        sha256: 'hash',
        s3Key: 'zips/contracts/zip-id',
        downloadUrl: expired,
        documentType: 'CONTRACT_DOCUMENTS' as const,
    }
    const request = vi.fn()
    const client = new ApolloClient({
        cache: new InMemoryCache(),
        link: new ApolloLink(
            () =>
                new Observable((observer) => {
                    request()
                    observer.next({
                        data: {
                            parent: {
                                documentZipPackages: [
                                    {
                                        ...zipPackage,
                                        downloadUrl:
                                            'https://example.com/fresh-zip',
                                    },
                                ],
                            },
                        },
                    })
                    observer.complete()
                })
        ),
    })
    const query = gql`
        query AuthorizedParent {
            parent {
                documentZipPackages {
                    id
                    s3Key
                    downloadUrl
                    documentType
                }
            }
        }
    `
    client.writeQuery({
        query,
        data: { parent: { documentZipPackages: [zipPackage] } },
    })
    const subscription = client.watchQuery({ query }).subscribe({})
    const replace = vi.fn()
    const open = vi.spyOn(window, 'open').mockReturnValue({
        opener: null,
        location: { replace },
        close: vi.fn(),
    } as unknown as Window)
    render(
        <ApolloProvider client={client}>
            <ZipDownloadLink
                type="CONTRACT"
                documentZipPackages={[zipPackage]}
                documentCount={1}
            />
        </ApolloProvider>
    )
    expect(request).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('link'))
    await waitFor(() =>
        expect(replace).toHaveBeenCalledWith('https://example.com/fresh-zip')
    )
    expect(request).toHaveBeenCalledTimes(1)
    subscription.unsubscribe()
    client.stop()
    open.mockRestore()
})
