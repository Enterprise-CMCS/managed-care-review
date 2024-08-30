import { fireEvent, screen, waitFor, within } from '@testing-library/react'
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
import { fetchCurrentUserMock, mockDraft } from '@mc-review/mocks'
import { Documents } from './Documents'
import { ACCEPTED_SUBMISSION_FILE_TYPES } from '../../../components/FileUpload'
import * as useRouteParams from '../../../hooks/useRouteParams'
import * as useHealthPlanPackageForm from '../../../hooks/useHealthPlanPackageForm'

describe('Documents', () => {
    const mockUpdateDraftFn = vi.fn()

    beforeEach(() => {
        vi.spyOn(
            useHealthPlanPackageForm,
            'useHealthPlanPackageForm'
        ).mockReturnValue({
            updateDraft: mockUpdateDraftFn,
            createDraft: vi.fn(),
            showPageErrorMessage: false,
            draftSubmission: mockDraft(),
        })
        vi.spyOn(useRouteParams, 'useRouteParams').mockReturnValue({
            id: '123-abc',
        })
    })

    afterEach(() => {
        vi.clearAllMocks()
        vi.spyOn(
            useHealthPlanPackageForm,
            'useHealthPlanPackageForm'
        ).mockRestore()
        vi.spyOn(useRouteParams, 'useRouteParams').mockRestore()
    })

    it('renders without errors', async () => {
        renderWithProviders(<Documents />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() => {
            expect(screen.getByTestId('file-input')).toBeInTheDocument()
            expect(screen.getByTestId('file-input')).toHaveClass(
                'usa-file-input'
            )
            expect(
                screen.getByRole('button', { name: 'Continue' })
            ).not.toHaveAttribute('aria-disabled')
        })
        expect(screen.getByText('0 files added')).toBeInTheDocument()
    })

    it('accepts a new document', async () => {
        renderWithProviders(<Documents />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        const input = screen.getByLabelText(
            'Upload contract-supporting documents'
        )
        expect(input).toBeInTheDocument()
        await userEvent.upload(input, [TEST_DOC_FILE])

        expect(await screen.findByText(TEST_DOC_FILE.name)).toBeInTheDocument()
    })

    it('accepts multiple pdf, word, excel documents', async () => {
        renderWithProviders(<Documents />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        const input = screen.getByLabelText(
            'Upload contract-supporting documents'
        )
        expect(input).toBeInTheDocument()
        expect(input).toHaveAttribute('accept', ACCEPTED_SUBMISSION_FILE_TYPES)
        await userEvent.upload(input, [
            TEST_DOC_FILE,
            TEST_PDF_FILE,
            TEST_XLS_FILE,
        ])
        await waitFor(() => {
            expect(screen.getByText(TEST_DOC_FILE.name)).toBeInTheDocument()
            expect(screen.getByText(TEST_PDF_FILE.name)).toBeInTheDocument()
            expect(screen.getByText(TEST_XLS_FILE.name)).toBeInTheDocument()
        })
    })

    it('does not accept image files', async () => {
        renderWithProviders(<Documents />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

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

    describe('inline errors', () => {
        it('shown in input when invalid file types dropped', async () => {
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

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
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            const input = screen.getByLabelText(
                'Upload contract-supporting documents'
            )
            await userEvent.upload(input, [TEST_DOC_FILE])
            await userEvent.upload(input, [TEST_PDF_FILE])
            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(screen.queryAllByText(TEST_PDF_FILE.name)).toHaveLength(
                    1
                )
                expect(screen.queryAllByText(TEST_DOC_FILE.name)).toHaveLength(
                    2
                )
                expect(
                    screen.queryAllByText('Duplicate file, please remove')
                ).toHaveLength(1)
            })
        })

        it('shown in file items list when duplicate files are added one at a time', async () => {
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            const input = screen.getByLabelText(
                'Upload contract-supporting documents'
            )

            await userEvent.upload(input, [TEST_XLS_FILE])

            const fileList = screen.getAllByRole('list')[0]

            await waitFor(() => {
                expect(
                    screen.queryAllByText('Duplicate file, please remove')
                ).toHaveLength(0)
                expect(within(fileList).getAllByRole('listitem')).toHaveLength(
                    1
                )
            })
            // note: userEvent.upload does not re-trigger input event when selected files are the same as before, this is why we upload nothing in between
            await userEvent.upload(input, [])
            await userEvent.upload(input, [TEST_XLS_FILE])

            await waitFor(() => {
                expect(
                    screen.queryAllByText('Duplicate file, please remove')
                ).toHaveLength(1)
                expect(within(fileList).getAllByRole('listitem')).toHaveLength(
                    2
                )
            })

            await userEvent.upload(input, [])
            await userEvent.upload(input, [TEST_XLS_FILE])

            await waitFor(() => {
                expect(
                    screen.queryAllByText('Duplicate file, please remove')
                ).toHaveLength(2)
                expect(within(fileList).getAllByRole('listitem')).toHaveLength(
                    3
                )
            })
        })

        it('not shown in file items list when duplicate file is removed', async () => {
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            const input = screen.getByLabelText(
                'Upload contract-supporting documents'
            )
            await userEvent.upload(input, [TEST_DOC_FILE])
            await userEvent.upload(input, [TEST_PDF_FILE])
            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(screen.queryAllByText(TEST_PDF_FILE.name)).toHaveLength(
                    1
                )
                expect(screen.queryAllByText(TEST_DOC_FILE.name)).toHaveLength(
                    2
                )
                expect(
                    screen.queryAllByText('Duplicate file, please remove')
                ).toHaveLength(1)
            })

            // Remove duplicate document and remove error
            await userEvent.click(screen.queryAllByText(/Remove/)[0])
            expect(screen.queryAllByText(TEST_DOC_FILE.name)).toHaveLength(1)
            expect(
                screen.queryByText('Duplicate file, please remove')
            ).toBeNull()
        })
    })

    describe('error summary at top of page', () => {
        it('displayed as expected', async () => {
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const input = screen.getByLabelText(
                'Upload contract-supporting documents'
            )

            await userEvent.upload(input, [TEST_DOC_FILE])
            await userEvent.upload(input, [TEST_PDF_FILE])
            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                // error summary messages don't appear on load
                expect(
                    screen.queryAllByText('You must remove duplicate files')
                ).toHaveLength(0)
            })

            // click continue and enter validation state
            await userEvent.click(
                screen.getByRole('button', { name: 'Continue' })
            )

            await waitFor(() => {
                expect(
                    screen.queryAllByText('You must remove duplicate files')
                ).toHaveLength(1)
            })
        })
    })

    describe('Continue button', () => {
        it('enabled when valid files are present', async () => {
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            const input = screen.getByLabelText(
                'Upload contract-supporting documents'
            )

            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(continueButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('enabled when invalid file types have been dropped', async () => {
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            const input = screen.getByLabelText(
                'Upload contract-supporting documents'
            )
            const targetEl = screen.getByTestId('file-input-droptarget')

            await userEvent.upload(input, [TEST_DOC_FILE])
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            await waitFor(() => {
                expect(
                    screen.getByText('This is not a valid file type.')
                ).toBeInTheDocument()
                expect(continueButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('when duplicate files present, triggers error alert on continue click', async () => {
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            const input = screen.getByLabelText(
                'Upload contract-supporting documents'
            )
            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })

            await userEvent.upload(input, [TEST_DOC_FILE])
            await userEvent.upload(input, [TEST_PDF_FILE])
            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(
                    screen.queryAllByText('Duplicate file, please remove')
                ).toHaveLength(1)
            })
            await userEvent.click(saveAsDraftButton)
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
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            expect(continueButton).not.toHaveAttribute('aria-disabled')

            await userEvent.click(continueButton)
            expect(
                screen.queryByText('You must upload at least one document')
            ).toBeNull()
            expect(mockUpdateDraftFn).toHaveBeenCalled()
        })

        it('when invalid file type files present, does not trigger alert on click to continue', async () => {
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            const input = screen.getByLabelText(
                'Upload contract-supporting documents'
            )
            const targetEl = screen.getByTestId('file-input-droptarget')

            await userEvent.upload(input, [TEST_DOC_FILE])
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            await waitFor(() => {
                expect(
                    screen.getByText('This is not a valid file type.')
                ).toBeInTheDocument()
            })

            await userEvent.click(continueButton)
            expect(
                screen.queryByText(
                    'You must remove all documents with error messages before continuing'
                )
            ).toBeNull()
            expect(mockUpdateDraftFn).toHaveBeenCalled()
        })

        it('disabled with alert when trying to continue while a file is still uploading', async () => {
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            const targetEl = screen.getByTestId('file-input-droptarget')

            // upload one file
            dragAndDrop(targetEl, [TEST_PDF_FILE])
            const imageElFile1 = screen.getByTestId('file-input-preview-image')
            expect(imageElFile1).toHaveClass('is-loading')

            // upload second file
            dragAndDrop(targetEl, [TEST_DOC_FILE])

            const imageElFile2 = screen.getAllByTestId(
                'file-input-preview-image'
            )[1]
            expect(imageElFile2).toHaveClass('is-loading')

            // click continue while file 2 still loading
            fireEvent.click(continueButton)
            expect(continueButton).toHaveAttribute('aria-disabled', 'true')

            expect(
                screen.getAllByText(
                    'You must wait for all documents to finish uploading before continuing'
                )
            ).not.toBeNull()
        })
    })

    describe('Save as draft button', () => {
        it('enabled when valid files are present', async () => {
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })
            const input = screen.getByLabelText(
                'Upload contract-supporting documents'
            )

            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(saveAsDraftButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })
            const input = screen.getByLabelText(
                'Upload contract-supporting documents'
            )
            const targetEl = screen.getByTestId('file-input-droptarget')

            await userEvent.upload(input, [TEST_DOC_FILE])
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            await waitFor(() => {
                expect(saveAsDraftButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('when zero files present, does not trigger missing documents alert on click', async () => {
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })
            expect(saveAsDraftButton).not.toHaveAttribute('aria-disabled')

            await userEvent.click(saveAsDraftButton)
            expect(mockUpdateDraftFn).toHaveBeenCalled()
            expect(
                screen.queryByText('You must upload at least one document')
            ).toBeNull()
        })
        it('when duplicate files present, triggers error alert on click', async () => {
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            const input = screen.getByLabelText(
                'Upload contract-supporting documents'
            )
            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })

            await userEvent.upload(input, [TEST_DOC_FILE])
            await userEvent.upload(input, [TEST_PDF_FILE])
            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(
                    screen.queryAllByText('Duplicate file, please remove')
                ).toHaveLength(1)
            })
            await userEvent.click(saveAsDraftButton)
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
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const backButton = screen.getByRole('button', {
                name: 'Back',
            })
            const input = screen.getByLabelText(
                'Upload contract-supporting documents'
            )

            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(backButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const backButton = screen.getByRole('button', {
                name: 'Back',
            })
            const input = screen.getByLabelText(
                'Upload contract-supporting documents'
            )
            const targetEl = screen.getByTestId('file-input-droptarget')

            await userEvent.upload(input, [TEST_DOC_FILE])
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            await waitFor(() => {
                expect(backButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('when zero files present, does not trigger alert on click', async () => {
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const backButton = screen.getByRole('button', {
                name: 'Back',
            })
            expect(backButton).not.toHaveAttribute('aria-disabled')

            await userEvent.click(backButton)
            expect(
                screen.queryByText('You must upload at least one document')
            ).toBeNull()
            expect(mockUpdateDraftFn).toHaveBeenCalled()
        })

        it('when duplicate files present, does not trigger alert on click', async () => {
            renderWithProviders(<Documents />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            const input = screen.getByLabelText(
                'Upload contract-supporting documents'
            )
            const backButton = screen.getByRole('button', {
                name: 'Back',
            })

            await userEvent.upload(input, [TEST_DOC_FILE])
            await userEvent.upload(input, [TEST_PDF_FILE])
            await userEvent.upload(input, [TEST_DOC_FILE])
            await waitFor(() => {
                expect(backButton).not.toHaveAttribute('aria-disabled')
                expect(
                    screen.queryAllByText('Duplicate file, please remove')
                ).toHaveLength(1)
            })
            await userEvent.click(backButton)
            expect(screen.queryByText('Remove files with errors')).toBeNull()
            expect(mockUpdateDraftFn).toHaveBeenCalled()
        })
    })
})
