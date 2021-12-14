import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
    mockDraft,
    fetchCurrentUserMock,
} from '../../../testHelpers/apolloHelpers'

import {
    renderWithProviders,
    TEST_DOC_FILE,
    TEST_PDF_FILE,
    TEST_XLS_FILE,
    TEST_PNG_FILE,
    dragAndDrop,
} from '../../../testHelpers/jestHelpers'
import { RateDetails } from './RateDetails'

describe('RateDetails', () => {
    const emptyRateDetailsDraft = {
        ...mockDraft(),
        rateType: null,
        rateDateStart: null,
        rateDateEnd: null,
        rateDateCertified: null,
    }

    afterEach(() => jest.clearAllMocks())

    it('renders without errors', async () => {
        const mockUpdateDraftFn = jest.fn()

        renderWithProviders(
            <RateDetails
                draftSubmission={emptyRateDetailsDraft}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        expect(screen.getByText('Rate certification type')).toBeInTheDocument()
        expect(
            screen.getByText('Upload rate certification')
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Continue' })
        ).not.toBeDisabled()
    })

    it('loads with empty rate type and document upload fields visible', async () => {
        const mockUpdateDraftFn = jest.fn()

        renderWithProviders(
            <RateDetails
                draftSubmission={emptyRateDetailsDraft}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        expect(
            screen.getByRole('radio', { name: 'New rate certification' })
        ).not.toBeChecked()
        expect(
            screen.getByRole('radio', {
                name: 'Amendment to prior rate certification',
            })
        ).not.toBeChecked()
        expect(screen.getByTestId('file-input')).toBeInTheDocument()
        expect(
            within(
                screen.getByTestId('file-input-preview-list')
            ).queryAllByRole('listitem').length
        ).toBe(0)

        // should not be able to find hidden things
        expect(screen.queryByText('Start date')).toBeNull()
        expect(screen.queryByText('End date')).toBeNull()
        expect(screen.queryByText('Date certified')).toBeNull()
    })

    it('cannot continue without selecting rate type', async () => {
        const mockUpdateDraftFn = jest.fn()

        renderWithProviders(
            <RateDetails
                draftSubmission={emptyRateDetailsDraft}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        const continueButton = screen.getByRole('button', { name: 'Continue' })
        await continueButton.click()
        await waitFor(() => {
            expect(
                screen.getAllByText('You must choose a rate certification type')
            ).toHaveLength(2)
            expect(continueButton).toBeDisabled()
        })
    })

    it('cannot continue if no documents are added', async () => {
        const mockUpdateDraftFn = jest.fn()

        renderWithProviders(
            <RateDetails
                draftSubmission={emptyRateDetailsDraft}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        const continueButton = screen.getByRole('button', { name: 'Continue' })

        screen.getByLabelText('New rate certification').click()

        await continueButton.click()
        await waitFor(() => {
            expect(
                screen.getAllByText('You must upload at least one document')
            ).toHaveLength(2)
            expect(continueButton).toBeDisabled()
        })
    })

    it('progressively disclose new rate form fields as expected', async () => {
        renderWithProviders(
            <RateDetails
                draftSubmission={emptyRateDetailsDraft}
                updateDraft={jest.fn()}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        expect(screen.getByText('Rate certification type')).toBeInTheDocument()
        screen.getByLabelText('New rate certification').click()
        const input = screen.getByLabelText('Upload rate certification')
        userEvent.upload(input, [TEST_DOC_FILE])

        // check that now we can see hidden things
        await waitFor(() => {
            expect(screen.queryByText('Rating period')).toBeInTheDocument()
            expect(screen.queryByText('Start date')).toBeInTheDocument()
            expect(screen.queryByText('End date')).toBeInTheDocument()
            expect(screen.queryByText('Date certified')).toBeInTheDocument()
            expect(screen.queryAllByTestId('errorMessage').length).toBe(0)
        })
        // click "continue"
        const continueButton = screen.getByRole('button', { name: 'Continue' })

        continueButton.click()

        // check for expected errors
        await waitFor(() => {
            expect(screen.queryAllByTestId('errorMessage').length).toBe(2)
            expect(
                screen.queryAllByText(
                    'You must enter the date the document was certified'
                )
            ).toHaveLength(2)
            expect(
                screen.queryByText('You must provide a start and an end date')
            ).toBeInTheDocument()
        })

        // fill out form and clear errors
        userEvent.type(screen.getByText('Start date'), '01/01/2022')
        userEvent.type(screen.getByText('End date'), '12/31/2022')
        userEvent.type(screen.getByText('Date certified'), '12/01/2021')
        await waitFor(() =>
            expect(screen.queryAllByTestId('errorMessage').length).toBe(0)
        )
    })

    describe('Rate documents file upload', () => {
        it('renders without errors', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
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
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            const input = screen.getByLabelText('Upload rate certification')
            expect(input).toBeInTheDocument()
            userEvent.upload(input, [TEST_DOC_FILE])

            expect(
                await screen.findByText(TEST_DOC_FILE.name)
            ).toBeInTheDocument()
        })

        it('accepts multiple pdf, word, excel documents', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            const input = screen.getByLabelText('Upload rate certification')
            expect(input).toBeInTheDocument()
            expect(input).toHaveAttribute(
                'accept',
                'application/pdf,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            userEvent.upload(input, [
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
    })

    describe('Continue button', () => {
        it('enabled when valid files are present', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
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
            const input = screen.getByLabelText('Upload rate certification')

            userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(continueButton).not.toBeDisabled()
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
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
            const input = screen.getByLabelText('Upload rate certification')
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
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
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
            expect(continueButton).not.toBeDisabled()

            continueButton.click()

            await waitFor(() => {
                expect(
                    screen.getAllByText('You must upload at least one document')
                ).toHaveLength(2)

                expect(continueButton).toBeDisabled()
            })
        })

        it('disabled with alert after first attempt to continue with invalid duplicate files', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            const input = screen.getByLabelText('Upload rate certification')
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            userEvent.upload(input, [TEST_DOC_FILE, TEST_DOC_FILE])
            expect(continueButton).not.toBeDisabled()

            continueButton.click()
            await waitFor(() => {
                expect(
                    screen.getByText(
                        'You must remove all documents with error messages before continuing'
                    )
                ).toBeInTheDocument()

                expect(continueButton).toBeDisabled()
            })
        })

        it('disabled with alert after first attempt to continue with invalid files', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
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
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            expect(
                await screen.findByText('This is not a valid file type.')
            ).toBeInTheDocument()

            expect(continueButton).not.toBeDisabled()
            continueButton.click()

            expect(
                await screen.findAllByText('You must upload at least one document')
            ).toHaveLength(2)

            expect(continueButton).toBeDisabled()
        })
    })

    describe('Save as draft button', () => {
        it('enabled when valid files are present', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
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
            const input = screen.getByLabelText('Upload rate certification')

            userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(saveAsDraftButton).not.toBeDisabled()
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
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
            const input = screen.getByLabelText('Upload rate certification')
            const targetEl = screen.getByTestId('file-input-droptarget')

            userEvent.upload(input, [TEST_DOC_FILE])
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            await waitFor(() => {
                expect(saveAsDraftButton).not.toBeDisabled()
            })
        })

        it('when zero files present, does not trigger missing documents alert on click but still saves the in progress draft', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
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

        it('when existing file is removed, does not trigger missing documents alert on click but still saves the in progress draft', async () => {
            const mockUpdateDraftFn = jest.fn()
            const hasDocsDetailsDraft = {
                ...mockDraft(),
                rateDocuments: [
                    {
                        name: 'aasdf3423af',
                        s3URL: 's3://bucketname/key/fileName',
                    },
                ],
                rateType: null,
                rateDateStart: null,
                rateDateEnd: null,
                rateDateCertified: null,
            }
            renderWithProviders(
                <RateDetails
                    draftSubmission={hasDocsDetailsDraft}
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
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={mockUpdateDraftFn}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )
            const input = screen.getByLabelText('Upload rate certification')
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
                    screen.queryAllByText(
                        'You must remove all documents with error messages before continuing'
                    )
                ).toHaveLength(2)
            })
        })
    })

    describe('Back button', () => {
        it('enabled when valid files are present', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
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
            const input = screen.getByLabelText('Upload rate certification')

            userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(backButton).not.toBeDisabled()
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
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
            const input = screen.getByLabelText('Upload rate certification')
            const targetEl = screen.getByTestId('file-input-droptarget')

            userEvent.upload(input, [TEST_DOC_FILE])
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            await waitFor(() => {
                expect(backButton).not.toBeDisabled()
            })
        })

        it('when zero files present, does not trigger missing documents alert on click', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
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
            expect(mockUpdateDraftFn).not.toHaveBeenCalled()
        })

        it('when duplicate files present, does not trigger duplicate documents alert on click and silently updates submission without the duplicate', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={mockUpdateDraftFn}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            const input = screen.getByLabelText('Upload rate certification')
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
            expect(mockUpdateDraftFn).toHaveBeenCalledWith(
                expect.objectContaining({
                    draftSubmissionUpdates: expect.objectContaining({
                        rateDocuments: [
                            {
                                name: 'testFile.doc',
                                s3URL: expect.any(String),
                            },
                            {
                                name: 'testFile.pdf',
                                s3URL: expect.any(String),
                            },
                        ],
                    }),
                })
            )
        })
    })
})
