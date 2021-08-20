import { screen, waitFor } from '@testing-library/react'

import {
    mockDraft,
    mockContactAndRatesDraft,
    mockCompleteDraft,
    fetchCurrentUserMock,
} from '../../../testHelpers/apolloHelpers'

import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { Contacts } from './Contacts'
import userEvent from '@testing-library/user-event'

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
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        // checks the submission values in apollohelper mock
        expect(screen.getByLabelText('Name')).toHaveValue('Test Person')
        expect(screen.getByLabelText('Title/Role')).toHaveValue('A Role')
        expect(screen.getByLabelText('Email')).toHaveValue('test@test.com')
    })

    it('should error and not continue if state contacts are not filled out', async () => {
        const mock = mockDraft()
        const mockUpdateDraftFn = jest.fn()
        const emptyContactsDraft = {
            ...mock,
            stateContacts: [
                {
                    name: '',
                    titleRole: '',
                    email: '',
                },
            ],
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

    it('after "Add state contact" button click, should focus on the field name of the new contact', async () => {
        const mock = mockDraft()
        const mockUpdateDraftFn = jest.fn()

        renderWithProviders(
            <Contacts draftSubmission={mock} updateDraft={mockUpdateDraftFn} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        const addStateContactButton = screen.getByRole('button', {
            name: 'Add state contact',
        })
        const firstContactName = screen.getByLabelText('Name')

        userEvent.type(firstContactName, 'First person')
        expect(firstContactName).toHaveFocus()

        addStateContactButton.click()

        await waitFor(() => {
            expect(screen.getAllByLabelText('Name').length).toBe(2)
            const secondContactName = screen.getAllByLabelText('Name')[1]
            expect(firstContactName).toHaveValue('First person')
            expect(firstContactName).not.toHaveFocus()

            expect(secondContactName).toHaveValue('')
            expect(secondContactName).toHaveFocus()
        })
    })

    it('after "Add actuary contact" button click, it should focus on the field name of the new actuarycontact', async () => {
        const mock = mockContactAndRatesDraft()
        const mockUpdateDraftFn = jest.fn()

        renderWithProviders(
            <Contacts draftSubmission={mock} updateDraft={mockUpdateDraftFn} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        const addActuaryContactButton = screen.getByRole('button', {
            name: 'Add actuary contact',
        })
        const firstActuaryContactName = screen.getAllByLabelText('Name')[1]

        userEvent.type(firstActuaryContactName, 'First actuary person')
        expect(firstActuaryContactName).toHaveFocus()

        addActuaryContactButton.click()

        await waitFor(() => {
            expect(screen.getByText('Add actuary contact')).toBeInTheDocument()

            expect(screen.getAllByLabelText('Name').length).toBe(3)

            const secondActuaryContactName = screen.getAllByLabelText('Name')[2]
            expect(firstActuaryContactName).toHaveValue('First actuary person')
            expect(firstActuaryContactName).not.toHaveFocus()

            expect(secondActuaryContactName).toHaveValue('')
            expect(secondActuaryContactName).toHaveFocus()
        })
    })

    it('after state contact "Remove contact" button click, should focus on add new contact button', async () => {
        const mock = mockDraft()
        const mockUpdateDraftFn = jest.fn()

        renderWithProviders(
            <Contacts draftSubmission={mock} updateDraft={mockUpdateDraftFn} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        const addStateContactButton = screen.getByRole('button', {
            name: 'Add state contact',
        })
        addStateContactButton.click()

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Remove contact' })
            ).toBeInTheDocument()

            userEvent.click(
                screen.getByRole('button', { name: 'Remove contact' })
            )

            expect(addStateContactButton).toHaveFocus()
        })
    })

    it('after actuary contact "Remove contact" button click, should focus on add new actuary contact button', async () => {
        const mock = mockContactAndRatesDraft()
        const mockUpdateDraftFn = jest.fn()

        renderWithProviders(
            <Contacts draftSubmission={mock} updateDraft={mockUpdateDraftFn} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        const addActuaryContactButton = screen.getByRole('button', {
            name: 'Add actuary contact',
        })
        addActuaryContactButton.click()

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Remove contact' })
            ).toBeInTheDocument()

            userEvent.click(
                screen.getByRole('button', { name: 'Remove contact' })
            )

            expect(addActuaryContactButton).toHaveFocus()
        })
    })
})
