import React from 'react'
import { screen, waitFor } from '@testing-library/react'

import { mockGetCurrentUser200 } from '../../utils/apolloUtils'
import { renderWithProviders } from '../../utils/jestUtils'
import { SubmissionType } from './SubmissionType'
import { StateSubmissionInitialValues } from './StateSubmissionForm'
import { Formik } from 'formik'

describe('SubmissionType', () => {
    const onInitialLoadProps = { errors: {}, showValidations: false }

    it('displays programs select input', async () => {
        renderWithProviders(
            <Formik
                initialValues={StateSubmissionInitialValues}
                onSubmit={jest.fn()}
            >
                <SubmissionType {...onInitialLoadProps} />
            </Formik>,
            {
                apolloProvider: { mocks: [mockGetCurrentUser200] },
            }
        )

        await waitFor(() =>
            expect(
                screen.getByRole('combobox', { name: 'Program' })
            ).toBeInTheDocument()
        )
    })

    it('displays the programs options from current user state', async () => {
        const mockWithPrograms = mockGetCurrentUser200
        mockWithPrograms.result.data.getCurrentUser.state.programs = [
            { name: 'Program 1' },
            { name: 'Program Test' },
            { name: 'Program 3' },
        ]

        renderWithProviders(
            <Formik
                initialValues={StateSubmissionInitialValues}
                onSubmit={jest.fn()}
            >
                <SubmissionType {...onInitialLoadProps} />
            </Formik>,
            {
                apolloProvider: { mocks: [mockWithPrograms] },
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
                initialValues={StateSubmissionInitialValues}
                onSubmit={jest.fn()}
            >
                <SubmissionType {...onInitialLoadProps} />
            </Formik>,
            {
                apolloProvider: { mocks: [mockGetCurrentUser200] },
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
                initialValues={StateSubmissionInitialValues}
                onSubmit={jest.fn()}
            >
                <SubmissionType {...onInitialLoadProps} />
            </Formik>,
            {
                apolloProvider: { mocks: [mockGetCurrentUser200] },
            }
        )
        await waitFor(() =>
            expect(
                screen.getByRole('textbox', { name: 'Submission description' })
            ).toBeInTheDocument()
        )
    })

    it('show error messages when there are errors and showValidations is true', async () => {
        const withErrorsProps = {
            errors: {
                submissionDescription:
                    'Test - Submission description is required',
            },
            showValidations: true,
        }
        renderWithProviders(
            <Formik
                initialValues={StateSubmissionInitialValues}
                onSubmit={jest.fn()}
            >
                <SubmissionType {...withErrorsProps} />
            </Formik>,
            {
                apolloProvider: { mocks: [mockGetCurrentUser200] },
            }
        )
        await waitFor(() => {
            const textarea = screen.getByRole('textbox', {
                name: 'Submission description',
            })

            expect(textarea).toBeInTheDocument()
            expect(textarea).toHaveClass('usa-input--error')
            expect(
                screen.getByText('Test - Submission description is required')
            ).toBeVisible()
        })
    })

    it('do not show error messages when showValidations is false', async () => {
        const withErrorsProps = {
            errors: {
                submissionDescription:
                    'Test - Submission description is required',
            },
            showValidations: false,
        }
        renderWithProviders(
            <Formik
                initialValues={StateSubmissionInitialValues}
                onSubmit={jest.fn()}
            >
                <SubmissionType {...withErrorsProps} />
            </Formik>,
            {
                apolloProvider: { mocks: [mockGetCurrentUser200] },
            }
        )
        await waitFor(() => {
            const textarea = screen.getByRole('textbox', {
                name: 'Submission description',
            })

            expect(textarea).toBeInTheDocument()
            expect(textarea).not.toHaveClass('usa-input--error')
            expect(
                screen.queryByText('Test - Submission description is required')
            ).toBeNull()
        })
    })
})
