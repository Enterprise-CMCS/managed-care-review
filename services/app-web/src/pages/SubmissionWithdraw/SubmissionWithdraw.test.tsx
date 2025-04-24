import { Route, Routes } from 'react-router'
import { waitFor, screen } from '@testing-library/react'
import { renderWithProviders } from '../../testHelpers'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { RoutesRecord } from '@mc-review/constants'
import { SubmissionSummary } from '../SubmissionSummary'
import { SubmissionWithdraw, shouldWarnOnWithdraw } from './SubmissionWithdraw'
import {
    fetchContractMockSuccess,
    fetchContractWithQuestionsMockSuccess,
    fetchCurrentUserMock,
    mockContractPackageSubmitted,
    mockContractPackageSubmittedWithQuestions,
    mockValidCMSUser,
    indexRatesStrippedWithRelatedContractsMockSuccess,
    withdrawContractMockFailure,
    withdrawContractMockSuccess,
} from '@mc-review/mocks'
import { RateStripped } from '../../gen/gqlClient'
import { Contract } from '../../gen/gqlClient'

describe('SubmissionWithdraw', () => {
    it('renders without errors', async () => {
        const contract = mockContractPackageSubmitted({
            id: 'test-abc-123',
        })
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSION_WITHDRAW}
                        element={<SubmissionWithdraw />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract,
                        }),
                        fetchContractMockSuccess({ contract }),
                        indexRatesStrippedWithRelatedContractsMockSuccess(
                            undefined,
                            ['123']
                        ),
                    ],
                },
                routerProvider: {
                    route: '/submission-reviews/test-abc-123/withdraw-submission',
                },
                featureFlags: {
                    'withdraw-submission': true,
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', {
                    name: 'Withdraw submission',
                    level: 2,
                })
            ).toBeInTheDocument()
            expect(
                screen.getByText('Reason for withdrawing the submission.')
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Withdraw submission' })
            ).toBeInTheDocument()
        })
    })

    it('can withdraw a submission', async () => {
        const contract =
            mockContractPackageSubmittedWithQuestions('test-abc-123')
        const withdrawnContract: Contract = {
            ...contract,
            reviewStatus: 'WITHDRAWN',
            consolidatedStatus: 'WITHDRAWN',
            status: 'RESUBMITTED',
            reviewStatusActions: [
                {
                    contractID: contract.id,
                    updatedAt: new Date(),
                    updatedBy: {
                        role: 'CMS_USER',
                        givenName: 'bob',
                        familyName: 'ddmas',
                        email: 'bob@dmas.mn.gov',
                    },
                    actionType: 'WITHDRAW',
                    updatedReason: 'a valid note',
                },
            ],
        }

        const { user } = renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSION_WITHDRAW}
                        element={<SubmissionWithdraw />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract,
                        }),
                        fetchContractMockSuccess({ contract }),
                        withdrawContractMockSuccess({ contractData: contract }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: withdrawnContract,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract: withdrawnContract,
                        }),
                        indexRatesStrippedWithRelatedContractsMockSuccess(
                            undefined,
                            ['123']
                        ),
                    ],
                },
                routerProvider: {
                    route: '/submission-reviews/test-abc-123/withdraw-submission',
                },
                featureFlags: {
                    'withdraw-submission': true,
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Withdraw submission' })
            ).toBeInTheDocument()
        })

        const withdrawBtn = screen.getByRole('button', {
            name: 'Withdraw submission',
        })
        const withdrawReasonInput = screen.getByTestId(
            'submissionWithdrawReason'
        )

        await user.type(withdrawReasonInput, 'a valid note')
        await user.click(withdrawBtn)

        await waitFor(() => {
            expect(
                screen.getByTestId('withdrawnSubmissionBanner')
            ).toBeInTheDocument()
        })
        expect(
            screen.getByText(
                'No action can be taken on this submission in its current status.'
            )
        ).toBeInTheDocument()
    })

    it('renders error banner on failed withdraw', async () => {
        const contract = mockContractPackageSubmitted({
            id: 'test-abc-123',
        })
        const { user } = renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSION_WITHDRAW}
                        element={<SubmissionWithdraw />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract,
                        }),
                        fetchContractMockSuccess({ contract }),
                        indexRatesStrippedWithRelatedContractsMockSuccess(
                            undefined,
                            ['123']
                        ),
                        withdrawContractMockFailure(),
                    ],
                },
                routerProvider: {
                    route: '/submission-reviews/test-abc-123/withdraw-submission',
                },
                featureFlags: {
                    'withdraw-submission': true,
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Withdraw submission' })
            ).toBeInTheDocument()
        })

        const withdrawBtn = screen.getByRole('button', {
            name: 'Withdraw submission',
        })
        const withdrawReasonInput = screen.getByTestId(
            'submissionWithdrawReason'
        )

        await user.type(withdrawReasonInput, 'reason for withdraw')
        await user.click(withdrawBtn)

        await waitFor(() => {
            expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        })
    })

    it('displays an error message if no reason is provided', async () => {
        const contract = mockContractPackageSubmitted({
            id: 'test-abc-123',
        })
        const { user } = renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSION_WITHDRAW}
                        element={<SubmissionWithdraw />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchContractWithQuestionsMockSuccess({
                            contract,
                        }),
                        fetchContractMockSuccess({ contract }),
                        indexRatesStrippedWithRelatedContractsMockSuccess(
                            undefined,
                            ['123']
                        ),
                    ],
                },
                routerProvider: {
                    route: '/submission-reviews/test-abc-123/withdraw-submission',
                },
                featureFlags: {
                    'withdraw-submission': true,
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.queryByTestId('submissionWithdrawReason')
            ).toBeInTheDocument()
        })

        const submitButton = screen.getByRole('button', {
            name: 'Withdraw submission',
        })
        await user.click(submitButton)

        await waitFor(() => {
            expect(
                screen.getByText(
                    'You must provide a reason for withdrawing this submission.'
                )
            ).toBeInTheDocument()
        })
    })
})

//Each rate object is just the bare bones data we need for the sake of testing
const ratesWithContractData = [
    // Case 1: Does withdraw - single child rate attached to submission being withdrawn
    {
        id: 'rate-1',
        consolidatedStatus: 'SUBMITTED',
        parentContractID: 'contract-to-be-withdrawn-ID',
        relatedContracts: [
            {
                id: 'contract-to-be-withdrawn-ID',
                consolidatedStatus: 'SUBMITTED',
            },
        ],
    },

    // Case 2: Does not withdraw - Same case as above but the rate was already withdrawn
    {
        id: 'rate-2',
        consolidatedStatus: 'WITHDRAWN', // Not in submitted status
        parentContractID: 'contract-to-be-withdrawn-ID',
        relatedContracts: [
            {
                id: 'contract-to-be-withdrawn-ID',
                consolidatedStatus: 'SUBMITTED',
            },
        ],
    },

    // Case 3: Does withdraw - Linked rate's parent is in a withdrawn state
    {
        id: 'rate-3',
        consolidatedStatus: 'SUBMITTED',
        parentContractID: 'contract-1',
        relatedContracts: [
            {
                id: 'contract-to-be-withdrawn-ID',
                consolidatedStatus: 'SUBMITTED',
            },
            { id: 'contract-1', consolidatedStatus: 'WITHDRAWN' }, //Rate's parent contract is in a withdrawn state
        ],
    },

    // Case 4: Does not withdraw - Linked rate's parent MUST be in a withdrawn state
    {
        id: 'rate-4',
        consolidatedStatus: 'SUBMITTED',
        parentContractID: 'contract-1',
        relatedContracts: [
            {
                id: 'contract-to-be-withdrawn-ID',
                consolidatedStatus: 'SUBMITTED',
            },
            { id: 'contract-1', consolidatedStatus: 'SUBMITTED' }, //Rate's parent contract is NOT in withdrawn state
        ],
    },

    // Case 5: Does not withdraw - in the case of mulitple related contracts,
    // if ANY of the related contracts (excluding the parent) are not in a WITHDRAWN state the rate
    // will not be withdrawn
    {
        id: 'rate-5',
        consolidatedStatus: 'SUBMITTED',
        parentContractID: 'contract-1',
        relatedContracts: [
            {
                id: 'contract-to-be-withdrawn-ID',
                consolidatedStatus: 'SUBMITTED',
            },
            { id: 'contract-1', consolidatedStatus: 'WITHDRAWN' },
            { id: 'contract-2', consolidatedStatus: 'SUBMITTED' }, //This one is not withdrawn so it returns false
            { id: 'contract-3', consolidatedStatus: 'WITHDRAWN' },
        ],
    },
]
const submissionToBeWithdrawnID = 'contract-to-be-withdrawn-ID'

describe('shouldWarnOnWithdraw function', () => {
    //The shouldWarnOnWithdraw function is what handles the logic in deciding whether or not a rate will
    //be displayed in the warning banner
    it.each([
        [ratesWithContractData[0], true], //Case 1
        [ratesWithContractData[1], false], //Case 2
        [ratesWithContractData[2], true], //Case 3
        [ratesWithContractData[3], false], //Case 4
        [ratesWithContractData[4], false], //Case 5
    ])('Rate: %s - Should return: %s', (rate, expected) => {
        expect(
            shouldWarnOnWithdraw(
                rate as RateStripped,
                submissionToBeWithdrawnID
            )
        ).toBe(expected)
    })
})
