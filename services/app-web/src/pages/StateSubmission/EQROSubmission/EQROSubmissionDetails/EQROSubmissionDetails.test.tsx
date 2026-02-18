import { renderWithProviders } from '../../../../testHelpers'
import {
    createContractMockFail,
    fetchContractMockSuccess,
    fetchCurrentUserMock,
    mockContractPackageDraft,
    updateContractDraftRevisionMockSuccess,
} from '@mc-review/mocks'
import { userEvent } from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/react'
import { EQROSubmissionDetails } from './EQROSubmissionDetails'
import { generatePath, Location, Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'

it('displays correct submission detail form fields', async () => {
    let testLocation: Location
    renderWithProviders(
        <Routes>
            <Route
                element={<EQROSubmissionDetails />}
                path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
            />
        </Routes>,
        {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    fetchCurrentUserMock({ statusCode: 200 }),
                ],
            },
            routerProvider: { route: '/submissions/new/eqro' },
            location: (location) => (testLocation = location),
        }
    )

    await waitFor(() => {
        expect(testLocation.pathname).toBe(
            generatePath(RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM, {
                contractSubmissionType: 'eqro',
            })
        )
    })

    const medicaid = await screen.findByText('Medicaid')
    expect(medicaid).toBeInTheDocument()

    const comboBox = await screen.findByRole('combobox', {
        name: 'Programs reviewed by this EQRO (required)',
    })
    expect(comboBox).toBeInTheDocument()

    const contractType = await screen.findByText('Base contract')
    expect(contractType).toBeInTheDocument()

    const textarea = await screen.findByRole('textbox', {
        name: 'Submission description',
    })
    expect(textarea).toBeInTheDocument()

    const managedCareEntity = await screen.findByRole('checkbox', {
        name: 'Managed Care Organization (MCO)',
    })
    expect(managedCareEntity).toBeInTheDocument()
})

it('displays save as draft button for editing a existing submission', async () => {
    let testLocation: Location
    const mockData = mockContractPackageDraft()

    if (!mockData.draftRevision) {
        throw new Error('Expected a draft revision')
    }

    mockData.id = 'test-123'
    mockData.contractSubmissionType = 'EQRO'
    mockData.draftRevision.formData.submissionType = 'CONTRACT_ONLY'
    mockData.draftRates = []

    renderWithProviders(
        <Routes>
            <Route
                element={<EQROSubmissionDetails />}
                path={RoutesRecord.SUBMISSIONS_TYPE}
            />
        </Routes>,
        {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    fetchContractMockSuccess({
                        contract: mockData,
                    }),
                    updateContractDraftRevisionMockSuccess({
                        contract: mockData,
                    }),
                ],
            },
            routerProvider: { route: '/submissions/eqro/test-123/edit/type' },
            location: (location) => (testLocation = location),
        }
    )

    await waitFor(() => {
        expect(testLocation.pathname).toBe(
            generatePath(RoutesRecord.SUBMISSIONS_TYPE, {
                id: mockData.id,
                contractSubmissionType: 'eqro',
            })
        )
    })

    const saveAsDraft = await screen.findByRole('button', {
        name: 'Save as draft',
    })

    expect(saveAsDraft).toBeInTheDocument()
    await userEvent.click(saveAsDraft)

    await waitFor(() => {
        expect(
            screen.getByTestId('saveAsDraftSuccessBanner')
        ).toBeInTheDocument()
    })
})

it('displays validation messages', async () => {
    let testLocation: Location
    renderWithProviders(
        <Routes>
            <Route
                element={<EQROSubmissionDetails />}
                path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
            />
        </Routes>,
        {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    fetchCurrentUserMock({ statusCode: 200 }),
                ],
            },
            routerProvider: { route: '/submissions/new/eqro' },
            location: (location) => (testLocation = location),
        }
    )

    await waitFor(() => {
        expect(testLocation.pathname).toBe(
            generatePath(RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM, {
                contractSubmissionType: 'eqro',
            })
        )
    })

    const continueButton = await screen.findByRole('button', {
        name: 'Continue',
    })
    await userEvent.click(continueButton)

    // expect inline and summary errors to be on screen
    await waitFor(() => {
        expect(
            screen.queryAllByText(
                'You must select the population included in EQRO activities'
            )
        ).toHaveLength(2)
        expect(
            screen.queryAllByText('You must select at least one program')
        ).toHaveLength(2)
        expect(
            screen.queryAllByText('You must select at least one entity')
        ).toHaveLength(2)
        expect(
            screen.queryAllByText('You must choose a contract type')
        ).toHaveLength(2)
        expect(
            screen.queryAllByText(
                'You must provide a description of any major changes or updates'
            )
        ).toHaveLength(2)
    })

    // fill out all fields
    const medicaid = await screen.findByText('Medicaid')
    await userEvent.click(medicaid)

    const comboBox = await screen.findByRole('combobox', {
        name: 'Programs reviewed by this EQRO (required)',
    })
    await userEvent.click(comboBox)

    const program = await screen.findByText('PMAP')
    await userEvent.click(program)

    const contractType = await screen.findByText('Base contract')
    await userEvent.click(contractType)

    const textarea = await screen.findByRole('textbox', {
        name: 'Submission description',
    })
    await userEvent.type(textarea, 'A submitted submission')

    const managedCareEntity = await screen.findByRole('checkbox', {
        name: 'Managed Care Organization (MCO)',
    })
    await userEvent.click(managedCareEntity)

    // expect no inline or summary errors
    await waitFor(() => {
        expect(
            screen.queryAllByText(
                'You must select the population included in EQRO activities'
            )
        ).toHaveLength(0)
        expect(
            screen.queryAllByText('You must select at least one program')
        ).toHaveLength(0)
        expect(
            screen.queryAllByText('You must select at least one entity')
        ).toHaveLength(0)
        expect(
            screen.queryAllByText('You must choose a contract type')
        ).toHaveLength(0)
        expect(
            screen.queryAllByText(
                'You must provide a description of any major changes or updates'
            )
        ).toHaveLength(0)
    })
})

it('shows validation error when submission description exceeds 1500 characters and clears when characters are removed', async () => {
    let testLocation: Location
    renderWithProviders(
        <Routes>
            <Route
                element={<EQROSubmissionDetails />}
                path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
            />
        </Routes>,
        {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    fetchCurrentUserMock({ statusCode: 200 }),
                ],
            },
            routerProvider: { route: '/submissions/new/eqro' },
            location: (location) => (testLocation = location),
        }
    )

    await waitFor(() => {
        expect(testLocation.pathname).toBe(
            generatePath(RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM, {
                contractSubmissionType: 'eqro',
            })
        )
    })

    const textarea = screen.getByRole('textbox', {
        name: 'Submission description',
    })

    // Text that exceeds limit to trigger error
    const tooLongText = 'a'.repeat(1501)
    await userEvent.click(textarea)
    await userEvent.paste(tooLongText)

    // Click Continue to trigger validation
    await userEvent.click(
        screen.getByRole('button', {
            name: 'Continue',
        })
    )

    // Expect error in summary and above text area
    await waitFor(() => {
        expect(
            screen.queryAllByText(
                'The submission description must be 1500 characters or less.'
            )
        ).toHaveLength(2)
    })

    // Reduce text to not exceed threshhold
    await userEvent.click(textarea)
    await userEvent.keyboard('{Backspace}')

    // Expect error to disappear
    await waitFor(() => {
        expect(
            screen.queryByText(
                'The submission description must be 1500 characters or less.'
            )
        ).not.toBeInTheDocument()
    })
})

it('shows validation warning when user exceeds character count', async () => {
    let testLocation: Location
    renderWithProviders(
        <Routes>
            <Route
                element={<EQROSubmissionDetails />}
                path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
            />
        </Routes>,
        {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    fetchCurrentUserMock({ statusCode: 200 }),
                ],
            },
            routerProvider: { route: '/submissions/new/eqro' },
            location: (location) => (testLocation = location),
        }
    )

    await waitFor(() => {
        expect(testLocation.pathname).toBe(
            generatePath(RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM, {
                contractSubmissionType: 'eqro',
            })
        )
    })

    const textarea = screen.getByRole('textbox', {
        name: 'Submission description',
    })

    // Text that exceeds limit to trigger error
    const tooLongText = 'a'.repeat(1501)
    await userEvent.click(textarea)
    await userEvent.paste(tooLongText)

    // Expect counter to display error message
    await waitFor(() => {
        expect(screen.queryAllByText('1 character over limit')).toHaveLength(1)
        expect(screen.getByTestId('characterCountMessage')).toHaveClass(
            'usa-character-count__message--invalid'
        )
    })

    // Reduce text to not exceed threshhold
    await userEvent.click(textarea)
    await userEvent.keyboard('{Backspace}')

    // Expect error to disappear
    await waitFor(() => {
        expect(screen.queryAllByText('1 character over limit')).toHaveLength(0)
        expect(screen.getByTestId('characterCountMessage')).not.toHaveClass(
            'usa-character-count__message--invalid'
        )
    })
})

it('displays generic error banner when creating EQRO submission fails', async () => {
    let testLocation: Location
    renderWithProviders(
        <Routes>
            <Route
                element={<EQROSubmissionDetails />}
                path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
            />
        </Routes>,
        {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    fetchCurrentUserMock({ statusCode: 200 }),
                    createContractMockFail({}),
                ],
            },
            routerProvider: { route: '/submissions/new/eqro' },
            location: (location) => (testLocation = location),
        }
    )

    await waitFor(() => {
        expect(testLocation.pathname).toBe(
            generatePath(RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM, {
                contractSubmissionType: 'eqro',
            })
        )
    })

    const medicaid = await screen.findByText('Medicaid')
    await userEvent.click(medicaid)

    const comboBox = await screen.findByRole('combobox', {
        name: 'Programs reviewed by this EQRO (required)',
    })
    await userEvent.click(comboBox)

    const program = await screen.findByText('PMAP')
    await userEvent.click(program)

    const contractType = await screen.findByText('Base contract')
    await userEvent.click(contractType)

    const textarea = await screen.findByRole('textbox', {
        name: 'Submission description',
    })
    await userEvent.type(textarea, 'A submitted submission')

    const managedCareEntity = await screen.findByRole('checkbox', {
        name: 'Managed Care Organization (MCO)',
    })
    await userEvent.click(managedCareEntity)

    const continueButton = await screen.findByRole('button', {
        name: 'Continue',
    })
    await userEvent.click(continueButton)

    await waitFor(() => {
        expect(screen.getAllByText('System error')).toHaveLength(1)
    })
})
