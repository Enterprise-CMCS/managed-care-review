import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { getCurrentUserMock } from '../../utils/apolloUtils'
import { renderWithProviders } from '../../utils/jestUtils'
import { StateSubmissionForm } from './StateSubmissionForm'

describe('StateSubmissionForm', () => {
    it('displays a cancel link', async () => {
        renderWithProviders(<StateSubmissionForm />, {
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
        renderWithProviders(<StateSubmissionForm />, {
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

    it('displays a form', async () => {
        renderWithProviders(<StateSubmissionForm />, {
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

    describe('form steps', () => {
        describe('step 0 - SUBMISSION_TYPE', () => {
            it('renders without errors', async () => {
                renderWithProviders(
                    <StateSubmissionForm step="SUBMISSION_TYPE" />,
                    {
                        apolloProvider: {
                            mocks: [getCurrentUserMock({ statusCode: 200 })],
                        },
                    }
                )

                await waitFor(() =>
                    expect(
                        screen.getByRole('heading', { name: 'Submission type' })
                    ).toBeInTheDocument()
                )
            })

            it('loads at step 0 by default even if no step prop passed in', async () => {
                renderWithProviders(<StateSubmissionForm />, {
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

            it('does not show error validations on initial load', async () => {
                renderWithProviders(
                    <StateSubmissionForm step="SUBMISSION_TYPE" />,
                    {
                        apolloProvider: {
                            mocks: [getCurrentUserMock({ statusCode: 200 })],
                        },
                    }
                )

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

            it('if form fields are invalid, shows validation error messages when continue button is clicked', async () => {
                renderWithProviders(
                    <StateSubmissionForm step="SUBMISSION_TYPE" />,
                    {
                        apolloProvider: {
                            mocks: [getCurrentUserMock({ statusCode: 200 })],
                        },
                    }
                )

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

            it('if form fields are valid, displays step 1 when continue button is clicked', async () => {
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

                renderWithProviders(
                    <StateSubmissionForm step="SUBMISSION_TYPE" />,
                    {
                        apolloProvider: {
                            mocks: [
                                getCurrentUserMock({
                                    statusCode: 200,
                                    user: mockUser,
                                }),
                            ],
                        },
                    }
                )

                await waitFor(() => {
                    expect(
                        screen.getByRole('heading', { name: 'Submission type' })
                    ).toBeInTheDocument()

                    // Fill in form to make valid
                    userEvent.click(
                        screen.getByRole('option', { name: 'Program Test' })
                    )
                    userEvent.click(
                        screen.getByLabelText('Contract action only')
                    )
                    userEvent.type(screen.getByRole('textbox'), 'a description')

                    // Click continue
                    userEvent.click(
                        screen.getByRole('button', {
                            name: 'Continue',
                        })
                    )
                })

                await waitFor(() => {
                    expect(
                        screen.getByRole('heading', {
                            name: 'Contract details',
                        })
                    ).toBeInTheDocument()
                })
            })
        })
    })
})
