import { screen } from '@testing-library/react'
import { Route } from 'react-router'
import { RoutesRecord } from '../../constants/routes'
import {
    fetchCurrentUserMock,
    fetchStateSubmission2MockSuccess,
    mockValidCMSUser,
    mockSubmittedSubmission2WithRevisions,
} from '../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { SubmissionRevisionSummary } from './SubmissionRevisionSummary'
import { dayjs } from '../../dateHelpers'

describe('SubmissionRevisionSummary', () => {
    it('renders correctly without errors', async () => {
        renderWithProviders(
            <Route
                path={RoutesRecord.SUBMISSIONS_REVISION}
                component={SubmissionRevisionSummary}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchStateSubmission2MockSuccess({
                            stateSubmission:
                                mockSubmittedSubmission2WithRevisions(),
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/revisions/1',
                },
            }
        )
        expect(
            await screen.findByRole('heading', { name: 'Contract details' })
        ).toBeInTheDocument()

        const submissionVersion = `${dayjs
            .utc('2022-03-24T01:19:46.154Z')
            .tz('America/New_York')
            .format('MM/DD/YY h:mma z')} ET version`
        expect(await screen.findByText(submissionVersion)).toBeInTheDocument()
    })
})
