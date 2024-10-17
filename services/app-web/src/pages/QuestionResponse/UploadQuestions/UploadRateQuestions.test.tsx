import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
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
import {
    fetchCurrentUserMock,
    iterableCmsUsersMockData,
    fetchRateWithQuestionsMockSuccess,
    mockRateSubmittedWithQuestions,
    mockValidCMSUser
} from '../../../testHelpers/apolloMocks'
import {
    createRateQuestionNetworkFailure,
    createRateQuestionSuccess,
} from '../../../testHelpers/apolloMocks/questionResponseGQLMock'
// import { SubmissionSideNav } from '../../SubmissionSideNav'
import { Location } from 'react-router-dom'
import { UploadRateQuestions } from './UploadRateQuestions'

describe('UploadRateQuestions', () => {
    afterEach(() => {
        vitest.clearAllMocks()
    })
    const renderUploadQuestionUI = () => {
        return (
            <Routes>
            <Route
                path={RoutesRecord.RATES_UPLOAD_QUESTION}
                element={<UploadRateQuestions />}
            />
        </Routes>
        )
    }
    describe.each(iterableCmsUsersMockData)(
        '$userRole UploadQuestions tests',
        ({ userRole, mockUser }) => {
            it('displays file upload for correct cms division', async () => {
                const division = 'dmco'
                const rate =  mockRateSubmittedWithQuestions({ id: '15'})

                renderWithProviders(
                    renderUploadQuestionUI(),
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockValidCMSUser(),
                                    statusCode: 200,
                                }),
                                fetchRateWithQuestionsMockSuccess({
                                    rate
                                }),
                            ],
                        },
                        routerProvider: {
                            route: `/rates/15/question-and-answers/${division}/upload-questions`,
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
                        screen.queryByText(
                            `Questions from ${division.toUpperCase()}`
                        )
                    ).toBeInTheDocument()
                })
                // Expect file upload input on page
                expect(
                    await screen.findByTestId('file-input')
                ).toBeInTheDocument()
                expect(
                    screen.getByLabelText('Upload questions')
                ).toBeInTheDocument()
            })

            it('file upload accepts multiple pdf, word, excel documents', async () => {
                const rate =   mockRateSubmittedWithQuestions({ id: '15'})

                renderWithProviders(
                  renderUploadQuestionUI(),
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockValidCMSUser(),
                                    statusCode: 200,
                                }),
                                fetchRateWithQuestionsMockSuccess({
                                    rate,
                                }),
                            ],
                        },
                        routerProvider: {
                            route: `/rates/15/question-and-answers/dmco/upload-questions`,
                        },
                    }
                )

                await screen.findByRole('heading', {
                    name: /Add questions/,
                    level: 2,
                })
                const input = screen.getByLabelText('Upload questions')
                expect(input).toBeInTheDocument()
                expect(input).toHaveAttribute(
                    'accept',
                    ACCEPTED_SUBMISSION_FILE_TYPES
                )
                await userEvent.upload(input, [
                    TEST_DOC_FILE,
                    TEST_PDF_FILE,
                    TEST_XLS_FILE,
                ])
                await waitFor(() => {
                    expect(
                        screen.getByText(TEST_DOC_FILE.name)
                    ).toBeInTheDocument()
                    expect(
                        screen.getByText(TEST_PDF_FILE.name)
                    ).toBeInTheDocument()
                    expect(
                        screen.getByText(TEST_XLS_FILE.name)
                    ).toBeInTheDocument()
                })
            })

            it.skip('allows submission with an uploaded doc', async () => {
                let testLocation: Location
                const rate =   mockRateSubmittedWithQuestions({ id: '15'})

                const { user } = renderWithProviders(
                  renderUploadQuestionUI(),
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockValidCMSUser(),
                                    statusCode: 200,
                                }),
                                fetchRateWithQuestionsMockSuccess({
                                    rate: {
                                        ...rate,
                                        id: '15',
                                    },
                                }),
                                createRateQuestionSuccess({
                                    rateID: '15',
                                    documents: [
                                        {
                                            name: 'testFile.doc',
                                            s3URL: 's3://fake-bucket/fakeS3Key0-testFile.doc/testFile.doc',
                                        },
                                    ],
                                }),
                            ],
                        },
                        routerProvider: {
                            route: `/rates/15/question-and-answers/dmco/upload-questions`,
                        },
                        location: (location) => (testLocation = location),
                    }
                )

                await screen.findByRole('heading', {
                    name: /Add questions/,
                    level: 2,
                })
                const input = screen.getByLabelText('Upload questions')
                expect(input).toBeInTheDocument()
                expect(input).toHaveAttribute(
                    'accept',
                    ACCEPTED_SUBMISSION_FILE_TYPES
                )
                await userEvent.upload(input, [TEST_DOC_FILE])
                await waitFor(() => {
                    expect(
                        screen.getByText(TEST_DOC_FILE.name)
                    ).toBeInTheDocument()
                })

                // OK, this document has been uploaded with an S3Key of the current timestamp
                // is that serving us at all? gives us unique keys which is good.
                // makes it pretty difficult to create the correct mock, since everything needs to match exactly.

                await user.click(
                    await screen.findByRole('button', { name: /Add questions/ })
                )

                await waitFor(() =>
                    expect(testLocation.pathname).toBe(
                        `/rates/15/question-and-answers`
                    )
                )
            })

            it('displays form validation error if attempting to add question with zero files', async () => {
                const rate =   mockRateSubmittedWithQuestions({ id: '15'})

                const { user } = renderWithProviders(
                    renderUploadQuestionUI(),
                    {
                        routerProvider: {
                            route: `/rates/15/question-and-answers/dmco/upload-questions`,
                        },
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockValidCMSUser(),
                                    statusCode: 200,
                                }),
                                fetchRateWithQuestionsMockSuccess({
                                    rate: {
                                        ...rate,
                                        id: '15',
                                    },
                                }),
                            ],
                        },
                    }
                )
                await screen.findByRole('heading', {
                    name: /Add questions/,
                    level: 2,
                })
                const continueButton = screen.getByRole('button', {
                    name: 'Add questions',
                })
                expect(continueButton).not.toHaveAttribute('aria-disabled')

                await user.click(continueButton)

                await waitFor(() => {
                    expect(
                        screen.getAllByText(
                            'You must upload at least one document'
                        )
                    ).toHaveLength(2)
                })
            })

            it('displays file upload alert if attempting to add question with all invalid files', async () => {
                const rate =   mockRateSubmittedWithQuestions({ id: '15'})
                const { user } = renderWithProviders(
                  renderUploadQuestionUI(),
                    {
                        routerProvider: {
                            route: `/rates/15/question-and-answers/dmco/upload-questions`,
                        },
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockValidCMSUser(),
                                    statusCode: 200,
                                }),
                                fetchRateWithQuestionsMockSuccess({
                                    rate: {
                                        ...rate,
                                        id: '15',
                                    },
                                }),
                                fetchRateWithQuestionsMockSuccess({
                                    rate: {
                                        ...rate,
                                        id: '15',
                                    },
                                }),
                            ],
                        },
                    }
                )
                await screen.findByRole('heading', {
                    name: /Add questions/,
                    level: 2,
                })
                const continueButton = screen.getByRole('button', {
                    name: 'Add questions',
                })

                const targetEl = screen.getByTestId('file-input-droptarget')
                dragAndDrop(targetEl, [TEST_PNG_FILE])

                expect(
                    await screen.findByText('This is not a valid file type.')
                ).toBeInTheDocument()

                expect(continueButton).not.toHaveAttribute('aria-disabled')
                await user.click(continueButton)

                expect(
                    await screen.findAllByText(
                        'You must upload at least one document'
                    )
                ).toHaveLength(2)
            })

            it('displays file upload error alert if attempting to add question while a file is still uploading', async () => {
                const rate =   mockRateSubmittedWithQuestions({ id: '15'})
                renderWithProviders(
                  renderUploadQuestionUI(),
                    {
                        routerProvider: {
                            route: `/rates/15/question-and-answers/dmco/upload-questions`,
                        },
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockValidCMSUser(),
                                    statusCode: 200,
                                }),
                                fetchRateWithQuestionsMockSuccess({
                                    rate: {
                                        ...rate,
                                        id: '15',
                                    },
                                }),
                            ],
                        },
                    }
                )
                await screen.findByRole('heading', {
                    name: /Add questions/,
                    level: 2,
                })
                const continueButton = screen.getByRole('button', {
                    name: 'Add questions',
                })
                const targetEl = screen.getByTestId('file-input-droptarget')

                // upload one file
                dragAndDrop(targetEl, [TEST_PDF_FILE])
                const imageElFile1 = screen.getByTestId(
                    'file-input-preview-image'
                )
                await waitFor(() =>
                    expect(imageElFile1).toHaveClass('is-loading')
                )
                await waitFor(() =>
                    expect(imageElFile1).not.toHaveClass('is-loading')
                )

                // upload second file
                dragAndDrop(targetEl, [TEST_DOC_FILE])

                const imageElFile2 = screen.getAllByTestId(
                    'file-input-preview-image'
                )[1]
                await waitFor(() => {
                    /* The following tested states--that the "Add questions" button is disabled and an error message shown--only happen
                AFTER the user clicks "Add questions".  The reason we don't disable the button before a user tries to click
                is that it could be confusing to accessibility users to tab into a disabled button and not know why it's disabled. So they
                have to make the mistake before we show any errors. */
                    expect(imageElFile2).toHaveClass('is-loading')
                    fireEvent.click(continueButton)
                })
                expect(continueButton).toHaveAttribute('aria-disabled', 'true')
                expect(
                    screen.getAllByText(
                        'You must wait for all documents to finish uploading before continuing'
                    )
                ).toHaveLength(2)
            })

            it.skip('displays api error if createQuestion fails', async () => {
                const rate =  mockRateSubmittedWithQuestions({ id: '15'})
                const { user } = renderWithProviders(
                  renderUploadQuestionUI(),
                    {
                        routerProvider: {
                            route: `/rates/15/question-and-answers/dmco/upload-questions`,
                        },
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockValidCMSUser(),
                                    statusCode: 200,
                                }),
                                fetchRateWithQuestionsMockSuccess({
                                    rate: {
                                        ...rate,
                                        id: '15',
                                    },
                                }),
                                createRateQuestionNetworkFailure({
                                    rateID: '15',
                                    documents: [
                                        {
                                            name: 'testFile.doc',
                                            s3URL: 's3://fake-bucket/fakeS3Key0-testFile.doc/testFile.doc',
                                        },
                                    ],
                                }),
                            ],
                        },
                    }
                )

                await screen.findByRole('heading', {
                    name: /Add questions/,
                    level: 2,
                })
                const createQuestionButton = screen.getByRole('button', {
                    name: 'Add questions',
                })
                const input = screen.getByLabelText('Upload questions')

                await userEvent.upload(input, [TEST_DOC_FILE])
                await screen.findByText(TEST_DOC_FILE.name)
                await screen.findByText(/1 complete/)

                await user.click(createQuestionButton)

                await screen.findByTestId('error-alert')
                expect(
                    screen.getByText("We're having trouble loading this page.")
                ).toBeDefined()
            })

            describe('errors', () => {
                it('shows generic error if submission is a draft', async () => {
                   const rate = mockRateSubmittedWithQuestions({ id: '15', status: 'DRAFT'})
                    renderWithProviders(
                        renderUploadQuestionUI(),
                        {
                            apolloProvider: {
                                mocks: [
                                    fetchCurrentUserMock({
                                        user: mockValidCMSUser(),
                                        statusCode: 200,
                                    }),
                                    fetchRateWithQuestionsMockSuccess({
                                        rate: rate,
                                    }),
                                ],
                            },
                            routerProvider: {
                                route: `/rates/15/question-and-answers/dmco/upload-questions`,
                            },
                        }
                    )

                    await waitFor(() => {
                        expect(
                            screen.getByText('System error')
                        ).toBeInTheDocument()
                    })
                })
            })
        }
    )
})
