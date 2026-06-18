import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { AdminUploadContractQuestions } from '../../QuestionResponse'
import { renderWithProviders } from '../../../testHelpers'
import { RoutesRecord } from '@mc-review/constants'
import {
    fetchCurrentUserMock,
    fetchContractWithQuestionsMockSuccess,
    indexUsersQueryMock,
    mockContractPackageSubmittedWithQuestions,
    mockValidAdminUser,
    mockValidCMSUser,
} from '@mc-review/mocks'

const cmsUserWithDivision = mockValidCMSUser({
    id: 'cms-1',
    givenName: 'Anna',
    familyName: 'Analyst',
    email: 'anna.analyst@example.com',
    divisionAssignment: 'OACT',
})
const cmsUserNoDivision = mockValidCMSUser({
    id: 'cms-2',
    givenName: 'Nora',
    familyName: 'NoDivision',
    email: 'nora.nodivision@example.com',
    divisionAssignment: null,
})

const renderAdminUploadQuestions = (options?: {
    featureFlags?: Record<string, boolean>
}) => {
    const contract = mockContractPackageSubmittedWithQuestions()
    return renderWithProviders(
        <Routes>
            <Route
                path={RoutesRecord.SUBMISSIONS_ADMIN_UPLOAD_CONTRACT_QUESTION}
                element={<AdminUploadContractQuestions />}
            />
        </Routes>,
        {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidAdminUser({
                            givenName: 'Adam',
                            familyName: 'Admin',
                            email: 'adam.admin@example.com',
                        }),
                        statusCode: 200,
                    }),
                    fetchContractWithQuestionsMockSuccess({
                        contract: {
                            ...contract,
                            id: '15',
                            contractSubmissionType: 'HEALTH_PLAN',
                        },
                    }),
                    indexUsersQueryMock([
                        cmsUserWithDivision,
                        cmsUserNoDivision,
                    ]),
                ],
            },
            routerProvider: {
                route: `/submissions/health-plan/15/question-and-answers/admin-upload-questions`,
            },
            featureFlags: options?.featureFlags,
        }
    )
}

describe('AdminUploadContractQuestions', () => {
    it('offers an "ask on behalf of" picker with "Myself (admin)" when the flag is on, but does not pre-select', async () => {
        const user = userEvent.setup()
        renderAdminUploadQuestions({
            featureFlags: { 'admin-only-qa-rounds': true },
        })

        // Nothing is pre-selected; the admin info section is not shown
        const onBehalfOf = await screen.findByRole('combobox', {
            name: 'Ask on behalf of',
        })
        expect(
            screen.queryByTestId('selected-user-info')
        ).not.toBeInTheDocument()

        // Opening the menu shows "Myself (admin)" and CMS users
        await user.click(onBehalfOf)
        expect(await screen.findByText('Myself (admin)')).toBeInTheDocument()
        expect(
            await screen.findByText(/anna\.analyst@example\.com/)
        ).toBeInTheDocument()
    })

    it("locks the division to the selected CMS user's division", async () => {
        const user = userEvent.setup()
        renderAdminUploadQuestions()

        const onBehalfOf = await screen.findByRole('combobox', {
            name: 'Ask on behalf of',
        })
        await user.click(onBehalfOf)
        await user.click(await screen.findByText(/anna\.analyst@example\.com/))

        await waitFor(() => {
            // The manual division dropdown is replaced by the locked division
            expect(
                screen.queryByRole('combobox', { name: 'Division' })
            ).not.toBeInTheDocument()
        })
        expect(
            screen.getByText('Office of the Actuary (OACT)')
        ).toBeInTheDocument()
    })

    it('requires a reason before submitting', async () => {
        const user = userEvent.setup()
        renderAdminUploadQuestions()

        expect(await screen.findByLabelText('Reason')).toBeInTheDocument()

        const submit = await screen.findByRole('button', {
            name: 'Add questions',
        })
        await user.click(submit)

        expect(
            (await screen.findAllByText('You must provide a reason')).length
        ).toBeGreaterThan(0)

        // Error summary links point to (and can focus) the matching fields.
        const reasonLink = screen.getByRole('link', {
            name: 'You must provide a reason',
        })
        expect(reasonLink).toHaveAttribute('href', '#reason')
        expect(document.getElementById('reason')).toBeInTheDocument()

        const divisionLink = screen.getByRole('link', {
            name: 'You must select a division',
        })
        expect(divisionLink).toHaveAttribute('href', '#division-select')
        expect(document.getElementById('division-select')).toBeInTheDocument()

        // Errors are listed in page order: division before reason.
        const summaryMessages = screen
            .getAllByTestId('error-summary-message')
            .map((el) => el.textContent)
        expect(
            summaryMessages.indexOf('You must select a division')
        ).toBeLessThan(summaryMessages.indexOf('You must provide a reason'))
    })

    it('offers an optional question date field that disallows future dates', async () => {
        renderAdminUploadQuestions()

        expect(await screen.findByText('Question date')).toBeInTheDocument()
        expect(screen.getByText(/Cannot be a future date/)).toBeInTheDocument()
    })

    it('displays the admin\'s own info after explicitly selecting "Myself (admin)"', async () => {
        const user = userEvent.setup()
        renderAdminUploadQuestions({
            featureFlags: { 'admin-only-qa-rounds': true },
        })

        const onBehalfOf = await screen.findByRole('combobox', {
            name: 'Ask on behalf of',
        })
        await user.click(onBehalfOf)
        await user.click(await screen.findByText('Myself (admin)'))

        const info = await screen.findByTestId('selected-user-info')
        expect(info).toHaveTextContent('Adam Admin')
        expect(info).toHaveTextContent('adam.admin@example.com')
        expect(info).toHaveTextContent('Admin')
    })

    it("displays the selected CMS user's details below the dropdown", async () => {
        const user = userEvent.setup()
        renderAdminUploadQuestions()

        const onBehalfOf = await screen.findByRole('combobox', {
            name: 'Ask on behalf of',
        })
        await user.click(onBehalfOf)
        await user.click(await screen.findByText(/anna\.analyst@example\.com/))

        const info = await screen.findByTestId('selected-user-info')
        expect(info).toHaveTextContent('Anna Analyst')
        expect(info).toHaveTextContent('anna.analyst@example.com')
        expect(info).toHaveTextContent('CMS User')
        expect(info).toHaveTextContent('OACT')
    })

    it('lets the admin pick a division when the selected CMS user has none', async () => {
        const user = userEvent.setup()
        renderAdminUploadQuestions()

        const onBehalfOf = await screen.findByRole('combobox', {
            name: 'Ask on behalf of',
        })
        await user.click(onBehalfOf)
        await user.click(
            await screen.findByText(/nora\.nodivision@example\.com/)
        )

        // The division dropdown remains available for the admin to choose
        await waitFor(() => {
            expect(
                screen.getByRole('combobox', { name: 'Division' })
            ).toBeInTheDocument()
        })
    })
})
