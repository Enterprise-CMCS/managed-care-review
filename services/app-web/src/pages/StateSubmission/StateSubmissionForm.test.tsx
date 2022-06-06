import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { Document } from '../../gen/gqlClient'
import { RoutesRecord } from '../../constants/routes'
import {
    fetchCurrentUserMock,
    fetchHealthPlanPackageMock,
    mockDraftHealthPlanPackage,
    mockUnlockedHealthPlanPackage,
    mockUnlockedHealthPlanPackageWithDocuments,
    updateHealthPlanFormDataMockSuccess,
} from '../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../testHelpers/jestHelpers'

import { StateSubmissionForm } from './StateSubmissionForm'
import {
    base64ToDomain,
    domainToBase64,
} from '../../common-code/proto/healthPlanFormDataProto'
import { testS3Client } from '../../testHelpers/s3Helpers'
import { getYesNoFieldValue } from '../../testHelpers/fieldHelpers'

describe('StateSubmissionForm', () => {
    describe('loads draft submission', () => {
        it('loads step indicator', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_FORM}
                        element={<StateSubmissionForm />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchHealthPlanPackageMock({
                                id: '15',
                                statusCode: 200,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15/edit/contract-details',
                    },
                }
            )

            const stepIndicator = await screen.findByTestId('step-indicator')

            expect(stepIndicator).toHaveClass('usa-step-indicator')
        })

        it('loads submission type fields for /submissions/edit/type', async () => {
            const mockSubmission = mockDraftHealthPlanPackage({
                submissionDescription: 'A real submission',
                submissionType: 'CONTRACT_ONLY',
                programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            })
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_FORM}
                        element={<StateSubmissionForm />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchHealthPlanPackageMock({
                                id: '15',
                                statusCode: 200,
                                submission: mockSubmission,
                            }),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/edit/type' },
                }
            )

            const description = await screen.findByLabelText(
                'Submission description'
            )
            expect(description).toBeInTheDocument()
            expect(description.textContent).toBe('A real submission')

            expect(
                await screen.findByLabelText('Contract action only')
            ).toBeChecked()

            // in react-select, only items that are selected have a "remove item" label
            await waitFor(() => {
                expect(screen.getByLabelText('Remove SNBC')).toBeInTheDocument()
            })
        })

        it('loads contract details fields for /submissions/:id/edit/contract-details with amendments', async () => {
            const mockAmendment = mockDraftHealthPlanPackage({
                contractType: 'AMENDMENT',
                contractAmendmentInfo: {
                    modifiedBenefitsProvided: true,
                    modifiedGeoAreaServed: false,
                    modifiedMedicaidBeneficiaries: false,
                    modifiedRiskSharingStrategy: false,
                    modifiedIncentiveArrangements: false,
                    modifiedWitholdAgreements: false,
                    modifiedStateDirectedPayments: true,
                    modifiedPassThroughPayments: false,
                    modifiedPaymentsForMentalDiseaseInstitutions: false,
                    modifiedMedicalLossRatioStandards: false,
                    modifiedOtherFinancialPaymentIncentive: false,
                    modifiedEnrollmentProcess: false,
                    modifiedGrevienceAndAppeal: false,
                    modifiedNetworkAdequacyStandards: false,
                    modifiedLengthOfContract: false,
                    modifiedNonRiskPaymentArrangements: false,
                },
            })

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_FORM}
                        element={<StateSubmissionForm />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchHealthPlanPackageMock({
                                id: '12',
                                statusCode: 200,
                                submission: mockAmendment,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/12/edit/contract-details',
                    },
                }
            )

            await waitFor(() => {
                expect(
                    getYesNoFieldValue(
                        'Benefits provided by the managed care plans'
                    )
                ).toBe(true)
                expect(
                    getYesNoFieldValue(
                        'Geographic areas served by the managed care plans'
                    )
                ).toBe(false)
            })
        })

        it('loads documents fields for /submissions/:id/edit/documents', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_FORM}
                        element={<StateSubmissionForm />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchHealthPlanPackageMock({
                                id: '12',
                                statusCode: 200,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/12/edit/documents',
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByText(
                        'Upload any additional supporting documents'
                    )
                ).toBeInTheDocument()
                expect(screen.getByTestId('file-input')).toBeInTheDocument()
            })
        })
    })

    describe('loads unlocked submission', () => {
        it('displays unlock banner with correct data for an unlocked submission', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_FORM}
                        element={<StateSubmissionForm />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchHealthPlanPackageMock({
                                id: '15',
                                statusCode: 200,
                                submission: mockUnlockedHealthPlanPackage(),
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15/edit/documents',
                    },
                }
            )

            const banner = expect(await screen.findByTestId('unlockedBanner'))
            banner.toBeInTheDocument()
            banner.toHaveClass('usa-alert--info')
            banner.toHaveTextContent(
                /Unlocked on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+\s[a-zA-Z]+/i
            )
            banner.toHaveTextContent('Unlocked by: bob@dmas.mn.govUnlocked')
            banner.toHaveTextContent('Reason for unlock: Test unlock reason')
        })
    })

    describe('when user edits submission', () => {
        it('change draft submission description and navigate to contract details', async () => {
            const mockSubmission = mockDraftHealthPlanPackage({
                submissionDescription:
                    'A real submission but updated something',
            })
            const formData = base64ToDomain(
                mockSubmission.revisions[0].node.formDataProto
            )
            if (formData instanceof Error) throw Error

            formData.submissionDescription =
                'A real submission but updated something'

            const updatedFormData = domainToBase64(formData)

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_FORM}
                        element={<StateSubmissionForm />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchHealthPlanPackageMock({
                                submission: mockSubmission,
                                id: '15',
                                statusCode: 200,
                            }),
                            updateHealthPlanFormDataMockSuccess({
                                id: '15',
                                pkg: mockSubmission,
                                updatedFormData,
                            }),
                            fetchHealthPlanPackageMock({
                                id: '15',
                                statusCode: 200,
                            }),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/edit/type' },
                }
            )

            await waitFor(() =>
                expect(
                    screen.getByRole('form', { name: 'Submission Type Form' })
                ).toBeInTheDocument()
            )
            const textarea = await screen.findByRole('textbox', {
                name: 'Submission description',
            })
            userEvent.type(textarea, ' but updated something')

            const continueButton = await screen.findByRole('button', {
                name: 'Continue',
            })
            continueButton.click()
        })

        it('works even if other sections of the form have been filled out', async () => {
            const mockDocs: Document[] = [
                {
                    name: 'somedoc.pdf',
                    s3URL: 's3://bucketName/key/somedoc.pdf',
                    documentCategories: ['CONTRACT_RELATED'],
                },
            ]
            const mockSubmission = mockDraftHealthPlanPackage({
                id: '15',
                documents: mockDocs,
            })

            const formData = base64ToDomain(
                mockSubmission.revisions[0].node.formDataProto
            )
            if (formData instanceof Error) throw Error

            formData.submissionDescription =
                'A real submission but updated something'

            const updatedFormData = domainToBase64(formData)

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_FORM}
                        element={<StateSubmissionForm />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchHealthPlanPackageMock({
                                id: '15',
                                submission: mockSubmission,
                                statusCode: 200,
                            }),
                            updateHealthPlanFormDataMockSuccess({
                                id: '15',
                                pkg: mockSubmission,
                                updatedFormData,
                            }),
                            fetchHealthPlanPackageMock({
                                id: '15',
                                statusCode: 200,
                            }),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/edit/type' },
                }
            )
            await waitFor(() =>
                expect(
                    screen.getByRole('form', { name: 'Submission Type Form' })
                ).toBeInTheDocument()
            )

            const textarea = await screen.findByRole('textbox', {
                name: 'Submission description',
            })
            userEvent.type(textarea, ' but updated something')

            const continueButton = await screen.findByRole('button', {
                name: 'Continue',
            })
            continueButton.click()
        })
    })

    describe('errors', () => {
        it('shows a generic error fetching submission fails at submission type', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_FORM}
                        element={<StateSubmissionForm />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchHealthPlanPackageMock({
                                id: '15',
                                statusCode: 403,
                            }),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/edit/type' },
                }
            )

            const loading = await screen.findByText('System error')
            expect(loading).toBeInTheDocument()
        })

        it('shows a generic error fetching submission fails at contract details', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_FORM}
                        element={<StateSubmissionForm />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchHealthPlanPackageMock({
                                id: '15',
                                statusCode: 403,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15/edit/contract-details',
                    },
                }
            )

            const loading = await screen.findByText('System error')
            expect(loading).toBeInTheDocument()
        })

        it('shows a generic error fetching submission fails at documents', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_FORM}
                        element={<StateSubmissionForm />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchHealthPlanPackageMock({
                                id: '15',
                                statusCode: 403,
                            }),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/edit/documents' },
                }
            )

            const loading = await screen.findByText('System error')
            expect(loading).toBeInTheDocument()
        })
    })

    describe('the delete button', () => {
        // For this test, we want to mock the call to deleteFile to see when it gets called
        const mockS3 = testS3Client()
        const deleteCallKeys: string[] = []
        mockS3.deleteFile = async (key) => {
            deleteCallKeys.push(key)
        }

        it('does not delete files from past revisions', async () => {
            const submission = mockUnlockedHealthPlanPackageWithDocuments()
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_FORM}
                        element={<StateSubmissionForm />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchHealthPlanPackageMock({
                                id: '15',
                                statusCode: 200,
                                submission,
                            }),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/edit/documents' },
                    s3Provider: mockS3,
                }
            )

            // PERFORM

            // We should be able to find delete buttons for each of the three recent files.
            // the aria label for each button is a lifesaver here.
            const removeOneTwo = await screen.findByLabelText(
                'Remove one two document'
            )
            const removeTwoOne = await screen.findByLabelText(
                'Remove two one document'
            )
            const removeThreeOne = await screen.findByLabelText(
                'Remove three one document'
            )
            userEvent.click(removeOneTwo)
            userEvent.click(removeTwoOne)
            userEvent.click(removeThreeOne)

            // ASSERT
            // When deleting a file that exists in a previous revision, we should not see it's key
            // in the deleteCallKeys array.
            expect(deleteCallKeys).toEqual(['three-one'])
        })
    })
})
