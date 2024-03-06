/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    screen,
    waitFor,
    within,
    fireEvent,
    Screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
    mockDraft,
    mockContractAndRatesDraft,
    fetchCurrentUserMock,
    indexHealthPlanPackagesMockSuccess,
    mockUnlockedHealthPlanPackage,
    mockSubmittedHealthPlanPackage,
    mockMNState,
} from '../../../testHelpers/apolloMocks'

import {
    renderWithProviders,
    TEST_DOC_FILE,
    TEST_DOCX_FILE,
    TEST_PDF_FILE,
    TEST_XLS_FILE,
    TEST_PNG_FILE,
    dragAndDrop,
    updateDateRange,
} from '../../../testHelpers'
import { RateDetails } from './RateDetails'
import {
    ACCEPTED_RATE_SUPPORTING_DOCS_FILE_TYPES,
    ACCEPTED_RATE_CERTIFICATION_FILE_TYPES,
} from '../../../components/FileUpload'
import selectEvent from 'react-select-event'
import * as useStatePrograms from '../../../hooks/useStatePrograms'
import * as useRouteParams from '../../../hooks/useRouteParams'
import * as useHealthPlanPackageForm from '../../../hooks/useHealthPlanPackageForm'
import { unlockedWithALittleBitOfEverything } from '../../../common-code/healthPlanFormDataMocks'

const emptyRateDetailsDraft = () => ({
    ...mockDraft(),
    rateInfos: [],
    rateType: undefined,
    rateDateStart: undefined,
    rateDateEnd: undefined,
    rateDateCertified: undefined,
    actuaryContacts: [],
})

describe('RateDetails', () => {
    beforeAll(() => {
        jest.setTimeout(10000)
        // TODO: These tests are too long and need to be fully refactored. They are starting to flake in recent versions of RTL, particularly the multi-rate and contract amendment tests
        // See this guidance for waitFor and getBy Role: https://github.com/testing-library/dom-testing-library/issues/820
    })
    const mockUpdateDraftFn = jest.fn()
    beforeEach(() => {
        jest.spyOn(
            useHealthPlanPackageForm,
            'useHealthPlanPackageForm'
        ).mockReturnValue({
            updateDraft: mockUpdateDraftFn,
            createDraft: jest.fn(),
            showPageErrorMessage: false,
            draftSubmission: emptyRateDetailsDraft(),
        })
        jest.spyOn(useRouteParams, 'useRouteParams').mockReturnValue({
            id: '123-abc',
        })
    })
    afterEach(() => {
        jest.clearAllMocks()
        jest.spyOn(useStatePrograms, 'useStatePrograms').mockRestore()
        jest.spyOn(
            useHealthPlanPackageForm,
            'useHealthPlanPackageForm'
        ).mockRestore()
        jest.spyOn(useRouteParams, 'useRouteParams').mockRestore()
    })

    describe('handles a single rate', () => {
        afterEach(() => {
            jest.clearAllMocks()
        })

        it('renders without errors', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            expect(
                screen.getByText('Rate certification type')
            ).toBeInTheDocument()
            expect(
                screen.getByText('Upload one rate certification document')
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Continue' })
            ).not.toHaveAttribute('aria-disabled')
        })

        it('displays correct form guidance', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            expect(
                screen.queryByText(/All fields are required/)
            ).not.toBeInTheDocument()
            const requiredLabels = await screen.findAllByText('Required')
            expect(requiredLabels).toHaveLength(7)
            const optionalLabels = screen.queryAllByText('Optional')
            expect(optionalLabels).toHaveLength(1)
        })

        it('loads with empty rate type and document upload fields visible', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            expect(
                screen.getByRole('radio', {
                    name: 'New rate certification',
                })
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
            expect(screen.getAllByTestId('file-input')).toHaveLength(2)
            expect(screen.getAllByTestId('file-input')[0]).toBeInTheDocument()
            expect(screen.getAllByTestId('file-input')[1]).toBeInTheDocument()
            expect(
                within(
                    screen.getAllByTestId('file-input-preview-list')[0]
                ).queryAllByRole('listitem')
            ).toHaveLength(0)

            // should not be able to find hidden things
            expect(screen.queryByText('Start date')).toBeNull()
            expect(screen.queryByText('End date')).toBeNull()
            expect(screen.queryByText('Date certified')).toBeNull()
        })

        it('cannot continue without selecting rate type', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            continueButton.click()
            await waitFor(() => {
                expect(
                    screen.getAllByText(
                        'You must choose a rate certification type'
                    )
                ).toHaveLength(2)
                expect(continueButton).toHaveAttribute('aria-disabled', 'true')
            })
        })

        it('cannot continue without selecting rate capitation type', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            continueButton.click()
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
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            screen.getByLabelText('New rate certification').click()

            continueButton.click()
            await waitFor(() => {
                expect(
                    screen.getAllByText('You must upload a rate certification')
                ).toHaveLength(2)
                expect(continueButton).toHaveAttribute('aria-disabled', 'true')
            })
        })

        it('progressively disclose new rate form fields as expected', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
            })

            expect(
                screen.getByText('Programs this rate certification covers')
            ).toBeInTheDocument()
            expect(
                screen.getByText('Rate certification type')
            ).toBeInTheDocument()
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
            const input = screen.getByLabelText(
                'Upload one rate certification document'
            )
            await userEvent.upload(input, [TEST_DOC_FILE])
            const hasSharedRateFieldset = screen
                .getByText(
                    /Was this rate certification uploaded to any other submissions/
                )
                .closest('fieldset')
            await userEvent.click(
                within(hasSharedRateFieldset!).getByLabelText(/No/i)
            )

            // check that now we can see hidden things
            await waitFor(() => {
                expect(screen.queryByText('Rating period')).toBeInTheDocument()
                expect(screen.queryByText('Rating period')).toBeInTheDocument()
                expect(screen.queryByText('Start date')).toBeInTheDocument()
                expect(screen.queryByText('End date')).toBeInTheDocument()
                expect(screen.queryByText('Date certified')).toBeInTheDocument()
                expect(screen.queryAllByTestId('errorMessage')).toHaveLength(0)
            })
            // click "continue"
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            fireEvent.click(continueButton)

            // check for expected errors
            await waitFor(() => {
                expect(screen.queryAllByTestId('errorMessage')).toHaveLength(7)
                expect(
                    screen.queryAllByText('You must select a program')
                ).toHaveLength(2)
                expect(
                    screen.queryByText(
                        'You must provide a start and an end date'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.queryAllByText(
                        'You must enter the date the document was certified'
                    )
                ).toHaveLength(2)
                expect(
                    screen.queryAllByText('You must provide a name')
                ).toHaveLength(2)
                expect(
                    screen.queryAllByText('You must provide a title/role')
                ).toHaveLength(2)
                expect(
                    screen.queryAllByText('You must provide an email address')
                ).toHaveLength(2)
                expect(
                    screen.queryAllByText('You must select an actuarial firm')
                ).toHaveLength(2)
            })

            await fillOutFirstRate(screen)

            //wait for all errors to clear
            await waitFor(() =>
                expect(screen.queryAllByTestId('errorMessage')).toHaveLength(0)
            )
        })

        it('displays program options based on current user state', async () => {
            const mockUser = {
                __typename: 'StateUser' as const,
                role: 'STATE_USER',
                name: 'Sheena in Minnesota',
                email: 'Sheena@dmas.mn.gov',
                state: {
                    name: 'Minnesota',
                    code: 'MN',
                    programs: [
                        {
                            id: 'first',
                            name: 'Program 1',
                            fullName: 'Program 1',
                        },
                        {
                            id: 'second',
                            name: 'Program Test',
                            fullName: 'Program Test',
                        },
                        {
                            id: 'third',
                            name: 'Program 3',
                            fullName: 'Program 3',
                        },
                    ],
                },
            }

            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockUser,
                            statusCode: 200,
                        }),
                    ],
                },
            })
            const combobox = await screen.findByRole('combobox')

            selectEvent.openMenu(combobox)

            await waitFor(() => {
                expect(screen.getByText('Program 3')).toBeInTheDocument()
            })

            await selectEvent.select(combobox, 'Program 1')
            selectEvent.openMenu(combobox)
            await selectEvent.select(combobox, 'Program 3')

            // in react-select, only items that are selected have a "remove item" label
            expect(
                screen.getByLabelText('Remove Program 1')
            ).toBeInTheDocument()
            expect(
                screen.getByLabelText('Remove Program 3')
            ).toBeInTheDocument()
        })
    })

    describe('handles documents and file upload', () => {
        it('renders file upload', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            await waitFor(() => {
                const textInputs = screen.getAllByTestId('file-input')
                expect(textInputs).toHaveLength(2)
                expect(textInputs[0]).toBeInTheDocument()
                expect(textInputs[0]).toHaveClass('usa-file-input')
                expect(
                    screen.getByRole('button', { name: 'Continue' })
                ).not.toHaveAttribute('aria-disabled')
                expect(
                    within(
                        screen.getAllByTestId('file-input-preview-list')[0]
                    ).queryAllByRole('listitem')
                ).toHaveLength(0)
            })
        })
        it('accepts documents on new rate', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const input = screen.getByLabelText(
                'Upload one rate certification document'
            )
            expect(input).toBeInTheDocument()
            await userEvent.upload(input, [TEST_DOC_FILE])

            expect(
                await screen.findByText(TEST_DOC_FILE.name)
            ).toBeInTheDocument()
        })

        it('accepts a single file for rate cert', async () => {
            //

            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const input = screen.getByLabelText(
                'Upload one rate certification document'
            )

            expect(input).toBeInTheDocument()
            expect(input).toHaveAttribute(
                'accept',
                ACCEPTED_RATE_CERTIFICATION_FILE_TYPES
            )
            await userEvent.upload(input, [
                TEST_DOC_FILE,
                TEST_PDF_FILE,
                TEST_DOCX_FILE,
            ])

            await waitFor(() => {
                expect(screen.getByText(/1 file added/)).toBeInTheDocument()
                expect(screen.getByText(TEST_DOC_FILE.name)).toBeInTheDocument()
                expect(
                    screen.queryByText(TEST_PDF_FILE.name)
                ).not.toBeInTheDocument()
                expect(
                    screen.queryByText(TEST_DOCX_FILE.name)
                ).not.toBeInTheDocument()
            })
        })

        it('accepts multiple pdf, word, excel documents for supporting documents', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const input = screen.getByLabelText('Upload supporting documents')

            expect(input).toBeInTheDocument()
            expect(input).toHaveAttribute(
                'accept',
                ACCEPTED_RATE_SUPPORTING_DOCS_FILE_TYPES
            )
            await userEvent.upload(input, [
                TEST_DOC_FILE,
                TEST_PDF_FILE,
                TEST_DOCX_FILE,
            ])
            await waitFor(() => {
                expect(screen.getByText(TEST_DOC_FILE.name)).toBeInTheDocument()
                expect(screen.getByText(TEST_PDF_FILE.name)).toBeInTheDocument()
                expect(
                    screen.getByText(TEST_DOCX_FILE.name)
                ).toBeInTheDocument()
            })
        })
    })

    describe('handles multiple rates', () => {
        it('renders add another rate button, which adds another set of rate certification fields to the form', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
            })
            const rateCertsOnLoad = rateCertifications(screen)
            expect(rateCertsOnLoad).toHaveLength(1)

            await fillOutFirstRate(screen)

            await clickAddNewRate(screen)

            await waitFor(() => {
                const rateCertsAfterAddAnother = rateCertifications(screen)
                expect(rateCertsAfterAddAnother).toHaveLength(2)
            })
        })

        it('renders remove rate certification button, which removes set of rate certification fields from the form', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
            })
            const rateCertsOnLoad = rateCertifications(screen)
            expect(rateCertsOnLoad).toHaveLength(1)

            await clickAddNewRate(screen)
            await clickAddNewRate(screen)
            await waitFor(() => {
                const rateCertsAfterAddAnother = rateCertifications(screen)
                expect(rateCertsAfterAddAnother).toHaveLength(3)
            })

            await clickRemoveIndexRate(screen, 1)

            await waitFor(() => {
                const rateCertsAfterRemove = rateCertifications(screen)
                expect(rateCertsAfterRemove).toHaveLength(2)
            })
        })

        it('accepts documents on second rate', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            await fillOutFirstRate(screen)

            await clickAddNewRate(screen)
            const newRateCert = lastRateCertificationFromList(screen)
            expect(newRateCert).toBeDefined()
            const newRateInput = within(newRateCert!).getByLabelText(
                'Upload one rate certification document'
            )
            expect(newRateInput).toBeInTheDocument()

            await userEvent.upload(newRateInput, [TEST_PDF_FILE])
            await waitFor(() => {
                expect(
                    within(newRateCert!).getByText(TEST_PDF_FILE.name)
                ).toBeInTheDocument()
            })
        })

        it('cannot continue without selecting rate type for a second rate', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            await fillOutFirstRate(screen)
            await clickAddNewRate(screen)

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            continueButton.click()
            await waitFor(() => {
                expect(
                    screen.getAllByText(
                        'You must choose a rate certification type'
                    )
                ).toHaveLength(2)
                expect(continueButton).toHaveAttribute('aria-disabled', 'true')
            })
        })

        it('cannot continue if no documents are added to the second rate', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            await fillOutFirstRate(screen)
            await clickAddNewRate(screen)

            await waitFor(() => {
                const rateInfoContainers = screen.getAllByTestId(
                    'rate-certification-form'
                )
                expect(rateInfoContainers).toHaveLength(2)
            })
            const rateInfo2 = screen.getAllByTestId(
                'rate-certification-form'
            )[1]

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            within(rateInfo2).getByLabelText('New rate certification').click()

            continueButton.click()
            await waitFor(() => {
                expect(
                    screen.getAllByText('You must upload a rate certification')
                ).toHaveLength(2)
                expect(continueButton).toHaveAttribute('aria-disabled', 'true')
            })
        })
    })

    describe('handles rates across submissions', () => {
        it('correctly checks shared rate certification radios and selects shared packages', async () => {
            //Spy on useStatePrograms hook to get up-to-date state programs
            jest.spyOn(useStatePrograms, 'useStatePrograms').mockReturnValue(
                mockMNState().programs
            )

            //First submission is 'CONTRACT_ONLY' and last submission is the current one. Both should be excluded from
            // package combobox options.
            const currentSubmission = {
                ...emptyRateDetailsDraft(),
                stateNumber: 3,
                id: 'test-shared-rate',
            }

            const mockSubmissions = [
                {
                    ...mockSubmittedHealthPlanPackage({
                        ...unlockedWithALittleBitOfEverything(),
                        stateNumber: 4,
                        id: 'test-id-123',
                    }),
                    id: 'test-id-123',
                },
                {
                    ...mockUnlockedHealthPlanPackage({
                        stateNumber: 5,
                        id: 'test-id-124',
                    }),
                    id: 'test-id-124',
                },
                {
                    ...mockUnlockedHealthPlanPackage({
                        stateNumber: 6,
                        id: 'test-id-125',
                    }),
                    id: 'test-id-125',
                },
                {
                    ...mockUnlockedHealthPlanPackage(currentSubmission),
                    id: 'test-shared-rate',
                },
            ]

            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: currentSubmission,
                }
            })

            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                        indexHealthPlanPackagesMockSuccess(mockSubmissions),
                    ],
                },
            })

            const rateCertsOnLoad = rateCertifications(screen)
            expect(rateCertsOnLoad).toHaveLength(1)

            //Fill out first rate certification
            await fillOutFirstRate(screen)

            //Click the first rate certification shared rate cert radio YES
            const firstRateCert = within(rateCertsOnLoad[0]!)
            const firstRateHasSharedRateFieldset = firstRateCert
                .getByText(
                    /Was this rate certification uploaded to any other submissions/
                )
                .closest('fieldset')
            const firstRateYesSharedRate = within(
                firstRateHasSharedRateFieldset!
            ).getByLabelText(/Yes/i)
            const firstRateNoSharedRate = within(
                firstRateHasSharedRateFieldset!
            ).getByLabelText(/No/i)
            await userEvent.click(firstRateYesSharedRate)

            //Expect there to be two combo boxes, packages and programs.
            const comboBoxes = firstRateCert.getAllByRole('combobox')
            expect(comboBoxes).toHaveLength(2)

            //Expect the two packages we know to exist.
            const firstRatePackageCombobox = comboBoxes[0]
            selectEvent.openMenu(firstRatePackageCombobox)
            await waitFor(() => {
                expect(
                    firstRateCert.getByText(
                        'MCR-MN-0004-MSC+-PMAP-SNBC (Submitted 01/02/21)'
                    )
                ).toBeInTheDocument()
                expect(
                    firstRateCert.getByText(
                        'MCR-MN-0005-MSC+-PMAP-SNBC (Draft)'
                    )
                ).toBeInTheDocument()
                expect(
                    firstRateCert.getByText(
                        'MCR-MN-0006-MSC+-PMAP-SNBC (Draft)'
                    )
                ).toBeInTheDocument()
            })

            //Select two packages that have a shared rate cert with this rate cert.
            selectEvent.openMenu(firstRatePackageCombobox)
            await selectEvent.select(
                firstRatePackageCombobox,
                'MCR-MN-0004-MSC+-PMAP-SNBC (Submitted 01/02/21)'
            )
            selectEvent.openMenu(firstRatePackageCombobox)
            await selectEvent.select(
                firstRatePackageCombobox,
                'MCR-MN-0005-MSC+-PMAP-SNBC (Draft)'
            )
            selectEvent.openMenu(firstRatePackageCombobox)
            await selectEvent.select(
                firstRatePackageCombobox,
                'MCR-MN-0006-MSC+-PMAP-SNBC (Draft)'
            )
            selectEvent.openMenu(firstRatePackageCombobox)

            //Expect the three packages to have been selected and 'No options' are left to be selected.
            expect(firstRateCert.getByText('No options')).toBeInTheDocument()
            expect(
                firstRateCert.getByLabelText(
                    'Remove MCR-MN-0004-MSC+-PMAP-SNBC (Submitted 01/02/21)'
                )
            ).toBeInTheDocument()
            expect(
                firstRateCert.getByLabelText(
                    'Remove MCR-MN-0005-MSC+-PMAP-SNBC (Draft)'
                )
            ).toBeInTheDocument()
            expect(
                firstRateCert.getByLabelText(
                    'Remove MCR-MN-0006-MSC+-PMAP-SNBC (Draft)'
                )
            ).toBeInTheDocument()

            //Add new rate certification
            await clickAddNewRate(screen)
            await waitFor(() => {
                const rateCertsAfterAddAnother = rateCertifications(screen)
                expect(rateCertsAfterAddAnother).toHaveLength(2)
            })

            //Only first rate certification shared rate radio is checked and has two comboboxes
            const secondRateCert = within(rateCertifications(screen)[1]!)
            const secondRateHasSharedRateFieldset = secondRateCert
                .getByText(
                    /Was this rate certification uploaded to any other submissions/
                )
                .closest('fieldset')
            const secondRateYesSharedRate = within(
                secondRateHasSharedRateFieldset!
            ).getByLabelText(/Yes/)
            const secondRateNoSharedRate = within(
                secondRateHasSharedRateFieldset!
            ).getByLabelText(/No/)
            await userEvent.click(secondRateNoSharedRate)
            await userEvent.click(secondRateNoSharedRate)
            expect(firstRateCert.getAllByRole('combobox')).toHaveLength(2)
            expect(
                firstRateCert.getByText(
                    /Please select the submissions that also contain this rate/
                )
            ).toBeInTheDocument()
            expect(secondRateYesSharedRate).not.toBeChecked()
            expect(
                secondRateCert.queryByText(
                    /Please select the submissions that also contain this rate/
                )
            ).toBeNull()
            expect(secondRateCert.getAllByRole('combobox')).toHaveLength(1)

            //Both shared rate cert radios have no checked and only programs combobox present
            await userEvent.click(firstRateNoSharedRate)
            expect(firstRateNoSharedRate).toBeChecked()
            expect(firstRateCert.getAllByRole('combobox')).toHaveLength(1)
            expect(secondRateYesSharedRate).not.toBeChecked()
            expect(secondRateCert.getAllByRole('combobox')).toHaveLength(1)

            ///Only second rate certification shared rate is yes and has two comboboxes
            await userEvent.click(secondRateYesSharedRate)
            expect(secondRateYesSharedRate).toBeChecked()
            expect(secondRateCert.getAllByRole('combobox')).toHaveLength(2)

            //Both rate cert YES radios are checked and have selected packages in the comboxes
            await userEvent.click(firstRateYesSharedRate)
            const secondRatePackageCombobox =
                secondRateCert.getAllByRole('combobox')[0]
            selectEvent.openMenu(secondRatePackageCombobox)
            await selectEvent.select(
                secondRatePackageCombobox,
                'MCR-MN-0005-MSC+-PMAP-SNBC (Draft)'
            )
            expect(firstRateYesSharedRate).toBeChecked()
            expect(firstRateCert.getAllByRole('combobox')).toHaveLength(2)
            expect(
                firstRateCert.getByLabelText(
                    'Remove MCR-MN-0004-MSC+-PMAP-SNBC (Submitted 01/02/21)'
                )
            ).toBeInTheDocument()
            expect(
                firstRateCert.getByLabelText(
                    'Remove MCR-MN-0005-MSC+-PMAP-SNBC (Draft)'
                )
            ).toBeInTheDocument()
            expect(
                firstRateCert.getByLabelText(
                    'Remove MCR-MN-0006-MSC+-PMAP-SNBC (Draft)'
                )
            ).toBeInTheDocument()
            expect(secondRateYesSharedRate).toBeChecked()
            expect(secondRateCert.getAllByRole('combobox')).toHaveLength(2)
            expect(
                secondRateCert.getByLabelText(
                    'Remove MCR-MN-0005-MSC+-PMAP-SNBC (Draft)'
                )
            ).toBeInTheDocument()
            expect(
                secondRateCert.queryByLabelText(
                    'Remove MCR-MN-0006-MSC+-PMAP-SNBC (Draft)'
                )
            ).not.toBeInTheDocument()
        }, 10000)

        it('cannot continue when shared rate radio is unchecked', async () => {
            //Spy on useStatePrograms hook to get up-to-date state programs
            jest.spyOn(useStatePrograms, 'useStatePrograms').mockReturnValue(
                mockMNState().programs
            )

            //First submission is 'CONTRACT_ONLY' and last submission is the current one. Both should be excluded from
            // package combobox options.
            const currentSubmission = {
                ...emptyRateDetailsDraft(),
                stateNumber: 3,
                id: 'test-shared-rate',
            }

            const mockSubmissions = [
                {
                    ...mockSubmittedHealthPlanPackage({
                        stateNumber: 4,
                        id: 'test-id-123',
                    }),
                    id: 'test-id-123',
                },
                {
                    ...mockUnlockedHealthPlanPackage({
                        stateNumber: 5,
                        id: 'test-id-124',
                    }),
                    id: 'test-id-124',
                },
                {
                    ...mockUnlockedHealthPlanPackage({
                        stateNumber: 6,
                        id: 'test-id-125',
                    }),
                    id: 'test-id-125',
                },
                {
                    ...mockUnlockedHealthPlanPackage(currentSubmission),
                    id: 'test-shared-rate',
                },
            ]

            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: currentSubmission,
                }
            })

            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                        indexHealthPlanPackagesMockSuccess(mockSubmissions),
                    ],
                },
            })
            const rateCertsOnLoad = rateCertifications(screen)
            expect(rateCertsOnLoad).toHaveLength(1)

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            await userEvent.click(continueButton)

            await waitFor(() => {
                expect(
                    screen.queryAllByText('You must select yes or no')
                ).toHaveLength(2)
                expect(continueButton).toHaveAttribute('aria-disabled')
            })

            //Fill out first rate certification
            await fillOutFirstRate(screen)

            //Click the first rate certification shared rate cert radio
            const firstRateCert = within(rateCertsOnLoad[0]!)
            const firstRateHasSharedRateFieldset = screen
                .getByText(
                    /Was this rate certification uploaded to any other submissions/,
                    {
                        selector: 'legend',
                    }
                )
                .closest('fieldset')
            const firstRateYesSharedRate = within(
                firstRateHasSharedRateFieldset!
            ).getByLabelText(/Yes/i)
            await userEvent.click(firstRateYesSharedRate)

            //Expect there to be two combo boxes, packages and programs.
            const comboBoxes = firstRateCert.getAllByRole('combobox')
            expect(comboBoxes).toHaveLength(2)

            //Expect the two packages we know to exist.
            const firstRatePackageCombobox = comboBoxes[0]
            selectEvent.openMenu(firstRatePackageCombobox)
            await waitFor(() => {
                expect(
                    firstRateCert.getByText(
                        'MCR-MN-0005-MSC+-PMAP-SNBC (Draft)'
                    )
                ).toBeInTheDocument()
                expect(
                    firstRateCert.getByText(
                        'MCR-MN-0006-MSC+-PMAP-SNBC (Draft)'
                    )
                ).toBeInTheDocument()
            })

            //Select two packages that have a shared rate cert with this rate cert.
            await selectEvent.select(
                firstRatePackageCombobox,
                'MCR-MN-0005-MSC+-PMAP-SNBC (Draft)'
            )
            selectEvent.openMenu(firstRatePackageCombobox)
            await selectEvent.select(
                firstRatePackageCombobox,
                'MCR-MN-0006-MSC+-PMAP-SNBC (Draft)'
            )
            selectEvent.openMenu(firstRatePackageCombobox)

            //Expect submission selection error to clear and continue button is not disabled
            expect(continueButton).not.toHaveAttribute('aria-disabled')
        })

        it('cannot continue when shared rate radio is checked and no package is selected', async () => {
            //Spy on useStatePrograms hook to get up-to-date state programs
            jest.spyOn(useStatePrograms, 'useStatePrograms').mockReturnValue(
                mockMNState().programs
            )

            //First submission is 'CONTRACT_ONLY' and last submission is the current one. Both should be excluded from
            // package combobox options.
            const currentSubmission = {
                ...emptyRateDetailsDraft(),
                stateNumber: 3,
                id: 'test-shared-rate',
            }

            const mockSubmissions = [
                {
                    ...mockSubmittedHealthPlanPackage({
                        stateNumber: 4,
                        id: 'test-id-123',
                    }),
                    id: 'test-id-123',
                },
                {
                    ...mockUnlockedHealthPlanPackage({
                        stateNumber: 5,
                        id: 'test-id-124',
                    }),
                    id: 'test-id-124',
                },
                {
                    ...mockUnlockedHealthPlanPackage({
                        stateNumber: 6,
                        id: 'test-id-125',
                    }),
                    id: 'test-id-125',
                },
                {
                    ...mockUnlockedHealthPlanPackage(currentSubmission),
                    id: 'test-shared-rate',
                },
            ]
            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: currentSubmission,
                }
            })
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                        indexHealthPlanPackagesMockSuccess(mockSubmissions),
                    ],
                },
            })
            const rateCertsOnLoad = rateCertifications(screen)
            expect(rateCertsOnLoad).toHaveLength(1)

            //Fill out first rate certification
            await fillOutFirstRate(screen)

            //Click the first rate certification shared rate cert radio
            const firstRateCert = within(rateCertsOnLoad[0]!)
            const firstRateHasSharedRateFieldset = screen
                .getByText(
                    /Was this rate certification uploaded to any other submissions/,
                    {
                        selector: 'legend',
                    }
                )
                .closest('fieldset')
            const firstRateYesSharedRate = within(
                firstRateHasSharedRateFieldset!
            ).getByLabelText(/Yes/i)
            await userEvent.click(firstRateYesSharedRate)

            //Expect there to be two combo boxes, packages and programs.
            const comboBoxes = firstRateCert.getAllByRole('combobox')
            expect(comboBoxes).toHaveLength(2)

            //Expect the two packages we know to exist.
            const firstRatePackageCombobox = comboBoxes[0]
            selectEvent.openMenu(firstRatePackageCombobox)
            await waitFor(() => {
                expect(
                    firstRateCert.getByText(
                        'MCR-MN-0005-MSC+-PMAP-SNBC (Draft)'
                    )
                ).toBeInTheDocument()
                expect(
                    firstRateCert.getByText(
                        'MCR-MN-0006-MSC+-PMAP-SNBC (Draft)'
                    )
                ).toBeInTheDocument()
            })

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            await userEvent.click(continueButton)

            //Expect submission selection error and continue button is disabled
            await waitFor(() => {
                expect(
                    screen.getAllByText(
                        'You must select at least one submission'
                    )
                ).toHaveLength(2)
                expect(continueButton).toHaveAttribute('aria-disabled', 'true')
            })

            //Select two packages that have a shared rate cert with this rate cert.
            await selectEvent.select(
                firstRatePackageCombobox,
                'MCR-MN-0005-MSC+-PMAP-SNBC (Draft)'
            )
            selectEvent.openMenu(firstRatePackageCombobox)
            await selectEvent.select(
                firstRatePackageCombobox,
                'MCR-MN-0006-MSC+-PMAP-SNBC (Draft)'
            )
            selectEvent.openMenu(firstRatePackageCombobox)

            //Expect submission selection error to clear and continue button is not disabled
            await waitFor(() => {
                expect(continueButton).not.toHaveAttribute('aria-disabled')
            })
        })
    })

    describe('Continue button', () => {
        it('enabled when valid files are present', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            const input = screen.getByLabelText(
                'Upload one rate certification document'
            )

            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(continueButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            const input = screen.getByLabelText(
                'Upload one rate certification document'
            )
            const targetEl = screen.getAllByTestId('file-input-droptarget')[0]

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
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            expect(continueButton).not.toHaveAttribute('aria-disabled')

            continueButton.click()

            await waitFor(() => {
                expect(
                    screen.getAllByText('You must upload a rate certification')
                ).toHaveLength(2)

                expect(continueButton).toHaveAttribute('aria-disabled', 'true')
            })
        })

        it('disabled with alert if previously submitted with more than one rate cert file', async () => {
            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: mockContractAndRatesDraft({
                        rateInfos: [
                            {
                                supportingDocuments: [],
                                rateDocuments: [
                                    {
                                        s3URL: 's3://bucketname/one-one/one-one.png',
                                        name: 'one one',
                                        sha256: 'fakeSha1',
                                    },
                                    {
                                        s3URL: 's3://bucketname/one-two/one-two.png',
                                        name: 'one two',
                                        sha256: 'fakeSha2',
                                    },
                                    {
                                        s3URL: 's3://bucketname/one-three/one-three.png',
                                        name: 'one three',
                                        sha256: 'fakeSha3',
                                    },
                                ],
                                actuaryContacts: [
                                    {
                                        actuarialFirm: 'DELOITTE',
                                        name: 'Actuary Contact 1',
                                        titleRole: 'Test Actuary Contact 1',
                                        email: 'actuarycontact1@test.com',
                                    },
                                ],
                            },
                        ],
                    }),
                    previousDocuments: ['testFile.docx', 'testFile.pdf'],
                }
            })

            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            expect(continueButton).not.toHaveAttribute('aria-disabled')

            continueButton.click()

            await waitFor(() => {
                expect(
                    screen.getAllByText(
                        'Only one document is allowed for a rate certification. You must remove documents before continuing.'
                    )
                ).toHaveLength(2)

                expect(continueButton).toHaveAttribute('aria-disabled', 'true')
            })
        })

        it('disabled with alert after first attempt to continue with invalid duplicate files', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const input = screen.getByLabelText(
                'Upload one rate certification document'
            )
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
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            const targetEl = screen.getAllByTestId('file-input-droptarget')[0]
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            expect(
                await screen.findByText('This is not a valid file type.')
            ).toBeInTheDocument()

            expect(continueButton).not.toHaveAttribute('aria-disabled')
            continueButton.click()

            expect(
                await screen.findAllByText(
                    'You must upload a rate certification'
                )
            ).toHaveLength(2)

            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })
        // eslint-disable-next-line jest/no-disabled-tests
        it('disabled with alert when trying to continue while a file is still uploading', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            const targetEl = await screen.findAllByTestId(
                'file-input-droptarget'
            )

            // upload one file
            dragAndDrop(targetEl[1], [TEST_PDF_FILE])
            const imageElFile = await screen.findByTestId(
                'file-input-preview-image'
            )
            await waitFor(() =>
                expect(imageElFile).not.toHaveClass('is-loading')
            )

            // upload second file
            dragAndDrop(targetEl[1], [TEST_DOC_FILE])
            const imageElFiles = await screen.findAllByTestId(
                'file-input-preview-image'
            )
            expect(imageElFiles[1]).toHaveClass('is-loading')

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
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })
            const input = screen.getByLabelText(
                'Upload one rate certification document'
            )

            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(saveAsDraftButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const saveAsDraftButton = screen.getByRole('button', {
                name: 'Save as draft',
            })
            const input = screen.getByLabelText(
                'Upload one rate certification document'
            )
            const targetEl = screen.getAllByTestId('file-input-droptarget')[0]

            await userEvent.upload(input, [TEST_DOC_FILE])
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            await waitFor(() => {
                expect(saveAsDraftButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('when zero files present, does not trigger missing documents alert on click but still saves the in progress draft', async () => {
            renderWithProviders(<RateDetails />, {
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
                screen.queryByText('You must upload a rate certification')
            ).toBeNull()
        })

        it('when existing file is removed, does not trigger missing documents alert on click but still saves the in progress draft', async () => {
            const hasDocsDetailsDraft = {
                ...mockDraft(),
                rateDocuments: [
                    {
                        name: 'aasdf3423af',
                        s3URL: 's3://bucketname/key/fileName',
                    },
                ],
                supportingDocuments: [],
                rateType: undefined,
                rateDateStart: undefined,
                rateDateEnd: undefined,
                rateDateCertified: undefined,
            }
            jest.spyOn(
                useHealthPlanPackageForm,
                'useHealthPlanPackageForm'
            ).mockImplementation(() => {
                return {
                    createDraft: jest.fn(),
                    updateDraft: mockUpdateDraftFn,
                    showPageErrorMessage: false,
                    draftSubmission: hasDocsDetailsDraft,
                }
            })

            renderWithProviders(<RateDetails />, {
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
                screen.queryByText('You must upload a rate certification')
            ).toBeNull()
        })

        it('when duplicate files present, triggers error alert on click', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const input = screen.getByLabelText('Upload supporting documents')
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
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const backButton = screen.getByRole('button', {
                name: 'Back',
            })
            const input = screen.getByLabelText(
                'Upload one rate certification document'
            )

            await userEvent.upload(input, [TEST_DOC_FILE])

            await waitFor(() => {
                expect(backButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('enabled when invalid files have been dropped but valid files are present', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            const backButton = screen.getByRole('button', {
                name: 'Back',
            })
            const input = screen.getByLabelText(
                'Upload one rate certification document'
            )
            const targetEl = screen.getAllByTestId('file-input-droptarget')[0]

            await userEvent.upload(input, [TEST_DOC_FILE])
            dragAndDrop(targetEl, [TEST_PNG_FILE])

            await waitFor(() => {
                expect(backButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('when zero files present, does not trigger missing documents alert on click', async () => {
            renderWithProviders(<RateDetails />, {
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
                screen.queryByText('You must upload a rate certification')
            ).toBeNull()
            expect(mockUpdateDraftFn).not.toHaveBeenCalled()
        })

        it('when duplicate files present, does not trigger duplicate documents alert on click and silently updates rate and supporting documents lists without duplicates', async () => {
            renderWithProviders(<RateDetails />, {
                apolloProvider: {
                    mocks: [
                        indexHealthPlanPackagesMockSuccess([
                            {
                                ...mockSubmittedHealthPlanPackage(),
                                id: 'test-abc-123',
                            },
                        ]),
                    ],
                },
            })

            const rateCertInput = screen.getByLabelText(
                'Upload one rate certification document'
            )
            const supportingDocsInput = screen.getByLabelText(
                'Upload supporting documents'
            )
            const backButton = screen.getByRole('button', {
                name: 'Back',
            })

            await userEvent.upload(rateCertInput, [TEST_DOC_FILE])

            await userEvent.upload(supportingDocsInput, [TEST_XLS_FILE])
            await userEvent.upload(supportingDocsInput, [TEST_DOC_FILE])
            await userEvent.upload(supportingDocsInput, [TEST_XLS_FILE])
            await waitFor(() => {
                expect(backButton).not.toHaveAttribute('aria-disabled')
                expect(
                    screen.queryAllByText('Duplicate file, please remove')
                ).toHaveLength(1)
            })
            await userEvent.click(backButton)

            expect(screen.queryByText('Remove files with errors')).toBeNull()

            const updatedRateInfo =
                mockUpdateDraftFn.mock.calls[0][0].rateInfos[0]

            // rate certs sent are as expected
            expect(updatedRateInfo.rateDocuments).toBeDefined()
            expect(updatedRateInfo.rateDocuments).toEqual([
                {
                    name: 'testFile.doc',
                    s3URL: expect.any(String),
                    sha256: 'da7d22ce886b5ab262cd7ab28901212a027630a5edf8e88c8488087b03ffd833', // pragma: allowlist secret
                },
            ])

            // rate certs sent are as expected
            expect(updatedRateInfo.supportingDocuments).toBeDefined()

            expect(updatedRateInfo.supportingDocuments).toEqual([
                {
                    name: 'testFile.xls',
                    s3URL: expect.any(String),
                    sha256: '76dbe3fd2b5c00001d424347bd28047b3bb2196561fc703c04fe254c10964c80', // pragma: allowlist secret
                },
                {
                    name: 'testFile.doc',
                    s3URL: expect.any(String),
                    sha256: 'da7d22ce886b5ab262cd7ab28901212a027630a5edf8e88c8488087b03ffd833', // pragma: allowlist secret
                },
            ])
        })
    })
})

// Helper functions

const fillOutIndexRate = async (screen: Screen, index: number) => {
    const targetRateCert = rateCertifications(screen)[index]
    expect(targetRateCert).toBeDefined()
    const withinTargetRateCert = within(targetRateCert)

    // assert proper initial fields are present
    expect(
        withinTargetRateCert.getByText('Upload one rate certification document')
    ).toBeInTheDocument()
    expect(
        withinTargetRateCert.getByText(
            'Programs this rate certification covers'
        )
    ).toBeInTheDocument()
    expect(
        withinTargetRateCert.getByText('Rate certification type')
    ).toBeInTheDocument()
    expect(
        withinTargetRateCert.getByText(
            'Does the actuary certify capitation rates specific to each rate cell or a rate range?'
        )
    ).toBeInTheDocument()

    //Rates across submission
    const sharedRates = withinTargetRateCert.queryByText(
        /Was this rate certification uploaded to any other submissions/
    )
    //if rates across submission UI exists then fill out section
    if (sharedRates) {
        expect(sharedRates).toBeInTheDocument()
        withinTargetRateCert.getByLabelText('No').click()
    }

    // add 1 doc
    const input = withinTargetRateCert.getByLabelText(
        'Upload one rate certification document'
    )
    await userEvent.upload(input, [TEST_PDF_FILE])

    // add programs
    const combobox = await withinTargetRateCert.findByRole('combobox')
    selectEvent.openMenu(combobox)
    await selectEvent.select(combobox, 'SNBC')
    selectEvent.openMenu(combobox)
    await selectEvent.select(combobox, 'PMAP')
    expect(
        withinTargetRateCert.getByLabelText('Remove SNBC')
    ).toBeInTheDocument()
    expect(
        withinTargetRateCert.getByLabelText('Remove PMAP')
    ).toBeInTheDocument()

    //  add types and answer captitation rates question
    withinTargetRateCert.getByLabelText('New rate certification').click()

    withinTargetRateCert
        .getByLabelText(
            'Certification of capitation rates specific to each rate cell'
        )
        .click()

    // check that now we can see dates, since that is triggered after selecting type
    await waitFor(() => {
        expect(
            withinTargetRateCert.queryByText('Start date')
        ).toBeInTheDocument()
        expect(withinTargetRateCert.queryByText('End date')).toBeInTheDocument()
        expect(
            withinTargetRateCert.queryByText('Date certified')
        ).toBeInTheDocument()
        expect(withinTargetRateCert.queryByText('Name')).toBeInTheDocument()
        expect(
            withinTargetRateCert.queryByText('Title/Role')
        ).toBeInTheDocument()
        expect(withinTargetRateCert.queryByText('Email')).toBeInTheDocument()
    })

    const startDateInputs = withinTargetRateCert.getAllByLabelText('Start date')
    const endDateInputs = withinTargetRateCert.getAllByLabelText('End date')
    await updateDateRange({
        start: { elements: startDateInputs, date: '01/01/2022' },
        end: { elements: endDateInputs, date: '12/31/2022' },
    })

    withinTargetRateCert.getAllByLabelText('Date certified')[0].focus()
    await userEvent.paste('12/01/2021')

    // fill out actuary contact
    withinTargetRateCert.getByLabelText('Name').focus()
    await userEvent.paste(`Actuary Contact Person ${index}`)

    withinTargetRateCert.getByLabelText('Title/Role').focus()
    await userEvent.paste(`Actuary Contact Title ${index}`)

    withinTargetRateCert.getByLabelText('Email').focus()
    await userEvent.paste(`actuarycontact${index}@test.com`)

    await userEvent.click(withinTargetRateCert.getByLabelText('Mercer'))
}

const fillOutFirstRate = async (screen: Screen) => {
    // trigger errors (used later to confirm we filled out every field)
    fireEvent.click(
        screen.getByRole('button', {
            name: 'Continue',
        })
    )

    await fillOutIndexRate(screen, 0)
}

const clickAddNewRate = async (screen: Screen) => {
    const rateCertsBeforeAddingNewRate = rateCertifications(screen)

    const addAnotherButton = screen.getByRole('button', {
        name: /Add another rate/,
    })

    expect(addAnotherButton).toBeInTheDocument()
    fireEvent.click(addAnotherButton)
    return await waitFor(() =>
        expect(rateCertifications(screen)).toHaveLength(
            rateCertsBeforeAddingNewRate.length + 1
        )
    )
}

const clickRemoveIndexRate = async (
    screen: Screen,
    indexOfRateCertToRemove: number
) => {
    // Remember, user cannot never remove the first rate certification -- MR-2231
    const rateCertsBeforeRemoving = rateCertifications(screen)
    // Confirm there is a rate to remove
    expect(rateCertsBeforeRemoving.length).toBeGreaterThanOrEqual(2)

    // Confirm there is one less rate removal button than rate certs
    const removeRateButtonsBeforeClick = screen.getAllByRole('button', {
        name: /Remove rate certification/,
    })
    expect(removeRateButtonsBeforeClick.length).toBeGreaterThanOrEqual(1)
    expect(removeRateButtonsBeforeClick).toHaveLength(
        rateCertsBeforeRemoving.length - 1
    )

    // Remove rate cert
    const removeRateButton =
        removeRateButtonsBeforeClick[indexOfRateCertToRemove - 1]

    expect(removeRateButton).toBeInTheDocument()
    fireEvent.click(removeRateButton)

    await waitFor(() => {
        // Confirm that there is one less rate certification on the page
        expect(rateCertifications(screen)).toHaveLength(
            rateCertsBeforeRemoving.length - 1
        )
        // Confirm that there is one less rate removal button (might even be zero buttons on page if all additional rates removed)
        expect(
            screen.getAllByRole('button', {
                name: /Remove rate certification/,
            })
        ).toHaveLength(removeRateButtonsBeforeClick.length - 1)
    })
}

const rateCertifications = (screen: Screen) => {
    return screen.getAllByTestId('rate-certification-form')
}

const lastRateCertificationFromList = (screen: Screen) => {
    return rateCertifications(screen).pop()
}
