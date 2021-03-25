import React from 'react'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory } from 'history'
import { screen, waitFor } from '@testing-library/react'

import { getCurrentUserMock } from '../../utils/apolloUtils'
import { renderWithProviders } from '../../utils/jestUtils'
import { SubmissionType, SubmissionTypeFormValues } from './SubmissionType'
import { Formik } from 'formik'

describe('SubmissionType', () => {
    const SubmissionTypeInitialValues: SubmissionTypeFormValues = {
        programId: 'ccc-plus',
        submissionDescription: '',
        submissionType: '',
    }

    it('renders without errors', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [getCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() =>
            expect(
                screen.getByRole('heading', { name: 'Submission type' })
            ).toBeInTheDocument()
        )
    })

    it('displays a form', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [getCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() =>
            expect(
                screen.getByRole('form', { name: 'New Submission Form' })
            ).toBeInTheDocument()
        )
    })

    it('displays a cancel link', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [getCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() =>
            expect(
                screen.getByRole('link', {
                    name: 'Cancel',
                })
            ).toBeDefined()
        )
    })

    it('displays a continue button', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [getCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() =>
            expect(
                screen.getByRole('button', {
                    name: 'Continue',
                })
            ).toBeDefined()
        )
    })

    it('displays programs select dropdown', async () => {
        renderWithProviders(
            <Formik
                initialValues={SubmissionTypeInitialValues}
                onSubmit={jest.fn()}
            >
                <SubmissionType />
            </Formik>,
            {
                apolloProvider: {
                    mocks: [getCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() =>
            expect(
                screen.getByRole('combobox', { name: 'Program' })
            ).toBeInTheDocument()
        )
    })

    it('displays program options based on current user state', async () => {
        const mockUser = {
            role: 'State User',
            name: 'Sheena in Minnesota',
            email: 'Sheena@dmas.mn.gov',
            state: {
                name: 'Minnesota',
                code: 'MN',
                programs: [
                    { name: 'Program 1' },
                    { name: 'Program Test' },
                    { id: 'third', name: 'Program 3' },
                ],
            },
        }
        renderWithProviders(
            <Formik
                initialValues={SubmissionTypeInitialValues}
                onSubmit={jest.fn()}
            >
                <SubmissionType />
            </Formik>,
            {
                apolloProvider: {
                    mocks: [
                        getCurrentUserMock({ statusCode: 200, user: mockUser }),
                    ],
                },
            }
        )

        await waitFor(() => {
            const programOptions = screen.getAllByRole('option')
            expect(programOptions.length).toBe(3)
            expect(
                programOptions.find(
                    (option) => option.textContent === 'Program Test'
                )
            ).toBeDefined()
        })
    })

    it('displays submission type radio buttons', async () => {
        renderWithProviders(
            <Formik
                initialValues={SubmissionTypeInitialValues}
                onSubmit={jest.fn()}
            >
                <SubmissionType />
            </Formik>,
            {
                apolloProvider: {
                    mocks: [getCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            const programOptions = screen.getAllByRole('option')
            expect(programOptions.length).toBe(3)
            expect(
                screen.getByRole('radio', { name: 'Contract action only' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('radio', {
                    name: 'Contract action and rate certification',
                })
            ).toBeInTheDocument()
        })
    })

    it('displays submission description textarea', async () => {
        renderWithProviders(
            <Formik
                initialValues={SubmissionTypeInitialValues}
                onSubmit={jest.fn()}
            >
                <SubmissionType />
            </Formik>,
            {
                apolloProvider: {
                    mocks: [getCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        await waitFor(() =>
            expect(
                screen.getByRole('textbox', { name: 'Submission description' })
            ).toBeInTheDocument()
        )
    })

    describe('validations', () => {
        it('does not show error validations on initial load', async () => {
            renderWithProviders(<SubmissionType />, {
                apolloProvider: {
                    mocks: [getCurrentUserMock({ statusCode: 200 })],
                },
            })

            await waitFor(() => {
                expect(
                    screen.getByRole('heading', { name: 'Submission type' })
                ).toBeInTheDocument()

                expect(screen.getByRole('textbox')).not.toHaveClass(
                    'usa-input--error'
                )
                expect(
                    screen.queryByText('You must choose a submission type')
                ).toBeNull()
                expect(
                    screen.queryByText(
                        'You must provide a description of any major changes or updates'
                    )
                ).toBeNull()
            })
        })

        it('shows error messages when there are validation errors and showValidations is true', async () => {
            renderWithProviders(
                <SubmissionType showValidations={true} />,

                {
                    apolloProvider: {
                        mocks: [getCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )
            const textarea = screen.getByRole('textbox', {
                name: 'Submission description',
            })

            await waitFor(() => {
                expect(textarea).toBeInTheDocument()
            })

            //trigger validation
            await userEvent.type(textarea, 'something')
            await userEvent.clear(textarea)

            await waitFor(() => {
                expect(textarea).toHaveClass('usa-input--error')
                expect(
                    screen.getByText('You must choose a submission type')
                ).toBeVisible()
            })
        })

        it('do not show error messages when showValidations is false', async () => {
            renderWithProviders(<SubmissionType showValidations={false} />, {
                apolloProvider: {
                    mocks: [getCurrentUserMock({ statusCode: 200 })],
                },
            })
            await waitFor(() => {
                const textarea = screen.getByRole('textbox', {
                    name: 'Submission description',
                })
                expect(textarea).toBeInTheDocument()

                //trigger validation
                userEvent.type(textarea, 'something')
                userEvent.clear(textarea)

                expect(textarea).not.toHaveClass('usa-input--error')
                expect(
                    screen.queryByText('You must choose a submission type')
                ).toBeNull()
            })
        })
    })

    describe('Continue / Save Draft button', () => {
        it('if form fields are invalid, shows validation error messages when continue button is clicked', async () => {
            renderWithProviders(<SubmissionType />, {
                apolloProvider: {
                    mocks: [getCurrentUserMock({ statusCode: 200 })],
                },
            })

            await waitFor(() => {
                expect(
                    screen.getByRole('heading', { name: 'Submission type' })
                ).toBeInTheDocument()
            })
            userEvent.click(
                screen.getByRole('button', {
                    name: 'Continue',
                })
            )
            await waitFor(() => {
                expect(
                    screen.queryByText('You must choose a submission type')
                ).toBeInTheDocument()
                expect(
                    screen.queryByText(
                        'You must provide a description of any major changes or updates'
                    )
                ).toBeInTheDocument()
            })
        })

        it('if form fields are valid, navigate to /:id/contract-details when continue button is clicked', async () => {
            const mockUser = {
                role: 'State User',
                name: 'Bob in Minnesota',
                email: 'bob@dmas.mn.gov',
                state: {
                    name: 'Minnesota',
                    code: 'MN',
                    programs: [
                        { name: 'Program 1' },
                        { name: 'Program Test' },
                        { name: 'Program 3' },
                    ],
                },
            }
            const history = createMemoryHistory()

            renderWithProviders(<SubmissionType />, {
                apolloProvider: {
                    mocks: [
                        getCurrentUserMock({
                            statusCode: 200,
                            user: mockUser,
                        }),
                    ],
                },
                routerProvider: { routerProps: { history: history } },
            })

            await waitFor(() => {
                expect(
                    screen.getByRole('heading', { name: 'Submission type' })
                ).toBeInTheDocument()

                // Fill in form to make valid
                userEvent.click(
                    screen.getByRole('option', { name: 'Program Test' })
                )
                userEvent.click(screen.getByLabelText('Contract action only'))
                userEvent.type(screen.getByRole('textbox'), 'a description')

                // Click continue
                userEvent.click(
                    screen.getByRole('button', {
                        name: 'Continue',
                    })
                )
            })

            await waitFor(() => {
                expect(history.location.pathname).toBe(
                    '/submissions/1/contract-details'
                )
            })
        })
    })
})
