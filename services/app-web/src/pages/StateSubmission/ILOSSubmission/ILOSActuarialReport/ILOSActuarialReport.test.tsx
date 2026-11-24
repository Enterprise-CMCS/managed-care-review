import { screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { Location, Route, Routes } from 'react-router-dom'
import { GraphQLError } from 'graphql'
import type { Mock } from 'vitest'
import type { ApolloLink } from '@apollo/client'
import { RoutesRecord } from '@mc-review/constants'
import {
    fetchContractMockSuccess,
    fetchCurrentUserMock,
    mockContractPackageDraft,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../../../testHelpers'
import {
    CreateContractDocument,
    CreateContractMutation,
    CreateContractMutationVariables,
} from '../../../../gen/gqlClient'
import { ILOSActuarialReport } from './ILOSActuarialReport'
import { Header } from '../../../../components/Header'
import { NewSubmissionForm } from '../../SharedSubmissionComponents/NewSubmissionForm/NewSubmissionForm'

const ilosDraft = mockContractPackageDraft({
    id: 'ilos-draft-123',
    contractSubmissionType: 'ILOS',
})

// Where Save & Continue should land for the draft above
const ASSOCIATED_RATE_CERTIFICATIONS_PATH =
    '/submissions/ilos/ilos-draft-123/edit/associated-rate-certifications'

// Records each createContract call so tests can check its variables and call count
type CreateContractResultFn = Mock<
    (
        variables: CreateContractMutationVariables
    ) => ApolloLink.Result<CreateContractMutation>
>

const createContractSuccess: ApolloLink.Result<CreateContractMutation> = {
    data: { createContract: { contract: ilosDraft } },
}

const createContractFailure: ApolloLink.Result<CreateContractMutation> = {
    errors: [new GraphQLError('Error attempting to submit.')],
}

// The input the placeholder page is expected to send to createContract
const expectedCreateInput = {
    input: {
        contractSubmissionType: 'ILOS',
        submissionType: 'CONTRACT_AND_RATES',
        contractType: 'BASE',
        programIDs: [],
        submissionDescription: 'Placeholder ILOS submission',
        ilosRateDateStart: '2025-01-01',
        ilosRateDateEnd: '2025-12-31',
        ilosDocuments: [
            {
                name: 'placeholder-ilos-report.pdf',
                s3URL: 's3://bucketname/key/placeholder-ilos-report.pdf',
                sha256: 'placeholder-sha256',
            },
        ],
    },
}

// A createContract mock that matches any variables and records every call,
// so tests can assert on the exact input and on how many times it ran.
const createContractSpyMock = (resultFn: CreateContractResultFn) => ({
    request: { query: CreateContractDocument, variables: () => true },
    result: resultFn,
    maxUsageCount: Number.POSITIVE_INFINITY,
})

const renderNewILOSSubmission = (
    createContractResult: CreateContractResultFn,
    onLocation?: (location: Location) => Location
) =>
    renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
                element={<ILOSActuarialReport />}
            />
            <Route
                path={RoutesRecord.SUBMISSIONS_ASSOCIATED_RATE_CERTIFICATIONS}
                element={
                    <div data-testid="associated-rate-certifications-page" />
                }
            />
        </Routes>,
        {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    fetchCurrentUserMock({ statusCode: 200 }),
                    createContractSpyMock(createContractResult),
                ],
            },
            routerProvider: { route: '/submissions/new/ilos' },
            location: onLocation,
        }
    )

describe('ILOSActuarialReport', () => {
    const renderPage = (onLocation?: (location: Location) => Location) =>
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
                    element={<ILOSActuarialReport />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: { route: '/submissions/new/ilos' },
                location: onLocation,
            }
        )

    it('renders the placeholder with Save & Continue', async () => {
        renderPage()

        expect(
            await screen.findByTestId('ilos-submission-details-placeholder')
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Save & Continue' })
        ).toBeInTheDocument()
    })

    it('renders the ILOS steps with the first step current', async () => {
        renderPage()

        expect(
            await screen.findByRole('heading', {
                level: 2,
                name: /Step\s*1\s*of 4\s*ILOS actuarial report/,
            })
        ).toBeInTheDocument()
        expect(
            screen.getByText('Associated rate certifications')
        ).toBeInTheDocument()
        expect(screen.getByText('Contacts')).toBeInTheDocument()
        expect(screen.getByText('Review and submit')).toBeInTheDocument()
    })

    it('shows ILOS as the contract type in the page header', async () => {
        renderWithProviders(
            <>
                <Header authMode="AWS_COGNITO" />
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
                        element={<NewSubmissionForm />}
                    />
                </Routes>
            </>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchCurrentUserMock({ statusCode: 200 }),
                    ],
                },
                routerProvider: { route: '/submissions/new/ilos' },
            }
        )

        expect(await screen.findByTestId('contractType')).toHaveTextContent(
            'ILOS'
        )
    })

    it('returns to the dashboard on Cancel', async () => {
        let testLocation: Location | undefined
        renderPage((location) => (testLocation = location))

        await userEvent.click(
            await screen.findByRole('button', { name: 'Cancel' })
        )

        expect(testLocation?.pathname).toBe(RoutesRecord.DASHBOARD_SUBMISSIONS)
    })

    describe('Save & Continue', () => {
        it('creates an ILOS draft with the placeholder input', async () => {
            const createContractResult: CreateContractResultFn = vi.fn(
                () => createContractSuccess
            )
            renderNewILOSSubmission(createContractResult)

            await userEvent.click(
                await screen.findByRole('button', { name: 'Save & Continue' })
            )

            await waitFor(() =>
                expect(createContractResult).toHaveBeenCalledTimes(1)
            )
            expect(createContractResult).toHaveBeenCalledWith(
                expectedCreateInput
            )
        })

        it('navigates to Associated rate certifications using the returned draft ID', async () => {
            let testLocation: Location | undefined
            renderNewILOSSubmission(
                vi.fn(() => createContractSuccess),
                (location) => (testLocation = location)
            )

            await userEvent.click(
                await screen.findByRole('button', { name: 'Save & Continue' })
            )

            expect(
                await screen.findByTestId('associated-rate-certifications-page')
            ).toBeInTheDocument()
            expect(testLocation?.pathname).toBe(
                ASSOCIATED_RATE_CERTIFICATIONS_PATH
            )
        })

        it('shows the error banner and allows a retry after a failed create', async () => {
            let testLocation: Location | undefined
            const createContractResult: CreateContractResultFn = vi
                .fn()
                .mockReturnValueOnce(createContractFailure)
                .mockReturnValueOnce(createContractSuccess)
            renderNewILOSSubmission(
                createContractResult,
                (location) => (testLocation = location)
            )

            // First attempt fails: banner shows and the user stays on the page
            await userEvent.click(
                await screen.findByRole('button', { name: 'Save & Continue' })
            )

            expect(await screen.findByText('System error')).toBeInTheDocument()
            expect(testLocation?.pathname).toBe('/submissions/new/ilos')
            expect(createContractResult).toHaveBeenCalledTimes(1)

            // Button is usable again once the failed request settles
            const retryButton = await screen.findByRole('button', {
                name: 'Save & Continue',
            })
            expect(retryButton).not.toHaveAttribute('aria-disabled', 'true')

            // Retry succeeds with the same input and navigates on
            await userEvent.click(retryButton)

            expect(
                await screen.findByTestId('associated-rate-certifications-page')
            ).toBeInTheDocument()
            expect(testLocation?.pathname).toBe(
                ASSOCIATED_RATE_CERTIFICATIONS_PATH
            )
            expect(createContractResult).toHaveBeenCalledTimes(2)
            expect(createContractResult).toHaveBeenNthCalledWith(
                2,
                expectedCreateInput
            )
        })

        it('continues an existing draft without creating another contract', async () => {
            let testLocation: Location | undefined
            const createContractResult: CreateContractResultFn = vi.fn(
                () => createContractSuccess
            )

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_TYPE}
                        element={<ILOSActuarialReport />}
                    />
                    <Route
                        path={
                            RoutesRecord.SUBMISSIONS_ASSOCIATED_RATE_CERTIFICATIONS
                        }
                        element={
                            <div data-testid="associated-rate-certifications-page" />
                        }
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({ contract: ilosDraft }),
                            createContractSpyMock(createContractResult),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/ilos/ilos-draft-123/edit/type',
                    },
                    location: (location) => (testLocation = location),
                }
            )

            // Editing an existing draft uses the EDIT_FIRST variant, labelled "Continue"
            await userEvent.click(
                await screen.findByRole('button', { name: 'Continue' })
            )

            expect(
                await screen.findByTestId('associated-rate-certifications-page')
            ).toBeInTheDocument()
            expect(testLocation?.pathname).toBe(
                ASSOCIATED_RATE_CERTIFICATIONS_PATH
            )
            expect(createContractResult).not.toHaveBeenCalled()
        })
    })
})
