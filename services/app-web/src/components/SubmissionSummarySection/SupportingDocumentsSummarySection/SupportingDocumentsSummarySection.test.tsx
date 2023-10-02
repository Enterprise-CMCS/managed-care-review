import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { SupportingDocumentsSummarySection } from './SupportingDocumentsSummarySection'
import {
    fetchCurrentUserMock,
    mockContractAndRatesDraft,
    mockStateSubmission,
} from '../../../testHelpers/apolloMocks'

describe('SupportingDocumentsSummarySection', () => {
    const draftSubmission = mockContractAndRatesDraft()
    const stateSubmission = mockStateSubmission()

    it('can render uncategorized documents in draft submission without errors', async () => {
        const testSubmission = {
            ...draftSubmission,
            documents: [
                {
                    s3URL: 's3://foo/bar/test-1',
                    name: 'supporting docs test 1',
                    sha256: 'fakesha',
                    documentCategories: ['CONTRACT_RELATED' as const],
                },
                {
                    s3URL: 's3://foo/bar/test-2',
                    name: 'supporting docs test 2',
                    sha256: 'fakesha',
                    documentCategories: ['RATES_RELATED' as const],
                },
                {
                    s3URL: 's3://foo/bar/test-3',
                    name: 'supporting docs test 3',
                    sha256: 'fakesha',
                    documentCategories: [],
                },
            ],
        }

        renderWithProviders(
            <SupportingDocumentsSummarySection
                submission={testSubmission}
                navigateTo="documents"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', {
                    level: 2,
                    name: 'Supporting documents',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('link', { name: 'Edit Supporting documents' })
            ).toHaveAttribute('href', '/documents')
            expect(screen.queryByText('supporting docs test 2')).toBeNull()
            expect(
                screen.getByText('supporting docs test 3')
            ).toBeInTheDocument()
        })
    })

    it('can render uncategorized documents state submission without errors', async () => {
        const testSubmission = {
            ...stateSubmission,
            documents: [
                {
                    s3URL: 's3://foo/bar/test-1',
                    name: 'supporting docs test 1',
                    sha256: 'fakesha',
                    documentCategories: [],
                },
                {
                    s3URL: 's3://foo/bar/test-2',
                    name: 'supporting docs test 2',
                    sha256: 'fakesha',
                    documentCategories: [],
                },
            ],
        }

        renderWithProviders(
            <SupportingDocumentsSummarySection submission={testSubmission} />
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', {
                    level: 2,
                    name: 'Supporting documents',
                })
            ).toBeInTheDocument()

            expect(screen.queryByText('Edit')).not.toBeInTheDocument()
            expect(
                screen.getByText('supporting docs test 1')
            ).toBeInTheDocument()
            expect(
                screen.getByText('supporting docs test 2')
            ).toBeInTheDocument()
        })
    })
})
