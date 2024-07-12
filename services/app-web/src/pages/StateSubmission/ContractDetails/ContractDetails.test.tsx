import React from 'react'
import { screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
    mockContractAndRatesDraft,
    fetchCurrentUserMock,
    mockDraft,
    mockBaseContract,
} from '../../../testHelpers/apolloMocks'

import {
    renderWithProviders,
    TEST_DOC_FILE,
    TEST_PDF_FILE,
    TEST_XLS_FILE,
    TEST_PNG_FILE,
    dragAndDrop,
    selectYesNoRadio,
} from '../../../testHelpers/jestHelpers'
import { ACCEPTED_SUBMISSION_FILE_TYPES } from '../../../components/FileUpload'
import { ContractDetails } from './ContractDetails'
import {
    provisionCHIPKeys,
    federalAuthorityKeys,
    federalAuthorityKeysForCHIP,
    modifiedProvisionMedicaidAmendmentKeys,
    modifiedProvisionMedicaidBaseKeys,
} from '../../../common-code/healthPlanFormDataType'
import {
    StatutoryRegulatoryAttestation,
    StatutoryRegulatoryAttestationDescription,
    StatutoryRegulatoryAttestationQuestion,
} from '../../../constants/statutoryRegulatoryAttestation'
import * as useRouteParams from '../../../hooks/useRouteParams'
import * as useHealthPlanPackageForm from '../../../hooks/useHealthPlanPackageForm'

const mockUpdateDraftFn = jest.fn()
const scrollIntoViewMock = jest.fn()
HTMLElement.prototype.scrollIntoView = scrollIntoViewMock

describe('ContractDetails', () => {
    beforeEach(() => {
        jest.spyOn(
            useHealthPlanPackageForm,
            'useHealthPlanPackageForm'
        ).mockReturnValue({
            updateDraft: mockUpdateDraftFn,
            createDraft: jest.fn(),
            showPageErrorMessage: false,
            draftSubmission: mockDraft(),
        })
        jest.spyOn(useRouteParams, 'useRouteParams').mockReturnValue({
            id: '123-abc',
        })
    })
    afterEach(() => {
        jest.clearAllMocks()
        jest.spyOn(
            useHealthPlanPackageForm,
            'useHealthPlanPackageForm'
        ).mockRestore()
        jest.spyOn(useRouteParams, 'useRouteParams').mockRestore()
    })

    const defaultApolloProvider = {
        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
    }

    it('displays correct form guidance', async () => {
        renderWithProviders(<ContractDetails />, {
            apolloProvider: defaultApolloProvider,
        })

        expect(
            screen.queryByText(/All fields are required/)
        ).not.toBeInTheDocument()
        const requiredLabels = await screen.findAllByText('Required')
        expect(requiredLabels).toHaveLength(6)
        const optionalLabels = screen.queryAllByText('Optional')
        expect(optionalLabels).toHaveLength(0)
    })

    describe('Contract documents file upload', () => {
        it('renders without errors', async () => {
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })

            // check hint text
            await screen.findByText(
                'Supporting documents can be added later. If you have additional contract actions, you must submit them in a separate submission.'
            )
            await screen.findByRole('link', { name: /Document definitions/ })

            // check file input presences
            await screen.findByTestId('file-input')

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

        it('accepts a new document', async () => {
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })

            const input = screen.getByLabelText('Upload contract')
            expect(input).toBeInTheDocument()
            await userEvent.upload(input, [TEST_DOC_FILE])

            expect(
                await screen.findByText(TEST_DOC_FILE.name)
            ).toBeInTheDocument()
        })

        it('accepts multiple pdf, word, excel documents', async () => {
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })

            const input = screen.getByLabelText('Upload contract')
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
                expect(screen.getByText(TEST_DOC_FILE.name)).toBeInTheDocument()
                expect(screen.getByText(TEST_PDF_FILE.name)).toBeInTheDocument()
                expect(screen.getByText(TEST_XLS_FILE.name)).toBeInTheDocument()
            })
        })
    })

    describe('Federal authorities', () => {
        it('displays correct form fields for federal authorities with medicaid contract', async () => {
            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: {
                        ...mockContractAndRatesDraft(),
                        populationCovered: 'MEDICAID',
                    },
                }
            })

            await waitFor(() => {
                renderWithProviders(<ContractDetails />, {
                    apolloProvider: defaultApolloProvider,
                })
            })

            const fedAuthQuestion = screen.getByRole('group', {
                name: 'Active federal operating authority',
            })

            expect(fedAuthQuestion).toBeInTheDocument()
            expect(
                within(fedAuthQuestion).getAllByRole('checkbox')
            ).toHaveLength(federalAuthorityKeys.length)
            expect(
                within(fedAuthQuestion).getByRole('checkbox', {
                    name: '1915(b) Waiver Authority',
                })
            ).toBeInTheDocument() // authority disallowed for chip is not included in list
        })

        it('displays correct form fields for federal authorities with CHIP only contract', async () => {
            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: {
                        ...mockContractAndRatesDraft(),
                        populationCovered: 'CHIP',
                    },
                }
            })

            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })
            const fedAuthQuestion = await screen.findByRole('group', {
                name: 'Active federal operating authority',
            })
            expect(fedAuthQuestion).toBeInTheDocument()
            expect(
                within(fedAuthQuestion).getAllByRole('checkbox')
            ).toHaveLength(federalAuthorityKeysForCHIP.length)
            expect(
                within(fedAuthQuestion).queryByRole('checkbox', {
                    name: '1915(b) Waiver Authority',
                })
            ).not.toBeInTheDocument() // medicaid only authority should be in the list
        })
    })

    describe('Contract provisions - yes/nos', () => {
        const medicaidAmendmentPackage = mockContractAndRatesDraft({
            populationCovered: 'MEDICAID',
            contractType: 'AMENDMENT',
        })
        const medicaidBasePackage = mockContractAndRatesDraft({
            populationCovered: 'MEDICAID',
            contractType: 'BASE',
        })

        const chipAmendmentPackage = mockContractAndRatesDraft({
            populationCovered: 'CHIP',
            contractType: 'AMENDMENT',
        })
        const chipBasePackage = mockContractAndRatesDraft({
            populationCovered: 'CHIP',
            contractType: 'BASE',
        })

        it('can set provisions for medicaid contract amendment', async () => {
            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: {
                        ...mockContractAndRatesDraft(),
                        populationCovered: 'MEDICAID',
                    },
                }
            })
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })
            await screen.findByRole('form')
            // amendment specific copy is used
            expect(
                screen.queryByText(
                    'Medicaid beneficiaries served by the managed care plans (e.g. eligibility or enrollment criteria)'
                )
            ).toBeInTheDocument()

            expect(
                screen.queryByText('Network adequacy standards')
            ).toBeInTheDocument()
            expect(
                screen.queryByText('Grievance and appeal system')
            ).toBeInTheDocument()

            // risk and payment related provisions should be visible
            expect(
                screen.queryByText(/Risk-sharing strategy/)
            ).toBeInTheDocument()
            expect(
                screen.queryByText(/Withhold arrangements in accordance/)
            ).toBeInTheDocument()
            expect(
                screen.queryByText(/Payments to MCOs and PIHPs/)
            ).toBeInTheDocument()
            expect(
                screen.queryByText(/State directed payments/)
            ).toBeInTheDocument()

            // overall number of provisions should be correct
            expect(screen.getAllByTestId('yes-no-radio-fieldset')).toHaveLength(
                modifiedProvisionMedicaidAmendmentKeys.length
            )
        })
        // eslint-disable-next-line jest/no-disabled-tests
        it.skip('shows correct validations for medicaid contract amendment', async () => {
            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: medicaidAmendmentPackage,
                }
            })
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })
            // trigger validations
            await userEvent.click(
                screen.getByRole('button', {
                    name: 'Continue',
                })
            )

            // check for overall list of yes/no errors in form
            const formGroup = screen.getByText(
                'Does this contract action include new or modified provisions related to any of the following'
            ).parentElement
            await waitFor(() => {
                expect(
                    formGroup &&
                        within(formGroup).getAllByText(
                            'You must select yes or no'
                        )
                ).toHaveLength(modifiedProvisionMedicaidAmendmentKeys.length)
            })

            await selectYesNoRadio(
                screen,
                'Benefits provided by the managed care plans',
                'Yes'
            )
            await selectYesNoRadio(
                screen,
                'Geographic areas served by the managed care plans',
                'No'
            )
            await selectYesNoRadio(
                screen,
                'Length of the contract period',
                'Yes'
            )

            // overall list of yes/no errors should update as expected
            await waitFor(() => {
                expect(
                    formGroup &&
                        within(formGroup).getAllByText(
                            'You must select yes or no'
                        )
                ).toHaveLength(
                    modifiedProvisionMedicaidAmendmentKeys.length - 3
                )
            })
        })
        // eslint-disable-next-line jest/no-disabled-tests
        it.skip('can set provisions for medicaid base contract', async () => {
            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: medicaidBasePackage,
                }
            })
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })
            await screen.findByRole('form')

            // risk and payment related provisions should be visible
            expect(
                screen.queryByText(/Risk-sharing strategy/)
            ).toBeInTheDocument()
            expect(
                screen.queryByText(/Withhold arrangements in accordance/)
            ).toBeInTheDocument()
            expect(
                screen.queryByText(/Payments to MCOs and PIHPs/)
            ).toBeInTheDocument()
            expect(
                screen.queryByText(/State directed payments/)
            ).toBeInTheDocument()

            // overall number of provisions should be correct
            expect(screen.getAllByTestId('yes-no-radio-fieldset')).toHaveLength(
                modifiedProvisionMedicaidBaseKeys.length
            )
        })
        // eslint-disable-next-line jest/no-disabled-tests
        it.skip('shows correct validations for medicaid base contract', async () => {
            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: {
                        ...mockContractAndRatesDraft(),
                        populationCovered: 'MEDICAID',
                    },
                }
            })
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })

            // trigger validations
            await userEvent.click(
                screen.getByRole('button', {
                    name: 'Continue',
                })
            )

            // check for overall list of yes/no errors in form
            const formGroup = screen.getByText(
                'Does this contract action include provisions related to any of the following'
            ).parentElement

            await waitFor(() => {
                expect(
                    formGroup &&
                        within(formGroup).getAllByText(
                            'You must select yes or no'
                        )
                ).toHaveLength(modifiedProvisionMedicaidBaseKeys.length)
            })

            // select responses for a few provisions

            await selectYesNoRadio(
                screen,
                /Non-risk payment arrangements/,
                'Yes'
            )
            await selectYesNoRadio(screen, /Withhold arrangements/, 'No')

            //overall list of yes/no errors should update as expected
            await waitFor(() => {
                expect(
                    formGroup &&
                        within(formGroup).queryAllByText(
                            'You must select yes or no'
                        )
                ).toHaveLength(modifiedProvisionMedicaidBaseKeys.length - 2)
            })
        })

        it('cannot set provisions for CHIP only base contract', async () => {
            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: chipBasePackage,
                }
            })
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })
            await screen.findByRole('form')
            expect(
                screen.queryByText(
                    'Does this contract action include provisions related to any of the following'
                )
            ).toBeNull()
            expect(
                screen.queryAllByTestId('yes-no-radio-fieldset')
            ).toHaveLength(0)
        })

        it('can set provisions for CHIP only amendment', async () => {
            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: chipAmendmentPackage,
                }
            })
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })
            await screen.findByRole('form')

            // CHIP specific copy is used
            expect(
                screen.queryByText(
                    'CHIP beneficiaries served by the managed care plans (e.g. eligibility or enrollment criteria)'
                )
            ).toBeInTheDocument()

            expect(
                screen.queryByText(
                    'Network adequacy standards 42 CFR § 457.1218'
                )
            ).toBeInTheDocument()
            expect(
                screen.queryByText(
                    'Grievance and appeal system 42 CFR § 457.1260'
                )
            ).toBeInTheDocument()

            // risk and payment related provisions should not be visible
            expect(screen.queryByText(/Risk-sharing strategy/)).toBeNull()
            expect(screen.queryByText(/Payments to MCOs and PIHPs/)).toBeNull()
            expect(screen.queryByText(/State directed payments/)).toBeNull()

            // overall number of provisions should be correct
            expect(screen.getAllByTestId('yes-no-radio-fieldset')).toHaveLength(
                provisionCHIPKeys.length
            )
        })
        // eslint-disable-next-line jest/no-disabled-tests
        it.skip('shows correct validations for CHIP only amendment', async () => {
            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: {
                        ...mockContractAndRatesDraft(),
                        populationCovered: 'MEDICAID',
                    },
                }
            })
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })

            // trigger validations
            await userEvent.click(
                screen.getByRole('button', {
                    name: 'Continue',
                })
            )

            // check for overall list of yes/no errors in form
            const formGroup = screen.getByText(
                'Does this contract action include new or modified provisions related to any of the following'
            ).parentElement

            await waitFor(() => {
                expect(
                    formGroup &&
                        within(formGroup).getAllByText(
                            'You must select yes or no'
                        )
                ).toHaveLength(provisionCHIPKeys.length)
            })

            await selectYesNoRadio(
                screen,
                'Benefits provided by the managed care plans',
                'Yes'
            )
            await selectYesNoRadio(
                screen,
                'Geographic areas served by the managed care plans',
                'No'
            )
            await selectYesNoRadio(
                screen,
                'Length of the contract period',
                'Yes'
            )

            await screen.findByTestId('error-summary')

            await waitFor(() => {
                expect(
                    formGroup &&
                        within(formGroup).queryAllByText(
                            'You must select yes or no'
                        )
                ).toHaveLength(provisionCHIPKeys.length - 3)
            })
        })
    })

    describe('Continue button', () => {
        it('enabled when valid files are present', async () => {
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })

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
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })

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
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            expect(continueButton).not.toHaveAttribute('aria-disabled')

            await userEvent.click(continueButton)

            await waitFor(() => {
                expect(
                    screen.getAllByText('You must upload at least one document')
                ).toHaveLength(2)

                expect(continueButton).toHaveAttribute('aria-disabled', 'true')
            })
        })

        it('disabled with alert after first attempt to continue with invalid duplicate files', async () => {
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })

            const input = screen.getByLabelText('Upload contract')
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            await userEvent.upload(input, [TEST_DOC_FILE])
            await userEvent.upload(input, []) // clear input and ensure we add same file twice
            await userEvent.upload(input, [TEST_DOC_FILE])

            expect(continueButton).not.toHaveAttribute('aria-disabled')
            await userEvent.click(continueButton)

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
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            const targetEl = screen.getByTestId('file-input-droptarget')
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            expect(
                await screen.findByText('This is not a valid file type.')
            ).toBeInTheDocument()

            expect(continueButton).not.toHaveAttribute('aria-disabled')
            await userEvent.click(continueButton)

            expect(
                await screen.findAllByText(
                    'You must upload at least one document'
                )
            ).toHaveLength(2)

            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })
        it('disabled with alert when trying to continue while a file is still uploading', async () => {
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })
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
            await waitFor(() => {
                fireEvent.click(continueButton)
                expect(continueButton).toHaveAttribute('aria-disabled', 'true')

                expect(
                    screen.getAllByText(
                        'You must wait for all documents to finish uploading before continuing'
                    )
                ).toHaveLength(2)
            })
        })
    })

    describe('Save as draft button', () => {
        it('enabled when valid files are present', async () => {
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })

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
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })

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
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
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

        it('when existing file is removed, does not trigger missing documents alert on click but still saves the in progress draft', async () => {
            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: {
                        ...mockContractAndRatesDraft(),
                        contractDocuments: [
                            {
                                name: 'aasdf3423af',
                                sha256: 'fakesha',
                                s3URL: 's3://bucketname/key/fileName',
                            },
                        ],
                    },
                }
            })

            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
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
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })
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
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })

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
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })

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
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })

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
            renderWithProviders(<ContractDetails />, {
                apolloProvider: defaultApolloProvider,
            })

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
                            sha256: 'da7d22ce886b5ab262cd7ab28901212a027630a5edf8e88c8488087b03ffd833', // pragma: allowlist secret
                        },
                        {
                            name: 'testFile.pdf',
                            s3URL: expect.any(String),
                            sha256: '6d50607f29187d5b185ffd9d46bc5ef75ce7abb53318690c73e55b6623e25ad5', // pragma: allowlist secret
                        },
                    ],
                })
            )
        })
    })

    describe('Contract 438 attestation', () => {
        it('renders 438 attestation question without errors', async () => {
            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: mockBaseContract({
                        statutoryRegulatoryAttestation: true,
                    }),
                }
            })

            await waitFor(() => {
                renderWithProviders(<ContractDetails />, {
                    apolloProvider: defaultApolloProvider,
                    featureFlags: { '438-attestation': true },
                })
            })

            // expect 438 attestation question to be on the page
            await waitFor(() => {
                expect(
                    screen.getByText(StatutoryRegulatoryAttestationQuestion)
                ).toBeInTheDocument()
            })

            const yesRadio = screen.getByRole('radio', {
                name: StatutoryRegulatoryAttestation.YES,
            })
            const noRadio = screen.getByRole('radio', {
                name: StatutoryRegulatoryAttestation.NO,
            })

            // expect both yes and no answers on the page and yes to be checked
            expect(yesRadio).toBeChecked()
            expect(noRadio).toBeInTheDocument()

            await userEvent.click(noRadio)
            expect(noRadio).toBeChecked()

            const nonComplianceTextBox = screen.getByRole('textbox', {
                name: StatutoryRegulatoryAttestationDescription,
            })
            // expect 438 non-compliance description text box to be in the document
            await waitFor(() => {
                expect(nonComplianceTextBox).toBeInTheDocument()
            })
        })
        it('errors when continuing without answering 438 attestation question', async () => {
            const testDraft = mockContractAndRatesDraft({
                contractDateStart: new Date('11-12-2023'),
                contractDateEnd: new Date('11-12-2024'),
                statutoryRegulatoryAttestation: undefined,
                statutoryRegulatoryAttestationDescription: undefined,
            })
            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: testDraft,
                }
            })

            await waitFor(() => {
                renderWithProviders(<ContractDetails />, {
                    apolloProvider: defaultApolloProvider,
                    featureFlags: { '438-attestation': true },
                })
            })

            // expect 438 attestation question to be on the page
            await waitFor(() => {
                expect(
                    screen.getByText(StatutoryRegulatoryAttestationQuestion)
                ).toBeInTheDocument()
            })

            const yesRadio = screen.getByRole('radio', {
                name: StatutoryRegulatoryAttestation.YES,
            })
            const noRadio = screen.getByRole('radio', {
                name: StatutoryRegulatoryAttestation.NO,
            })

            // expect both yes and no answers on the page and yes to be checked
            expect(yesRadio).toBeInTheDocument()
            expect(noRadio).toBeInTheDocument()

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            // click continue
            await userEvent.click(continueButton)

            // expect errors for attestation question
            await waitFor(() => {
                expect(mockUpdateDraftFn).not.toHaveBeenCalled()
                expect(
                    screen.queryAllByText('You must select yes or no')
                ).toHaveLength(2)
            })

            // Click the Yes radio
            await userEvent.click(yesRadio)

            // click continue
            await userEvent.click(continueButton)

            // There should be no errors
            await waitFor(() => {
                expect(mockUpdateDraftFn).toHaveBeenCalled()
                expect(
                    screen.queryAllByText('You must select yes or no')
                ).toHaveLength(0)
            })
        })
        it('errors when continuing without description for 438 non-compliance', async () => {
            const draft = mockContractAndRatesDraft({
                contractDateStart: new Date('11-12-2023'),
                contractDateEnd: new Date('11-12-2024'),
                statutoryRegulatoryAttestation: undefined,
                statutoryRegulatoryAttestationDescription: undefined,
            })
            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: draft,
                }
            })

            await waitFor(() => {
                renderWithProviders(<ContractDetails />, {
                    apolloProvider: defaultApolloProvider,
                    featureFlags: { '438-attestation': true },
                })
            })

            // expect 438 attestation question to be on the page
            await waitFor(() => {
                expect(
                    screen.getByText(StatutoryRegulatoryAttestationQuestion)
                ).toBeInTheDocument()
            })

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            const noRadio = screen.getByRole('radio', {
                name: StatutoryRegulatoryAttestation.NO,
            })

            // check no radio
            await userEvent.click(noRadio)

            const nonComplianceTextBox = screen.getByRole('textbox', {
                name: StatutoryRegulatoryAttestationDescription,
            })

            // expect 438 non-compliance description text box to be in the document
            await waitFor(() => {
                expect(nonComplianceTextBox).toBeInTheDocument()
            })

            // try to continue without typing in non-compliance explanation
            await userEvent.click(continueButton)

            // expect errors for attestation question
            await waitFor(() => {
                expect(mockUpdateDraftFn).not.toHaveBeenCalled()
                expect(
                    screen.queryAllByText(
                        'You must provide a description of the contract’s non-compliance'
                    )
                ).toHaveLength(2)
            })

            await userEvent.type(nonComplianceTextBox, 'No compliance')

            // continue with explanation
            await userEvent.click(continueButton)

            // expect no errors
            await waitFor(() => {
                expect(mockUpdateDraftFn).toHaveBeenCalled()
                expect(
                    screen.queryAllByText(
                        'You must provide a description of the contract’s non-compliance'
                    )
                ).toHaveLength(0)
            })
        })
    })
})
