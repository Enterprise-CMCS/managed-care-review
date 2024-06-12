import { screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../../../testHelpers/jestHelpers'
import { ReviewSubmitV2 } from './ReviewSubmitV2'
import {
    fetchCurrentUserMock,
    fetchContractMockSuccess,
    mockValidStateUser,
    mockEmptyDraftContractAndRate,
    mockContractPackageDraft,
} from '../../../../../testHelpers/apolloMocks'
import { Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '../../../../../constants'
import {
    mockContractFormData,
    mockContractPackageUnlocked,
} from '../../../../../testHelpers/apolloMocks/contractPackageDataMock'
import { Contract } from '../../../../../gen/gqlClient'
import { mockMNState } from '../../../../../common-code/healthPlanFormDataMocks/healthPlanFormData'

describe('ReviewSubmit', () => {
    it('renders without errors', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmitV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({}),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: 'Contract details' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('heading', { name: 'Rate details' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('heading', { name: 'State contacts' })
            ).toBeInTheDocument()
        })
    })

    it('displays edit buttons for every section', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmitV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                id: 'test-abc-123',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )

        await waitFor(() => {
            const sectionHeadings = screen.queryAllByRole('heading', {
                level: 2,
            })
            const editButtons = screen.queryAllByRole('button', {
                name: 'Edit',
            })
            expect(sectionHeadings.length).toBeGreaterThan(1)
            expect(sectionHeadings.length).toBeGreaterThanOrEqual(
                editButtons.length
            )
        })
    })

    it('does not display zip download buttons', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmitV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                id: 'test-abc-123',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )

        await waitFor(() => {
            const bulkDownloadButtons = screen.queryAllByRole('button', {
                name: /documents/,
            })
            expect(bulkDownloadButtons).toHaveLength(0)
        })
    })

    it('renders info from a draft contract', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmitV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: { id: 'test-abc-123' },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: 'Contract details' })
            ).toBeInTheDocument()

            expect(
                screen.getByRole('heading', { name: 'State contacts' })
            ).toBeInTheDocument()

            const sectionHeadings = screen.queryAllByRole('heading', {
                level: 2,
            })
            const editButtons = screen.queryAllByRole('button', {
                name: 'Edit',
            })
            expect(sectionHeadings.length).toBeGreaterThanOrEqual(
                editButtons.length
            )
            const submissionDescription =
                screen.queryByText('A real submission')
            expect(submissionDescription).toBeInTheDocument()
        })
    })

    it('extracts the correct dates from unlocked submission and displays them in tables', async () => {
        const contractMock = fetchContractMockSuccess({
            contract: mockContractPackageUnlocked(),
        })

        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmitV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        contractMock,
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )

        await waitFor(() => {
            const rows = screen.getAllByRole('row')
            expect(rows).toHaveLength(4)
            expect(within(rows[0]).getByText('Date added')).toBeInTheDocument()
            expect(within(rows[1]).getByText('2/2/23')).toBeInTheDocument()
            expect(within(rows[2]).getByText('Date added')).toBeInTheDocument()
            expect(within(rows[3]).getByText('3/2/23')).toBeInTheDocument()
        })
    })

    it('displays back, save as draft, and submit buttons', async () => {
        const { user } = renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmitV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: { id: 'test-abc-123' },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )

        await screen.findByRole('button', {
            name: 'Back',
        })

        await screen.findByRole('button', {
            name: 'Save as draft',
        })

        expect(screen.getByTestId('form-submit')).toBeDefined()
        expect(screen.getAllByText('Submit')).toHaveLength(2)
        await user.click(screen.getAllByText('Submit')[0])
    })

    it('pulls the right version of UNLOCKED data for state users', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmitV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidStateUser(),
                        }),
                        fetchContractMockSuccess({
                            contract: mockContractPackageUnlocked(),
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )

        const description = await screen.findByLabelText(
            'Submission description'
        )
        expect(description).toHaveTextContent('An updated submission')
        const ratingPeriod = await screen.findByLabelText(
            'Rating period of original rate certification'
        )
        expect(ratingPeriod).toHaveTextContent('02/02/2020 to 02/02/2021')
    })

    it('hides the legacy shared rates across submissions UI for state users when unlocked', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmitV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidStateUser(),
                        }),
                        fetchContractMockSuccess({
                            contract: mockContractPackageUnlocked(),
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )

        expect(
            await screen.queryByText('Linked submissions')
        ).not.toBeInTheDocument()
        expect(await screen.queryByText('SHARED')).not.toBeInTheDocument()
    })

    describe('Missing data error notifications', () => {
        it('renders missing data error notifications for state user', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmitV2 />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: mockEmptyDraftContractAndRate(),
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: {
                        'link-rates': true,
                        '438-attestation': true,
                    },
                }
            )
            // Expect 20 notifications, if this fails change length to what is found in test to isolate which field failed.
            await waitFor(() => {
                expect(
                    screen.getAllByText(/You must provide this information/)
                ).toHaveLength(20)
            })
            const text = /You must provide this information/

            //Submission type summary section
            expect(
                within(await screen.findByTestId('submissionType')).getByText(
                    text
                )
            ).toBeInTheDocument()
            expect(
                within(await screen.findByTestId('program')).getByText(text)
            ).toBeInTheDocument()
            expect(
                within(await screen.findByTestId('contractType')).getByText(
                    text
                )
            ).toBeInTheDocument()
            expect(
                within(
                    await screen.findByTestId('riskBasedContract')
                ).getByText(text)
            ).toBeInTheDocument()
            expect(
                within(
                    await screen.findByTestId('populationCoverage')
                ).getByText(text)
            ).toBeInTheDocument()
            expect(
                within(
                    await screen.findByTestId('submissionDescription')
                ).getByText(text)
            ).toBeInTheDocument()

            //Contract details summary section
            expect(
                within(
                    await screen.findByTestId(
                        'statutoryRegulatoryAttestationDescription'
                    )
                ).getByText(text)
            ).toBeInTheDocument()
            expect(
                within(
                    await screen.findByTestId('contractExecutionStatus')
                ).getByText(text)
            ).toBeInTheDocument()
            expect(
                within(
                    await screen.findByTestId('contractEffectiveDates')
                ).getByText(text)
            ).toBeInTheDocument()
            expect(
                within(
                    await screen.findByTestId('managedCareEntities')
                ).getByText(text)
            ).toBeInTheDocument()
            expect(
                within(
                    await screen.findByTestId('federalAuthorities')
                ).getByText(text)
            ).toBeInTheDocument()

            //Rate detail summary section
            expect(
                within(await screen.findByTestId('ratePrograms')).getByText(
                    text
                )
            ).toBeInTheDocument()
            expect(
                within(await screen.findByTestId('rateType')).getByText(text)
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

            // Contact details summary section
            expect(
                within(await screen.findByTestId('statecontact')).getByText(
                    text
                )
            ).toBeInTheDocument()
        })

        it('renders missing modified and unmodified provisions data error notifications', async () => {
            const draftContract: Contract = mockContractPackageDraft({
                draftRevision: {
                    id: '123',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    contractName: 'MCR-0005-alvhalfhdsalfee',
                    formData: mockContractFormData({
                        contractType: 'AMENDMENT',
                        modifiedBenefitsProvided: undefined,
                        modifiedGeoAreaServed: undefined,
                        modifiedMedicaidBeneficiaries: undefined,
                        modifiedRiskSharingStrategy: undefined,
                        modifiedIncentiveArrangements: undefined,
                        modifiedWitholdAgreements: undefined,
                        modifiedStateDirectedPayments: undefined,
                        modifiedPassThroughPayments: undefined,
                        modifiedPaymentsForMentalDiseaseInstitutions: undefined,
                        modifiedMedicalLossRatioStandards: undefined,
                        modifiedOtherFinancialPaymentIncentive: undefined,
                        modifiedEnrollmentProcess: undefined,
                        modifiedGrevienceAndAppeal: undefined,
                        modifiedNetworkAdequacyStandards: undefined,
                        modifiedLengthOfContract: undefined,
                        modifiedNonRiskPaymentArrangements: undefined,
                    }),
                },
            })
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmitV2 />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: draftContract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: {
                        'link-rates': true,
                        '438-attestation': true,
                    },
                }
            )

            const modifiedProvisions =
                await screen.findByTestId('modifiedProvisions')
            const unmodifiedProvisions = await screen.findByTestId(
                'unmodifiedProvisions'
            )

            await waitFor(() => {
                expect(modifiedProvisions).toBeInTheDocument()
                expect(unmodifiedProvisions).toBeInTheDocument()

                expect(
                    within(modifiedProvisions).getByText(
                        /You must provide this information/
                    )
                ).toBeInTheDocument()
                expect(
                    within(unmodifiedProvisions).getByText(
                        /You must provide this information/
                    )
                ).toBeInTheDocument()
            })
        })

        it('renders missing effective rating period data error notification', async () => {
            const draftContract: Contract = mockContractPackageDraft({
                draftRates: [
                    {
                        id: '123',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        status: 'DRAFT',
                        stateCode: 'MN',
                        revisions: [],
                        state: mockMNState(),
                        stateNumber: 5,
                        parentContractID: 'test-abc-123',
                        draftRevision: {
                            id: '123',
                            rateID: '456',
                            contractRevisions: [],
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            formData: {
                                rateType: 'AMENDMENT',
                                rateCapitationType: undefined,
                                rateDocuments: [],
                                supportingDocuments: [],
                                rateDateStart: undefined,
                                rateDateEnd: undefined,
                                rateDateCertified: undefined,
                                amendmentEffectiveDateStart: undefined,
                                amendmentEffectiveDateEnd: undefined,
                                deprecatedRateProgramIDs: [],
                                rateProgramIDs: [],
                                certifyingActuaryContacts: [],
                                addtlActuaryContacts: [],
                                actuaryCommunicationPreference: undefined,
                                packagesWithSharedRateCerts: [],
                            },
                        },
                    },
                ],
            })
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<ReviewSubmitV2 />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: draftContract,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/test-abc-123/edit/review-and-submit',
                    },
                    featureFlags: {
                        'link-rates': true,
                    },
                }
            )

            const rateType = await screen.findByTestId('rateType')
            const effectiveRatingPeriod = await screen.findByTestId(
                'effectiveRatingPeriod'
            )

            await waitFor(() => {
                expect(rateType).toBeInTheDocument()
                expect(effectiveRatingPeriod).toBeInTheDocument()

                expect(
                    within(rateType).getByText(
                        /Amendment to prior rate certification/
                    )
                ).toBeInTheDocument()
                expect(
                    within(effectiveRatingPeriod).getByText(
                        /You must provide this information/
                    )
                ).toBeInTheDocument()
            })
        })
    })
})
