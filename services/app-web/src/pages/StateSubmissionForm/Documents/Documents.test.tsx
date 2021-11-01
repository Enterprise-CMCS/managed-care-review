import { screen, waitFor, within } from '@testing-library/react'
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

    it('error is shown in file items list when duplicate files are added one at a time', async () => {
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

    it('errors for duplicate files are cleared when duplicate file is removed', async () => {
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

        // Remove duplicate document and remove error
        userEvent.click(screen.queryAllByText('Remove')[0])
        expect(screen.queryAllByText(TEST_DOC_FILE.name).length).toBe(1)
        expect(screen.queryByText('Duplicate file')).toBeNull()
    })

    describe('Continue button', () => {
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

        it('enabled when invalid file types have been dropped', async () => {
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

        it('when duplicate files present, triggers error alert on continue click', async () => {
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
            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })

            userEvent.upload(input, [TEST_DOC_FILE])
            userEvent.upload(input, [TEST_PDF_FILE])
            userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(screen.queryAllByText('Duplicate file').length).toBe(1)
            })
            userEvent.click(saveAsDraftButton)
            await waitFor(() => {
                expect(mockUpdateDraftFn).not.toHaveBeenCalled()
                expect(
                    screen.queryByText('Remove files with errors')
                ).toBeInTheDocument()
            })
        })

        it('when zero files present, does not trigger alert on click to continue', async () => {
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

            userEvent.click(continueButton)
            expect(
                screen.queryByText('You must upload at least one document')
            ).toBeNull()
            expect(mockUpdateDraftFn).toHaveBeenCalled()
        })

        it('when invalid file type files present, does not trigger alert on click to continue', async () => {
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
            })

            userEvent.click(continueButton)
            expect(
                screen.queryByText(
                    'You must remove all documents with error messages before continuing'
                )
            ).toBeNull()
            expect(mockUpdateDraftFn).toHaveBeenCalled()
        })
    })

    describe('Save as draft button', () => {
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

            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })
            const input = screen.getByLabelText('Upload documents')

            userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(saveAsDraftButton).not.toBeDisabled()
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

            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })
            const input = screen.getByLabelText('Upload documents')
            const targetEl = screen.getByTestId('file-input-droptarget')

            userEvent.upload(input, [TEST_DOC_FILE])
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            await waitFor(() => {
                expect(saveAsDraftButton).not.toBeDisabled()
            })
        })

        it('when zero files present, does not trigger missing documents alert on click', async () => {
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

            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })
            expect(saveAsDraftButton).not.toBeDisabled()

            userEvent.click(saveAsDraftButton)
            expect(mockUpdateDraftFn).toHaveBeenCalled()
            expect(
                screen.queryByText('You must upload at least one document')
            ).toBeNull()
        })
        it('when duplicate files present, triggers error alert on click', async () => {
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
            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })

            userEvent.upload(input, [TEST_DOC_FILE])
            userEvent.upload(input, [TEST_PDF_FILE])
            userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(screen.queryAllByText('Duplicate file').length).toBe(1)
            })
            userEvent.click(saveAsDraftButton)
            await waitFor(() => {
                expect(mockUpdateDraftFn).not.toHaveBeenCalled()
                expect(
                    screen.queryByText('Remove files with errors')
                ).toBeInTheDocument()
            })
        })
    })
})

describe('Back button', () => {
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

        const backButton = screen.getByRole('button', {
            name: 'Back',
        })
        const input = screen.getByLabelText('Upload documents')

        userEvent.upload(input, [TEST_DOC_FILE])

        await waitFor(() => {
            expect(backButton).not.toBeDisabled()
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

        const backButton = screen.getByRole('button', {
            name: 'Back',
        })
        const input = screen.getByLabelText('Upload documents')
        const targetEl = screen.getByTestId('file-input-droptarget')

        userEvent.upload(input, [TEST_DOC_FILE])
        dragAndDrop(targetEl, [TEST_PNG_FILE])

        await waitFor(() => {
            expect(backButton).not.toBeDisabled()
        })
    })

    it('when zero files present, does not trigger alert on click', async () => {
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

        const backButton = screen.getByRole('button', {
            name: 'Back',
        })
        expect(backButton).not.toBeDisabled()

        userEvent.click(backButton)
        expect(
            screen.queryByText('You must upload at least one document')
        ).toBeNull()
        expect(mockUpdateDraftFn).toHaveBeenCalled()
    })

    it('when duplicate files present, does not trigger alert on click', async () => {
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
        const backButton = screen.getByRole('button', {
            name: 'Back',
        })

        userEvent.upload(input, [TEST_DOC_FILE])
        userEvent.upload(input, [TEST_PDF_FILE])
        userEvent.upload(input, [TEST_DOC_FILE])
        await waitFor(() => {
            expect(backButton).not.toBeDisabled()
            expect(screen.queryAllByText('Duplicate file').length).toBe(1)
        })
        userEvent.click(backButton)
        expect(screen.queryByText('Remove files with errors')).toBeNull()
        expect(mockUpdateDraftFn).toHaveBeenCalled()
    })
})
