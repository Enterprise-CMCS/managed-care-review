import { screen, waitFor } from '@testing-library/react'
import { RateDetailsV2 } from './RateDetailsV2'
import {
    TEST_DOC_FILE,
    TEST_PNG_FILE,
    dragAndDrop,
    renderWithProviders,
} from '../../../../testHelpers'
import {
    fetchCurrentUserMock,
    fetchContractMockSuccess,
    updateDraftContractRatesMockSuccess,
} from '../../../../testHelpers/apolloMocks'
import { Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '../../../../constants'
import userEvent from '@testing-library/user-event'
import { rateRevisionDataMock } from '../../../../testHelpers/apolloMocks/rateDataMock'
import { fetchDraftRateMockSuccess } from '../../../../testHelpers/apolloMocks/rateGQLMocks'
import {
    clickAddNewRate,
    fillOutFirstRate,
    rateCertifications,
    clickRemoveIndexRate,
    fillOutIndexRate,
} from '../../../../testHelpers/jestRateHelpers'

describe('RateDetailsv2', () => {
    /* eslint-disable jest/no-disabled-tests, jest/expect-expect */
    describe.skip('handles edit  of a single rate', () => {
        it('renders without errors', async () => {
            const rateID = 'test-abc-123'
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.RATE_EDIT}
                        element={<RateDetailsV2 type="SINGLE" />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftRateMockSuccess({ id: rateID }),
                        ],
                    },
                    routerProvider: {
                        route: `/rates/${rateID}/edit`,
                    },
                }
            )

            await screen.findByText('Rate Details')
            await screen.findByText(/Rate certification/)
            await screen.findByText('Upload one rate certification document')

            expect(
                screen.getByRole('button', { name: 'Submit' })
            ).not.toHaveAttribute('aria-disabled')
            const requiredLabels = await screen.findAllByText('Required')
            expect(requiredLabels).toHaveLength(7)
            const optionalLabels = screen.queryAllByText('Optional')
            expect(optionalLabels).toHaveLength(1)
        })

        describe('submit', () => {
            it('enabled on initial load but disabled with alert if valid rate cert file replaced with invalid file', async () => {
                const rateID = 'abc-123'
                renderWithProviders(
                    <Routes>
                        <Route
                            path={RoutesRecord.RATE_EDIT}
                            element={<RateDetailsV2 type="SINGLE" />}
                        />
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({ statusCode: 200 }),
                                fetchDraftRateMockSuccess({ id: rateID }),
                            ],
                        },
                        routerProvider: {
                            route: `/rates/${rateID}/edit`,
                        },
                    }
                )
                await screen.findByText('Rate certification')

                const input = screen.getByLabelText(
                    'Upload one rate certification document'
                )
                const targetEl = screen.getAllByTestId(
                    'file-input-droptarget'
                )[0]

                await userEvent.upload(input, [TEST_DOC_FILE])
                dragAndDrop(targetEl, [TEST_PNG_FILE])

                await waitFor(() => {
                    const submitButton = screen.getByRole('button', {
                        name: 'Submit',
                    })
                    expect(
                        screen.getByText('This is not a valid file type.')
                    ).toBeInTheDocument()
                    expect(submitButton).not.toHaveAttribute('aria-disabled')
                })
            })
            // eslint-disable-next-line
            it.skip('disabled with alert if previously submitted with more than one rate cert file', async () => {
                const rateID = 'abc-123'
                renderWithProviders(
                    <Routes>
                        <Route
                            path={RoutesRecord.RATE_EDIT}
                            element={<RateDetailsV2 type="SINGLE" />}
                        />
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({ statusCode: 200 }),
                                fetchDraftRateMockSuccess({
                                    id: rateID,
                                    draftRevision: {
                                        ...rateRevisionDataMock(),
                                        formData: {
                                            ...rateRevisionDataMock().formData,
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
                                        },
                                    },
                                }),
                            ],
                        },
                        routerProvider: {
                            route: `/rates/${rateID}/edit`,
                        },
                    }
                )

                await screen.findByText('Rate certification')
                const submitButton = screen.getByRole('button', {
                    name: 'Submit',
                })
                expect(submitButton).not.toHaveAttribute('aria-disabled')

                submitButton.click()

                await waitFor(() => {
                    expect(
                        screen.getAllByText(
                            'Only one document is allowed for a rate certification. You must remove documents before continuing.'
                        )
                    ).toHaveLength(2)

                    expect(submitButton).toHaveAttribute(
                        'aria-disabled',
                        'true'
                    )
                })
            })

            it.todo(
                'disabled with alert after first attempt to continue with invalid rate doc file'
            )
            it.todo(
                'disabled with alert when trying to continue while a file is still uploading'
            )
        })

        describe('Save as draft button', () => {
            it.todo('saves documents that were uploaded')
            it.todo('does not trigger form validations')
            it.todo('trigger duplicate file validations')
        })

        describe('Back button', () => {
            it.todo('saves documents that were uploaded')
            it.todo('does not trigger form validations')
            it.todo('does not trigger duplicate file validations')
        })
    })

    describe('handles editing multiple rates', () => {
        it('renders linked rates without errors', async () => {
            const rateID = 'test-abc-123'
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_RATE_DETAILS}
                        element={<RateDetailsV2 type="MULTI" />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftRateMockSuccess({ id: rateID }),
                            fetchContractMockSuccess({
                                contract: {
                                    id: 'test-abc-123',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/test-abc-123/edit/rate-details`,
                    },
                    featureFlags: {
                        'link-rates': true,
                        'rate-edit-unlock': false,
                    },
                }
            )

            await screen.findByText('Rate Details')
            expect(
                screen.getByText(
                    'Was this rate certification included with another submission?'
                )
            ).toBeInTheDocument()
            expect(
                screen.queryByText('Upload one rate certification document')
            ).not.toBeInTheDocument()
        })

        it('add rate button will increase number of rate certification fields on the', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_RATE_DETAILS}
                        element={<RateDetailsV2 type="MULTI" />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftRateMockSuccess(),
                            fetchContractMockSuccess({
                                contract: {
                                    id: 'test-abc-123',
                                },
                            }),
                            updateDraftContractRatesMockSuccess({
                                contract: {
                                    id: 'test-abc-123',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/test-abc-123/edit/rate-details`,
                    },
                    featureFlags: {
                        'link-rates': true,
                        'rate-edit-unlock': false,
                    },
                }
            )

            await screen.findByText('Rate Details')
            const rateCertsOnLoad = rateCertifications(screen)
            expect(rateCertsOnLoad).toHaveLength(1)
            await fillOutFirstRate(screen)

            await clickAddNewRate(screen)

            await waitFor(() => {
                const rateCertsAfterAddAnother = rateCertifications(screen)
                expect(rateCertsAfterAddAnother).toHaveLength(2)
            })
        })

        it('display rest of the form when linked rates question is answered', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_RATE_DETAILS}
                        element={<RateDetailsV2 type="MULTI" />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftRateMockSuccess(),
                            fetchContractMockSuccess({
                                contract: {
                                    id: 'test-abc-123',
                                },
                            }),
                            updateDraftContractRatesMockSuccess({
                                contract: {
                                    id: 'test-abc-123',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/test-abc-123/edit/rate-details`,
                    },
                    featureFlags: {
                        'link-rates': true,
                        'rate-edit-unlock': false,
                    },
                }
            )
            await screen.findByText('Rate Details')

            await userEvent.click(
                screen.getByLabelText(
                    'No, this rate certification was not included with any other submissions'
                )
            )
            const input = screen.getByLabelText(
                'Upload one rate certification document'
            )
            await expect(input).toBeInTheDocument()
            const submitButton = screen.getByRole('button', {
                name: 'Continue',
            })

            // trigger validations
            await submitButton.click()
            await waitFor(() => {
                expect(
                    screen.getByText('Rate certification 1')
                ).toBeInTheDocument()
                expect(submitButton).toHaveAttribute('aria-disabled', 'true')
                expect(
                    screen.getByText('There are 8 errors on this page')
                ).toBeInTheDocument()
            })
        })

        it('renders remove rate certification button, which removes set of rate certification fields from the form', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_RATE_DETAILS}
                        element={<RateDetailsV2 type="MULTI" />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftRateMockSuccess(),
                            fetchContractMockSuccess({
                                contract: {
                                    id: 'test-abc-123',
                                },
                            }),
                            updateDraftContractRatesMockSuccess({
                                contract: {
                                    id: 'test-abc-123',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/test-abc-123/edit/rate-details`,
                    },
                    featureFlags: {
                        'link-rates': true,
                        'rate-edit-unlock': false,
                    },
                }
            )

            await screen.findByText('Rate Details')
            const rateCertsOnLoad = rateCertifications(screen)
            expect(rateCertsOnLoad).toHaveLength(1)
            await fillOutFirstRate(screen)

            await clickAddNewRate(screen)
            await fillOutIndexRate(screen, 1)
            await clickRemoveIndexRate(screen, 1)

            await waitFor(() => {
                const rateCertsAfterAddAnother = rateCertifications(screen)
                expect(rateCertsAfterAddAnother).toHaveLength(1)
            })
        })

        it('accepts documents on second rate', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_RATE_DETAILS}
                        element={<RateDetailsV2 type="MULTI" />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftRateMockSuccess(),
                            fetchContractMockSuccess({
                                contract: {
                                    id: 'test-abc-123',
                                },
                            }),
                            updateDraftContractRatesMockSuccess({
                                contract: {
                                    id: 'test-abc-123',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/test-abc-123/edit/rate-details`,
                    },
                    featureFlags: {
                        'link-rates': true,
                        'rate-edit-unlock': false,
                    },
                }
            )

            await screen.findByText('Rate Details')
            const rateCertsOnLoad = rateCertifications(screen)
            expect(rateCertsOnLoad).toHaveLength(1)
            await fillOutIndexRate(screen, 0)

            await clickAddNewRate(screen)
            await fillOutIndexRate(screen, 1)

            await waitFor(() => {
                expect(screen.getAllByText(/1 complete/)).toHaveLength(2)
            })
        })
        it('cannot continue with partially filled out second rate', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_RATE_DETAILS}
                        element={<RateDetailsV2 type="MULTI" />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftRateMockSuccess(),
                            fetchContractMockSuccess({
                                contract: {
                                    id: 'test-abc-123',
                                },
                            }),
                            updateDraftContractRatesMockSuccess({
                                contract: {
                                    id: 'test-abc-123',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/test-abc-123/edit/rate-details`,
                    },
                    featureFlags: {
                        'link-rates': true,
                        'rate-edit-unlock': false,
                    },
                }
            )

            await screen.findByText('Rate Details')
            const rateCertsOnLoad = rateCertifications(screen)
            expect(rateCertsOnLoad).toHaveLength(1)
            await fillOutIndexRate(screen, 0)

            await clickAddNewRate(screen)
            const submitButton = screen.getByRole('button', {
                name: 'Continue',
            })

            // trigger validations
            await submitButton.click()
            await waitFor(() => {
                expect(
                    screen.getByText('Rate certification 1')
                ).toBeInTheDocument()
                expect(submitButton).toHaveAttribute('aria-disabled', 'true')
                expect(
                    screen.getByText('There is 1 error on this page')
                ).toBeInTheDocument()
                expect(
                    screen.getByText('You must select yes or no')
                ).toBeInTheDocument()
            })
        })
    })
})
