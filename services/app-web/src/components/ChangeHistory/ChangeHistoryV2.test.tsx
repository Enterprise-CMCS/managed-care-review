import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { ChangeHistoryV2 as ChangeHistory } from './ChangeHistoryV2'
import {
    mockContractPackageSubmitted,
    fetchCurrentUserMock,
    mockValidStateUser,
    mockValidCMSUser,
    mockContractPackageUnlocked,
} from '../../testHelpers/apolloMocks'

describe('SubmissionTypeSummarySection', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })
    const submittedContract = mockContractPackageSubmitted()

    it('can render history for initial submission', () => {
        renderWithProviders(<ChangeHistory contract={submittedContract} />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidCMSUser(),
                        statusCode: 200,
                    }),
                ],
            },
        })

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Change history',
            })
        ).toBeInTheDocument()

        expect(screen.getByText(`contract submit`)).toBeInTheDocument()
    })

    it('can render change history for unlocked submission', () => {
        renderWithProviders(
            <ChangeHistory contract={mockContractPackageUnlocked()} />,
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
        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Change history',
            })
        ).toBeInTheDocument()

        expect(screen.getByText(`unlocked for a test`)).toBeInTheDocument()
    })
})
