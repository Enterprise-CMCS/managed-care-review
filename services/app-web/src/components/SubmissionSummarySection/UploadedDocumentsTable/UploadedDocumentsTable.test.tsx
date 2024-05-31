import { screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { UploadedDocumentsTable } from './UploadedDocumentsTable'
import {
    fetchCurrentUserMock,
    mockValidCMSUser,
    mockValidStateUser,
} from '../../../testHelpers/apolloMocks'
import type { GenericDocument } from '../../../gen/gqlClient'

describe('UploadedDocumentsTable', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })
    it('renders documents without errors', async () => {
        const testDocuments = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                sha256: 'fakesha',
                dateAdded: new Date(),
            },
        ]
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                caption="Contract"
                documentCategory="Contract"
                previousSubmissionDate={new Date('01/01/01')}
                hideDynamicFeedback={true}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        await waitFor(() => {
            expect(
                screen.getByRole('table', {
                    name: 'Contract',
                })
            ).toBeInTheDocument()

            expect(screen.getAllByRole('row').length - 1).toEqual(
                testDocuments.length
            )
            expect(
                screen.queryByText(
                    'Only one document is allowed for a rate certification. You must remove documents before continuing'
                )
            ).not.toBeInTheDocument()
        })
    })

    it('renders supporting contract documents when they exist', async () => {
        const testDocuments = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                sha256: 'fakesha',
                dateAdded: new Date(),
            },
            {
                s3URL: 's3://foo/bar/test-3',
                name: 'supporting docs test 3',
                sha256: 'fakesha',
                dateAdded: new Date(),
            },
        ]

        renderWithProviders(
            <UploadedDocumentsTable
                previousSubmissionDate={null}
                documents={testDocuments}
                caption="Contract supporting"
                documentCategory="Contract-supporting"
                isSupportingDocuments
                hideDynamicFeedback={true}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('table', {
                    name: /Contract supporting/,
                })
            ).toBeInTheDocument()

            expect(screen.getAllByRole('row').length - 1).toEqual(
                testDocuments.length
            )
        })
    })

    it('renders date added as expected for CMS user viewing submission', async () => {
        const testDocuments: GenericDocument[] = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                sha256: 'fakesha',
                dateAdded: new Date('03/25/2022'),
            },
            {
                s3URL: 's3://foo/bar/test-2',
                name: 'supporting docs test 2',
                sha256: 'fakesha1',
                dateAdded: new Date('03/26/2022'),
            },
            {
                s3URL: 's3://foo/bar/test-3',
                name: 'supporting docs test 3',
                sha256: 'fakesha2',
                dateAdded: new Date('03/27/2022'),
            },
        ]
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                caption="Contract supporting"
                documentCategory="Contract-supporting"
                isSupportingDocuments
                previousSubmissionDate={new Date('03/26/2022')}
                hideDynamicFeedback={true}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )
        await waitFor(() => {
            const rows = screen.getAllByRole('row')
            expect(rows).toHaveLength(4)
            expect(rows[0]).toHaveTextContent('Date added')
            expect(rows[1]).toHaveTextContent('3/25/22')
            expect(rows[2]).toHaveTextContent('3/26/22')
            expect(rows[3]).toHaveTextContent('3/27/22')
        })
    })

    it('renders date added for State user viewing submission', async () => {
        const testDocuments: GenericDocument[] = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                sha256: 'fakesha',
                dateAdded: new Date('03/25/2022'),
            },
            {
                s3URL: 's3://foo/bar/test-2',
                name: 'supporting docs test 2',
                sha256: 'fakesha1',
                dateAdded: new Date('03/26/2022'),
            },
            {
                s3URL: 's3://foo/bar/test-3',
                name: 'supporting docs test 3',
                sha256: 'fakesha2',
                dateAdded: new Date('03/27/2022'),
            },
        ]
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                previousSubmissionDate={new Date('03/26/2022')}
                caption="Contract supporting"
                documentCategory="Contract-supporting"
                isSupportingDocuments
                hideDynamicFeedback={true}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )
        await waitFor(() => {
            const rows = screen.getAllByRole('row')
            expect(rows).toHaveLength(4)
            expect(rows[0]).toHaveTextContent('Date added')
            expect(rows[1]).toHaveTextContent('3/25/22')
            expect(rows[2]).toHaveTextContent('3/26/22')
            expect(rows[3]).toHaveTextContent('3/27/22')
        })
    })

    it('does not render a date added when supplied a new draft submissions)', async () => {
        const testDocuments: GenericDocument[] = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                sha256: 'fakesha',
                dateAdded: new Date(),
            },
            {
                s3URL: 's3://foo/bar/test-2',
                name: 'supporting docs test 2',
                sha256: 'fakesha1',
                dateAdded: new Date(),
            },
            {
                s3URL: 's3://foo/bar/test-3',
                name: 'supporting docs test 3',
                sha256: 'fakesha2',
                dateAdded: new Date(),
            },
        ]

        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                previousSubmissionDate={null}
                caption="Contract supporting"
                documentCategory="Contract-supporting"
                isSupportingDocuments
                hideDynamicFeedback={true}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )
        await waitFor(() => {
            expect(screen.getByRole('table')).toBeInTheDocument()
            // we have a table with rows for each document
            const rows = screen.getAllByRole('row')
            rows.shift() // get ride of column header row
            expect(rows).toHaveLength(testDocuments.length)

            // There is a screenreader only "N/A" for each row
            rows.forEach((row) => {
                expect(within(row).getByText('N/A')).toBeInTheDocument()
                expect(within(row).getByText('N/A')).toHaveAttribute(
                    'class',
                    'srOnly'
                )
            })
        })
    })
    it('renders the NEW tag when a document is submitted after the last submission', async () => {
        const testDocuments: GenericDocument[] = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                sha256: 'fakesha',
                dateAdded: new Date('03/25/2022'),
            },
            {
                s3URL: 's3://foo/bar/test-2',
                name: 'supporting docs test 2',
                sha256: 'fakesha1',
                dateAdded: new Date('03/26/2022'),
            },
            {
                s3URL: 's3://foo/bar/test-3',
                name: 'supporting docs test 3',
                sha256: 'fakesha2',
                dateAdded: new Date('03/27/2022'),
            },
        ]
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                previousSubmissionDate={new Date('03/26/2022')}
                caption="Contract supporting"
                documentCategory="Contract-supporting"
                isSupportingDocuments
                hideDynamicFeedback={true}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )
        await waitFor(() => {
            expect(screen.getByTestId('tag')).toHaveTextContent('NEW')
        })
    })

    it('renders error when multiple documents supplied when not allowed (to address historical submissions before doc limit constraints)', async () => {
        const testDocuments = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                sha256: 'fakeSha1',
                dateAdded: new Date('03/25/2022'),
            },
            {
                s3URL: 's3://foo/bar/test-2',
                name: 'supporting docs test 2',
                sha256: 'fakeSha2',
                dateAdded: new Date('03/25/2022'),
            },
        ]

        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                previousSubmissionDate={new Date('01/01/01')}
                caption="Contract"
                documentCategory="Contract"
                multipleDocumentsAllowed={false}
                hideDynamicFeedback={false}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        await waitFor(() => {
            expect(screen.getAllByRole('row').length - 1).toEqual(
                testDocuments.length
            )
            expect(
                screen.getByText(
                    /Only one document is allowed for a rate certification. You must remove documents before continuing/
                )
            ).toBeInTheDocument()
        })
    })

    it('does not show the NEW tag to state user', async () => {
        const testDocuments = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                sha256: 'fakesha',
                dateAdded: new Date('03/25/2022'),
            },
            {
                s3URL: 's3://foo/bar/test-2',
                name: 'supporting docs test 2',
                sha256: 'fakesha1',
                dateAdded: new Date('03/25/2022'),
            },
            {
                s3URL: 's3://foo/bar/test-3',
                name: 'supporting docs test 3',
                sha256: 'fakesha2',
                dateAdded: new Date('03/27/2022'),
            },
        ]
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                previousSubmissionDate={new Date('03/27/2022')}
                caption="Contract supporting"
                documentCategory="Contract-supporting"
                isSupportingDocuments
                hideDynamicFeedback={true}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        await waitFor(() => {
            const rows = screen.getAllByRole('row')
            expect(rows).toHaveLength(4)
            expect(screen.queryByTestId('tag')).not.toBeInTheDocument()
        })
    })

    it('renders SHARED tag to CMS users when packages across submissions present', async () => {
        const packagesWithSharedRateCerts = [
            {
                packageId: '333b4225-5b49-4e82-aa71-be0d33d7418d',
                packageName: 'MCR-MN-0001-SNBC',
            },
            {
                packageId: '21467dba-6ae8-11ed-a1eb-0242ac120002',
                packageName: 'MCR-MN-0002-PMAP',
            },
        ]
        const testDocuments = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                sha256: 'fakesha',
                dateAdded: new Date('01/01/00'),
            },
        ]
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                caption="Rate"
                documentCategory="Rate certification"
                packagesWithSharedRateCerts={packagesWithSharedRateCerts}
                previousSubmissionDate={new Date('01/01/01')}
                hideDynamicFeedback={true}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                    ],
                },
                featureFlags: {},
            }
        )

        expect(await screen.findByTestId('tag')).toHaveTextContent('SHARED')
    })

    it('renders SHARED tag to state users when packages across submissions present', async () => {
        const packagesWithSharedRateCerts = [
            {
                packageId: '333b4225-5b49-4e82-aa71-be0d33d7418d',
                packageName: 'MCR-MN-0001-SNBC',
            },
            {
                packageId: '21467dba-6ae8-11ed-a1eb-0242ac120002',
                packageName: 'MCR-MN-0002-PMAP',
            },
        ]
        const testDocuments = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                sha256: 'fakesha',
                dateAdded: new Date('01/01/00'),
            },
        ]
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                caption="Rate"
                documentCategory="Rate certification"
                packagesWithSharedRateCerts={packagesWithSharedRateCerts}
                previousSubmissionDate={new Date('01/01/01')}
                hideDynamicFeedback={true}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                featureFlags: {},
            }
        )

        expect(await screen.findByTestId('tag')).toHaveTextContent('SHARED')
    })

    it('still renders SHARED tag to CMS user if linked rates flag on', async () => {
        const packagesWithSharedRateCerts = [
            {
                packageId: '333b4225-5b49-4e82-aa71-be0d33d7418d',
                packageName: 'MCR-MN-0001-SNBC',
            },
            {
                packageId: '21467dba-6ae8-11ed-a1eb-0242ac120002',
                packageName: 'MCR-MN-0002-PMAP',
            },
        ]
        const testDocuments = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                sha256: 'fakesha',
                dateAdded: new Date('01/01/00'),
            },
        ]
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                caption="Rate"
                documentCategory="Rate certification"
                packagesWithSharedRateCerts={packagesWithSharedRateCerts}
                previousSubmissionDate={new Date('01/01/01')}
                hideDynamicFeedback={true}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                    ],
                },
                featureFlags: {},
            }
        )

        expect(await screen.findByTestId('tag')).toHaveTextContent('SHARED')
    })

    it('still renders SHARED tag to state user on submission summary when linked rates flag on', async () => {
        const packagesWithSharedRateCerts = [
            {
                packageId: '333b4225-5b49-4e82-aa71-be0d33d7418d',
                packageName: 'MCR-MN-0001-SNBC',
            },
            {
                packageId: '21467dba-6ae8-11ed-a1eb-0242ac120002',
                packageName: 'MCR-MN-0002-PMAP',
            },
        ]
        const testDocuments = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                sha256: 'fakesha',
                dateAdded: new Date('01/01/00'),
            },
        ]
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                caption="Rate"
                documentCategory="Rate certification"
                packagesWithSharedRateCerts={packagesWithSharedRateCerts}
                previousSubmissionDate={new Date('01/01/01')}
                hideDynamicFeedback={false}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                    ],
                },
                featureFlags: {},
            }
        )

        expect(await screen.findByTestId('tag')).toHaveTextContent('SHARED')
        expect(
            await screen.findByText('Linked submissions')
        ).toBeInTheDocument()
    })

    it('does not render SHARED tag to state user on review submit when linked rates flag on', async () => {
        const packagesWithSharedRateCerts = [
            {
                packageId: '333b4225-5b49-4e82-aa71-be0d33d7418d',
                packageName: 'MCR-MN-0001-SNBC',
            },
            {
                packageId: '21467dba-6ae8-11ed-a1eb-0242ac120002',
                packageName: 'MCR-MN-0002-PMAP',
            },
        ]
        const testDocuments = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                sha256: 'fakesha',
                dateAdded: new Date('01/01/00'),
            },
        ]
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                caption="Rate"
                documentCategory="Rate certification"
                packagesWithSharedRateCerts={packagesWithSharedRateCerts}
                previousSubmissionDate={new Date('01/01/01')}
                hideDynamicFeedback={true}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                    ],
                },
                featureFlags: {},
            }
        )

        expect(await screen.findByTestId('tag')).not.toBeInTheDocument()
        expect(
            await screen.queryByText('Linked submissions')
        ).not.toBeInTheDocument()
    })

    it('does not validations when hideDynamicFeedback is set to true', async () => {
        const testDocuments = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                sha256: 'fakesha',
                dateAdded: new Date('03/25/2022'),
            },
            {
                s3URL: 's3://foo/bar/test-2',
                name: 'supporting docs test 2',
                sha256: 'fakesha1',
                dateAdded: new Date('03/25/2022'),
            },
            {
                s3URL: 's3://foo/bar/test-3',
                name: 'supporting docs test 3',
                sha256: 'fakesha2',
                dateAdded: new Date('03/27/2022'),
            },
        ]
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                previousSubmissionDate={new Date('03/27/2022')}
                caption="Contract"
                documentCategory="Contract-supporting"
                multipleDocumentsAllowed={false}
                hideDynamicFeedback={true}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        await waitFor(() => {
            expect(
                screen.queryByText(/Only one document is allowed/)
            ).not.toBeInTheDocument()
        })
    })
    it('renders document validations if hideDynamicFeedback is false and too many documents uploaded', async () => {
        const testDocuments = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                sha256: 'fakesha',
                dateAdded: new Date('03/25/2022'),
            },
            {
                s3URL: 's3://foo/bar/test-2',
                name: 'supporting docs test 2',
                sha256: 'fakesha1',
                dateAdded: new Date('03/25/2022'),
            },
            {
                s3URL: 's3://foo/bar/test-3',
                name: 'supporting docs test 3',
                sha256: 'fakesha2',
                dateAdded: new Date('03/27/2022'),
            },
        ]
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                previousSubmissionDate={new Date('03/27/2022')}
                caption="Contract"
                documentCategory="Contract-supporting"
                multipleDocumentsAllowed={false}
                hideDynamicFeedback={false}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        await waitFor(() => {
            expect(
                screen.queryByText(/Only one document is allowed/)
            ).toBeInTheDocument()
        })
    })
})
