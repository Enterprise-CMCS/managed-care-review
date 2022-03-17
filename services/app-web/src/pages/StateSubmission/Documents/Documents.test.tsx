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
        })
        expect(
            screen.getByText('You have not uploaded any files')
        ).toBeInTheDocument()
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

        const input = screen.getByLabelText(
            'Upload any additional supporting documents'
        )
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

        const input = screen.getByLabelText(
            'Upload any additional supporting documents'
        )
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

        expect(
            screen.queryByText(TEST_PNG_FILE.name)
        ).not.toBeInTheDocument()
        expect(
            screen.queryByText(TEST_VIDEO_FILE.name)
        ).not.toBeInTheDocument()

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


    describe('inline errors', () => {
        it('shown in input when invalid file types dropped', async () => {
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
                expect(
                    screen.getByTestId('file-input-error')
                ).toHaveTextContent('This is not a valid file type')

                expect(screen.getByTestId('file-input-droptarget')).toHaveClass(
                    'has-invalid-file'
                )
            })
        })

        it('shown in file items list when duplicate files added', async () => {
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
            const input = screen.getByLabelText(
                'Upload any additional supporting documents'
            )
            userEvent.upload(input, [TEST_DOC_FILE])
            userEvent.upload(input, [TEST_PDF_FILE])
            userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(screen.queryAllByText(TEST_PDF_FILE.name).length).toBe(1)
                expect(screen.queryAllByText(TEST_DOC_FILE.name).length).toBe(2)
                expect(
                    screen.queryAllByText('Duplicate file, please remove')
                        .length
                ).toBe(1)
            })
        })

        it('shown in file items list when duplicate files are added one at a time', async () => {
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
            const input = screen.getByLabelText(
                'Upload any additional supporting documents'
            )

            userEvent.upload(input, [TEST_XLS_FILE])

            await waitFor(() => {
                expect(
                    screen.queryAllByText('Duplicate file, please remove')
                        .length
                ).toBe(0)
                expect(screen.queryAllByRole('row').length).toBe(2)
            })
            // note: userEvent.upload does not re-trigger input event when selected files are the same as before, this is why we upload nothing in between
            userEvent.upload(input, [])
            userEvent.upload(input, [TEST_XLS_FILE])

            await waitFor(() => {
                expect(
                    screen.queryAllByText('Duplicate file, please remove')
                        .length
                ).toBe(1)
                expect(screen.queryAllByRole('row').length).toBe(3)
            })

            userEvent.upload(input, [])
            userEvent.upload(input, [TEST_XLS_FILE])

            await waitFor(() => {
                expect(
                    screen.queryAllByText('Duplicate file, please remove')
                        .length
                ).toBe(2)
                expect(screen.queryAllByRole('row').length).toBe(4)
            })
        })

        it('not shown in file items list when duplicate file is removed', async () => {
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
            const input = screen.getByLabelText(
                'Upload any additional supporting documents'
            )
            userEvent.upload(input, [TEST_DOC_FILE])
            userEvent.upload(input, [TEST_PDF_FILE])
            userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(screen.queryAllByText(TEST_PDF_FILE.name).length).toBe(1)
                expect(screen.queryAllByText(TEST_DOC_FILE.name).length).toBe(2)
                expect(
                    screen.queryAllByText('Duplicate file, please remove')
                        .length
                ).toBe(1)
            })

            // Remove duplicate document and remove error
            userEvent.click(screen.queryAllByText(/Remove/)[0])
            expect(screen.queryAllByText(TEST_DOC_FILE.name).length).toBe(1)
            expect(
                screen.queryByText('Duplicate file, please remove')
            ).toBeNull()
        })

        it('not shown in file items list for document categories on initial load in table view, only shown after validation', async () => {
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

            const input = screen.getByLabelText(
                'Upload any additional supporting documents'
            )
            userEvent.upload(input, [TEST_PDF_FILE])
            userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(
                    screen.queryAllByText(
                        'Must select at least one category checkbox'
                    ).length
                ).toBe(0)
            })

            // check a category for the second row
            const rows = screen.getAllByRole('row')
            expect(rows.length).toBe(3)
            userEvent.click(
                within(rows[1]).getByRole('checkbox', {
                    name: 'contract-supporting',
                })
            )

            await waitFor(() => {
                expect(
                    screen.queryAllByText(
                        'Must select at least one category checkbox'
                    ).length
                ).toBe(0)
            })

            // click continue and enter validation state
            userEvent.click(screen.getByRole('button', { name: 'Continue' }))

            await waitFor(() => {
                expect(
                    screen.queryAllByText(
                        'Must select at least one category checkbox'
                    ).length
                ).toBe(1)
            })
        })
    })
    
    describe('error summary at top of page', () => {
        it('displayed as expected',  async () => {
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

    const input = screen.getByLabelText(
        'Upload any additional supporting documents'
    )

    userEvent.upload(input, [TEST_DOC_FILE])
    userEvent.upload(input, [TEST_PDF_FILE])
    userEvent.upload(input, [TEST_DOC_FILE])

    await waitFor(() => {
        // error summary messages don't appear on load
        expect(
            screen.queryAllByText('You must select a document category').length
        ).toBe(0)
        expect(
            screen.queryAllByText('You must remove duplicate files')
                .length
        ).toBe(0)
    })

    // click continue and enter validation state
    userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => {
        expect(
            screen.queryAllByText('You must select a document category').length
        ).toBe(2)
        expect(
            screen.queryAllByText('You must remove duplicate files')
                .length
        ).toBe(1)
    })


        })
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
            const input = screen.getByLabelText(
                'Upload any additional supporting documents'
            )

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
            const input = screen.getByLabelText(
                'Upload any additional supporting documents'
            )
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
            const input = screen.getByLabelText(
                'Upload any additional supporting documents'
            )
            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })

            userEvent.upload(input, [TEST_DOC_FILE])
            userEvent.upload(input, [TEST_PDF_FILE])
            userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(screen.queryAllByText('Duplicate file, please remove').length).toBe(1)
            })
            userEvent.click(saveAsDraftButton)
            await waitFor(() => {
                expect(mockUpdateDraftFn).not.toHaveBeenCalled()
                const errorMessage = screen.getByText(
                    'You must remove duplicate files'
                )
                const errorSummary = screen.getByText(
                    'You must remove all documents with error messages before continuing'
                )
                expect(errorMessage).toBeInTheDocument()
                expect(errorMessage).toHaveAttribute('href')
                expect(errorSummary).toBeInTheDocument()
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

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            const input = screen.getByLabelText(
                'Upload any additional supporting documents'
            )
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

        it('disabled with alert when trying to continue while a file is still uploading', async () => {
            renderWithProviders(
                <Documents
                    draftSubmission={{
                        ...mockDraft(),
                    }}
                    updateDraft={jest.fn()}
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

            // upload one file
            dragAndDrop(targetEl, [TEST_PDF_FILE])
            const imageElFile1 = screen.getByTestId('file-input-loading-image')
            expect(imageElFile1).toHaveClass('is-loading')

            // upload second file
            dragAndDrop(targetEl, [TEST_DOC_FILE])

            const imageElFile2 = screen.getAllByTestId(
                'file-input-loading-image'
            )[1]
            expect(imageElFile2).toHaveClass('is-loading')

            // click continue while file 2 still loading
            continueButton.click()
            expect(continueButton).toBeDisabled()

            expect(
                screen.getAllByText(
                    'You must wait for all documents to finish uploading before continuing'
                )
            ).not.toBeNull()
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
            const input = screen.getByLabelText(
                'Upload any additional supporting documents'
            )

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
            const input = screen.getByLabelText(
                'Upload any additional supporting documents'
            )
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
            const input = screen.getByLabelText(
                'Upload any additional supporting documents'
            )
            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })

            userEvent.upload(input, [TEST_DOC_FILE])
            userEvent.upload(input, [TEST_PDF_FILE])
            userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(screen.queryAllByText('Duplicate file, please remove').length).toBe(1)
            })
            userEvent.click(saveAsDraftButton)
            await waitFor(() => {
                const errorMessage = screen.getByText(
                    'You must remove duplicate files'
                )
                const errorSummary = screen.getByText(
                    'You must remove all documents with error messages before continuing'
                )
                expect(errorMessage).toBeInTheDocument()
                expect(errorMessage).toHaveAttribute('href')
                expect(errorSummary).toBeInTheDocument()
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
            const input = screen.getByLabelText(
                'Upload any additional supporting documents'
            )

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
            const input = screen.getByLabelText(
                'Upload any additional supporting documents'
            )
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
            const input = screen.getByLabelText(
                'Upload any additional supporting documents'
            )
            const backButton = screen.getByRole('button', {
                name: 'Back',
            })

            userEvent.upload(input, [TEST_DOC_FILE])
            userEvent.upload(input, [TEST_PDF_FILE])
            userEvent.upload(input, [TEST_DOC_FILE])
            await waitFor(() => {
                expect(backButton).not.toBeDisabled()
                expect(screen.queryAllByText('Duplicate file, please remove').length).toBe(1)
            })
            userEvent.click(backButton)
            expect(screen.queryByText('Remove files with errors')).toBeNull()
            expect(mockUpdateDraftFn).toHaveBeenCalled()
        })
    })

    describe('Document categories checkbox', () => {
        it('not present on contract only submission, categories default to contract-supporting', async () => {
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
            expect(screen.queryAllByText('Contract-supporting').length).toBe(0)
            expect(screen.queryAllByText('Rate-supporting').length).toBe(0)

            const input = screen.getByTestId('file-input-input')
            userEvent.upload(input, [TEST_PDF_FILE])

            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: 'Continue' })
                ).not.toBeDisabled()
                screen.getByRole('button', { name: 'Continue' }).click()
                // TODO: check if we have a small loop here, expecting 1 call but consistently getting 10+ calls after button click
                const call = mockUpdateDraftFn.mock.calls[0][0]
                const documents = call.draftSubmissionUpdates.documents

                expect(documents.length).toBe(1)
                expect(
                    documents[0].documentCategories.includes('CONTRACT_RELATED')
                ).toBe(true)
            })
        })

        it('present on contract and rates submission', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <Documents
                    draftSubmission={{
                        ...mockDraft(),
                        submissionType: 'CONTRACT_AND_RATES',
                        documents: [
                        {
                            s3URL: 's3://bucketname/key/supporting-documents',
                            name: 'supporting documents',
                            documentCategories: ['RATES_RELATED' as const],
                        }
                        ]
                    }}
                    updateDraft={mockUpdateDraftFn}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )
            await waitFor(() => {
                expect(
                    screen.getAllByText('Contract-supporting').length
                ).toBeGreaterThanOrEqual(1)
                expect(
                    screen.getAllByText('Rate-supporting').length
                ).toBeGreaterThanOrEqual(1)
            })

        })

        it('present on contract and rates submission in categories error state', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <Documents
                    draftSubmission={{
                        ...mockDraft(),
                        submissionType: 'CONTRACT_AND_RATES',
                        documents: [
                            {
                                s3URL: 's3://bucketname/key/supporting-documents',
                                name: 'supporting documents',
                                documentCategories: ['RATES_RELATED' as const],
                            },
                        ],
                    }}
                    updateDraft={mockUpdateDraftFn}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            const input = screen.getByLabelText(
                'Upload any additional supporting documents'
            )

            userEvent.upload(input, [TEST_DOC_FILE])

            // no errors before validation but checkboxes present
            await waitFor(() => {
                expect(
                    screen.queryAllByText('You must select a document category')
                        .length
                ).toBe(0)

                expect(screen.queryAllByText('Contract-supporting').length).toBe(1)
                expect(screen.queryAllByText('Rate-supporting').length).toBe(1)

            })

            userEvent.click(screen.getByRole('button', { name: 'Continue' }))

            // errors after validation and checkboxes still present
            await waitFor(() => {
                expect(
                    screen.queryAllByText('You must select a document category')
                        .length
                ).toBe(1)
                expect(screen.queryAllByText('Contract-supporting').length).toBe(1)
                expect(screen.queryAllByText('Rate-supporting').length).toBe(1)
            })
        })

        it('not present on contract and rates submission in duplicate name error rows', async () => {
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

            const input = screen.getByLabelText(
                'Upload any additional supporting documents'
            )

            userEvent.upload(input, [TEST_DOC_FILE])
            userEvent.upload(input, [TEST_PDF_FILE])
            userEvent.upload(input, [TEST_DOC_FILE])

            const rows = screen.getAllByRole('row')
            await waitFor(() => expect(rows.length).toBe(4))
    
            // check a category for the second row
            userEvent.click(
                within(rows[2]).getByRole('checkbox', {
                    name: 'contract-supporting',
                })
            )

            // confirm checkboxes are present or hidden when expected
            const missingDocumentCategoriesRow = rows[1]
            const validAndHasCategoriesRow = rows[2]
            const duplicateNameRow = rows[3]

            expect(
                within(missingDocumentCategoriesRow).getAllByRole(
                    'checkbox'
                )
            .length).toBe(2)
            
            expect(
                within(validAndHasCategoriesRow).getAllByRole('checkbox')
            .length).toBe(2)
            expect(
                within(duplicateNameRow).queryByRole('checkbox')
            ).toBeNull()
            
            // click continue and enter validation state
            userEvent.click(screen.getByRole('button', { name: 'Continue' }))
            await waitFor( () => {
                expect(
                    screen.queryAllByText('You must select a document category').length
                 ).toBe(1)
            })

            // checkboxes presence is unchanged
            expect(
                within(missingDocumentCategoriesRow).getAllByRole('checkbox')
            .length).toBe(2)
    
            expect(
                within(validAndHasCategoriesRow).getAllByRole(
                'checkbox'
            )
            .length).toBe(2)
            expect(
                within(duplicateNameRow).queryByRole(
                    'checkbox'
                )).toBeNull()
        })

    })
})
