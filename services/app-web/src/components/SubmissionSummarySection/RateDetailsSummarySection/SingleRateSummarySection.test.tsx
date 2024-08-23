import {
    renderWithProviders,
    userClickByRole,
} from '../../../testHelpers/jestHelpers'
import { SingleRateSummarySection } from './SingleRateSummarySection'
import {
    fetchCurrentUserMock,
    mockEmptyDraftContractAndRate,
    mockValidCMSUser,
    mockValidHelpDeskUser,
    mockValidStateUser,
} from '../../../testHelpers/apolloMocks'
import { screen, waitFor, within } from '@testing-library/react'
import { type Location, Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '../../../constants'
import {
    rateUnlockedWithHistoryMock,
    rateWithHistoryMock,
} from '../../../testHelpers/apolloMocks/rateDataMock'

describe('SingleRateSummarySection', () => {
    it('can render rate details without errors', async () => {
        const rateData = rateWithHistoryMock()
        rateData.revisions[0].formData.deprecatedRateProgramIDs = ['123']
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
                featureFlags: {
                    'rate-edit-unlock': true,
                },
            }
        )
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
                name: 'Rates this rate certification covers',
            })
        ).toBeInTheDocument()
        // this is a deprecated field but should still show if present on summary page
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
            screen.getAllByRole('definition', { name: 'Certifying actuary' })
        ).toHaveLength(2)
        expect(
            screen.getByRole('definition', {
                name: 'Does the actuary certify capitation rates specific to each rate cell or a rate range?',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Contract actions',
            })
        ).toBeInTheDocument()

        expect(
            screen.getByRole('heading', { name: 'Rate documents' })
        ).toBeInTheDocument()
    })
    // can delete the next test when linked rates flag is permanently on
    it('renders documents with linked submissions correctly for CMS users (legacy feature)', async () => {
        const rateData = rateWithHistoryMock()
        const lastSubmission = rateData.packageSubmissions?.[0]
        if (!lastSubmission) {
            throw new Error('no sub')
        }

        const parentContractRev = lastSubmission.contractRevisions[0]
        const rateDoc = rateData.revisions[0].formData.rateDocuments[0]
        const supportingDoc =
            rateData.revisions[0].formData.supportingDocuments[0]
        const linkedSubmissionOne =
            rateData.revisions[0].formData.packagesWithSharedRateCerts[0]
        const linkedSubmissionTwo =
            rateData.revisions[0].formData.packagesWithSharedRateCerts[1]

        const contractPackageName = parentContractRev.contractName

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
            name: 'Contract actions',
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
            `/submissions/${parentContractRev.contractID}`
        )

        // Expect rate certification document and linked submissions
        expect(
            within(rateDocsTable).getByText(rateDoc.name)
        ).toBeInTheDocument()
        expect(within(rateDocsTable).getByText('SHARED')).toBeInTheDocument()
        expect(within(rateDocsTable).getByText('NEW')).toBeInTheDocument()
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
    it('renders rates linked to other contract actions correctly', async () => {
        const rateData = rateWithHistoryMock()
        const parentContractRev =
            rateData.packageSubmissions?.[2].contractRevisions[0]
        if (!parentContractRev) {
            throw new Error('no parent')
        }

        const contractPackageName = parentContractRev.contractName

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
                featureFlags: {
                    'rate-edit-unlock': true,
                },
            }
        )

        expect(
            screen.getByRole('heading', { name: 'Rate documents' })
        ).toBeInTheDocument()

        const relatedContractActions = screen.getByRole('definition', {
            name: 'Contract actions',
        })

        // Expect submissions this rate was submitted with link to exists
        expect(relatedContractActions).toBeInTheDocument()
        expect(
            within(relatedContractActions).getByRole('link', {
                name: contractPackageName,
            })
        ).toBeInTheDocument()
        expect(
            within(relatedContractActions).getByRole('link', {
                name: contractPackageName,
            })
        ).toHaveAttribute(
            'href',
            `/submissions/${parentContractRev.contractID}`
        )
    })

    describe('Unlock rate', () => {
        it('renders the unlock button to CMS users when rate edit and unlock is enabled', async () => {
            const rateData = rateWithHistoryMock()
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

            await screen.findByRole('button', {
                name: 'Unlock rate',
            })

            expect(screen.getByText('Unlock rate')).toBeDefined()
        })

        it('renders unlock button that redirects to contract submission page when linked rates on but standalone rate edit and unlock is still disabled', async () => {
            let testLocation: Location // set up location to track URL changes

            const rateData = rateWithHistoryMock()
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<div>Summary page placeholder</div>}
                    />
                    <Route
                        path={`/rates/${rateData.id}`}
                        element={
                            <SingleRateSummarySection
                                rate={rateData}
                                isSubmitted={false}
                                statePrograms={rateData.state.programs}
                            />
                        }
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                                user: mockValidCMSUser(),
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/rates/${rateData.id}`,
                    },
                    featureFlags: {
                        'rate-edit-unlock': false,
                    },
                    location: (location) => (testLocation = location),
                }
            )
            await screen.findByRole('button', {
                name: 'Unlock rate',
            })

            await userClickByRole(screen, 'button', {
                name: 'Unlock rate',
            })
            await waitFor(() => {
                const parentContractSubmissionID = rateData.parentContractID
                expect(testLocation.pathname).toBe(
                    `/submissions/${parentContractSubmissionID}`
                )
            })
        })

        it('disables the unlock button for CMS users when rate already unlocked', async () => {
            const rateData = rateUnlockedWithHistoryMock()
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
            const rateData = rateWithHistoryMock()
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
            // ensure page fully loaded
            await screen.findByRole('link', {
                name: 'Download all rate documents',
            })

            // no unlock rate button present
            expect(
                screen.queryByRole('button', {
                    name: 'Unlock rate',
                })
            ).toBeNull()
        })
    })

    describe('Missing data error notifications', () => {
        const mockEmptyRateData = () => {
            const emptyDraftRates = mockEmptyDraftContractAndRate().draftRates
            if (!emptyDraftRates) {
                throw new Error('Unexpected error: draft rates is undefined')
            }

            const emptyRateFormData = emptyDraftRates[0].draftRevision?.formData

            if (!emptyRateFormData) {
                throw new Error('no form data')
            }

            const rateData = rateWithHistoryMock()
            const sub = rateData.packageSubmissions?.[0]
            if (!sub) {
                throw new Error('no sub')
            }
            sub.rateRevision.formData = emptyRateFormData

            return rateData
        }

        it('should not display missing field text to CMS users', async () => {
            const rateData = mockEmptyRateData()

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
            const rateData = mockEmptyRateData()

            if (
                !rateData.packageSubmissions ||
                rateData.packageSubmissions.length === 0
            ) {
                throw new Error('no package subs')
            }

            rateData.packageSubmissions[0].rateRevision.formData.rateType =
                'AMENDMENT'

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

            const text = /You must provide this information/

            expect(await screen.findAllByText(text)).toHaveLength(8)

            // expect Amendment rate
            expect(
                within(await screen.findByTestId('rateType')).getByText(
                    /Amendment to prior rate certification/
                )
            ).toBeInTheDocument()

            // expected errors
            expect(
                within(
                    await screen.findByTestId('effectiveRatingPeriod')
                ).getByText(text)
            ).toBeInTheDocument()
            expect(
                within(await screen.findByTestId('ratePrograms')).getByText(
                    text
                )
            ).toBeInTheDocument()
            expect(
                within(await screen.findByTestId('ratingPeriod')).getByText(
                    text
                )
            ).toBeInTheDocument()
            expect(
                within(await screen.findByTestId('dateCertified')).getByText(
                    text
                )
            ).toBeInTheDocument()
            expect(
                within(
                    await screen.findByTestId('rateCapitationType')
                ).getByText(text)
            ).toBeInTheDocument()
            expect(
                within(
                    await screen.findByTestId('certifyingActuary')
                ).getByText(text)
            ).toBeInTheDocument()
            expect(
                within(
                    await screen.findByTestId('addtlCertifyingActuary-0')
                ).getByText(text)
            ).toBeInTheDocument()
            expect(
                within(
                    await screen.findByTestId('communicationPreference')
                ).getByText(text)
            ).toBeInTheDocument()
        })

        it('should display missing field text to helpdesk users', async () => {
            const rateData = mockEmptyRateData()
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
                                user: mockValidHelpDeskUser(),
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
            ).toHaveLength(8)
        })

        it('should not display missing field text on submitted rates', async () => {
            const rateData = mockEmptyRateData()
            rateData.status = 'SUBMITTED'
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
                                user: mockValidHelpDeskUser(),
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
                screen.queryAllByText(/You must provide this information/)
            ).toHaveLength(0)
        })
    })
})
