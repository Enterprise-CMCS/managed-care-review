import { screen, waitFor, within, fireEvent } from '@testing-library/react'
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
        rateType: undefined,
        rateDateStart: undefined,
        rateDateEnd: undefined,
        rateDateCertified: undefined,
    }

    afterEach(() => jest.clearAllMocks())

    it('renders without errors', async () => {
        const mockUpdateDraftFn = jest.fn()

        renderWithProviders(
            <RateDetails
                draftSubmission={emptyRateDetailsDraft}
                updateDraft={mockUpdateDraftFn}
                previousDocuments={[]}
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
        ).not.toHaveAttribute('aria-disabled')
    })

    it('displays correct form guidance', async () => {
        renderWithProviders(
            <RateDetails
                draftSubmission={emptyRateDetailsDraft}
                updateDraft={jest.fn()}
                previousDocuments={[]}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        expect(screen.getByText(/All fields are required/)).toBeInTheDocument()
    })

    it('loads with empty rate type and document upload fields visible', async () => {
        const mockUpdateDraftFn = jest.fn()

        renderWithProviders(
            <RateDetails
                draftSubmission={emptyRateDetailsDraft}
                updateDraft={mockUpdateDraftFn}
                previousDocuments={[]}
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
        expect(
            screen.getByRole('radio', {
                name: 'Certification of capitation rates specific to each rate cell',
            })
        ).not.toBeChecked()
        expect(
            screen.getByRole('radio', {
                name: 'Certification of rate ranges of capitation rates per rate cell',
            })
        ).not.toBeChecked()
        expect(screen.getByTestId('file-input')).toBeInTheDocument()
        expect(
            within(
                screen.getByTestId('file-input-preview-list')
            ).queryAllByRole('listitem')
        ).toHaveLength(0)

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
                previousDocuments={[]}
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
            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })
    })

    it('cannot continue without selecting rate capitation type', async () => {
        const mockUpdateDraftFn = jest.fn()

        renderWithProviders(
            <RateDetails
                draftSubmission={emptyRateDetailsDraft}
                updateDraft={mockUpdateDraftFn}
                previousDocuments={[]}
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
                screen.getAllByText(
                    "You must select whether you're certifying rates or rate ranges"
                )
            ).toHaveLength(2)
            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })
    })

    it('cannot continue if no documents are added', async () => {
        const mockUpdateDraftFn = jest.fn()

        renderWithProviders(
            <RateDetails
                draftSubmission={emptyRateDetailsDraft}
                updateDraft={mockUpdateDraftFn}
                previousDocuments={[]}
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
            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })
    })

    it('progressively disclose new rate form fields as expected', async () => {
        renderWithProviders(
            <RateDetails
                draftSubmission={emptyRateDetailsDraft}
                updateDraft={jest.fn()}
                previousDocuments={[]}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        expect(screen.getByText('Rate certification type')).toBeInTheDocument()
        screen.getByLabelText('New rate certification').click()
        expect(
            screen.getByText(
                'Does the actuary certify capitation rates specific to each rate cell or a rate range?'
            )
        ).toBeInTheDocument()
        screen
            .getByLabelText(
                'Certification of capitation rates specific to each rate cell'
            )
            .click()
        const input = screen.getByLabelText('Upload rate certification')
        await userEvent.upload(input, [TEST_DOC_FILE])

        // check that now we can see hidden things
        await waitFor(() => {
            expect(screen.queryByText('Rating period')).toBeInTheDocument()
            expect(screen.queryByText('Start date')).toBeInTheDocument()
            expect(screen.queryByText('End date')).toBeInTheDocument()
            expect(screen.queryByText('Date certified')).toBeInTheDocument()
            expect(screen.queryAllByTestId('errorMessage')).toHaveLength(0)
        })
        // click "continue"
        const continueButton = screen.getByRole('button', { name: 'Continue' })

        fireEvent.click(continueButton)

        // check for expected errors
        await waitFor(() => {
            expect(screen.queryAllByTestId('errorMessage')).toHaveLength(2)
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
        const startDate = await screen.findByText('Start date')
        await userEvent.type(startDate, '01/01/2022')

        const endDate = await screen.findByText('End date')
        await userEvent.type(endDate, '12/31/2022')

        const dateCertified = await screen.findByText('Date certified')
        await userEvent.type(dateCertified, '12/01/2021')

        //wait for all errors to clear
        await waitFor(() =>
            expect(screen.queryAllByTestId('errorMessage')).toHaveLength(0)
        )
    })

    describe('Rate documents file upload', () => {
        it('renders without errors', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
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
                ).not.toHaveAttribute('aria-disabled')
                expect(
                    within(
                        screen.getByTestId('file-input-preview-list')
                    ).queryAllByRole('listitem')
                ).toHaveLength(0)
            })
        })

        it('accepts a new document', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            const input = screen.getByLabelText('Upload rate certification')
            expect(input).toBeInTheDocument()
            await userEvent.upload(input, [TEST_DOC_FILE])

            expect(
                await screen.findByText(TEST_DOC_FILE.name)
            ).toBeInTheDocument()
        })

        it('accepts multiple pdf, word, excel documents', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
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
    })

    describe('Continue button', () => {
        it('enabled when valid files are present', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
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

            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(continueButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
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

            await userEvent.upload(input, [TEST_DOC_FILE])
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            await waitFor(() => {
                expect(
                    screen.getByText('This is not a valid file type.')
                ).toBeInTheDocument()
                expect(continueButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('disabled with alert after first attempt to continue with zero files', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
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
            expect(continueButton).not.toHaveAttribute('aria-disabled')

            continueButton.click()

            await waitFor(() => {
                expect(
                    screen.getAllByText('You must upload at least one document')
                ).toHaveLength(2)

                expect(continueButton).toHaveAttribute('aria-disabled', 'true')
            })
        })

        it('disabled with alert after first attempt to continue with invalid duplicate files', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
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

            await userEvent.upload(input, TEST_DOC_FILE)
            await userEvent.upload(input, [])
            await userEvent.upload(input, TEST_DOC_FILE)
            expect(continueButton).not.toHaveAttribute('aria-disabled')

            continueButton.click()

            await waitFor(() => {
                expect(
                    screen.getAllByText(
                        'You must remove all documents with error messages before continuing'
                    )
                ).toHaveLength(2)

                expect(continueButton).toHaveAttribute('aria-disabled', 'true')
            })
        })

        it('disabled with alert after first attempt to continue with invalid files', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
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

            expect(continueButton).not.toHaveAttribute('aria-disabled')
            continueButton.click()

            expect(
                await screen.findAllByText(
                    'You must upload at least one document'
                )
            ).toHaveLength(2)

            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })
        it('disabled with alert when trying to continue while a file is still uploading', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
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
            const imageElFile1 = screen.getByTestId('file-input-preview-image')
            expect(imageElFile1).toHaveClass('is-loading')
            await waitFor(() =>
                expect(imageElFile1).not.toHaveClass('is-loading')
            )

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
            ).toHaveLength(2)
        })
    })

    describe('Save as draft button', () => {
        it('enabled when valid files are present', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={mockUpdateDraftFn}
                    previousDocuments={[]}
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

            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(saveAsDraftButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={mockUpdateDraftFn}
                    previousDocuments={[]}
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

            await userEvent.upload(input, [TEST_DOC_FILE])
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            await waitFor(() => {
                expect(saveAsDraftButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('when zero files present, does not trigger missing documents alert on click but still saves the in progress draft', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={mockUpdateDraftFn}
                    previousDocuments={[]}
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
            expect(saveAsDraftButton).not.toHaveAttribute('aria-disabled')

            await userEvent.click(saveAsDraftButton)
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
                        documentCategories: ['RATES' as const],
                    },
                ],
                rateType: undefined,
                rateDateStart: undefined,
                rateDateEnd: undefined,
                rateDateCertified: undefined,
            }
            renderWithProviders(
                <RateDetails
                    draftSubmission={hasDocsDetailsDraft}
                    updateDraft={mockUpdateDraftFn}
                    previousDocuments={[]}
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
            expect(saveAsDraftButton).not.toHaveAttribute('aria-disabled')

            await userEvent.click(saveAsDraftButton)
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
                    previousDocuments={[]}
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
                    previousDocuments={[]}
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

            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(backButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
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

            await userEvent.upload(input, [TEST_DOC_FILE])
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            await waitFor(() => {
                expect(backButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('when zero files present, does not trigger missing documents alert on click', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={mockUpdateDraftFn}
                    previousDocuments={[]}
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
            expect(backButton).not.toHaveAttribute('aria-disabled')

            await userEvent.click(backButton)
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
                    previousDocuments={[]}
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
            expect(mockUpdateDraftFn).toHaveBeenCalledWith(
                expect.objectContaining({
                    rateDocuments: [
                        {
                            name: 'testFile.doc',
                            s3URL: expect.any(String),
                            documentCategories: ['RATES'],
                        },
                        {
                            name: 'testFile.pdf',
                            s3URL: expect.any(String),
                            documentCategories: ['RATES'],
                        },
                    ],
                })
            )
        })
    })
})
