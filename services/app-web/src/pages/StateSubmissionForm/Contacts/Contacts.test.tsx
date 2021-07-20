import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
    mockDraft,
    mockCompleteDraft,
    fetchCurrentUserMock,
    updateDraftSubmissionMock,
} from '../../../testHelpers/apolloHelpers'

import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { Contacts } from './Contacts'

describe('Contacts', () => {
    afterEach(() => jest.clearAllMocks())

    it('renders without errors', async () => {
        const mockUpdateDraftFn = jest.fn()
        renderWithProviders(
            <Contacts
                draftSubmission={mockDraft()}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            expect(screen.getByTestId('state-contacts')).toBeInTheDocument()
            expect(screen.getByLabelText('Name')).toBeInTheDocument()
            expect(screen.getByLabelText('Title/Role')).toBeInTheDocument()
            expect(screen.getByLabelText('Email')).toBeInTheDocument()
        })
    })

    it('checks saving state contacts correctly', async () => {
        const mockUpdateDraftFn = jest.fn()

        renderWithProviders(
            <Contacts
                draftSubmission={mockCompleteDraft()}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                    ],
                },
            }
        )

        expect(screen.getByLabelText('Name')).toHaveValue('Test Person')
        expect(screen.getByLabelText('Title/Role')).toHaveValue('A Role')
        expect(screen.getByLabelText('Email')).toHaveValue('test@test.com')
    })

})
