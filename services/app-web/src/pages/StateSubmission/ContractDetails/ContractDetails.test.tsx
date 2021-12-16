import { screen, waitFor, within } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { createMemoryHistory } from 'history'
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

describe('ContractDetails', () => {
    const emptyContractDetailsDraft = {
        ...mockDraft(),
    }
    afterEach(() => jest.clearAllMocks())

    it('progressively discloses options for capitation rates', async () => {
        // mount an empty form

        const emptyDraft = mockDraft()
        emptyDraft.id = '12'
        const history = createMemoryHistory()

        renderWithProviders(
            <ContractDetails
                draftSubmission={emptyDraft}
                updateDraft={async (_) => undefined}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: {
                    route: '/submissions/12/contract-details',
                    routerProps: { history: history },
                },
            }
        )

        // should not be able to find hidden things
        // "Items being amended"
        expect(screen.queryByText('Items being amended')).toBeNull()
        expect(
            screen.queryByText(
                'Is this contract action related to the COVID-19 public health emergency?'
            )
        ).toBeNull()

        // click amendment and upload docs
        const amendmentRadio = screen.getByLabelText(
            'Amendment to base contract'
        )
        amendmentRadio.click()
        const input = screen.getByLabelText('Upload contract')
        userEvent.upload(input, [TEST_DOC_FILE])

        // check that now we can see hidden things
        expect(screen.queryByText('Items being amended')).toBeInTheDocument()
        expect(
            screen.queryByText(
                'Is this contract action related to the COVID-19 public health emergency?'
            )
        ).toBeInTheDocument()

        // click "next"
        const continueButton = screen.getByRole('button', { name: 'Continue' })
        await act(async () => {
            continueButton.click()
        })

        // select some things to narrow down which errors we are looking for
        // these options have to be selected no matter which type of contract it is
        await act(async () => {
            screen.getByLabelText('Managed Care Organization (MCO)').click()
            screen.getByLabelText('1115 Waiver Authority').click()
        })

        // check that there are the errors we expect
        expect(
            screen.queryByText('You must select at least one item')
        ).toBeInTheDocument()

        // click capRates
        await act(async () => {
            screen.getByLabelText('Capitation rates').click()
        })
        expect(
            screen.queryByText('You must select at least one item')
        ).toBeNull()

        // check error for not selected
        expect(
            screen.getByText(
                'You must select a reason for capitation rate change'
            )
        ).toBeInTheDocument()

        // click annual rate
        await act(async () => {
            screen.getByLabelText('Mid-year update').click()
        })

        // error should be gone
        expect(
            screen.queryByText(
                'You must select a reason for capitation rate change'
            )
        ).toBeNull()

        // click other,
        const capitationChoices = screen.getByText(
            'Select reason for capitation rate change'
        ).parentElement
        if (capitationChoices === null) {
            throw new Error('cap choices should always have a parent')
        }

        within(capitationChoices)
            .getByLabelText('Other (please describe)')
            .click()

        // other is displayed, error is back
        await waitFor(() =>
            expect(
                screen.getByText('You must enter a description')
            ).toBeInTheDocument()
        )
        // click "NO" for the Covid question so we can submit
        const otherBox = screen.getByLabelText(
            'Other capitation rate description'
        )
        userEvent.type(otherBox, 'x') // WEIRD, for some reason it's not recording but the last character of the typing
        await waitFor(() => screen.getByLabelText('No').click())

        // click continue

        userEvent.click(continueButton)

        await waitFor(() => {
            expect(screen.queryAllByTestId('errorMessage').length).toBe(0)
        })
    })

    it('progressively discloses option for amended items', async () => {
        // mount an empty form

        const emptyDraft = mockDraft()
        const mockUpdateDraftFn = jest.fn()
        renderWithProviders(
            <ContractDetails
                draftSubmission={emptyDraft}
                updateDraft={mockUpdateDraftFn}
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

        // click "next"
        const continueButton = screen.getByRole('button', { name: 'Continue' })
        await act(async () => {
            continueButton.click()
        })

        // select some things to narrow down which errors we are looking for
        // these options have to be selected no matter which type of contract it is
        await act(async () => {
            screen.getByLabelText('Managed Care Organization (MCO)').click()
            screen.getByLabelText('1115 Waiver Authority').click()
        })

        // click other
        await act(async () => {
            screen.getByLabelText('Other (please describe)').click()
        })

        // check error for not selected
        expect(
            screen.getByText('You must enter a description')
        ).toBeInTheDocument()

        // click annual rate
        await act(async () => {
            const other = screen.getByLabelText('Other item description')
            userEvent.type(other, 'foo bar')
        })

        // error should be gone
        expect(screen.queryByText('You must enter a description')).toBeNull()
    })

    it('progressively discloses option for covid', async () => {
        // mount an empty form

        const emptyDraft = mockDraft()
        emptyDraft.id = '12'
        const history = createMemoryHistory()
        const mockUpdateDraftFn = jest.fn()

        renderWithProviders(
            <ContractDetails
                draftSubmission={emptyDraft}
                updateDraft={mockUpdateDraftFn}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: {
                    route: '/submissions/12/contract-details',
                    routerProps: { history: history },
                },
            }
        )

        // click amendment
        const amendmentRadio = screen.getByLabelText(
            'Amendment to base contract'
        )
        amendmentRadio.click()

        // click "next"
        const continueButton = screen.getByRole('button', { name: 'Continue' })
        await act(async () => {
            continueButton.click()
        })

        // select some things to narrow down which errors we are looking for
        // these options have to be selected no matter which type of contract it is
        await act(async () => {
            screen.getByLabelText('Managed Care Organization (MCO)').click()
            screen.getByLabelText('1115 Waiver Authority').click()
            screen.getByLabelText('Financial incentives').click()
        })

        // check on the covid error
        expect(
            screen.queryByText(
                'You must indicate whether or not this contract action is related to COVID-19'
            )
        ).toBeInTheDocument()

        // click other
        await act(async () => {
            screen.getByLabelText('Yes').click()
        })

        // check error for not selected
        expect(
            screen.getByText(
                'Is this related to coverage and reimbursement for vaccine administration?'
            )
        ).toBeInTheDocument()
        expect(
            screen.queryByText(
                'You must indicate whether or not this is related to vaccine administration'
            )
        ).toBeInTheDocument()

        // click annual rate
        await act(async () => {
            const vaccineNo = screen.getAllByLabelText('No')[1]
            vaccineNo.click()
        })

        // error should be gone
        expect(
            screen.queryByText(
                'You must indicate whether or not this is related to vaccine administration'
            )
        ).toBeNull()
    })

    describe('Contract documents file upload', () => {
        it('renders without errors', async () => {
            renderWithProviders(
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
                    updateDraft={jest.fn()}
                />,
                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )

            const input = screen.getByLabelText('Upload contract')
            expect(input).toBeInTheDocument()
            userEvent.upload(input, [TEST_DOC_FILE])

            expect(
                await screen.findByText(TEST_DOC_FILE.name)
            ).toBeInTheDocument()
        })

        it('accepts multiple pdf, word, excel documents', async () => {
            renderWithProviders(
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
                    updateDraft={jest.fn()}
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
            const input = screen.getByLabelText('Upload contract')

            userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(continueButton).not.toBeDisabled()
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            renderWithProviders(
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
            const input = screen.getByLabelText('Upload contract')
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
                    screen.getByText('You must upload at least one document')
                ).toBeInTheDocument()

                expect(continueButton).toBeDisabled()
            })
        })

        it('disabled with alert after first attempt to continue with invalid duplicate files', async () => {
            renderWithProviders(
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
                    updateDraft={jest.fn()}
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
                await screen.findByText('You must upload at least one document')
            ).toBeInTheDocument()

            expect(continueButton).toBeDisabled()
        })
        it('disabled with alert when trying to continue while a file is still uploading', async () => {
            renderWithProviders(
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
            continueButton.click()
            expect(continueButton).toBeDisabled()

            expect(
                screen.getByText(
                    'You must remove all documents with error messages before continuing'
                )
            ).toBeInTheDocument()
        })
    })

    describe('Save as draft button', () => {
        it('enabled when valid files are present', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
            const input = screen.getByLabelText('Upload contract')

            userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(saveAsDraftButton).not.toBeDisabled()
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            const mockUpdateDraftFn = jest.fn()
            renderWithProviders(
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
            const input = screen.getByLabelText('Upload contract')
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
                contractDocuments: [
                    {
                        name: 'aasdf3423af',
                        s3URL: 's3://bucketname/key/fileName',
                    },
                ],
            }
            renderWithProviders(
                <ContractDetails
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
                    updateDraft={mockUpdateDraftFn}
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
                    screen.queryByText(
                        'You must remove all documents with error messages before continuing'
                    )
                ).toBeInTheDocument()
            })
        })
    })

    describe('Back button', () => {
        it('enabled when valid files are present', async () => {
            renderWithProviders(
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
            const input = screen.getByLabelText('Upload contract')

            userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(backButton).not.toBeDisabled()
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            renderWithProviders(
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
            const input = screen.getByLabelText('Upload contract')
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
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
                <ContractDetails
                    draftSubmission={emptyContractDetailsDraft}
                    updateDraft={mockUpdateDraftFn}
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
                        contractDocuments: [
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
