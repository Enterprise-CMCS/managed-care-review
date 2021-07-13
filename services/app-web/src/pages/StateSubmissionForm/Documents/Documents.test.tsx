import React from 'react'
import { screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
    renderWithProviders,
    TEST_DOC_FILE,
    TEST_PDF_FILE,
    TEST_XLS_FILE,
    TEST_VIDEO_FILE,
    TEST_PNG_FILE,
    dragAndDrop,
} from '../../../testHelpers/jestHelpers'
import {
    fetchCurrentUserMock,
    mockDraft,
} from '../../../testHelpers/apolloHelpers'
import { Documents } from './Documents'

describe('Documents', () => {
    it('renders without errors', async () => {
        const mockUpdateDraftFn = jest.fn()
        renderWithProviders(
            <Documents
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
            expect(screen.getByTestId('file-input')).toBeInTheDocument()
            expect(screen.getByTestId('file-input')).toHaveClass(
                'usa-file-input'
            )
            expect(
                screen.getByRole('button', { name: 'Continue' })
            ).not.toBeDisabled()
            expect(
                within(
                    screen.getByTestId('file-input-preview-list')
                ).queryAllByRole('listitem').length
            ).toBe(0)
        })
    })

    it('accepts a new document', async () => {
        const mockUpdateDraftFn = jest.fn()

        renderWithProviders(
            <Documents
                draftSubmission={mockDraft()}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        const input = screen.getByLabelText('Upload documents')
        expect(input).toBeInTheDocument()
        userEvent.upload(input, [TEST_DOC_FILE])

        expect(await screen.findByText(TEST_DOC_FILE.name)).toBeInTheDocument()
    })

    it('accepts multiple pdf, word, excel documents', async () => {
        const mockUpdateDraftFn = jest.fn()
        renderWithProviders(
            <Documents
                draftSubmission={mockDraft()}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        const input = screen.getByLabelText('Upload documents')
        expect(input).toBeInTheDocument()
        expect(input).toHaveAttribute(
            'accept',
            'application/pdf,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        userEvent.upload(input, [TEST_DOC_FILE, TEST_PDF_FILE, TEST_XLS_FILE])
        await waitFor(() => {
            expect(screen.getByText(TEST_DOC_FILE.name)).toBeInTheDocument()
            expect(screen.getByText(TEST_PDF_FILE.name)).toBeInTheDocument()
            expect(screen.getByText(TEST_XLS_FILE.name)).toBeInTheDocument()
        })
    })

    it('does not accept image files', async () => {
        const mockUpdateDraftFn = jest.fn()
        renderWithProviders(
            <Documents
                draftSubmission={mockDraft()}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        // drop documents because accept (used for userEvent.upload) not allow invalid documents to upload in the first place
        const targetEl = screen.getByTestId('file-input-droptarget')
        dragAndDrop(targetEl, [TEST_PNG_FILE, TEST_VIDEO_FILE])

        expect(screen.queryByText(TEST_PNG_FILE.name)).not.toBeInTheDocument()
        expect(screen.queryByText(TEST_VIDEO_FILE.name)).not.toBeInTheDocument()

        await waitFor(() => {
            expect(screen.getByTestId('file-input-error')).toHaveClass(
                'usa-file-input__accepted-files-message'
            )
            expect(screen.getByTestId('file-input-droptarget')).toHaveClass(
                'has-invalid-file'
            )
            expect(
                screen.getByText('This is not a valid file type.')
            ).toBeInTheDocument()
            expect(
                screen.queryByTestId('file-input-preview')
            ).not.toBeInTheDocument()
        })
    })

    it('show correct hint text for contract only submission', () => {
        const mockUpdateDraftFn = jest.fn()
        renderWithProviders(
            <Documents
                draftSubmission={{
                    ...mockDraft(),
                    submissionType: 'CONTRACT_ONLY',
                }}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        expect(screen.queryByTestId('documents-hint')).toHaveTextContent(
            'Must include: An executed contract'
        )
    })

    it('show correct hint text for contract and rates submission', () => {
        const mockUpdateDraftFn = jest.fn()
        renderWithProviders(
            <Documents
                draftSubmission={{
                    ...mockDraft(),
                    submissionType: 'CONTRACT_AND_RATES',
                }}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        expect(screen.queryByTestId('documents-hint')).toHaveTextContent(
            'Must include: An executed contract and a signed rate certification'
        )
    })

    it('error is shown in input when invalid file types dropped', async () => {
        const mockUpdateDraftFn = jest.fn()
        renderWithProviders(
            <Documents
                draftSubmission={{
                    ...mockDraft(),
                }}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        const inputEl = screen.getByTestId('file-input-input')
        expect(inputEl).not.toHaveAttribute('accept', 'image/*')

        const targetEl = screen.getByTestId('file-input-droptarget')
        dragAndDrop(targetEl, [TEST_PNG_FILE])

        await waitFor(() => {
            expect(screen.getByTestId('file-input-error')).toHaveTextContent(
                'This is not a valid file type'
            )

            expect(screen.getByTestId('file-input-droptarget')).toHaveClass(
                'has-invalid-file'
            )
        })
    })

    it('error is shown in file items list when duplicate files added', async () => {
        const mockUpdateDraftFn = jest.fn()
        renderWithProviders(
            <Documents
                draftSubmission={{
                    ...mockDraft(),
                }}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        const input = screen.getByLabelText('Upload documents')
        userEvent.upload(input, [TEST_DOC_FILE])
        userEvent.upload(input, [TEST_PDF_FILE])
        userEvent.upload(input, [TEST_DOC_FILE])

        await waitFor(() => {
            expect(screen.queryAllByText(TEST_PDF_FILE.name).length).toBe(1)
            expect(screen.queryAllByText(TEST_DOC_FILE.name).length).toBe(2)
            expect(screen.queryAllByText('Duplicate file').length).toBe(1)
        })
    })

    it('errors for duplicate files are added one at a time', async () => {
        const mockUpdateDraftFn = jest.fn()
        renderWithProviders(
            <Documents
                draftSubmission={{
                    ...mockDraft(),
                }}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        const input = screen.getByLabelText('Upload documents')

        userEvent.upload(input, [TEST_XLS_FILE])

        await waitFor(() => {
            expect(screen.queryAllByText('Duplicate file').length).toBe(0)
            expect(
                within(
                    screen.getByTestId('file-input-preview-list')
                ).queryAllByRole('listitem').length
            ).toBe(1)
        })
        // note: userEvent.upload does not re-trigger input event when selected files are the same as before, this is why we upload nothing in between
        userEvent.upload(input, [])
        userEvent.upload(input, [TEST_XLS_FILE])

        await waitFor(() => {
            expect(
                within(
                    screen.getByTestId('file-input-preview-list')
                ).queryAllByRole('listitem').length
            ).toBe(2)
            expect(screen.queryAllByText('Duplicate file').length).toBe(1)
        })

        userEvent.upload(input, [])
        userEvent.upload(input, [TEST_XLS_FILE])

        await waitFor(() => {
            expect(screen.queryAllByText('Duplicate file').length).toBe(2)
            expect(
                within(
                    screen.getByTestId('file-input-preview-list')
                ).queryAllByRole('listitem').length
            ).toBe(3)
        })
    })

    describe('continue button', () => {
        it('enabled when valid files are present', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <Documents
                    draftSubmission={{
                        ...mockDraft(),
                        submissionType: 'CONTRACT_AND_RATES',
                    }}
                    updateDraft={mockUpdateDraftFn}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            const input = screen.getByLabelText('Upload documents')

            userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(continueButton).not.toBeDisabled()
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <Documents
                    draftSubmission={{
                        ...mockDraft(),
                        submissionType: 'CONTRACT_AND_RATES',
                    }}
                    updateDraft={mockUpdateDraftFn}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            const input = screen.getByLabelText('Upload documents')
            const targetEl = screen.getByTestId('file-input-droptarget')

            userEvent.upload(input, [TEST_DOC_FILE])
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            await waitFor(() => {
                expect(
                    screen.getByText('This is not a valid file type.')
                ).toBeInTheDocument()
                expect(continueButton).not.toBeDisabled()
            })
        })

        it('disabled with alert after first attempt to continue with zero files', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <Documents
                    draftSubmission={{
                        ...mockDraft(),
                        submissionType: 'CONTRACT_AND_RATES',
                    }}
                    updateDraft={mockUpdateDraftFn}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            expect(continueButton).not.toBeDisabled()

            continueButton.click()

            await waitFor(() => {
                expect(
                    screen.getByText('You must upload at least one document')
                ).toBeInTheDocument()

                expect(continueButton).toBeDisabled()
            })
        })

        it('disabled with alert after first attempt to continue with invalid duplicate files', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <Documents
                    draftSubmission={{
                        ...mockDraft(),
                        submissionType: 'CONTRACT_AND_RATES',
                    }}
                    updateDraft={mockUpdateDraftFn}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )
            const input = screen.getByLabelText('Upload documents')
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            userEvent.upload(input, [TEST_DOC_FILE, TEST_DOC_FILE])

            expect(continueButton).not.toBeDisabled()

            continueButton.click()

            await waitFor(() => {
                expect(
                    screen.getByText('You must address duplicate name errors')
                ).toBeInTheDocument()

                expect(continueButton).toBeDisabled()
            })
        })

        it('disabled with alert after first attempt to continue with invalid dropped and no other files present', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <Documents
                    draftSubmission={{
                        ...mockDraft(),
                        submissionType: 'CONTRACT_AND_RATES',
                    }}
                    updateDraft={mockUpdateDraftFn}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            const targetEl = screen.getByTestId('file-input-droptarget')
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            expect(
                await screen.findByText('This is not a valid file type.')
            ).toBeInTheDocument()

            expect(continueButton).not.toBeDisabled()
            continueButton.click()

            expect(
                await screen.findByText('You must upload at least one document')
            ).toBeInTheDocument()

            expect(continueButton).toBeDisabled()
        })
    })
})
