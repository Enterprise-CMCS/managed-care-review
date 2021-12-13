import React from 'react'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory } from 'history'
import { screen, waitFor } from '@testing-library/react'
import selectEvent from 'react-select-event'
import {
    fetchCurrentUserMock,
    mockDraft,
} from '../../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { SubmissionType, SubmissionTypeFormValues } from './'
import { Formik } from 'formik'

describe('SubmissionType', () => {
    const SubmissionTypeInitialValues: SubmissionTypeFormValues = {
        programIDs: ['ccc-plus'],
        submissionDescription: '',
        submissionType: '',
    }

    it('displays submission type form when expected', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() =>
            expect(
                screen.getByRole('form', { name: 'Submission Type Form' })
            ).toBeInTheDocument()
        )
    })

    it('displays new submission form when expected', async () => {
        const history = createMemoryHistory()
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
            routerProvider: {
                route: '/submissions/new',
                routerProps: { history: history },
            },
        })

        await waitFor(() =>
            expect(
                screen.getByRole('form', { name: 'New Submission Form' })
            ).toBeInTheDocument()
        )
    })

    it('displays with draft submission when expected', async () => {
        renderWithProviders(<SubmissionType draftSubmission={mockDraft()} />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() =>
            expect(
                screen.getByRole('form', { name: 'Submission Type Form' })
            ).toBeInTheDocument()
        )
    })

    it('displays a cancel link', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
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
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
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
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() =>
            expect(
                screen.getByRole('combobox', { name: 'programs' })
            ).toBeInTheDocument()
        )
    })

    it('displays program options based on current user state', async () => {
        const mockUser = {
            __typename: 'StateUser' as const,
            role: 'STATE_USER',
            name: 'Sheena in Minnesota',
            email: 'Sheena@dmas.mn.gov',
            state: {
                name: 'Minnesota',
                code: 'MN',
                programs: [
                    { id: 'first', name: 'Program 1' },
                    { id: 'second', name: 'Program Test' },
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
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockUser,
                        }),
                    ],
                },
            }
        )
        const combobox = await screen.findByRole('combobox')

        await waitFor(async () => {
            await selectEvent.openMenu(combobox)
        })

        await waitFor(() => {
            expect(screen.getByText('Program 3')).toBeInTheDocument()
        })

        await waitFor(async () => {
            await selectEvent.select(combobox, 'Program 1')
        })

        // in react-select, only items that are selected have a "remove item" label
        await waitFor(() => {
            expect(
                screen.getByLabelText('Remove Program 1')
            ).toBeInTheDocument()
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
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
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
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
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
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            await waitFor(() => {
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
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
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
            userEvent.type(textarea, 'something')
            userEvent.clear(textarea)

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
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
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
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
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
                expect(
                    screen.queryByText('You must select at least one program')
                ).toBeInTheDocument()
            })
        })
    })
})
