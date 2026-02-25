import React from 'react'
import { screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'

import {
    fetchCurrentUserMock,
    fetchContractMockSuccess,
    mockContractPackageUnlockedWithUnlockedType,
    s3DlUrl,
} from '@mc-review/mocks'

import {
    renderWithProviders,
    TEST_DOC_FILE,
    TEST_PDF_FILE,
    TEST_PNG_FILE,
    dragAndDrop,
} from '../../../../testHelpers/jestHelpers'

import { EQROContractDetails } from './EQROContractDetails'

const scrollIntoViewMock = vi.fn()
HTMLElement.prototype.scrollIntoView = scrollIntoViewMock

describe('EQROContractDetails', () => {
    it('displays correct form guidance', async () => {
        const draftContract = mockContractPackageUnlockedWithUnlockedType()
        draftContract.draftRevision.formData.contractType = 'BASE'
        draftContract.draftRevision.formData.populationCovered = 'MEDICAID'
        draftContract.draftRevision.formData.managedCareEntities = ['MCO']

        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                    element={<EQROContractDetails />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...draftContract,
                                id: '15',
                                contractSubmissionType: 'EQRO',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/eqro/15/edit/contract-details',
                },
                featureFlags: {
                    'hide-supporting-docs-page': true,
                },
            }
        )

        await screen.findByText('EQRO Contract details')
        const requiredLabels = await screen.findAllByText('Required')
        expect(requiredLabels.length).toBeGreaterThan(0)
    })

    describe('Contract documents file upload', () => {
        it('renders without errors', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractDocuments = []
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.populationCovered = 'MEDICAID'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            // check hint text
            await screen.findByText(
                'Supporting documents can be added later. If you have additional contract actions, you must submit them in a separate submission.'
            )
            await screen.findAllByRole('link', { name: /Document definitions/ })

            // check file input presences
            await screen.findAllByTestId('file-input')

            expect(screen.getAllByTestId('file-input')[0]).toBeInTheDocument()
            expect(screen.getAllByTestId('file-input')[0]).toHaveClass(
                'usa-file-input'
            )
            expect(
                screen.getByRole('button', { name: 'Continue' })
            ).not.toHaveAttribute('aria-disabled')
            expect(
                within(
                    screen.getAllByTestId('file-input-preview-list')[0]
                ).queryAllByRole('listitem')
            ).toHaveLength(0)
        })
    })

    describe('EQRO provisions questions - conditional rendering', () => {
        it('shows eqroNewContractor question for Base contract with MCO', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.populationCovered = 'MEDICAID'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            expect(
                screen.getByRole('group', {
                    name: 'Is this contract with a new EQRO contractor?',
                })
            ).toBeInTheDocument()
        })

        it('does not show eqroNewContractor question for Base contract without MCO', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.populationCovered = 'MEDICAID'
            draftContract.draftRevision.formData.managedCareEntities = ['PIHP']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            expect(
                screen.queryByRole('group', {
                    name: 'Is this contract with a new EQRO contractor?',
                })
            ).not.toBeInTheDocument()
        })

        it('shows eqroProvisionMcoEqrOrRelatedActivities for Amendment with MCO', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'AMENDMENT'
            draftContract.draftRevision.formData.populationCovered = 'MEDICAID'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            expect(
                screen.getByRole('group', {
                    name: 'EQR or EQR-related activities performed on MCOs',
                })
            ).toBeInTheDocument()
        })

        it('does not show eqroProvisionMcoEqrOrRelatedActivities for Base contract', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.populationCovered = 'MEDICAID'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            // Base contracts should not show the eqroProvisionMcoEqrOrRelatedActivities question
            expect(
                screen.queryByRole('group', {
                    name: 'EQR or EQR-related activities performed on MCOs',
                })
            ).not.toBeInTheDocument()
        })

        it('shows optional activity questions when eqroProvisionMcoEqrOrRelatedActivities is YES', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'AMENDMENT'
            draftContract.draftRevision.formData.populationCovered = 'MEDICAID'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']
            draftContract.draftRevision.formData.eqroProvisionMcoEqrOrRelatedActivities =
                false

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            // Optional activity questions should not be visible initially (NO is selected)
            expect(
                screen.queryByRole('group', {
                    name: /New optional activities to be performed on MCO/,
                })
            ).not.toBeInTheDocument()

            // Find the fieldset by its ID and then click the Yes radio within it
            const eqrActivitiesFieldset = screen.getByRole('group', {
                name: 'EQR or EQR-related activities performed on MCOs',
            })

            const yesRadio = within(eqrActivitiesFieldset).getByRole('radio', {
                name: 'Yes',
            })

            await userEvent.click(yesRadio)

            // Now optional activity questions should appear
            await waitFor(() => {
                expect(
                    screen.getByRole('group', {
                        name: /New optional activities to be performed on MCO/,
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('group', {
                        name: /EQR-related activities for a new MCO managed care program/,
                    })
                ).toBeInTheDocument()
            })
        })

        it('hides optional activity questions when eqroProvisionMcoEqrOrRelatedActivities is NO', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'AMENDMENT'
            draftContract.draftRevision.formData.populationCovered = 'MEDICAID'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']
            draftContract.draftRevision.formData.eqroProvisionMcoEqrOrRelatedActivities =
                true

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            // Optional activity questions should be visible initially (YES is selected)
            expect(
                screen.getByRole('group', {
                    name: /New optional activities to be performed on MCO/,
                })
            ).toBeInTheDocument()

            // Find the fieldset by its ID and then click the No radio within it
            const eqrActivitiesFieldset = screen.getByRole('group', {
                name: 'EQR or EQR-related activities performed on MCOs',
            })

            const noRadio = within(eqrActivitiesFieldset).getByRole('radio', {
                name: 'No',
            })

            await userEvent.click(noRadio)

            // Now optional activity questions should disappear
            await waitFor(() => {
                expect(
                    screen.queryByRole('group', {
                        name: /New optional activities to be performed on MCO/,
                    })
                ).not.toBeInTheDocument()
                expect(
                    screen.queryByRole('group', {
                        name: /EQR-related activities for a new MCO managed care program/,
                    })
                ).not.toBeInTheDocument()
            })
        })

        it('shows optional activity questions for base contract with MCO without parent question', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.populationCovered = 'MEDICAID'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            // For base contracts, optional activity questions should be visible immediately
            expect(
                screen.getByRole('group', {
                    name: /New optional activities to be performed on MCO/,
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('group', {
                    name: /EQR-related activities for a new MCO managed care program/,
                })
            ).toBeInTheDocument()

            // eqroProvisionMcoEqrOrRelatedActivities question should NOT be visible for base contracts
            expect(
                screen.queryByRole('group', {
                    name: 'EQR or EQR-related activities performed on MCOs',
                })
            ).not.toBeInTheDocument()
        })

        it('shows CHIP population question when CHIP is in populationCovered', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.populationCovered =
                'MEDICAID_AND_CHIP'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            expect(
                screen.getByRole('group', {
                    name: 'EQR-related activities performed on the CHIP population',
                })
            ).toBeInTheDocument()
        })

        it('does not show CHIP population question when CHIP is not in populationCovered', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.populationCovered = 'MEDICAID'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            expect(
                screen.queryByRole('group', {
                    name: 'EQR-related activities performed on the CHIP population',
                })
            ).not.toBeInTheDocument()
        })

        it('counts correct number of EQRO provision questions for base contract with MCO and CHIP', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.populationCovered =
                'MEDICAID_AND_CHIP'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            // Base contract with MCO and CHIP should show 4 questions:
            // eqroNewContractor
            // eqroProvisionMcoNewOptionalActivity
            // eqroProvisionNewMcoEqrRelatedActivities
            // eqroProvisionChipEqrRelatedActivities
            expect(screen.getAllByTestId('yes-no-radio-fieldset')).toHaveLength(
                4
            )
        })

        it('counts correct number of EQRO provision questions for Amendment with MCO', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'AMENDMENT'
            draftContract.draftRevision.formData.populationCovered = 'MEDICAID'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']
            draftContract.draftRevision.formData.eqroProvisionMcoEqrOrRelatedActivities =
                false

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            // Amendment with MCO and NO selected for eqroProvisionMcoEqrOrRelatedActivities should show only 1 question
            expect(screen.getAllByTestId('yes-no-radio-fieldset')).toHaveLength(
                1
            )
        })

        it('does not show provisions heading for Base Medicaid contract without MCO', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.populationCovered = 'MEDICAID'
            draftContract.draftRevision.formData.managedCareEntities = ['PIHP']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            expect(screen.queryByText('Provisions')).not.toBeInTheDocument()

            expect(
                screen.queryByText(
                    'Does this contract action include provisions related to any of the following?'
                )
            ).not.toBeInTheDocument()
        })
    })

    describe('EQRO provisions questions - validation', () => {
        it('shows 4 validation errors for Base contract with MCO and MEDICAID_AND_CHIP', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.populationCovered =
                'MEDICAID_AND_CHIP'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']
            draftContract.draftRevision.formData.contractDateStart = new Date(
                '2027-01-01'
            )
            draftContract.draftRevision.formData.contractDateEnd = new Date(
                '2027-12-31'
            )

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            await userEvent.click(continueButton)

            await waitFor(() => {
                const errors = screen.getAllByText('You must select yes or no')
                // Base contract with MCO and CHIP should have 4 required Y/N fields
                expect(errors.length).toBe(8) // 4 errors displayed twice - on the top and at the control level
            })
        })

        it('shows 3 validation errors for Base contract with MCO and MEDICAID', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.populationCovered = 'MEDICAID'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']
            draftContract.draftRevision.formData.contractDateStart = new Date(
                '2027-01-01'
            )
            draftContract.draftRevision.formData.contractDateEnd = new Date(
                '2027-12-31'
            )

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            await userEvent.click(continueButton)

            await waitFor(() => {
                const errors = screen.getAllByText('You must select yes or no')
                // Base contract with MCO and MEDICAID should have 3 required fields
                expect(errors.length).toBe(6) // 3 errors displayed twice - on the top and at the control level
            })
        })

        it('shows 1 validation error for Base contract with no MCO and CHIP', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.populationCovered = 'CHIP'
            draftContract.draftRevision.formData.managedCareEntities = ['PIHP']
            draftContract.draftRevision.formData.contractDateStart = new Date(
                '2027-01-01'
            )
            draftContract.draftRevision.formData.contractDateEnd = new Date(
                '2027-12-31'
            )

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            await userEvent.click(continueButton)

            await waitFor(() => {
                const errors = screen.getAllByText('You must select yes or no')
                // Base contract with CHIP and no MCO should have 1 required fields
                expect(errors.length).toBeGreaterThanOrEqual(2) // 1 error displayed twice - on the top and at the control level
            })
        })

        it('shows 1 validation error for Amendment with MCO and MEDICAID', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'AMENDMENT'
            draftContract.draftRevision.formData.populationCovered = 'MEDICAID'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']
            draftContract.draftRevision.formData.contractDateStart = new Date(
                '2027-01-01'
            )
            draftContract.draftRevision.formData.contractDateEnd = new Date(
                '2027-12-31'
            )
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            await userEvent.click(continueButton)

            await waitFor(() => {
                const errors = screen.getAllByText('You must select yes or no')
                // Amendment with MCO and MEDICAID should have 1 required fields
                expect(errors.length).toBe(2) //1 error displayed twice - on the top and at the control level
            })
        })

        it('shows 2 validation errors for Amendment with MCO and MEDICAID, when eqroProvisionMcoEqrOrRelatedActivities is answered YES', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'AMENDMENT'
            draftContract.draftRevision.formData.populationCovered = 'MEDICAID'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']
            draftContract.draftRevision.formData.contractDateStart = new Date(
                '2027-01-01'
            )
            draftContract.draftRevision.formData.contractDateEnd = new Date(
                '2027-12-31'
            )

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            // Select YES for the eqroProvisionMcoEqrOrRelatedActivities question
            const eqrActivitiesFieldset = screen.getByRole('group', {
                name: 'EQR or EQR-related activities performed on MCOs',
            })
            const yesRadio = within(eqrActivitiesFieldset).getByRole('radio', {
                name: 'Yes',
            })
            await userEvent.click(yesRadio)

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            await userEvent.click(continueButton)

            await waitFor(() => {
                const errors = screen.getAllByText('You must select yes or no')
                // Amendment with MCO and MEDICAID should have 2 additional required fields when eqroProvisionMcoEqrOrRelatedActivities is answered YES
                expect(errors.length).toBe(4) //2 errors each displayed twice: at the top and on the control level
            })
        })

        it('shows 2 validation errors for Amendment with MCO and MEDICAID_AND_CHIP', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'AMENDMENT'
            draftContract.draftRevision.formData.populationCovered =
                'MEDICAID_AND_CHIP'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']
            draftContract.draftRevision.formData.contractDateStart = new Date(
                '2024-01-01'
            )
            draftContract.draftRevision.formData.contractDateEnd = new Date(
                '2024-12-31'
            )

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            await userEvent.click(continueButton)

            await waitFor(() => {
                const errors = screen.getAllByText('You must select yes or no')
                // Amendment with MCO and MEDICAID_AND_CHIP should have 2 required fields
                expect(errors.length).toBe(4) //2 errors each displayed twice: at the top and on the control level
            })
        })

        it('shows 3 validation errors for Amendment with MCO and MEDICAID_AND_CHIP  when eqroProvisionMcoEqrOrRelatedActivities is answered YES', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'AMENDMENT'
            draftContract.draftRevision.formData.populationCovered =
                'MEDICAID_AND_CHIP'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']
            draftContract.draftRevision.formData.contractDateStart = new Date(
                '2027-01-01'
            )
            draftContract.draftRevision.formData.contractDateEnd = new Date(
                '2027-12-31'
            )

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            // Select YES for the eqroProvisionMcoEqrOrRelatedActivities question
            const eqrActivitiesFieldset = screen.getByRole('group', {
                name: 'EQR or EQR-related activities performed on MCOs',
            })
            const yesRadio = within(eqrActivitiesFieldset).getByRole('radio', {
                name: 'Yes',
            })
            await userEvent.click(yesRadio)

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            await userEvent.click(continueButton)

            await waitFor(() => {
                const errors = screen.getAllByText('You must select yes or no')
                // Amendment with MCO and MEDICAID_AND_CHIP should have 2 additional required fields when eqroProvisionMcoEqrOrRelatedActivities is answered YES
                expect(errors.length).toBe(6) //one of the two 'base' questions is answered YES, one is not answered, plus two additional questions. Total of 3 errors each displayed twice
            })
        })

        it('shows 1 validation error for Amendment with MCO and MEDICAID_AND_CHIP  when eqroProvisionChipForRelatedActivities is answered YES', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'AMENDMENT'
            draftContract.draftRevision.formData.populationCovered =
                'MEDICAID_AND_CHIP'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']
            draftContract.draftRevision.formData.contractDateStart = new Date(
                '2027-01-01'
            )
            draftContract.draftRevision.formData.contractDateEnd = new Date(
                '2027-12-31'
            )

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            //Select YES for the eqroProvisionChipEqrRelatedActivities question
            const eqrActivitiesFieldset = screen.getByRole('group', {
                name: 'EQR-related activities performed on the CHIP population',
            })
            const yesRadio = within(eqrActivitiesFieldset).getByRole('radio', {
                name: 'Yes',
            })

            await userEvent.click(yesRadio)

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            await userEvent.click(continueButton)

            await waitFor(() => {
                const errors = screen.getAllByText('You must select yes or no')
                // Amendment with MCO and MEDICAID_AND_CHIP should not have 2 additional required fields when eqroProvisionChipEqrRelatedActivities is answered YES
                expect(errors.length).toBe(2) //1 error displayed twice: at the top and on the control level
            })
        })

        it('shows 1 validation error for Amendment with CHIP and no MCO', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'AMENDMENT'
            draftContract.draftRevision.formData.populationCovered = 'CHIP'
            draftContract.draftRevision.formData.managedCareEntities = ['PIHP']
            draftContract.draftRevision.formData.contractDateStart = new Date(
                '2027-01-01'
            )
            draftContract.draftRevision.formData.contractDateEnd = new Date(
                '2027-12-31'
            )

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            await userEvent.click(continueButton)

            await waitFor(() => {
                const errors = screen.getAllByText('You must select yes or no')
                // Amendment with no MCO and CHIP should have 1 required field
                expect(errors.length).toBe(2) //1 error displayed twice: at the top and on the control level
            })
        })
    })

    describe('Continue button', () => {
        it('enabled when valid files are present', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            const input = screen.getByLabelText('Upload contract')

            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(continueButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            const input = screen.getByLabelText('Upload contract')
            const targetEl = screen.getAllByTestId('file-input-droptarget')[0]

            await userEvent.upload(input, [TEST_DOC_FILE])
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            await waitFor(() => {
                expect(
                    screen.getByText('This is not a valid file type.')
                ).toBeInTheDocument()
                expect(continueButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('disabled with alert after first attempt to continue with zero files', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractDocuments = []
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            expect(continueButton).not.toHaveAttribute('aria-disabled')

            await userEvent.click(continueButton)

            await waitFor(() => {
                expect(
                    screen.getAllByText('You must upload at least one document')
                ).toHaveLength(2)

                expect(continueButton).toHaveAttribute('aria-disabled', 'true')
            })
        })

        it('disabled with alert after first attempt to continue with invalid duplicate files', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const input = screen.getByLabelText('Upload contract')
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            await userEvent.upload(input, [TEST_DOC_FILE])
            await userEvent.upload(input, []) // clear input and ensure we add same file twice
            await userEvent.upload(input, [TEST_DOC_FILE])

            expect(continueButton).not.toHaveAttribute('aria-disabled')
            await userEvent.click(continueButton)

            await waitFor(() => {
                expect(
                    screen.getAllByText(
                        'You must remove all documents with error messages before continuing'
                    )
                ).toHaveLength(2)

                expect(continueButton).toHaveAttribute('aria-disabled', 'true')
            })
        })

        it('disabled with alert after first attempt to continue with invalid files', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractDocuments = []
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            const targetEl = screen.getAllByTestId('file-input-droptarget')[0]
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            expect(
                await screen.findByText('This is not a valid file type.')
            ).toBeInTheDocument()

            expect(continueButton).not.toHaveAttribute('aria-disabled')
            await userEvent.click(continueButton)

            expect(
                await screen.findAllByText(
                    'You must upload at least one document'
                )
            ).toHaveLength(2)

            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })

        it('disabled with alert when trying to continue while a file is still uploading', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractDocuments = []
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            const targetEl = screen.getAllByTestId('file-input-droptarget')[0]

            // upload one file
            dragAndDrop(targetEl, [TEST_PDF_FILE])
            const imageElFile1 = screen.getByTestId('file-input-preview-image')
            expect(imageElFile1).toHaveClass('is-loading')
            await waitFor(() =>
                expect(imageElFile1).not.toHaveClass('is-loading')
            )

            // upload second file
            dragAndDrop(targetEl, [TEST_DOC_FILE])

            const imageElFile2 = screen.getAllByTestId(
                'file-input-preview-image'
            )[1]
            expect(imageElFile2).toHaveClass('is-loading')
            await waitFor(() => {
                fireEvent.click(continueButton)
                expect(continueButton).toHaveAttribute('aria-disabled', 'true')

                expect(
                    screen.getAllByText(
                        'You must wait for all documents to finish uploading before continuing'
                    )
                ).toHaveLength(2)
            })
        })
    })

    describe('Save as draft button', () => {
        it('enabled when valid files are present', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })
            const input = screen.getByLabelText('Upload contract')

            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(saveAsDraftButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })
            const input = screen.getByLabelText('Upload contract')
            const targetEl = screen.getAllByTestId('file-input-droptarget')[0]

            await userEvent.upload(input, [TEST_DOC_FILE])
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            await waitFor(() => {
                expect(saveAsDraftButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('when zero files present, does not trigger missing documents alert on click but still saves the in progress draft', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })
            expect(saveAsDraftButton).not.toHaveAttribute('aria-disabled')

            await userEvent.click(saveAsDraftButton)
            expect(
                screen.queryByText('You must upload at least one document')
            ).toBeNull()
        })

        it('when existing file is removed, does not trigger missing documents alert on click but still saves the in progress draft', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractDocuments = [
                {
                    __typename: 'GenericDocument',
                    id: 'test-doc-1',
                    name: 'aasdf3423af',
                    sha256: 'fakesha',
                    s3URL: 's3://bucketname/key/fileName',
                    dateAdded: new Date(),
                    downloadURL: s3DlUrl,
                },
            ]
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })
            expect(saveAsDraftButton).not.toHaveAttribute('aria-disabled')

            await userEvent.click(saveAsDraftButton)
            expect(
                screen.queryByText('You must upload at least one document')
            ).toBeNull()
        })

        it('when duplicate files present, triggers error alert on click', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')
            const input = screen.getByLabelText('Upload contract')
            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })

            await userEvent.upload(input, [TEST_DOC_FILE])
            await userEvent.upload(input, [TEST_PDF_FILE])
            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(
                    screen.queryAllByText('Duplicate file, please remove')
                ).toHaveLength(1)
            })
            await userEvent.click(saveAsDraftButton)
            await waitFor(() => {
                expect(
                    screen.queryAllByText(
                        'You must remove all documents with error messages before continuing'
                    )
                ).toHaveLength(0)
            })
        })
    })

    describe('Back button', () => {
        it('enabled when valid files are present', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const backButton = screen.getByRole('button', {
                name: 'Back',
            })
            const input = screen.getByLabelText('Upload contract')

            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(backButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const backButton = screen.getByRole('button', {
                name: 'Back',
            })
            const input = screen.getByLabelText('Upload contract')
            const targetEl = screen.getAllByTestId('file-input-droptarget')[0]

            await userEvent.upload(input, [TEST_DOC_FILE])
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            await waitFor(() => {
                expect(backButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('when zero files present, does not trigger missing documents alert on click', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const backButton = screen.getByRole('button', {
                name: 'Back',
            })
            expect(backButton).not.toHaveAttribute('aria-disabled')

            await userEvent.click(backButton)
            expect(
                screen.queryByText('You must upload at least one document')
            ).toBeNull()
        })

        it('when duplicate files present, does not trigger duplicate documents alert on click and silently updates submission without the duplicate', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            draftContract.draftRevision.formData.contractDocuments = []
            draftContract.draftRevision.formData.contractType = 'BASE'
            draftContract.draftRevision.formData.managedCareEntities = ['MCO']

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<EQROContractDetails />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contract-details',
                    },
                }
            )

            await screen.findByText('EQRO Contract details')

            const input = screen.getByLabelText('Upload contract')
            const backButton = screen.getByRole('button', {
                name: 'Back',
            })

            await userEvent.upload(input, [TEST_DOC_FILE])
            await userEvent.upload(input, [TEST_PDF_FILE])
            await userEvent.upload(input, [TEST_DOC_FILE])
            await waitFor(() => {
                expect(backButton).not.toHaveAttribute('aria-disabled')
                expect(
                    screen.queryAllByText('Duplicate file, please remove')
                ).toHaveLength(1)
            })
            await userEvent.click(backButton)
            expect(screen.queryByText('Remove files with errors')).toBeNull()
        })
    })
})
