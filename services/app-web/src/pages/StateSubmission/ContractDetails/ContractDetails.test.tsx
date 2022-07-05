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

import { ContractDetails } from './'

const scrollIntoViewMock = jest.fn()
HTMLElement.prototype.scrollIntoView = scrollIntoViewMock

describe('ContractDetails', () => {
    afterEach(() => {
        jest.resetAllMocks()
    })
    afterAll(() => {
        jest.clearAllMocks()
    })

    const emptyContractDetailsDraft = {
        ...mockDraft(),
    }
    afterEach(() => jest.clearAllMocks())

    it('displays correct form guidance', async () => {
        renderWithProviders(
            <ContractDetails
                draftSubmission={mockDraft()}
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

    it('allows setting a yes/no modified provision', async () => {
        const emptyDraft = mockDraft()
        const mockUpdateDraftFn = jest.fn()
        renderWithProviders(
            <ContractDetails
                draftSubmission={emptyDraft}
                updateDraft={mockUpdateDraftFn}
                previousDocuments={[]}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        // click amendment
        const amendmentRadio = screen.getByLabelText(
            'Amendment to base contract'
        )
        amendmentRadio.click()
        expect(scrollIntoViewMock).toHaveBeenCalled()

        // click "next"
        const continueButton = screen.getByRole('button', { name: 'Continue' })
        await userEvent.click(continueButton)

        // check for yes/no errors
        await waitFor(() => {
            expect(
                screen.getAllByText('You must select yes or no')
            ).toHaveLength(32)
        })

        const benefitsGroup = screen.getByText(
            'Benefits provided by the managed care plans'
        ).parentElement
        const geoGroup = screen.getByText(
            'Geographic areas served by the managed care plans'
        ).parentElement
        const lengthGroup = screen.getByText(
            'Length of the contract period'
        ).parentElement

        if (
            benefitsGroup === null ||
            geoGroup === null ||
            lengthGroup === null
        ) {
            throw new Error('Benefits and Geo and Length must have parents.')
        }

        // choose yes and no
        const benefitsYes = within(benefitsGroup).getByLabelText('Yes') //
        const geoNo = within(geoGroup).getByLabelText('No')
        const lengthYes = within(lengthGroup).getByLabelText('Yes')

        await userEvent.click(benefitsYes)
        await userEvent.click(geoNo)
        await userEvent.click(lengthYes)

        // error should be reduced by 3
        await waitFor(() => {
            expect(
                screen.queryAllByText('You must select yes or no')
            ).toHaveLength(26)
        })
    })

    describe('Contract documents file upload', () => {
        it('renders without errors', async () => {
            renderWithProviders(
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            const input = screen.getByLabelText('Upload contract')
            expect(input).toBeInTheDocument()
            await userEvent.upload(input, [TEST_DOC_FILE])

            expect(
                await screen.findByText(TEST_DOC_FILE.name)
            ).toBeInTheDocument()
        })

        it('accepts multiple pdf, word, excel documents', async () => {
            renderWithProviders(
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            const input = screen.getByLabelText('Upload contract')
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
            const input = screen.getByLabelText('Upload contract')

            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(continueButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            renderWithProviders(
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
            const input = screen.getByLabelText('Upload contract')
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            const input = screen.getByLabelText('Upload contract')
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            await userEvent.upload(input, [TEST_DOC_FILE])
            await userEvent.upload(input, []) // clear input and ensure we add same file twice
            await userEvent.upload(input, [TEST_DOC_FILE])
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
            const input = screen.getByLabelText('Upload contract')

            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(saveAsDraftButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
            const input = screen.getByLabelText('Upload contract')
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
                contractDocuments: [
                    {
                        name: 'aasdf3423af',
                        s3URL: 's3://bucketname/key/fileName',
                        documentCategories: ['CONTRACT' as const],
                    },
                ],
            }
            renderWithProviders(
                <ContractDetails
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
                    updateDraft={mockUpdateDraftFn}
                    previousDocuments={[]}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )
            const input = screen.getByLabelText('Upload contract')
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
            const input = screen.getByLabelText('Upload contract')

            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(backButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            renderWithProviders(
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
            const input = screen.getByLabelText('Upload contract')
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
                    updateDraft={mockUpdateDraftFn}
                    previousDocuments={[]}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            const input = screen.getByLabelText('Upload contract')
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
                    contractDocuments: [
                        {
                            name: 'testFile.doc',
                            s3URL: expect.any(String),
                            documentCategories: ['CONTRACT'],
                        },
                        {
                            name: 'testFile.pdf',
                            s3URL: expect.any(String),
                            documentCategories: ['CONTRACT'],
                        },
                    ],
                })
            )
        })
    })
})
