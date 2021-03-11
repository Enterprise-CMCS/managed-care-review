import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { mockGetCurrentUser200 } from '../../utils/apolloUtils'
import { renderWithProviders } from '../../utils/jestUtils'
import { StateSubmissionForm } from './StateSubmissionForm'

describe('StateSubmissionForm', () => {
    it('displays a cancel link', async () => {
        renderWithProviders(<StateSubmissionForm />, {
            apolloProvider: { mocks: [mockGetCurrentUser200] },
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
            apolloProvider: { mocks: [mockGetCurrentUser200] },
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
            apolloProvider: { mocks: [mockGetCurrentUser200] },
        })

        await waitFor(() =>
            expect(
                screen.getByRole('form', { name: 'New Submission Form' })
            ).toBeInTheDocument()
        )
    })

    // Once we have multiple form steps, we should add tests
    describe('form steps', () => {
        describe('step 0 - SUBMISSION_TYPE', () => {
            it('renders submission type form without errors', async () => {
                renderWithProviders(
                    <StateSubmissionForm step="SUBMISSION_TYPE" />,
                    {
                        apolloProvider: { mocks: [mockGetCurrentUser200] },
                    }
                )

                await waitFor(() =>
                    expect(
                        screen.getByRole('heading', { name: 'Submission type' })
                    ).toBeInTheDocument()
                )
            })

            it('loads at submission type step by default when no step prop passed in', async () => {
                renderWithProviders(<StateSubmissionForm />, {
                    apolloProvider: { mocks: [mockGetCurrentUser200] },
                })

                await waitFor(() =>
                    expect(
                        screen.getByRole('heading', { name: 'Submission type' })
                    ).toBeInTheDocument()
                )
            })

            it('does not show validations on initial load', async () => {
                renderWithProviders(
                    <StateSubmissionForm step="SUBMISSION_TYPE" />,
                    {
                        apolloProvider: { mocks: [mockGetCurrentUser200] },
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

            // TODO: make this happen conditionally on the continue button click, depending on form step
            it('shows validations when validate button is clicked', async () => {
                renderWithProviders(
                    <StateSubmissionForm step="SUBMISSION_TYPE" />,
                    {
                        apolloProvider: { mocks: [mockGetCurrentUser200] },
                    }
                )

                await waitFor(() => {
                    expect(
                        screen.getByRole('heading', { name: 'Submission type' })
                    ).toBeInTheDocument()
                })
                userEvent.click(
                    screen.getByRole('button', {
                        name: 'Test Validation',
                    })
                )
                await waitFor(() => {
                    expect(screen.getByRole('textbox')).toHaveClass(
                        'usa-input--error'
                    )
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
            // TODO: get this test passing
            // it('goes to next step when continue button is clicked', async () => {
            //     renderWithProviders(
            //         <StateSubmissionForm step="SUBMISSION_TYPE" />,
            //         {
            //             apolloProvider: { mocks: [mockGetCurrentUser200] },
            //         }
            //     )

            //     await waitFor(() => {
            //         expect(
            //             screen.getByRole('heading', { name: 'Submission type' })
            //         ).toBeInTheDocument()

            //         userEvent.click(
            //             screen.getByRole('button', {
            //                 name: 'Continue',
            //             })
            //         )
            //     })

            //     await waitFor(() => {
            //         expect(
            //             screen.getByRole('heading', {
            //                 name: 'Contract details',
            //             })
            //         ).toBeInTheDocument()
            //     })
            // })
        })
    })
})
