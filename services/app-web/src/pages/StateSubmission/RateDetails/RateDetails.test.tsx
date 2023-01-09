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
    fetchCurrentUserMock,
    indexHealthPlanPackagesMockSuccess,
    mockUnlockedHealthPlanPackage,
    mockSubmittedHealthPlanPackage,
    mockMNState,
} from '../../../testHelpers/apolloHelpers'

import {
    renderWithProviders,
    TEST_DOC_FILE,
    TEST_PDF_FILE,
    TEST_XLS_FILE,
    TEST_PNG_FILE,
    dragAndDrop,
    ldUseClientSpy,
} from '../../../testHelpers/jestHelpers'
import { RateDetails } from './RateDetails'
import { ACCEPTED_SUBMISSION_FILE_TYPES } from '../../../components/FileUpload'
import selectEvent from 'react-select-event'
import * as useStatePrograms from '../../../hooks/useStatePrograms'
import { unlockedWithALittleBitOfEverything } from '../../../common-code/healthPlanFormDataMocks'

describe('RateDetails', () => {
    const emptyRateDetailsDraft = {
        ...mockDraft(),
        rateInfos: [],
        rateType: undefined,
        rateDateStart: undefined,
        rateDateEnd: undefined,
        rateDateCertified: undefined,
        actuaryContacts: [],
    }

    afterEach(() => {
        jest.clearAllMocks()
        jest.spyOn(useStatePrograms, 'useStatePrograms').mockRestore()
    })

    const fillOutIndexRate = async (screen: Screen, index: number) => {
        const targetRateCert = rateCertifications(screen)[index]
        expect(targetRateCert).toBeDefined()
        const withinTargetRateCert = within(targetRateCert)

        // assert proper initial fields are present
        expect(
            withinTargetRateCert.getByText('Upload rate certification')
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
            'Upload rate certification'
        )
        await userEvent.upload(input, [TEST_DOC_FILE])

        // add programs
        const combobox = await withinTargetRateCert.findByRole('combobox')
        await selectEvent.openMenu(combobox)
        await selectEvent.select(combobox, 'SNBC')
        await selectEvent.openMenu(combobox)
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
            expect(
                withinTargetRateCert.queryByText('End date')
            ).toBeInTheDocument()
            expect(
                withinTargetRateCert.queryByText('Date certified')
            ).toBeInTheDocument()
            expect(withinTargetRateCert.queryByText('Name')).toBeInTheDocument()
            expect(
                withinTargetRateCert.queryByText('Title/Role')
            ).toBeInTheDocument()
            expect(
                withinTargetRateCert.queryByText('Email')
            ).toBeInTheDocument()
        })

        // fill in dates
        withinTargetRateCert.getAllByLabelText('Start date')[0].focus()
        await userEvent.paste('01/01/2022')

        withinTargetRateCert.getAllByLabelText('End date')[0].focus()
        await userEvent.paste('12/31/2022')

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
        // wait for all errors to clear
        await waitFor(() =>
            expect(screen.queryAllByTestId('errorMessage')).toHaveLength(0)
        )
    }

    const clickAddNewRate = async (screen: Screen) => {
        const rateCertsBeforeAddingNewRate = rateCertifications(screen)

        const addAnotherButton = screen.getByRole('button', {
            name: /Add another rate/,
        })

        expect(addAnotherButton).toBeInTheDocument()
        fireEvent.click(addAnotherButton)
        await waitFor(() =>
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

    describe('handles a single rate', () => {
        afterEach(() => {
            jest.clearAllMocks()
        })
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

            expect(
                screen.getByText('Rate certification type')
            ).toBeInTheDocument()
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
            expect(
                screen.getByText(/All fields are required/)
            ).toBeInTheDocument()
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
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            await continueButton.click()
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
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
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
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

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
            ldUseClientSpy({
                'rates-across-submissions': true,
            })

            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                            }),
                        ],
                    },
                }
            )

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
            const input = screen.getByLabelText('Upload rate certification')
            await userEvent.upload(input, [TEST_XLS_FILE])
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

            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser,
                                statusCode: 200,
                            }),
                        ],
                    },
                }
            )
            const combobox = await screen.findByRole('combobox')

            await selectEvent.openMenu(combobox)

            await waitFor(() => {
                expect(screen.getByText('Program 3')).toBeInTheDocument()
            })

            await selectEvent.select(combobox, 'Program 1')
            await selectEvent.openMenu(combobox)
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

        it('accepts documents on new rate', async () => {
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

    describe('handles multiple rates', () => {
        afterEach(() => {
            jest.clearAllMocks()
        })

        it('renders add another rate button, which adds another set of rate certification fields to the form', async () => {
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                            }),
                        ],
                    },
                }
            )
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
            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                            }),
                        ],
                    },
                }
            )
            const rateCertsOnLoad = rateCertifications(screen)
            expect(rateCertsOnLoad).toHaveLength(1)

            await fillOutFirstRate(screen)
            await clickAddNewRate(screen)
            await fillOutIndexRate(screen, 1)
            await clickAddNewRate(screen)
            await fillOutIndexRate(screen, 2)

            await waitFor(() => {
                const rateCertsAfterAddAnother = rateCertifications(screen)
                expect(rateCertsAfterAddAnother).toHaveLength(3)
            })

            await clickRemoveIndexRate(screen, 1)

            await waitFor(() => {
                const rateCertsAfterRemove = rateCertifications(screen)
                expect(rateCertsAfterRemove).toHaveLength(2)
            })
        }, 10000)

        it('accepts documents on second rate', async () => {
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

            await fillOutFirstRate(screen)

            await clickAddNewRate(screen)
            const newRateCert = lastRateCertificationFromList(screen)
            expect(newRateCert).toBeDefined()
            const newRateInput = within(newRateCert!).getByLabelText(
                'Upload rate certification'
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
            await fillOutFirstRate(screen)
            await clickAddNewRate(screen)

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })
            await continueButton.click()
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
            await fillOutFirstRate(screen)
            await clickAddNewRate(screen)

            await waitFor(() => {
                const rateInfoContainers = screen.getAllByRole('group', {
                    name: /certification/,
                })
                expect(rateInfoContainers).toHaveLength(2)
            })
            const rateInfo2 = screen.getAllByRole('group', {
                name: /certification/,
            })[1]

            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            within(rateInfo2).getByLabelText('New rate certification').click()

            await continueButton.click()
            await waitFor(() => {
                expect(
                    screen.getAllByText('You must upload at least one document')
                ).toHaveLength(2)
                expect(continueButton).toHaveAttribute('aria-disabled', 'true')
            })
        })

        it('progressively disclose new rate form fields on the second rate', async () => {
            ldUseClientSpy({
                'rates-across-submissions': true,
            })
            jest.setTimeout(30000)
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
                        {
                            id: 'snbc',
                            name: 'SNBC',
                            fullName: 'SNBC',
                        },
                        {
                            id: 'pmap',
                            name: 'PMAP',
                            fullName: 'PMAP',
                        },
                    ],
                },
            }

            renderWithProviders(
                <RateDetails
                    draftSubmission={emptyRateDetailsDraft}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockUser,
                                statusCode: 200,
                            }),
                        ],
                    },
                }
            )

            await fillOutFirstRate(screen)
            await clickAddNewRate(screen)
            const newRateCert = lastRateCertificationFromList(screen)
            expect(newRateCert).toBeDefined()
            expect(
                within(newRateCert!).getByText(
                    'Programs this rate certification covers'
                )
            ).toBeInTheDocument()
            expect(
                within(newRateCert!).getByText('Rate certification type')
            ).toBeInTheDocument()
            within(newRateCert!)
                .getByLabelText('New rate certification')
                .click()
            expect(
                within(newRateCert!).getByText(
                    'Does the actuary certify capitation rates specific to each rate cell or a rate range?'
                )
            ).toBeInTheDocument()
            within(newRateCert!)
                .getByLabelText(
                    'Certification of capitation rates specific to each rate cell'
                )
                .click()
            const input = within(newRateCert!).getByLabelText(
                'Upload rate certification'
            )
            await userEvent.upload(input, [TEST_DOC_FILE])

            // check that now we can see hidden things
            await waitFor(() => {
                expect(
                    within(newRateCert!).queryByText('Rating period')
                ).toBeInTheDocument()
                expect(
                    within(newRateCert!).queryByText('Rating period')
                ).toBeInTheDocument()
                expect(
                    within(newRateCert!).queryByText('Start date')
                ).toBeInTheDocument()
                expect(
                    within(newRateCert!).queryByText('End date')
                ).toBeInTheDocument()
                expect(
                    within(newRateCert!).queryByText('Date certified')
                ).toBeInTheDocument()
            })
            // click "continue"
            const continueButton = screen.getByRole('button', {
                name: 'Continue',
            })

            fireEvent.click(continueButton)

            // check for expected errors
            await waitFor(() => {
                expect(screen.queryAllByTestId('errorMessage')).toHaveLength(8)
                expect(
                    screen.queryAllByText(
                        'You must enter the date the document was certified'
                    )
                ).toHaveLength(2)
                expect(
                    screen.queryByText(
                        'You must provide a start and an end date'
                    )
                ).toBeInTheDocument()
                expect(
                    screen.queryAllByText('You must select a program')
                ).toHaveLength(2)
                expect(
                    screen.queryAllByText('You must select yes or no')
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

            // Declare there are no shared rates
            await userEvent.click(within(newRateCert!).getByText('No'))

            //Select programs for rate certification
            const combobox = await within(newRateCert!).findByRole('combobox')

            await selectEvent.openMenu(combobox)
            await waitFor(() => {
                expect(
                    within(newRateCert!).getByText('Program 3')
                ).toBeInTheDocument()
            })
            await selectEvent.select(combobox, 'Program 1')
            await selectEvent.openMenu(combobox)
            await selectEvent.select(combobox, 'Program 3')

            // fill out form and clear errors
            within(newRateCert!).getAllByLabelText('Start date')[0].focus()
            await userEvent.paste('01/01/2022')

            within(newRateCert!).getAllByLabelText('End date')[0].focus()
            await userEvent.paste('12/31/2022')

            within(newRateCert!).getAllByLabelText('Date certified')[0].focus()
            await userEvent.paste('12/01/2021')

            // fill out actuary contact
            within(newRateCert!).getByLabelText('Name').focus()
            await userEvent.paste(`Actuary Contact Person 2`)

            within(newRateCert!).getByLabelText('Title/Role').focus()
            await userEvent.paste(`Actuary Contact Title 2`)

            within(newRateCert!).getByLabelText('Email').focus()
            await userEvent.paste(`actuarycontact2@test.com`)

            await userEvent.click(within(newRateCert!).getByLabelText('Mercer'))

            //wait for all errors to clear
            await waitFor(() =>
                expect(screen.queryAllByTestId('errorMessage')).toHaveLength(0)
            )
        })
    })

    describe('rates across submissions', () => {
        beforeEach(() =>
            ldUseClientSpy({
                'rates-across-submissions': true,
            })
        )
        afterEach(() => {
            jest.clearAllMocks()
        })

        it('correctly checks shared rate certification radios and selects shared packages', async () => {
            //Spy on useStatePrograms hook to get up-to-date state programs
            jest.spyOn(useStatePrograms, 'useStatePrograms').mockReturnValue(
                mockMNState().programs
            )

            //First submission is 'CONTRACT_ONLY' and last submission is the current one. Both should be excluded from
            // package combobox options.
            const currentSubmission = {
                ...emptyRateDetailsDraft,
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

            renderWithProviders(
                <RateDetails
                    draftSubmission={currentSubmission}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                            }),
                            indexHealthPlanPackagesMockSuccess(mockSubmissions),
                        ],
                    },
                }
            )
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
            await selectEvent.openMenu(firstRatePackageCombobox)
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
            await selectEvent.openMenu(firstRatePackageCombobox)
            await selectEvent.select(
                firstRatePackageCombobox,
                'MCR-MN-0004-MSC+-PMAP-SNBC (Submitted 01/02/21)'
            )
            await selectEvent.openMenu(firstRatePackageCombobox)
            await selectEvent.select(
                firstRatePackageCombobox,
                'MCR-MN-0005-MSC+-PMAP-SNBC (Draft)'
            )
            await selectEvent.openMenu(firstRatePackageCombobox)
            await selectEvent.select(
                firstRatePackageCombobox,
                'MCR-MN-0006-MSC+-PMAP-SNBC (Draft)'
            )
            await selectEvent.openMenu(firstRatePackageCombobox)

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
            await selectEvent.openMenu(secondRatePackageCombobox)
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
        })

        it('cannot continue when shared rate radio is unchecked', async () => {
            //Spy on useStatePrograms hook to get up-to-date state programs
            jest.spyOn(useStatePrograms, 'useStatePrograms').mockReturnValue(
                mockMNState().programs
            )

            //First submission is 'CONTRACT_ONLY' and last submission is the current one. Both should be excluded from
            // package combobox options.
            const currentSubmission = {
                ...emptyRateDetailsDraft,
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

            renderWithProviders(
                <RateDetails
                    draftSubmission={currentSubmission}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                            }),
                            indexHealthPlanPackagesMockSuccess(mockSubmissions),
                        ],
                    },
                }
            )
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
            await selectEvent.openMenu(firstRatePackageCombobox)
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
            await selectEvent.openMenu(firstRatePackageCombobox)
            await selectEvent.select(
                firstRatePackageCombobox,
                'MCR-MN-0006-MSC+-PMAP-SNBC (Draft)'
            )
            await selectEvent.openMenu(firstRatePackageCombobox)

            //Expect submission selection error to clear and continue button is not disabled
            await waitFor(() => {
                expect(
                    screen.queryByText(
                        'You must select at least one submission'
                    )
                ).not.toBeInTheDocument()
                expect(continueButton).not.toHaveAttribute('aria-disabled')
            })
        })

        it('cannot continue when shared rate radio is checked and no package is selected', async () => {
            //Spy on useStatePrograms hook to get up-to-date state programs
            jest.spyOn(useStatePrograms, 'useStatePrograms').mockReturnValue(
                mockMNState().programs
            )

            //First submission is 'CONTRACT_ONLY' and last submission is the current one. Both should be excluded from
            // package combobox options.
            const currentSubmission = {
                ...emptyRateDetailsDraft,
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

            renderWithProviders(
                <RateDetails
                    draftSubmission={currentSubmission}
                    updateDraft={jest.fn()}
                    previousDocuments={[]}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                            }),
                            indexHealthPlanPackagesMockSuccess(mockSubmissions),
                        ],
                    },
                }
            )
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
            await selectEvent.openMenu(firstRatePackageCombobox)
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
            await selectEvent.openMenu(firstRatePackageCombobox)
            await selectEvent.select(
                firstRatePackageCombobox,
                'MCR-MN-0006-MSC+-PMAP-SNBC (Draft)'
            )
            await selectEvent.openMenu(firstRatePackageCombobox)

            //Expect submission selection error to clear and continue button is not disabled
            await waitFor(() => {
                expect(
                    screen.queryByText(
                        'You must select at least one submission'
                    )
                ).not.toBeInTheDocument()
                expect(continueButton).not.toHaveAttribute('aria-disabled')
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
                    rateInfos: [
                        {
                            rateType: undefined,
                            rateCapitationType: undefined,
                            rateDateStart: undefined,
                            rateDateEnd: undefined,
                            rateDateCertified: undefined,
                            rateAmendmentInfo: undefined,
                            rateProgramIDs: [],
                            actuaryContacts: [
                                {
                                    actuarialFirm: undefined,
                                    actuarialFirmOther: '',
                                    email: '',
                                    name: '',
                                    titleRole: '',
                                },
                            ],
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
                            packagesWithSharedRateCerts: [],
                        },
                    ],
                })
            )
        })
    })
})
