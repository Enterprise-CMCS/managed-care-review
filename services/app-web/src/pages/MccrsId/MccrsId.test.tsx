import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { RoutesRecord } from '../../constants/routes'
import {
    fetchCurrentUserMock,
    fetchStateHealthPlanPackageWithQuestionsMockSuccess,
    mockValidCMSUser,
} from '../../testHelpers/apolloMocks'
import {
    ldUseClientSpy,
    renderWithProviders,
} from '../../testHelpers/jestHelpers'
import { MccrsId } from './MccrsId'

describe('MCCRSID', () => {
    beforeEach(() => {
        ldUseClientSpy({ 'mccrs-record-number': true })
    })
    afterEach(() => {
        jest.resetAllMocks()
    })

    it('renders without errors', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_MCCRSID}
                        element={<MccrsId />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/mccrs-record-number',
                },
            }
        )

        expect(
            await screen.findByRole('heading', { name: 'MC-CRS record number' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Save MC-CRS number' })
        ).not.toHaveAttribute('aria-disabled')
    })

    it('displays the text field for mccrs id', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_MCCRSID}
                        element={<MccrsId />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/mccrs-record-number',
                },
            }
        )

        expect(await screen.findByTestId('textInput')).toBeInTheDocument()
    })

    it('cannot continue without providing a MCCRS ID', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_MCCRSID}
                        element={<MccrsId />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/mccrs-record-number',
                },
            }
        )
        const continueButton = await screen.findByRole('button', {
            name: 'Save MC-CRS number',
        })
        continueButton.click()
        await waitFor(() => {
            expect(
                screen.getAllByText(
                    'You must enter a record number or delete this field.'
                )
            ).toHaveLength(1)
            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })
    })

    it('cannot continue with MCCRS ID less than 4 digits', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_MCCRSID}
                        element={<MccrsId />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/mccrs-record-number',
                },
            }
        )

        const input = await screen.findByTestId('textInput')
        input.focus()

        await userEvent.paste('123')
        const continueButton = screen.getByRole('button', {
            name: 'Save MC-CRS number',
        })
        continueButton.click()
        await waitFor(() => {
            expect(
                screen.getAllByText('You must enter no more than 4 characters')
            ).toHaveLength(1)
            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })
    })

    it('cannot continue with MCCRS ID more than 4 digits', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_MCCRSID}
                        element={<MccrsId />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/mccrs-record-number',
                },
            }
        )

        const input = await screen.findByTestId('textInput')
        input.focus()

        await userEvent.paste('12345')
        const continueButton = screen.getByRole('button', {
            name: 'Save MC-CRS number',
        })
        continueButton.click()
        await waitFor(() => {
            expect(
                screen.getAllByText('You must enter no more than 4 characters')
            ).toHaveLength(1)
            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })
    })

    it('cannot continue with MCCRS ID with non number input', async () => {
        renderWithProviders(
            <Routes>
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_MCCRSID}
                        element={<MccrsId />}
                    />
                </Route>
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageWithQuestionsMockSuccess({
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15/mccrs-record-number',
                },
            }
        )

        const input = await screen.findByTestId('textInput')
        input.focus()

        await userEvent.paste('123a')
        const continueButton = screen.getByRole('button', {
            name: 'Save MC-CRS number',
        })
        continueButton.click()
        await waitFor(() => {
            expect(screen.getAllByText('You must enter a number')).toHaveLength(
                1
            )
            expect(continueButton).toHaveAttribute('aria-disabled', 'true')
        })
    })
})
