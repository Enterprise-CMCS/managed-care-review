import { screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { UploadedDocumentsTable } from './UploadedDocumentsTable'
import {
    fetchCurrentUserMock,
    mockValidCMSUser,
} from '../../../testHelpers/apolloMocks'
import { DocumentDateLookupTableType } from '../../../documentHelpers/makeDocumentDateLookupTable'
import { SubmissionDocument } from '../../../common-code/healthPlanFormDataType'

describe('UploadedDocumentsTable', () => {
    const emptyDocumentsTable = () => {
        return { previousSubmissionDate: '01/01/01' }
    }
    it('renders documents without errors', async () => {
        const testDocuments = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                documentCategories: ['CONTRACT_RELATED' as const],
            },
        ]
        renderWithProviders(
            <UploadedDocumentsTable
                documentDateLookupTable={emptyDocumentsTable()}
                documents={testDocuments}
                caption="Contract"
                documentCategory="Contract"
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
        })
    })

    it('renders supporting contract documents when they exist', async () => {
        const testDocuments = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                documentCategories: ['CONTRACT_RELATED' as const],
            },
            {
                s3URL: 's3://foo/bar/test-3',
                name: 'supporting docs test 3',
                documentCategories: [
                    'CONTRACT_RELATED' as const,
                    'RATES_RELATED' as const,
                ],
            },
        ]

        renderWithProviders(
            <UploadedDocumentsTable
                documentDateLookupTable={emptyDocumentsTable()}
                documents={testDocuments}
                caption="Contract supporting"
                documentCategory="Contract-supporting"
                isSupportingDocuments
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
            expect(
                screen.getByText(
                    /Listed as both a contract and rate supporting document/
                )
            ).toBeInTheDocument()
        })
    })

    it('renders documents that are both contract and rate related', async () => {
        const testDocuments = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                documentCategories: ['CONTRACT_RELATED' as const],
            },
            {
                s3URL: 's3://foo/bar/test-2',
                name: 'supporting docs test 2',
                documentCategories: ['RATES_RELATED' as const],
            },
            {
                s3URL: 's3://foo/bar/test-3',
                name: 'supporting docs test 3',
                documentCategories: [
                    'CONTRACT_RELATED' as const,
                    'RATES_RELATED' as const,
                ],
            },
        ]

        const contractAndRateSupportingDocs = testDocuments.filter(
            (doc) =>
                doc.documentCategories.includes('CONTRACT_RELATED') &&
                doc.documentCategories.includes('RATES_RELATED')
        )
        const haveJustOneCategory = testDocuments.filter(
            (doc) => !contractAndRateSupportingDocs.includes(doc)
        )
        renderWithProviders(
            <UploadedDocumentsTable
                documentDateLookupTable={emptyDocumentsTable()}
                documents={testDocuments}
                caption="Contract supporting"
                documentCategory="Contract-supporting"
                isSupportingDocuments
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        await waitFor(() => {
            // confirm those documents are prefixed with asterisk
            contractAndRateSupportingDocs.forEach((doc) => {
                expect(screen.getByText(`*${doc.name}`)).toBeInTheDocument()
            })
            // and other docs exist but don't have asterisk
            expect(
                screen.getByText(`${haveJustOneCategory[0].name}`)
            ).toBeInTheDocument()
            expect(
                screen.queryByText(`*${haveJustOneCategory[0].name}`)
            ).toBeNull()
        })
    })
    it('renders date added when supplied with a date lookup table and is CMS user viewing submission', async () => {
        const testDocuments: SubmissionDocument[] = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                documentCategories: ['CONTRACT_RELATED' as const],
            },
            {
                s3URL: 's3://foo/bar/test-2',
                name: 'supporting docs test 2',
                documentCategories: ['RATES_RELATED' as const],
            },
            {
                s3URL: 's3://foo/bar/test-3',
                name: 'supporting docs test 3',
                documentCategories: [
                    'CONTRACT_RELATED' as const,
                    'RATES_RELATED' as const,
                ],
            },
        ]
        const dateLookupTable: DocumentDateLookupTableType = {
            's3://foo/bar/test-1':
                'Fri Mar 25 2022 16:13:20 GMT-0500 (Central Daylight Time)',
            's3://foo/bar/test-2':
                'Sat Mar 26 2022 16:13:20 GMT-0500 (Central Daylight Time)',
            's3://foo/bar/test-3':
                'Sun Mar 27 2022 16:13:20 GMT-0500 (Central Daylight Time)',
            previousSubmissionDate:
                'Sun Mar 26 2022 16:13:20 GMT-0500 (Central Daylight Time)',
        }
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                caption="Contract supporting"
                documentCategory="Contract-supporting"
                isSupportingDocuments
                documentDateLookupTable={dateLookupTable}
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

    it('renders date added when supplied with a date lookup table and is State user', async () => {
        const testDocuments: SubmissionDocument[] = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                documentCategories: ['CONTRACT_RELATED' as const],
            },
            {
                s3URL: 's3://foo/bar/test-2',
                name: 'supporting docs test 2',
                documentCategories: ['RATES_RELATED' as const],
            },
            {
                s3URL: 's3://foo/bar/test-3',
                name: 'supporting docs test 3',
                documentCategories: [
                    'CONTRACT_RELATED' as const,
                    'RATES_RELATED' as const,
                ],
            },
        ]
        const dateLookupTable: DocumentDateLookupTableType = {
            's3://foo/bar/test-1':
                'Fri Mar 25 2022 16:13:20 GMT-0500 (Central Daylight Time)',
            's3://foo/bar/test-2':
                'Sat Mar 26 2022 16:13:20 GMT-0500 (Central Daylight Time)',
            's3://foo/bar/test-3':
                'Sun Mar 27 2022 16:13:20 GMT-0500 (Central Daylight Time)',
            previousSubmissionDate:
                'Sun Mar 26 2022 16:13:20 GMT-0500 (Central Daylight Time)',
        }
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                caption="Contract supporting"
                documentCategory="Contract-supporting"
                isSupportingDocuments
                documentDateLookupTable={dateLookupTable}
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

    it('does not render a date added when supplied with empty date lookup table (this happens with new draft submissions)', async () => {
        const testDocuments: SubmissionDocument[] = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                documentCategories: ['CONTRACT_RELATED' as const],
            },
            {
                s3URL: 's3://foo/bar/test-2',
                name: 'supporting docs test 2',
                documentCategories: ['RATES_RELATED' as const],
            },
            {
                s3URL: 's3://foo/bar/test-3',
                name: 'supporting docs test 3',
                documentCategories: [
                    'CONTRACT_RELATED' as const,
                    'RATES_RELATED' as const,
                ],
            },
        ]
        const dateLookupTable: DocumentDateLookupTableType = {
            previousSubmissionDate: null,
        }
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                caption="Contract supporting"
                documentCategory="Contract-supporting"
                isSupportingDocuments
                documentDateLookupTable={dateLookupTable}
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
    it('shows the NEW tag when a document is submitted after the last submission', async () => {
        const testDocuments: SubmissionDocument[] = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                documentCategories: ['CONTRACT_RELATED' as const],
            },
            {
                s3URL: 's3://foo/bar/test-2',
                name: 'supporting docs test 2',
                documentCategories: ['RATES_RELATED' as const],
            },
            {
                s3URL: 's3://foo/bar/test-3',
                name: 'supporting docs test 3',
                documentCategories: [
                    'CONTRACT_RELATED' as const,
                    'RATES_RELATED' as const,
                ],
            },
        ]
        const dateLookupTable: DocumentDateLookupTableType = {
            's3://foo/bar/test-1':
                'Fri Mar 25 2022 16:13:20 GMT-0500 (Central Daylight Time)',
            's3://foo/bar/test-2':
                'Sat Mar 26 2022 16:13:20 GMT-0500 (Central Daylight Time)',
            's3://foo/bar/test-3':
                'Sun Mar 27 2022 16:13:20 GMT-0500 (Central Daylight Time)',
            previousSubmissionDate:
                'Sun Mar 26 2022 16:13:20 GMT-0500 (Central Daylight Time)',
        }
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                caption="Contract supporting"
                documentCategory="Contract-supporting"
                isSupportingDocuments
                documentDateLookupTable={dateLookupTable}
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
    it('does not show the NEW tag if the user is not a CMS user', async () => {
        const testDocuments = [
            {
                s3URL: 's3://foo/bar/test-1',
                name: 'supporting docs test 1',
                documentCategories: ['CONTRACT_RELATED' as const],
            },
            {
                s3URL: 's3://foo/bar/test-2',
                name: 'supporting docs test 2',
                documentCategories: ['RATES_RELATED' as const],
            },
            {
                s3URL: 's3://foo/bar/test-3',
                name: 'supporting docs test 3',
                documentCategories: [
                    'CONTRACT_RELATED' as const,
                    'RATES_RELATED' as const,
                ],
            },
        ]
        const dateLookupTable = {
            'supporting docs test 1':
                'Fri Mar 25 2022 16:13:20 GMT-0500 (Central Daylight Time)',
            'supporting docs test 2':
                'Sat Mar 26 2022 16:13:20 GMT-0500 (Central Daylight Time)',
            'supporting docs test 3':
                'Sun Mar 27 2022 16:13:20 GMT-0500 (Central Daylight Time)',
            previousSubmissionDate:
                'Sun Mar 26 2022 16:13:20 GMT-0500 (Central Daylight Time)',
        }
        renderWithProviders(
            <UploadedDocumentsTable
                documents={testDocuments}
                caption="Contract supporting"
                documentCategory="Contract-supporting"
                isSupportingDocuments
                documentDateLookupTable={dateLookupTable}
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
})
