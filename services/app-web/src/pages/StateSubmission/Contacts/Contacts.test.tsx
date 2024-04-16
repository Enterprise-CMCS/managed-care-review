import { screen, waitFor } from '@testing-library/react'

import {
    mockDraft,
    mockContractAndRatesDraft,
    mockBaseContract,
    fetchCurrentUserMock,
} from '../../../testHelpers/apolloMocks'

import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { Contacts } from './'
import userEvent from '@testing-library/user-event'
import { UnlockedHealthPlanFormDataType } from '../../../common-code/healthPlanFormDataType'
import * as useRouteParams from '../../../hooks/useRouteParams'
import * as useHealthPlanPackageForm from '../../../hooks/useHealthPlanPackageForm'

describe('Contacts', () => {
    const mockUpdateDraftFn = jest.fn()
    beforeEach(() => {
        jest.spyOn(
            useHealthPlanPackageForm,
            'useHealthPlanPackageForm'
        ).mockReturnValue({
            updateDraft: mockUpdateDraftFn,
            createDraft: jest.fn(),
            showPageErrorMessage: false,
            draftSubmission: mockDraft(),
        })
        jest.spyOn(useRouteParams, 'useRouteParams').mockReturnValue({
            id: '123-abc',
        })
    })

    afterEach(() => {
        jest.clearAllMocks()
        jest.spyOn(
            useHealthPlanPackageForm,
            'useHealthPlanPackageForm'
        ).mockRestore()
        jest.spyOn(useRouteParams, 'useRouteParams').mockRestore()
    })

    const contractAndRatesWithEmptyContacts =
        (): UnlockedHealthPlanFormDataType => {
            const draft = {
                ...mockContractAndRatesDraft(),
                addtlActuaryContacts: [],
                stateContacts: [],
            }
            return draft
        }

    it('renders without errors', async () => {
        renderWithProviders(<Contacts />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() => {
            expect(screen.getByTestId('state-contacts')).toBeInTheDocument()
            expect(screen.getByText('State contacts 1')).toBeInTheDocument()
            expect(screen.getByLabelText('Name')).toBeInTheDocument()
            expect(screen.getByLabelText('Title/Role')).toBeInTheDocument()
            expect(screen.getByLabelText('Email')).toBeInTheDocument()
        })
    })

    it('displays correct form guidance for contract only submission', async () => {
        renderWithProviders(<Contacts />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        const requiredLabels = await screen.findAllByText('Required')
        expect(requiredLabels).toHaveLength(1)
        const optionalLabels = await screen.queryAllByText('Optional')
        expect(optionalLabels).toHaveLength(0)
    })

    it('checks saved mocked state contacts correctly', async () => {
        jest.spyOn(
            useHealthPlanPackageForm,
            'useHealthPlanPackageForm'
        ).mockImplementation(() => {
            return {
                createDraft: jest.fn(),
                updateDraft: mockUpdateDraftFn,
                showPageErrorMessage: false,
                draftSubmission: mockBaseContract(),
            }
        })

        renderWithProviders(<Contacts />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        // checks the submission values in apollohelper mock
        expect(screen.getByLabelText('Name')).toHaveValue('Test Person')
        expect(screen.getByLabelText('Title/Role')).toHaveValue('A Role')
        expect(screen.getByLabelText('Email')).toHaveValue('test@test.com')
    })

    it('should not error if whitespace added to email addresses', async () => {
        renderWithProviders(<Contacts />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        screen.getAllByLabelText('Name')[0].focus()
        await userEvent.paste('State Contact Person')

        screen.getAllByLabelText('Title/Role')[0].focus()
        await userEvent.paste('State Contact Title')

        screen.getAllByLabelText('Email')[0].focus()
        await userEvent.paste('statecontactwithtrailingwhitespace@test.com  ')

        const continueButton = screen.getByRole('button', {
            name: 'Continue',
        })

        continueButton.click()

        await waitFor(() => {
            // check that validations won't error
            expect(screen.queryAllByTestId('errorMessage')).toHaveLength(0)
            expect(
                screen.queryByText(/You must enter a valid email address/)
            ).toBeNull()

            // check that display value is trimmed which is default behavior for FieldTextInput
            expect(
                screen.queryByDisplayValue(
                    'statecontactwithtrailingwhitespace@test.com  '
                )
            ).toBeNull()
            expect(
                screen.getByDisplayValue(
                    'statecontactwithtrailingwhitespace@test.com'
                )
            ).toBeInTheDocument()
        })
    })

    it('should error and not continue if state contacts are not filled out', async () => {
        const mock = mockDraft()
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
        jest.spyOn(
            useHealthPlanPackageForm,
            'useHealthPlanPackageForm'
        ).mockImplementation(() => {
            return {
                createDraft: jest.fn(),
                updateDraft: mockUpdateDraftFn,
                showPageErrorMessage: false,
                draftSubmission: emptyContactsDraft,
            }
        })

        renderWithProviders(<Contacts />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        const continueButton = screen.getByRole('button', { name: 'Continue' })

        continueButton.click()

        await waitFor(() => {
            expect(screen.getAllByText('You must provide a name')).toHaveLength(
                2
            )
            expect(
                screen.getAllByText('You must provide a title/role')
            ).toHaveLength(2)
            expect(
                screen.getAllByText('You must provide an email address')
            ).toHaveLength(2)
        })
    })

    it('after "Add state contact" button click, should focus on the field name of the new contact', async () => {
        renderWithProviders(<Contacts />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })
        const addStateContactButton = screen.getByRole('button', {
            name: 'Add another state contact',
        })
        const firstContactName = screen.getByLabelText('Name')

        await userEvent.type(firstContactName, 'First person')
        expect(firstContactName).toHaveFocus()

        addStateContactButton.click()

        await waitFor(() => {
            expect(screen.getAllByLabelText('Name')).toHaveLength(2)
            const secondContactName = screen.getAllByLabelText('Name')[1]
            expect(firstContactName).toHaveValue('First person')
            expect(firstContactName).not.toHaveFocus()

            expect(secondContactName).toHaveValue('')
            expect(secondContactName).toHaveFocus()
        })
    })

    it('after state contact "Remove contact" button click, should focus on add new contact button', async () => {
        renderWithProviders(<Contacts />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })
        const addStateContactButton = screen.getByRole('button', {
            name: 'Add another state contact',
        })
        expect(addStateContactButton).toBeInTheDocument()
        await userEvent.click(addStateContactButton)

        expect(
            screen.getByRole('button', { name: 'Remove contact' })
        ).toBeInTheDocument()

        await userEvent.click(
            screen.getByRole('button', { name: 'Remove contact' })
        )

        expect(addStateContactButton).toHaveFocus()
    })

    it('when there are multiple state contacts, they should numbered', async () => {
        jest.spyOn(
            useHealthPlanPackageForm,
            'useHealthPlanPackageForm'
        ).mockImplementation(() => {
            return {
                createDraft: jest.fn(),
                updateDraft: mockUpdateDraftFn,
                showPageErrorMessage: false,
                draftSubmission: contractAndRatesWithEmptyContacts(),
            }
        })

        renderWithProviders(<Contacts />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })
        const addStateContactButton = screen.getByRole('button', {
            name: 'Add another state contact',
        })
        addStateContactButton.click()

        await waitFor(() => {
            expect(screen.getByText(/State contacts 1/)).toBeInTheDocument()
            expect(screen.getByText('State contacts 2')).toBeInTheDocument()
        })
    })
})
