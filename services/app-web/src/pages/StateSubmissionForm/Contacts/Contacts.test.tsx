import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
    mockDraft,
    mockCompleteDraft,
    fetchCurrentUserMock,
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

    it('checks saved mocked state contacts correctly', async () => {
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

        // checks the submission values in apollohelper mock
        expect(screen.getByLabelText('Name')).toHaveValue('Test Person')
        expect(screen.getByLabelText('Title/Role')).toHaveValue('A Role')
        expect(screen.getByLabelText('Email')).toHaveValue('test@test.com')
    })

    it('it should error and not continue if state contacts are not filled out', async () => {
        const mock = mockDraft()
        const mockUpdateDraftFn = jest.fn()
        const emptyContactsDraft = {
            ...mock,
            stateContacts : [
                {
                    name: '',
                    titleRole: '',
                    email: '',
                }
            ]
        }

        renderWithProviders(
            <Contacts
                draftSubmission={emptyContactsDraft}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        const continueButton = screen.getByRole('button', { name: 'Continue' })

        continueButton.click()

        await waitFor(() => {
            expect(
                screen.getByText('You must provide a name')
            ).toBeInTheDocument()
            expect(
                screen.getByText('You must provide a title/role')
            ).toBeInTheDocument()
            expect(
                screen.getByText('You must provide an email address')
            ).toBeInTheDocument()
        })
    })

})
