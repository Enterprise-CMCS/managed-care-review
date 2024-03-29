import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { SingleRateSummarySection } from './SingleRateSummarySection'
import {
    fetchCurrentUserMock,
    mockValidCMSUser,
    mockValidStateUser,
    rateDataMock,
} from '../../../testHelpers/apolloMocks'
import { screen, waitFor, within } from '@testing-library/react'
import { packageName } from '../../../common-code/healthPlanFormDataType'
import { RateRevision } from '../../../gen/gqlClient'

describe('SingleRateSummarySection', () => {
    it('can render rate details without errors', async () => {
        const rateData = rateDataMock()
        await waitFor(() => {
            renderWithProviders(
                <SingleRateSummarySection
                    rate={rateData}
                    isSubmitted={true}
                    statePrograms={rateData.state.programs}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                                user: mockValidCMSUser(),
                            }),
                        ],
                    },
                    featureFlags: { 'rate-edit-unlock': true },
                }
            )
        })
        // Wait for all the documents to be in the table
        await screen.findByText(
            rateData.revisions[0].formData.rateDocuments[0].name
        )
        await screen.findByRole('link', {
            name: 'Download all rate documents',
        })

        const rateName = rateData.revisions[0].formData
            .rateCertificationName as string

        expect(screen.getByText(rateName)).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Programs this rate certification covers',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Rate certification type' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Rating period of original rate certification',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Date certified for rate amendment',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Rate amendment effective dates',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Rate submission date',
            })
        ).toHaveTextContent('10/16/2023')
        expect(
            screen.getByRole('definition', { name: 'Certifying actuary' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Does the actuary certify capitation rates specific to each rate cell or a rate range?',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Submission this rate was submitted with',
            })
        ).toBeInTheDocument()

        expect(
            screen.getByRole('heading', { name: 'Rate documents' })
        ).toBeInTheDocument()
    })
    it('renders documents with linked submissions correctly', async () => {
        const rateData = rateDataMock()
        const parentContractRev = rateData.revisions[0].contractRevisions[0]
        const rateDoc = rateData.revisions[0].formData.rateDocuments[0]
        const supportingDoc =
            rateData.revisions[0].formData.supportingDocuments[0]
        const linkedSubmissionOne =
            rateData.revisions[0].formData.packagesWithSharedRateCerts[0]
        const linkedSubmissionTwo =
            rateData.revisions[0].formData.packagesWithSharedRateCerts[1]

        const contractPackageName = packageName(
            parentContractRev.contract.stateCode,
            parentContractRev.contract.stateNumber,
            parentContractRev.formData.programIDs,
            rateData.state.programs
        )

        await waitFor(() => {
            renderWithProviders(
                <SingleRateSummarySection
                    rate={rateData}
                    isSubmitted={true}
                    statePrograms={rateData.state.programs}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                                user: mockValidCMSUser(),
                            }),
                        ],
                    },
                    featureFlags: { 'rate-edit-unlock': true },
                }
            )
        })

        expect(
            screen.getByRole('heading', { name: 'Rate documents' })
        ).toBeInTheDocument()

        const rateDocsTable = screen.getByRole('table', {
            name: /Rate certification/,
        })
        const supportingDocsTable = screen.getByRole('table', {
            name: /Rate supporting documents/,
        })

        // Wait for all the documents to be in the table
        await screen.findByText(rateDoc.name)
        await screen.findByRole('link', {
            name: 'Download all rate documents',
        })

        const parentContractSubmission = screen.getByRole('definition', {
            name: 'Submission this rate was submitted with',
        })

        // Expect submissions this rate was submitted with link to exists
        expect(parentContractSubmission).toBeInTheDocument()
        expect(
            within(parentContractSubmission).getByRole('link', {
                name: contractPackageName,
            })
        ).toBeInTheDocument()
        expect(
            within(parentContractSubmission).getByRole('link', {
                name: contractPackageName,
            })
        ).toHaveAttribute(
            'href',
            `/submissions/${parentContractRev.contract.id}`
        )

        // Expect rate certification document and linked submissions
        expect(
            within(rateDocsTable).getByText(rateDoc.name)
        ).toBeInTheDocument()
        expect(
            within(within(rateDocsTable).getByTestId('tag')).getByText('SHARED')
        ).toBeInTheDocument()
        expect(
            within(rateDocsTable).getByText(
                `${linkedSubmissionOne.packageName} (Draft)`
            )
        ).toBeInTheDocument()
        expect(
            within(rateDocsTable).getByText(
                `${linkedSubmissionTwo.packageName}`
            )
        ).toBeInTheDocument()

        // Expect supporting document and linked submissions
        expect(
            within(supportingDocsTable).getByText(supportingDoc.name)
        ).toBeInTheDocument()
        expect(
            within(within(supportingDocsTable).getByTestId('tag')).getByText(
                'SHARED'
            )
        ).toBeInTheDocument()
        expect(
            within(supportingDocsTable).getByText(
                `${linkedSubmissionOne.packageName} (Draft)`
            )
        ).toBeInTheDocument()
        expect(
            within(supportingDocsTable).getByText(
                `${linkedSubmissionTwo.packageName}`
            )
        ).toBeInTheDocument()
    })

    it('should not display missing field text to CMS users', async () => {
        const rateData = rateDataMock({
            rateType: undefined,
            rateDateCertified: undefined,
        } as unknown as Partial<RateRevision>)
        renderWithProviders(
            <SingleRateSummarySection
                rate={rateData}
                isSubmitted={false}
                statePrograms={rateData.state.programs}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidCMSUser(),
                        }),
                    ],
                },
                featureFlags: { 'rate-edit-unlock': true },
            }
        )

        // Wait for all the documents to be in the table
        await screen.findByText(
            rateData.revisions[0].formData.rateDocuments[0].name
        )
        await screen.findByRole('link', {
            name: 'Download all rate documents',
        })

        expect(
            screen.queryByText(/You must provide this information/)
        ).toBeNull()
    })

    it('should display missing field text to state users', async () => {
        const rateData = rateDataMock(
            {
                rateType: undefined,
                rateDateCertified: undefined,
            } as unknown as Partial<RateRevision>,
            { status: 'UNLOCKED' }
        )
        renderWithProviders(
            <SingleRateSummarySection
                rate={rateData}
                isSubmitted={false}
                statePrograms={rateData.state.programs}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidStateUser(),
                        }),
                    ],
                },
                featureFlags: { 'rate-edit-unlock': true },
            }
        )

        // Wait for all the documents to be in the table
        await screen.findByText(
            rateData.revisions[0].formData.rateDocuments[0].name
        )
        await screen.findByRole('link', {
            name: 'Download all rate documents',
        })

        expect(
            await screen.findAllByText(/You must provide this information/)
        ).toHaveLength(2)
    })

    describe('Unlock rate', () => {
        it('renders the unlock button to CMS users', async () => {
            const rateData = rateDataMock(
                {
                    rateType: undefined,
                    rateDateCertified: undefined,
                } as unknown as Partial<RateRevision>,
                { status: 'UNLOCKED' }
            )
            renderWithProviders(
                <SingleRateSummarySection
                    rate={rateData}
                    isSubmitted={false}
                    statePrograms={rateData.state.programs}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                                user: mockValidCMSUser(),
                            }),
                        ],
                    },
                    featureFlags: { 'rate-edit-unlock': true },
                }
            )
            expect(
                await screen.findByRole('button', {
                    name: 'Unlock rate',
                })
            ).toBeInTheDocument()
        })

        it('disables the unlock button for CMS users when rate already unlocked', async () => {
            const rateData = rateDataMock(
                {
                    rateType: undefined,
                    rateDateCertified: undefined,
                } as unknown as Partial<RateRevision>,
                { status: 'UNLOCKED' }
            )
            renderWithProviders(
                <SingleRateSummarySection
                    rate={rateData}
                    isSubmitted={false}
                    statePrograms={rateData.state.programs}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                                user: mockValidCMSUser(),
                            }),
                        ],
                    },
                    featureFlags: { 'rate-edit-unlock': true },
                }
            )
            await waitFor(() => {
                expect(
                    screen.getByRole('button', {
                        name: 'Unlock rate',
                    })
                ).toHaveAttribute('aria-disabled', 'true')
            })
        })

        it('does not render the unlock button to state users', async () => {
            const rateData = rateDataMock(
                {
                    rateType: undefined,
                    rateDateCertified: undefined,
                } as unknown as Partial<RateRevision>,
                { status: 'UNLOCKED' }
            )
            renderWithProviders(
                <SingleRateSummarySection
                    rate={rateData}
                    isSubmitted={false}
                    statePrograms={rateData.state.programs}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                                user: mockValidStateUser(),
                            }),
                        ],
                    },
                    featureFlags: { 'rate-edit-unlock': true },
                }
            )
            expect(
                await screen.queryByRole('button', {
                    name: 'Unlock rate',
                })
            ).toBeNull()
        })
    })
})
