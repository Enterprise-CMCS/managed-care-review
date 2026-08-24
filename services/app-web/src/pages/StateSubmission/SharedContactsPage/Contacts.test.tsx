import { screen, waitFor } from '@testing-library/react'

import { Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { Contacts } from './index'
import userEvent from '@testing-library/user-event'
import {
    fetchCurrentUserMock,
    fetchContractMockSuccess,
    mockContractPackageUnlockedWithUnlockedType,
} from '@mc-review/mocks'

describe('Contacts', () => {
    it('renders without errors', async () => {
        const draftContract = mockContractPackageUnlockedWithUnlockedType()
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_CONTACTS}
                    element={<Contacts />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...draftContract,
                                id: '15',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/15/edit/contacts',
                },
                featureFlags: {
                    'contact-data-model-update': true,
                },
            }
        )

        await waitFor(() => {
            expect(screen.getByTestId('state-contacts')).toBeInTheDocument()
            expect(screen.getByText('State contacts 1')).toBeInTheDocument()
            expect(screen.getByLabelText('First name')).toBeInTheDocument()
            expect(screen.getByLabelText('Last name')).toBeInTheDocument()
            expect(screen.getByLabelText('Suffix')).toBeInTheDocument()
            expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
            expect(screen.getByLabelText('Title/Role')).toBeInTheDocument()
            expect(screen.getByLabelText('Email')).toBeInTheDocument()
        })
    })

    it('displays correct form guidance for contract only submission', async () => {
        const draftContract = mockContractPackageUnlockedWithUnlockedType()
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_CONTACTS}
                    element={<Contacts />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...draftContract,
                                id: '15',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/15/edit/contacts',
                },
                featureFlags: {
                    'contact-data-model-update': true,
                },
            }
        )

        // First name, last name, title/role, and email are required. Suffix is
        // optional.
        const requiredLabels = await screen.findAllByText('Required')
        expect(requiredLabels).toHaveLength(4)
        const optionalLabels = await screen.queryAllByText('Optional')
        expect(optionalLabels).toHaveLength(1)
    })

    it('checks saved mocked state contacts correctly', async () => {
        const draftContract = mockContractPackageUnlockedWithUnlockedType()
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_CONTACTS}
                    element={<Contacts />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...draftContract,
                                id: '15',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/15/edit/contacts',
                },
                featureFlags: {
                    'contact-data-model-update': true,
                },
            }
        )
        await screen.findAllByText('Contacts')

        // checks the submission values in apollohelper mock
        expect(screen.getByLabelText('First name')).toHaveValue('State')
        expect(screen.getByLabelText('Last name')).toHaveValue('Contact')
        expect(screen.getByLabelText('Suffix')).toHaveValue('1')
        expect(screen.getByLabelText('Title/Role')).toHaveValue(
            'Test State Contact 1'
        )
        expect(screen.getByLabelText('Email')).toHaveValue(
            'actuarycontact1@test.com'
        )
    })

    it('should not error if whitespace added to email addresses', async () => {
        const draftContract = mockContractPackageUnlockedWithUnlockedType()
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_CONTACTS}
                    element={<Contacts />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...draftContract,
                                id: '15',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/15/edit/contacts',
                },
                featureFlags: {
                    'contact-data-model-update': true,
                },
            }
        )
        await screen.findAllByText('Contacts')

        const firstName = screen.getAllByLabelText('First name')[0]
        firstName.focus()
        await userEvent.clear(firstName)
        await userEvent.paste('State')

        const lastName = screen.getAllByLabelText('Last name')[0]
        lastName.focus()
        await userEvent.clear(lastName)
        await userEvent.paste('Contact 1')

        screen.getAllByLabelText('Title/Role')[0].focus()
        await userEvent.paste('State Contact Title')
        const email = screen.getAllByLabelText('Email')[0]
        email.focus()
        await userEvent.clear(email)
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
        const draftContract = mockContractPackageUnlockedWithUnlockedType()
        draftContract.draftRevision.formData.stateContacts = [
            {
                name: '',
                givenName: '',
                familyName: '',
                suffix: '',
                titleRole: '',
                email: '',
            },
        ]
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_CONTACTS}
                    element={<Contacts />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...draftContract,
                                id: '15',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/15/edit/contacts',
                },
                featureFlags: {
                    'contact-data-model-update': true,
                },
            }
        )
        await screen.findAllByText('Contacts')

        const continueButton = screen.getByRole('button', { name: 'Continue' })
        expect(continueButton).not.toHaveAttribute('aria-disabled')

        await userEvent.click(continueButton)

        await waitFor(() => {
            expect(
                screen.getAllByText('You must provide a first name')
            ).toHaveLength(2)
            expect(
                screen.getAllByText('You must provide a last name')
            ).toHaveLength(2)
            expect(
                screen.getAllByText('You must provide a title/role')
            ).toHaveLength(2)
            expect(
                screen.getAllByText('You must provide an email address')
            ).toHaveLength(2)
            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })

        await userEvent.type(screen.getByLabelText('First name'), 'Test')
        await userEvent.type(screen.getByLabelText('Last name'), 'Name')
        await userEvent.type(screen.getByLabelText('Suffix'), 'Jr.')
        await userEvent.type(screen.getByLabelText('Title/Role'), 'Test Role')
        await userEvent.type(screen.getByLabelText('Email'), 'test@example.com')

        await waitFor(() => {
            expect(continueButton).not.toHaveAttribute('aria-disabled')
        })
    })

    it('after "Add state contact" button click, should focus on the first name of the new contact', async () => {
        const draftContract = mockContractPackageUnlockedWithUnlockedType()
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_CONTACTS}
                    element={<Contacts />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...draftContract,
                                id: '15',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/15/edit/contacts',
                },
                featureFlags: {
                    'contact-data-model-update': true,
                },
            }
        )
        await screen.findAllByText('Contacts')

        const addStateContactButton = screen.getByRole('button', {
            name: 'Add another state contact',
        })
        const firstContactFirstName = screen.getByLabelText('First name')
        const firstContactLastName = screen.getByLabelText('Last name')
        await userEvent.clear(firstContactFirstName)
        await userEvent.clear(firstContactLastName)

        await userEvent.type(firstContactFirstName, 'First')
        await userEvent.type(firstContactLastName, 'Person')
        firstContactFirstName.focus()
        expect(firstContactFirstName).toHaveFocus()

        addStateContactButton.click()

        await waitFor(() => {
            expect(screen.getAllByLabelText('First name')).toHaveLength(2)
            expect(screen.getAllByLabelText('Last name')).toHaveLength(2)
            expect(screen.getAllByLabelText('Suffix')).toHaveLength(2)
            const secondContactFirstName =
                screen.getAllByLabelText('First name')[1]
            const secondContactLastName =
                screen.getAllByLabelText('Last name')[1]
            const secondContactSuffix = screen.getAllByLabelText('Suffix')[1]
            expect(firstContactFirstName).toHaveValue('First')
            expect(firstContactLastName).toHaveValue('Person')
            expect(firstContactFirstName).not.toHaveFocus()

            expect(secondContactFirstName).toHaveValue('')
            expect(secondContactLastName).toHaveValue('')
            expect(secondContactSuffix).toHaveValue('')
            expect(secondContactFirstName).toHaveFocus()
        })
    })

    it('after state contact "Remove contact" button click, should focus on add new contact button', async () => {
        const draftContract = mockContractPackageUnlockedWithUnlockedType()
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_CONTACTS}
                    element={<Contacts />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...draftContract,
                                id: '15',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/15/edit/contacts',
                },
                featureFlags: {
                    'contact-data-model-update': true,
                },
            }
        )
        await screen.findAllByText('Contacts')

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
        const draftContract = mockContractPackageUnlockedWithUnlockedType()
        draftContract.draftRevision.formData.stateContacts = [
            {
                name: '',
                givenName: '',
                familyName: '',
                suffix: '',
                titleRole: '',
                email: '',
            },
        ]
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_CONTACTS}
                    element={<Contacts />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...draftContract,
                                id: '15',
                                contractSubmissionType: 'HEALTH_PLAN',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/health-plan/15/edit/contacts',
                },
                featureFlags: {
                    'contact-data-model-update': true,
                },
            }
        )
        await screen.findAllByText('Contacts')

        const addStateContactButton = screen.getByRole('button', {
            name: 'Add another state contact',
        })
        addStateContactButton.click()

        await waitFor(() => {
            expect(screen.getByText(/State contacts 1/)).toBeInTheDocument()
            expect(screen.getByText('State contacts 2')).toBeInTheDocument()
        })
    })

    describe('EQRO submissions', () => {
        it('renders the contacts page for EQRO submissions', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTACTS}
                        element={<Contacts />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contacts',
                    },
                    featureFlags: {
                        'contact-data-model-update': true,
                    },
                }
            )

            await waitFor(() => {
                expect(screen.getByTestId('state-contacts')).toBeInTheDocument()
                expect(screen.getByText('State contacts 1')).toBeInTheDocument()
                expect(screen.getByLabelText('First name')).toBeInTheDocument()
                expect(screen.getByLabelText('Last name')).toBeInTheDocument()
                expect(screen.getByLabelText('Suffix')).toBeInTheDocument()
                expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
                expect(screen.getByLabelText('Title/Role')).toBeInTheDocument()
                expect(screen.getByLabelText('Email')).toBeInTheDocument()
            })
        })

        // TODO: Uncomment when EQRO Contract Details Page is created.
        // it('navigates back to contract details for EQRO when back button is selected', async () => {
        //     const draftContract = mockContractPackageUnlockedWithUnlockedType()
        //
        //     renderWithProviders(
        //         <Routes>
        //             <Route
        //                 path={RoutesRecord.SUBMISSIONS_CONTACTS}
        //                 element={<Contacts />}
        //             />
        //             <Route
        //                 path={RoutesRecord.SUBMISSIONS_CONTRACT_DETAILS}
        //                 element={<div>Contract Details Page</div>}
        //             />
        //         </Routes>,
        //         {
        //             apolloProvider: {
        //                 mocks: [
        //                     fetchCurrentUserMock({ statusCode: 200 }),
        //                     fetchContractMockSuccess({
        //                         contract: {
        //                             ...draftContract,
        //                             id: '15',
        //                             contractSubmissionType: 'EQRO',
        //                         },
        //                     }),
        //                 ],
        //             },
        //             routerProvider: {
        //                 route: '/submissions/eqro/15/edit/contacts',
        //             },
        //             featureFlags: {
        //                 'contact-data-model-update': true,
        //             },
        //         }
        //     )
        //
        //     await waitFor(() => {
        //         expect(screen.getByTestId('state-contacts')).toBeInTheDocument()
        //     })
        //
        //     const backButton = screen.getByRole('button', { name: 'Back' })
        //     await userEvent.click(backButton)
        //
        //     await waitFor(() => {
        //         // Should see Contract Details page
        //         expect(screen.getByText('Contract Details Page')).toBeInTheDocument()
        //     })
        // })

        it('continues to navigate to review and submit for EQRO when the continue button is selected', async () => {
            const draftContract = mockContractPackageUnlockedWithUnlockedType()

            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTACTS}
                        element={<Contacts />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                        element={<div>Review and Submit Page</div>}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...draftContract,
                                    id: '15',
                                    contractSubmissionType: 'EQRO',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/eqro/15/edit/contacts',
                    },
                    featureFlags: {
                        'contact-data-model-update': true,
                    },
                }
            )

            await waitFor(() => {
                expect(screen.getByTestId('state-contacts')).toBeInTheDocument()
            })

            // Fill out required fields for form validation to pass
            const firstNameInput = screen.getByLabelText('First name')
            const lastNameInput = screen.getByLabelText('Last name')
            const suffixInput = screen.getByLabelText('Suffix')
            const titleInput = screen.getByLabelText('Title/Role')
            const emailInput = screen.getByLabelText('Email')

            await userEvent.clear(firstNameInput)
            await userEvent.type(firstNameInput, 'Test')

            await userEvent.clear(lastNameInput)
            await userEvent.type(lastNameInput, 'Name')

            await userEvent.clear(suffixInput)
            await userEvent.type(suffixInput, 'Jr.')

            await userEvent.clear(titleInput)
            await userEvent.type(titleInput, 'Test Title')

            await userEvent.clear(emailInput)
            await userEvent.type(emailInput, 'test@example.com')

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            await userEvent.click(continueButton)

            await waitFor(() => {
                // Navigates to Review & Submit page in the EQRO flow
                expect(
                    screen.getByText('Review and submit')
                ).toBeInTheDocument()
            })
        })
    })
})
