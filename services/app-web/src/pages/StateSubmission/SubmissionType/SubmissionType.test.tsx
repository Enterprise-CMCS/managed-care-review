/* eslint-disable @typescript-eslint/no-non-null-assertion */
import userEvent from '@testing-library/user-event'
import { screen, waitFor, within } from '@testing-library/react'
import selectEvent from 'react-select-event'
import {
    fetchCurrentUserMock,
    fetchContractMockSuccess,
    mockContractPackageDraft,
    mockContractPackageUnlockedWithUnlockedType,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { SubmissionType } from './'
import { Routes } from 'react-router'
import { Route } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'

describe('SubmissionType', () => {
    it('displays correct form guidance', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        const requiredLabels = await screen.findAllByText('Required')
        expect(requiredLabels).toHaveLength(6)
        const optionalLabels = screen.queryAllByText('Optional')
        expect(optionalLabels).toHaveLength(0)
    })

    it('displays submission type form when expected', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    fetchContractMockSuccess({
                        contract: {
                            ...mockContractPackageDraft(),
                            id: '15',
                        },
                    }),
                ],
            },
        })

        expect(
            screen.getByRole('form', { name: 'Submission Type Form' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', {
                name: 'Save as draft',
            })
        ).toBeDefined()
        expect(
            screen.getByRole('button', {
                name: 'Cancel',
            })
        ).toBeDefined()
        expect(
            screen.getByRole('button', {
                name: 'Continue',
            })
        ).toBeDefined()
    })

    it('displays new submission form when expected', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
            routerProvider: { route: '/submissions/new' },
        })

        expect(
            screen.getByRole('form', { name: 'New Submission Form' })
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('button', {
                name: 'Save as draft',
            })
        ).toBeNull()

        expect(
            screen.getByRole('button', {
                name: 'Cancel',
            })
        ).toBeDefined()
        expect(
            screen.getByRole('button', {
                name: 'Continue',
            })
        ).toBeDefined()
    })

    it('displays population coverage question', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        expect(
            screen.getByText(
                'Which populations does this contract action cover?'
            )
        ).toBeInTheDocument()
        expect(
            screen.getByRole('radio', { name: 'Medicaid' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('radio', { name: 'CHIP-only' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('radio', { name: 'Medicaid and CHIP' })
        ).toBeInTheDocument()
    })
    it('disables contract and rates submission type radio and displays hint when CHIP only is selected', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        expect(
            screen.getByText(
                'Which populations does this contract action cover?'
            )
        ).toBeInTheDocument()
        const chipOnlyRadio = screen.getByRole('radio', {
            name: 'CHIP-only',
        })

        // Select Chip only population coverage
        await userEvent.click(chipOnlyRadio)

        // Contract and rates radio is disabled
        expect(
            screen.getByRole('radio', {
                name: 'Contract action and rate certification',
            })
        ).toHaveAttribute('disabled')

        // Shows hint for submission type
        expect(
            screen.getByText(
                'States are not required to submit rates with CHIP-only contracts.'
            )
        ).toBeInTheDocument()
    })
    it('switches submission type to contract only when changing existing population coverage to CHIP-only', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        expect(
            screen.getByText(
                'Which populations does this contract action cover?'
            )
        ).toBeInTheDocument()
        const medicaidRadio = screen.getByRole('radio', {
            name: 'Medicaid',
        })
        const contractAndRatesRadio = screen.getByRole('radio', {
            name: 'Contract action and rate certification',
        })

        // Click Medicaid population coverage radio
        await userEvent.click(medicaidRadio)

        // Click contract and rates submission type
        await userEvent.click(contractAndRatesRadio)

        // Expect contract and rates radio to be selected
        expect(contractAndRatesRadio).toBeChecked()

        const chipOnlyRadio = screen.getByRole('radio', {
            name: 'CHIP-only',
        })
        const contractOnlyRadio = screen.getByRole('radio', {
            name: 'Contract action only',
        })

        // Change population coverage to Chip only
        await userEvent.click(chipOnlyRadio)

        // Contract and rates radio is unselected and disabled
        expect(contractAndRatesRadio).not.toBeChecked()
        expect(contractAndRatesRadio).toHaveAttribute('disabled')

        // Contract only radio is selected
        expect(contractOnlyRadio).toBeChecked()

        // Shows hint for submission type
        expect(
            screen.getByText(
                'States are not required to submit rates with CHIP-only contracts.'
            )
        ).toBeInTheDocument()
    })
    it('new submissions does not automatically select contract only submission type when selecting CHIP-only coverage', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        expect(
            screen.getByText(
                'Which populations does this contract action cover?'
            )
        ).toBeInTheDocument()
        const medicaidRadio = screen.getByRole('radio', {
            name: 'Medicaid',
        })
        const chipOnlyRadio = screen.getByRole('radio', {
            name: 'CHIP-only',
        })
        const medicaidAndChipRadio = screen.getByRole('radio', {
            name: 'Medicaid and CHIP',
        })
        const contractAndRatesRadio = screen.getByRole('radio', {
            name: 'Contract action and rate certification',
        })
        const contractOnlyRadio = screen.getByRole('radio', {
            name: 'Contract action only',
        })

        // Click on each of the population covered radios
        await userEvent.click(medicaidRadio)
        await userEvent.click(chipOnlyRadio)
        await userEvent.click(medicaidAndChipRadio)

        // Expect contract and rates radio to not be selected
        await waitFor(() => {
            expect(contractAndRatesRadio).not.toBeChecked()
            expect(contractOnlyRadio).not.toBeChecked()
        })

        // Change population coverage to Chip only
        await userEvent.click(chipOnlyRadio)

        // Expect the submission type radios to still be unselected
        await waitFor(() => {
            expect(contractAndRatesRadio).not.toBeChecked()
            expect(contractOnlyRadio).not.toBeChecked()
        })

        // Shows hint for submission type
        expect(
            screen.getByText(
                'States are not required to submit rates with CHIP-only contracts.'
            )
        ).toBeInTheDocument()
    })
    it('does not clear contract only submission type radio when switching to CHIP-only population coverage', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        expect(
            screen.getByText(
                'Which populations does this contract action cover?'
            )
        ).toBeInTheDocument()
        const medicaidRadio = screen.getByRole('radio', {
            name: 'Medicaid',
        })
        const contractOnlyRadio = screen.getByRole('radio', {
            name: 'Contract action only',
        })

        // Click Medicaid population coverage radio
        await userEvent.click(medicaidRadio)

        // Click contract only submission type
        await userEvent.click(contractOnlyRadio)

        // Expect contract only radio to be selected
        expect(contractOnlyRadio).toBeChecked()

        const chipOnlyRadio = screen.getByRole('radio', {
            name: 'CHIP-only',
        })

        // Change population coverage to Chip only
        await userEvent.click(chipOnlyRadio)

        // Contract only radio is still selected
        expect(contractOnlyRadio).toBeChecked()
    })

    it('displays programs select dropdown', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        expect(
            screen.getByRole('combobox', {
                name: 'Programs this contract action covers (required)',
            })
        ).toBeInTheDocument()
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
                        isRateProgram: false,
                    },
                    {
                        id: 'second',
                        name: 'Program Test',
                        fullName: 'Program Test',
                        isRateProgram: false,
                    },
                    {
                        id: 'third',
                        name: 'Program 3',
                        fullName: 'Program 3',
                        isRateProgram: false,
                    },
                ],
            },
        }
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        statusCode: 200,
                        user: mockUser,
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
        expect(screen.getByLabelText('Remove Program 1')).toBeInTheDocument()
        expect(screen.getByLabelText('Remove Program 3')).toBeInTheDocument()
    })

    it('displays submission type radio buttons', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        expect(
            screen.getByRole('radio', { name: 'Contract action only' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('radio', {
                name: 'Contract action and rate certification',
            })
        ).toBeInTheDocument()
    })

    it('displays contract type radio buttons', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        expect(
            screen.getByRole('radio', { name: 'Base contract' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('radio', {
                name: 'Amendment to base contract',
            })
        ).toBeInTheDocument()
    })

    it('displays risk-based contract radio buttons and validation message', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        // setup
        const riskBasedContract = screen.getByText(
            /Is this a risk-based contract/
        )
        const riskBasedContractParent = riskBasedContract.parentElement
        expect(riskBasedContract).toBeInTheDocument()
        expect(riskBasedContractParent).toBeDefined()

        // check that fields are on page
        expect(
            within(riskBasedContractParent!).getByLabelText('Yes')
        ).toBeInTheDocument()
        expect(
            within(riskBasedContractParent!).getByLabelText('No')
        ).toBeInTheDocument()

        // check that validations work
        await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
        await screen.findByTestId('error-summary')
        await screen.findAllByText('You must select yes or no')
        await userEvent.click(
            within(riskBasedContractParent!).getByLabelText('No')
        )
        await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    })

    it('displays submission description textarea', async () => {
        renderWithProviders(<SubmissionType />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })
        expect(
            screen.getByRole('textbox', {
                name: 'Submission description',
            })
        ).toBeInTheDocument()
    })

    it('disables CHIP-only and Submission type radio options with at least 1 submitted child rate', async () => {
        const unlockedContract = {
            ...mockContractPackageUnlockedWithUnlockedType({
                id: '15',
            }),
        }

        // Add a linked rate
        unlockedContract.draftRates.push({
            ...unlockedContract.draftRates[0],
            parentContractID: 'some-other-contract',
        })

        // Add a draft rate
        unlockedContract.draftRates.push({
            ...unlockedContract.draftRates[0],
            status: 'DRAFT',
            consolidatedStatus: 'DRAFT',
        })

        renderWithProviders(
            <Routes>
                <Route
                    element={<SubmissionType />}
                    path={RoutesRecord.SUBMISSIONS_TYPE}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: unlockedContract,
                        }),
                    ],
                },
                routerProvider: { route: '/submissions/15/edit/type' },
            }
        )

        await waitFor(() => {
            // Submission type is disabled
            expect(
                screen.getByRole('radiogroup', {
                    name: 'Choose a submission type',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('radio', { name: 'Contract action only' })
            ).toBeDisabled()
            expect(
                screen.getByRole('radio', {
                    name: 'Contract action and rate certification',
                })
            ).toBeDisabled()

            // Population question disables CHIP-only radio
            expect(
                screen.getByRole('radiogroup', {
                    name: 'Which populations does this contract action cover?',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('radio', { name: 'CHIP-only' })
            ).toBeDisabled()
            expect(
                screen.queryAllByText(
                    'If you need to change your response, contact CMS.'
                )
            ).toHaveLength(2)
        })
    })

    it('does not disable CHIP-only and Submission type radio options with only linked rates', async () => {
        const unlockedContract = {
            ...mockContractPackageUnlockedWithUnlockedType({
                id: '15',
            }),
        }

        // Change all rates to linked rates
        unlockedContract.draftRates = unlockedContract.draftRates.map((dr) => ({
            ...dr,
            parentContractID: 'some-other-contract',
        }))

        renderWithProviders(
            <Routes>
                <Route
                    element={<SubmissionType />}
                    path={RoutesRecord.SUBMISSIONS_TYPE}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: unlockedContract,
                        }),
                    ],
                },
                routerProvider: { route: '/submissions/15/edit/type' },
            }
        )

        await waitFor(() => {
            // Submission type is disabled
            expect(
                screen.getByRole('radiogroup', {
                    name: 'Choose a submission type',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('radio', { name: 'Contract action only' })
            ).not.toBeDisabled()
            expect(
                screen.getByRole('radio', {
                    name: 'Contract action and rate certification',
                })
            ).not.toBeDisabled()

            // Population question disables CHIP-only radio
            expect(
                screen.getByRole('radiogroup', {
                    name: 'Which populations does this contract action cover?',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('radio', { name: 'CHIP-only' })
            ).not.toBeDisabled()
        })
    })

    it('does not disable CHIP-only and Submission type radio options with only draft rates', async () => {
        const unlockedContract = {
            ...mockContractPackageDraft({
                id: '15',
            }),
        }

        renderWithProviders(
            <Routes>
                <Route
                    element={<SubmissionType />}
                    path={RoutesRecord.SUBMISSIONS_TYPE}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: unlockedContract,
                        }),
                    ],
                },
                routerProvider: { route: '/submissions/15/edit/type' },
            }
        )

        await waitFor(() => {
            // Submission type is disabled
            expect(
                screen.getByRole('radiogroup', {
                    name: 'Choose a submission type',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('radio', { name: 'Contract action only' })
            ).not.toBeDisabled()
            expect(
                screen.getByRole('radio', {
                    name: 'Contract action and rate certification',
                })
            ).not.toBeDisabled()

            // Population question disables CHIP-only radio
            expect(
                screen.getByRole('radiogroup', {
                    name: 'Which populations does this contract action cover?',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('radio', { name: 'CHIP-only' })
            ).not.toBeDisabled()
        })
    })

    describe('validations', () => {
        it('does not show error validations on initial load', async () => {
            renderWithProviders(<SubmissionType />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            expect(screen.getByRole('textbox')).not.toHaveClass(
                'usa-input--error'
            )
            expect(
                screen.queryByText('You must choose a submission type')
            ).toBeNull()
            expect(
                screen.queryByText(
                    'You must provide a description of any major changes or updates'
                )
            ).toBeNull()
        })

        it('shows error messages when there are validation errors and showValidations is true', async () => {
            renderWithProviders(
                <SubmissionType showValidations={true} />,

                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )
            const textarea = screen.getByRole('textbox', {
                name: 'Submission description',
            })

            expect(textarea).toBeInTheDocument()

            //trigger validation
            await userEvent.type(textarea, 'something')
            await userEvent.clear(textarea)

            await waitFor(() => {
                expect(textarea).toHaveClass('usa-input--error')
                expect(
                    screen.getAllByText('You must choose a submission type')
                ).toHaveLength(2)
            })
        })

        it('shows error messages when contract type is not selected', async () => {
            renderWithProviders(
                <SubmissionType showValidations={true} />,

                {
                    apolloProvider: {
                        mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                    },
                }
            )
            const textarea = screen.getByRole('textbox', {
                name: 'Submission description',
            })

            expect(textarea).toBeInTheDocument()

            const submissionType = await screen.findByText(
                'Contract action only'
            )
            await userEvent.click(submissionType)

            //trigger validation
            await userEvent.type(textarea, 'something')
            await userEvent.clear(textarea)

            await waitFor(() => {
                expect(textarea).toHaveClass('usa-input--error')
                expect(
                    screen.getAllByText('You must choose a contract type')
                ).toHaveLength(2)
            })
        })

        it('do not show error messages when showValidations is false', async () => {
            renderWithProviders(<SubmissionType showValidations={false} />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })
            const textarea = screen.getByRole('textbox', {
                name: 'Submission description',
            })
            expect(textarea).toBeInTheDocument()

            //trigger validation
            await userEvent.type(textarea, 'something')
            await userEvent.clear(textarea)

            await waitFor(() => {
                expect(textarea).not.toHaveClass('usa-input--error')
                expect(
                    screen.queryByText('You must choose a submission type')
                ).toBeNull()
            })
        })

        it('shows validation message when population coverage is not selected', async () => {
            renderWithProviders(<SubmissionType />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            // Expect population coverage question and radios
            expect(
                screen.getByText(
                    'Which populations does this contract action cover?'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByRole('radio', { name: 'Medicaid' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('radio', { name: 'CHIP-only' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('radio', { name: 'Medicaid and CHIP' })
            ).toBeInTheDocument()

            // Test validations work.
            await userEvent.click(
                screen.getByRole('button', { name: 'Continue' })
            )
            await screen.findByTestId('error-summary')
            await screen.findAllByText(
                'You must select the population this contract covers'
            )
        })

        it('if form fields are invalid, shows validation error messages when continue button is clicked', async () => {
            renderWithProviders(<SubmissionType />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            })

            await userEvent.click(
                screen.getByRole('button', {
                    name: 'Continue',
                })
            )
            await waitFor(() => {
                expect(
                    screen.queryAllByText('You must choose a submission type')
                ).toHaveLength(2)
                expect(
                    screen.queryAllByText(
                        'You must provide a description of any major changes or updates'
                    )
                ).toHaveLength(2)
                expect(
                    screen.queryAllByText(
                        'You must select at least one program'
                    )
                ).toHaveLength(2)
            })
        })
    })
})
