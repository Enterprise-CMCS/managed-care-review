import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { UploadQuestions } from './.'
import {
    dragAndDrop,
    renderWithProviders,
    TEST_DOC_FILE,
    TEST_PDF_FILE,
    TEST_PNG_FILE,
    TEST_XLS_FILE,
} from '../../../testHelpers'
import { RoutesRecord } from '../../../constants/routes'
import { ACCEPTED_SUBMISSION_FILE_TYPES } from '../../../components/FileUpload'
import { fetchCurrentUserMock } from '../../../testHelpers/apolloMocks'
import { createQuestionNetworkFailure } from '../../../testHelpers/apolloMocks/questionAnswerGQLMock'

describe('UploadQuestions', () => {
    it('displays file upload for correct cms division', async () => {
        const division = 'testDivision'
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_UPLOAD_QUESTION}
                    element={<UploadQuestions />}
                />
            </Routes>,
            {
                routerProvider: {
                    route: `/submissions/15/question-and-answers/${division}/upload-questions`,
                },
            }
        )

        // Expect text to display correct division from url parameters.
        await waitFor(() => {
            expect(
                screen.queryByRole('heading', {
                    name: /Add questions/,
                    level: 2,
                })
            ).toBeInTheDocument()
            expect(
                screen.queryByText(`Questions from ${division.toUpperCase()}`)
            ).toBeInTheDocument()
        })
        // Expect file upload input on page
        expect(await screen.findByTestId('file-input')).toBeInTheDocument()
        expect(screen.getByLabelText('Upload questions')).toBeInTheDocument()
    })

    it('file upload accepts multiple pdf, word, excel documents', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_UPLOAD_QUESTION}
                    element={<UploadQuestions />}
                />
            </Routes>,
            {
                routerProvider: {
                    route: `/submissions/15/question-and-answers/dmco/upload-questions`,
                },
            }
        )

        const input = screen.getByLabelText('Upload questions')
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

    it('displays form validation error if attempting to add question with zero files', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_UPLOAD_QUESTION}
                    element={<UploadQuestions />}
                />
            </Routes>,
            {
                routerProvider: {
                    route: `/submissions/15/question-and-answers/dmco/upload-questions`,
                },
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        const continueButton = screen.getByRole('button', {
            name: 'Add questions',
        })
        expect(continueButton).not.toHaveAttribute('aria-disabled')

        continueButton.click()

        await waitFor(() => {
            expect(
                screen.getAllByText('You must upload at least one document')
            ).toHaveLength(2)
        })
    })

    it('displays file upload alert if attempting to add question with all invalid files', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_UPLOAD_QUESTION}
                    element={<UploadQuestions />}
                />
            </Routes>,
            {
                routerProvider: {
                    route: `/submissions/15/question-and-answers/dmco/upload-questions`,
                },
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        const continueButton = screen.getByRole('button', {
            name: 'Add questions',
        })

        const targetEl = screen.getByTestId('file-input-droptarget')
        dragAndDrop(targetEl, [TEST_PNG_FILE])

        expect(
            await screen.findByText('This is not a valid file type.')
        ).toBeInTheDocument()

        expect(continueButton).not.toHaveAttribute('aria-disabled')
        continueButton.click()

        expect(
            await screen.findAllByText('You must upload at least one document')
        ).toHaveLength(2)
    })

    it('displays file upload error alert if attempting to add question while a file is still uploading', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_UPLOAD_QUESTION}
                    element={<UploadQuestions />}
                />
            </Routes>,
            {
                routerProvider: {
                    route: `/submissions/15/question-and-answers/dmco/upload-questions`,
                },
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        const continueButton = screen.getByRole('button', {
            name: 'Add questions',
        })
        const targetEl = screen.getByTestId('file-input-droptarget')

        // upload one file
        dragAndDrop(targetEl, [TEST_PDF_FILE])
        const imageElFile1 = screen.getByTestId('file-input-preview-image')
        expect(imageElFile1).toHaveClass('is-loading')
        await waitFor(() => expect(imageElFile1).not.toHaveClass('is-loading'))

        // upload second file
        dragAndDrop(targetEl, [TEST_DOC_FILE])

        const imageElFile2 = screen.getAllByTestId(
            'file-input-preview-image'
        )[1]
        expect(imageElFile2).toHaveClass('is-loading')
        fireEvent.click(continueButton)
        await waitFor(() => {
            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })

        expect(
            await screen.findAllByText(
                'You must wait for all documents to finish uploading before continuing'
            )
        ).toHaveLength(2)
    })

    it('displays api error if createQuestion fails', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_UPLOAD_QUESTION}
                    element={<UploadQuestions />}
                />
            </Routes>,
            {
                routerProvider: {
                    route: `/submissions/15/question-and-answers/dmco/upload-questions`,
                },
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        createQuestionNetworkFailure(),
                    ],
                },
            }
        )

        const createQuestionButton = screen.getByRole('button', {
            name: 'Add questions',
        })
        const input = screen.getByLabelText('Upload questions')

        await userEvent.upload(input, [TEST_DOC_FILE])
        createQuestionButton.click()

        expect(await screen.findByText(TEST_DOC_FILE.name)).toBeInTheDocument()
        expect(
            await screen.findByText("We're having trouble loading this page.")
        ).toBeDefined()
    })
})
