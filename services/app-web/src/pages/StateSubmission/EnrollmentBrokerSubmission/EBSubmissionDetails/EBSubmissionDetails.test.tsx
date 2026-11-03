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
import { EBSubmissionDetails } from './EBSubmissionDetails'

const ebDraft = mockContractPackageDraft({
    id: 'eb-draft-123',
    contractSubmissionType: 'ENROLLMENT_BROKER',
})

// Records each createContract call so tests can check its variables and call count
type CreateContractResultFn = Mock<
    (
        variables: CreateContractMutationVariables
    ) => ApolloLink.Result<CreateContractMutation>
>

const createContractSuccess: ApolloLink.Result<CreateContractMutation> = {
    data: { createContract: { contract: ebDraft } },
}

const createContractFailure: ApolloLink.Result<CreateContractMutation> = {
    errors: [new GraphQLError('Error attempting to submit.')],
}

// The input the placeholder page is expected to send to createContract
const expectedCreateInput = {
    input: {
        contractSubmissionType: 'ENROLLMENT_BROKER',
        submissionType: 'CONTRACT_ONLY',
        contractType: 'BASE',
        populationCovered: 'MEDICAID',
        programIDs: [],
        submissionDescription: 'Placeholder Enrollment Broker submission',
    },
}

// A createContract mock that matches any variables and records every call,
// so tests can assert on the exact input and on how many times it ran.
const createContractSpyMock = (resultFn: CreateContractResultFn) => ({
    request: { query: CreateContractDocument, variables: () => true },
    result: resultFn,
    maxUsageCount: Number.POSITIVE_INFINITY,
})

const renderNewEBSubmission = (
    createContractResult: CreateContractResultFn,
    onLocation?: (location: Location) => Location
) =>
    renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
                element={<EBSubmissionDetails />}
            />
            <Route
                path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                element={<div data-testid="contract-details-page" />}
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
            routerProvider: { route: '/submissions/new/eb' },
            location: onLocation,
        }
    )

describe('EBSubmissionDetails', () => {
    it('renders the placeholder inside the form skeleton', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
                    element={<EBSubmissionDetails />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: { route: '/submissions/new/eb' },
            }
        )

        expect(
            await screen.findByTestId('eb-submission-details-placeholder')
        ).toBeInTheDocument()
        expect(screen.getByTestId('SubmissionDetails')).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Save & Continue' })
        ).not.toHaveAttribute('aria-disabled', 'true')
    })

    it('returns to the dashboard on Cancel', async () => {
        let testLocation: Location | undefined
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
                    element={<EBSubmissionDetails />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: { route: '/submissions/new/eb' },
                location: (location) => (testLocation = location),
            }
        )

        await userEvent.click(
            await screen.findByRole('button', { name: 'Cancel' })
        )
        expect(testLocation?.pathname).toBe(RoutesRecord.DASHBOARD_SUBMISSIONS)
    })

    describe('Save & Continue', () => {
        it('creates an EB draft with the placeholder input', async () => {
            const createContractResult: CreateContractResultFn = vi.fn(
                () => createContractSuccess
            )
            renderNewEBSubmission(createContractResult)

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

        it('navigates to Contract details using the returned draft ID', async () => {
            let testLocation: Location | undefined
            renderNewEBSubmission(
                vi.fn(() => createContractSuccess),
                (location) => (testLocation = location)
            )

            await userEvent.click(
                await screen.findByRole('button', { name: 'Save & Continue' })
            )

            expect(
                await screen.findByTestId('contract-details-page')
            ).toBeInTheDocument()
            expect(testLocation?.pathname).toBe(
                '/submissions/eb/eb-draft-123/edit/contract-details'
            )
        })

        it('shows the error banner and allows a retry after a failed create', async () => {
            let testLocation: Location | undefined
            const createContractResult: CreateContractResultFn = vi
                .fn()
                .mockReturnValueOnce(createContractFailure)
                .mockReturnValueOnce(createContractSuccess)
            renderNewEBSubmission(
                createContractResult,
                (location) => (testLocation = location)
            )

            // First attempt fails: banner shows and the user stays on the page
            await userEvent.click(
                await screen.findByRole('button', { name: 'Save & Continue' })
            )

            expect(await screen.findByText('System error')).toBeInTheDocument()
            expect(testLocation?.pathname).toBe('/submissions/new/eb')
            expect(createContractResult).toHaveBeenCalledTimes(1)

            // Button is usable again once the failed request settles
            const retryButton = await screen.findByRole('button', {
                name: 'Save & Continue',
            })
            expect(retryButton).not.toHaveAttribute('aria-disabled', 'true')

            // Retry succeeds with the same input and navigates on
            await userEvent.click(retryButton)

            expect(
                await screen.findByTestId('contract-details-page')
            ).toBeInTheDocument()
            expect(testLocation?.pathname).toBe(
                '/submissions/eb/eb-draft-123/edit/contract-details'
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
                        element={<EBSubmissionDetails />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
                        element={<div data-testid="contract-details-page" />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({ contract: ebDraft }),
                            createContractSpyMock(createContractResult),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eb/eb-draft-123/edit/type',
                    },
                    location: (location) => (testLocation = location),
                }
            )

            // Editing an existing draft uses the EDIT_FIRST variant, labelled "Continue"
            await userEvent.click(
                await screen.findByRole('button', { name: 'Continue' })
            )

            expect(
                await screen.findByTestId('contract-details-page')
            ).toBeInTheDocument()
            expect(testLocation?.pathname).toBe(
                '/submissions/eb/eb-draft-123/edit/contract-details'
            )
            expect(createContractResult).not.toHaveBeenCalled()
        })
    })
})
