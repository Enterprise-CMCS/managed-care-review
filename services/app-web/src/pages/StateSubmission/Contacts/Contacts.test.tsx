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

    it('displays correct form guidance for contract and rates submission', async () => {
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

        const requiredLabels = await screen.findAllByText('Required')
        expect(requiredLabels).toHaveLength(2)
        const optionalLabels = await screen.queryAllByText('Optional')
        expect(optionalLabels).toHaveLength(0)
        expect(
            screen.getByText('Additional Actuary Contacts')
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Provide contact information for any additional actuaries who worked directly on this submission.'
            )
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Add actuary contact' })
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Communication preference between CMS Office of the Actuary (OACT) and all state’s actuaries (i.e. certifying actuaries and additional actuary contacts)'
            )
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'OACT can communicate directly with the state’s actuaries but should copy the state on all written communication and all appointments for verbal discussions.'
            )
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'OACT can communicate directly with the state, and the state will relay all written communication to their actuaries and set up time for any potential verbal discussions.'
            )
        ).toBeInTheDocument()
        expect(screen.queryAllByTestId('actuary-contact')).toHaveLength(0)
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

    it('after "Add actuary contact" button click, it should focus on the field name of the new actuary contact', async () => {
        const mock = contractAndRatesWithEmptyContacts()
        jest.spyOn(
            useHealthPlanPackageForm,
            'useHealthPlanPackageForm'
        ).mockImplementation(() => {
            return {
                createDraft: jest.fn(),
                updateDraft: mockUpdateDraftFn,
                showPageErrorMessage: false,
                draftSubmission: mock,
            }
        })

        renderWithProviders(<Contacts />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        const addActuaryContactButton = screen.getByRole('button', {
            name: 'Add actuary contact',
        })

        addActuaryContactButton.click()

        await waitFor(() => {
            expect(screen.getByText('Add actuary contact')).toBeInTheDocument()

            expect(screen.getAllByLabelText('Name')).toHaveLength(2)

            const firstActuaryContactName = screen.getAllByLabelText('Name')[1]

            expect(firstActuaryContactName).toHaveValue('')
            expect(firstActuaryContactName).toHaveFocus()
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

    it('after actuary contact "Remove contact" button click, should focus on add new actuary contact button', async () => {
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
        const addActuaryContactButton = screen.getByRole('button', {
            name: 'Add actuary contact',
        })
        await userEvent.click(addActuaryContactButton)

        expect(
            screen.getByRole('button', { name: 'Remove contact' })
        ).toBeInTheDocument()

        await userEvent.click(
            screen.getByRole('button', { name: 'Remove contact' })
        )

        expect(addActuaryContactButton).toHaveFocus()
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

    it('when there are multiple actuary contacts, they should numbered', async () => {
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
        const addActuaryContactButton = screen.getByRole('button', {
            name: 'Add actuary contact',
        })
        addActuaryContactButton.click()
        addActuaryContactButton.click()
        await waitFor(() => {
            expect(
                screen.getByText('Additional actuary contact 1')
            ).toBeInTheDocument()
            expect(
                screen.getByText('Additional actuary contact 2')
            ).toBeInTheDocument()
        })
    })

    /* This test is likely to time out if we use userEvent.type().  Converted to .paste() */
    it('when there are multiple state and actuary contacts, remove button works as expected', async () => {
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

        screen.getAllByLabelText('Name')[0].focus()
        await userEvent.paste('State Contact Person')

        screen.getAllByLabelText('Title/Role')[0].focus()
        await userEvent.paste('State Contact Title')

        screen.getAllByLabelText('Email')[0].focus()
        await userEvent.paste('statecontact@test.com')

        // add additional actuary contact
        const addActuaryContactButton = screen.getByRole('button', {
            name: 'Add actuary contact',
        })
        addActuaryContactButton.click()

        await waitFor(() => {
            expect(
                screen.getByText('Additional actuary contact 1')
            ).toBeInTheDocument()
        })

        // fill out additional actuary contact 1
        screen.getAllByLabelText('Name')[1].focus()
        await userEvent.paste('Actuary Contact Person')

        screen.getAllByLabelText('Title/Role')[1].focus()
        await userEvent.paste('Actuary Contact Title')

        screen.getAllByLabelText('Email')[1].focus()
        await userEvent.paste('actuarycontact@test.com')

        await userEvent.click(screen.getAllByLabelText('Mercer')[0])

        await userEvent.click(
            screen.getByText(
                `OACT can communicate directly with the state’s actuaries but should copy the state on all written communication and all appointments for verbal discussions.`
            )
        )

        // Add additional state contact
        await userEvent.click(
            screen.getByRole('button', {
                name: /Add another state contact/,
            })
        )

        screen.getAllByLabelText('Name')[1].focus()
        await userEvent.paste('State Contact Person 2')

        screen.getAllByLabelText('Title/Role')[1].focus()
        await userEvent.paste('State Contact Title 2')

        screen.getAllByLabelText('Email')[1].focus()
        await userEvent.paste('statecontact2@test.com')

        expect(screen.queryAllByTestId('errorMessage')).toHaveLength(0)

        // Add additional actuary contact
        addActuaryContactButton.click()

        screen.getAllByLabelText('Name')[1].focus()
        await userEvent.paste('Actuary Contact Person 2')

        screen.getAllByLabelText('Title/Role')[1].focus()
        await userEvent.paste('Actuary Contact Title 2')

        screen.getAllByLabelText('Email')[1].focus()
        await userEvent.paste('actuarycontact2@test.com')

        await userEvent.click(screen.getAllByLabelText('Mercer')[1])

        // Remove additional state contact
        expect(
            screen.getAllByRole('button', { name: /Remove contact/ })
        ).toHaveLength(3) // there are two remove contact buttons on screen, one for state one for actuary
        await userEvent.click(
            screen.getAllByRole('button', { name: /Remove contact/ })[0]
        )

        expect(screen.queryByText('State contact 2')).toBeNull()
        expect(
            screen.queryByText('Additional actuary contact 2')
        ).toBeInTheDocument()
        expect(
            screen.queryByText('Additional actuary contact 1')
        ).toBeInTheDocument()

        // Remove additional actuary contacts
        expect(
            screen.getAllByRole('button', { name: /Remove contact/ })
        ).toHaveLength(2) // there are 2 remove contact buttons on screen, for actuary

        //Remove actuary contact 2
        await userEvent.click(
            screen.getAllByRole('button', { name: /Remove contact/ })[0]
        )

        expect(screen.queryByText('Additional actuary contact 2')).toBeNull()
        expect(
            screen.queryByText('Additional actuary contact 1')
        ).toBeInTheDocument()

        //Remove actuary contact 1
        await userEvent.click(
            screen.getAllByRole('button', { name: /Remove contact/ })[0]
        )

        expect(screen.queryByText('Additional actuary contact 1')).toBeNull()
    })
})
