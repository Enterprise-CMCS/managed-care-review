import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { RoutesRecord } from '@mc-review/constants'
import {
    fetchCurrentUserMock,
    fetchStateHealthPlanPackageWithQuestionsMockSuccess,
    iterableCmsUsersMockData,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { MccrsId } from './MccrsId'
import { mockSubmittedHealthPlanPackage } from '@mc-review/mocks'

describe('MCCRSID', () => {
    afterEach(() => {
        vi.resetAllMocks()
    })

    describe.each(iterableCmsUsersMockData)(
        '$userRole MCCRSID tests',
        ({ userRole, mockUser }) => {
            it('renders without errors', async () => {
                renderWithProviders(
                    <Routes>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_MCCRSID}
                            element={<MccrsId />}
                        />
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                    {
                                        id: '15',
                                    }
                                ),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/15/mccrs-record-number',
                        },
                    }
                )

                expect(
                    await screen.findByRole('heading', {
                        name: 'MC-CRS record number',
                    })
                ).toBeInTheDocument()
                expect(
                    screen.getByRole('button', { name: 'Save MC-CRS number' })
                ).not.toHaveAttribute('aria-disabled')
            })

            it('displays the text field for mccrs id', async () => {
                renderWithProviders(
                    <Routes>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_MCCRSID}
                            element={<MccrsId />}
                        />
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                    {
                                        id: '15',
                                    }
                                ),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/15/mccrs-record-number',
                        },
                    }
                )

                expect(
                    await screen.findByTestId('textInput')
                ).toBeInTheDocument()
            })

            it('cannot continue with MCCRS ID with non number input', async () => {
                renderWithProviders(
                    <Routes>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_MCCRSID}
                            element={<MccrsId />}
                        />
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                    {
                                        id: '15',
                                    }
                                ),
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
                    expect(
                        screen.getAllByText('You must enter a number')
                    ).toHaveLength(1)
                    expect(continueButton).toHaveAttribute(
                        'aria-disabled',
                        'true'
                    )
                })
            })

            it('edit - prepopulates the mccrs id when a submission has one', async () => {
                renderWithProviders(
                    <Routes>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_MCCRSID}
                            element={<MccrsId />}
                        />
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({
                                    user: mockUser(),
                                    statusCode: 200,
                                }),
                                fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                    {
                                        id: '15',
                                        stateSubmission: {
                                            ...mockSubmittedHealthPlanPackage(),
                                            mccrsID: '3333',
                                        },
                                    }
                                ),
                            ],
                        },
                        routerProvider: {
                            route: '/submissions/15/mccrs-record-number',
                        },
                    }
                )

                await waitFor(() => {
                    expect(screen.getByDisplayValue('3333')).toBeInTheDocument()
                })
            })
        }
    )
})
