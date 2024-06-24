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
    mockContractWithLinkedRateDraft,
} from '../../../../testHelpers/apolloMocks'
import { Route, Routes, Location } from 'react-router-dom'
import { RoutesRecord } from '../../../../constants'
import userEvent from '@testing-library/user-event'
import {
    rateDataMock,
    rateRevisionDataMock,
} from '../../../../testHelpers/apolloMocks/rateDataMock'
import {
    fetchDraftRateMockSuccess,
    indexRatesMockSuccess,
} from '../../../../testHelpers/apolloMocks/rateGQLMocks'
import {
    clickAddNewRate,
    fillOutFirstRate,
    rateCertifications,
    clickRemoveIndexRate,
    fillOutIndexRate,
} from '../../../../testHelpers/jestRateHelpers'
import { Rate } from '../../../../gen/gqlClient'

describe('RateDetailsV2', () => {
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
            it('disabled with alert if previously submitted with more than one rate cert file', async () => {
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
                                                    dateAdded: new Date(),
                                                },
                                                {
                                                    s3URL: 's3://bucketname/one-two/one-two.png',
                                                    name: 'one two',
                                                    sha256: 'fakeSha2',
                                                    dateAdded: new Date(),
                                                },
                                                {
                                                    s3URL: 's3://bucketname/one-three/one-three.png',
                                                    name: 'one three',
                                                    sha256: 'fakeSha3',
                                                    dateAdded: new Date(),
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
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractWithLinkedRateDraft(),
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

        it('add rate button will increase number of rate certification fields', async () => {
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

        it('display rest of the form when linked rates question is answered with NO', async () => {
            const { user } = renderWithProviders(
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
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractWithLinkedRateDraft(),
                                    id: 'test-abc-123',
                                    // clean draft rates for this test.
                                    draftRates: [],
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
            expect(input).toBeInTheDocument()
            const submitButton = screen.getByRole('button', {
                name: 'Continue',
            })

            // trigger validations
            await user.click(submitButton)
            await waitFor(() => {
                expect(
                    screen.getByText('Rate certification 1')
                ).toBeInTheDocument()
                expect(submitButton).toHaveAttribute('aria-disabled', 'true')
                expect(
                    screen.getByText('There are 9 errors on this page')
                ).toBeInTheDocument()
            })
        })

        it('validate form when the linked rate question is answered as YES', async () => {
            const { user } = renderWithProviders(
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
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractWithLinkedRateDraft(),
                                    id: 'test-abc-123',
                                    // clean draft rates for this test.
                                    draftRates: [],
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
                    'Yes, this rate certification is part of another submission'
                )
            )

            const submitButton = screen.getByRole('button', {
                name: 'Continue',
            })

            // trigger validations
            await user.click(submitButton)
            await waitFor(() => {
                expect(
                    screen.getByText('Rate certification 1')
                ).toBeInTheDocument()
                expect(submitButton).toHaveAttribute('aria-disabled', 'true')
                expect(
                    screen.getByText('There is 1 error on this page')
                ).toBeInTheDocument()
                expect(
                    screen.getAllByText('You must select a rate certification')
                ).toHaveLength(2)
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
        }, 10000)

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
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractWithLinkedRateDraft(),
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
        }, 10000)
        it('cannot continue with partially filled out second rate', async () => {
            const { user } = renderWithProviders(
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
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractWithLinkedRateDraft(),
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

            await clickAddNewRate(screen)
            const submitButton = screen.getByRole('button', {
                name: 'Continue',
            })

            // trigger validations
            await user.click(submitButton)
            await waitFor(() => {
                expect(
                    screen.getByText('Rate certification 1')
                ).toBeInTheDocument()
                expect(submitButton).toHaveAttribute('aria-disabled', 'true')
                expect(
                    screen.getByText('There is 1 error on this page')
                ).toBeInTheDocument()
                expect(
                    screen.getAllByText('You must select yes or no')
                ).toHaveLength(2)
            })
        })

        it('save as draft with partial data without error', async () => {
            let testLocation: Location // set up location to track URL changes
            const { user } = renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_RATE_DETAILS}
                        element={<RateDetailsV2 type="MULTI" />}
                    />
                    <Route
                        path={RoutesRecord.DASHBOARD_SUBMISSIONS}
                        element={<div>Dashboard page placeholder</div>}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractWithLinkedRateDraft({
                                        draftRates: [
                                            rateDataMock(
                                                {
                                                    formData: {
                                                        ...rateRevisionDataMock()
                                                            .formData,
                                                        rateCapitationType:
                                                            undefined,
                                                        rateType: undefined,
                                                    },
                                                },
                                                { id: 'test-abc-123' }
                                            ),
                                        ],
                                    }),
                                },
                            }),
                            updateDraftContractRatesMockSuccess({
                                contract: {
                                    ...mockContractWithLinkedRateDraft({
                                        draftRates: [
                                            rateDataMock(
                                                {
                                                    formData: {
                                                        ...rateRevisionDataMock()
                                                            .formData,
                                                        rateCapitationType:
                                                            undefined,
                                                        rateType: undefined,
                                                    },
                                                },
                                                { id: 'test-abc-123' }
                                            ),
                                        ],
                                    }),
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
                    location: (location) => (testLocation = location),
                }
            )
            await screen.findByText('Rate Details')

            await userEvent.click(
                screen.getByLabelText(
                    'No, this rate certification was not included with any other submissions'
                )
            )

            const saveButton = screen.getByRole('button', {
                name: 'Save as draft',
            })

            await user.click(saveButton)
            await waitFor(() => {
                expect(testLocation.pathname).toBe(`/dashboard/submissions`)
                expect(
                    screen.getByText('Dashboard page placeholder')
                ).toBeInTheDocument()
            })
        })
    })

    describe('can link existing rate', () => {
        it('does not display dropdown menu if no is selected', async () => {
            const { user } = renderWithProviders(
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
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractWithLinkedRateDraft(),
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

            //Making sure page loads
            await screen.findByText('Rate Details')
            expect(
                screen.getByText(
                    'Was this rate certification included with another submission?'
                )
            ).toBeInTheDocument()

            //Click the no button and assert the dropdown does not appear
            const noRadioButton = screen.getByLabelText(
                'No, this rate certification was not included with any other submissions'
            )
            await user.click(noRadioButton)
            await waitFor(() => {
                expect(
                    screen.queryByText('Which rate certification was it?')
                ).not.toBeInTheDocument()
            })
        })

        it('displays dropdown menu if yes is selected and dropdown is clicked', async () => {
            const { user } = renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_RATE_DETAILS}
                        element={<RateDetailsV2 type="MULTI" />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            indexRatesMockSuccess(),
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractWithLinkedRateDraft({
                                        draftRates: [
                                            rateDataMock(
                                                {
                                                    formData: {
                                                        ...rateRevisionDataMock()
                                                            .formData,
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
                                                { id: 'test-abc-123' }
                                            ),
                                        ],
                                    }),
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

            //Making sure page loads
            await screen.findByText('Rate Details')
            expect(
                screen.getByText(
                    'Was this rate certification included with another submission?'
                )
            ).toBeInTheDocument()

            //Click the yes button and assert it's clickable and checked
            const yesRadioButton = screen.getByRole('radio', {
                name: 'Yes, this rate certification is part of another submission',
            })
            expect(yesRadioButton).toBeInTheDocument()
            await user.click(yesRadioButton)
            expect(yesRadioButton).toBeChecked()

            // Assert the dropdown has rendered
            await waitFor(() => {
                expect(
                    screen.getByText('Which rate certification was it?')
                ).toBeInTheDocument()
                expect(screen.getByRole('combobox')).toBeInTheDocument()
            })

            // Assert the options menu is open when clicked
            const dropdown = screen.getByRole('combobox')
            expect(dropdown).toBeInTheDocument()
            await user.click(dropdown)
            const dropdownMenu = screen.getByRole('listbox')
            expect(dropdownMenu).toBeInTheDocument()

            // Assert options are present
            const dropdownOptions = screen.getAllByRole('option')
            expect(dropdownOptions).toHaveLength(3)
        })

        it('lists dropdown options in desc order by latest submission date', async () => {
            const rates: Rate[] = [
                {
                    ...rateDataMock(),
                    id: 'test-id-123',
                    stateNumber: 1,
                    revisions: [
                        {
                            ...rateRevisionDataMock(),
                            submitInfo: {
                                __typename: 'UpdateInformation',
                                updatedAt: new Date('2022-04-10'),
                                updatedBy: 'aang@example.com',
                                updatedReason: 'Resubmit',
                            },
                            formData: {
                                ...rateRevisionDataMock().formData,
                                rateCertificationName: 'Third-Position-Rate',
                            },
                        },
                    ],
                },
                {
                    ...rateDataMock(),
                    id: 'test-id-124',
                    stateNumber: 2,
                    revisions: [
                        {
                            ...rateRevisionDataMock(),
                            submitInfo: {
                                __typename: 'UpdateInformation',
                                updatedAt: new Date('2024-04-10'),
                                updatedBy: 'aang@example.com',
                                updatedReason: 'Resubmit',
                            },
                            formData: {
                                ...rateRevisionDataMock().formData,
                                rateCertificationName: 'First-Position-Rate',
                            },
                        },
                    ],
                },
                {
                    ...rateDataMock(),
                    id: 'test-id-125',
                    stateNumber: 3,
                    revisions: [
                        {
                            ...rateRevisionDataMock(),
                            submitInfo: {
                                __typename: 'UpdateInformation',
                                updatedAt: new Date('2024-04-08'),
                                updatedBy: 'aang@example.com',
                                updatedReason: 'Resubmit',
                            },
                            formData: {
                                ...rateRevisionDataMock().formData,
                                rateCertificationName: 'Second-Position-Rate',
                            },
                        },
                    ],
                },
            ]

            const { user } = renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_RATE_DETAILS}
                        element={<RateDetailsV2 type="MULTI" />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            indexRatesMockSuccess(rates),
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: mockContractWithLinkedRateDraft(),
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

            //Making sure page loads
            await screen.findByText('Rate Details')
            expect(
                screen.getByText(
                    'Was this rate certification included with another submission?'
                )
            ).toBeInTheDocument()

            //Click the yes button and assert it's clickable and checked
            const yesRadioButton = screen.getByRole('radio', {
                name: 'Yes, this rate certification is part of another submission',
            })
            expect(yesRadioButton).toBeInTheDocument()
            await user.click(yesRadioButton)
            expect(yesRadioButton).toBeChecked()

            // Assert the dropdown has rendered
            await waitFor(() => {
                expect(
                    screen.getByText('Which rate certification was it?')
                ).toBeInTheDocument()
                expect(screen.getByRole('combobox')).toBeInTheDocument()
            })

            // Assert the options menu is open when clicked
            const dropdown = screen.getByRole('combobox')
            expect(dropdown).toBeInTheDocument()
            await user.click(dropdown)
            const dropdownMenu = screen.getByRole('listbox')
            expect(dropdownMenu).toBeInTheDocument()

            // Assert options are present
            const dropdownOptions = screen.getAllByRole('option')
            expect(dropdownOptions).toHaveLength(3)

            expect(dropdownOptions[0]).toHaveTextContent('First-Position-Rate')
            expect(dropdownOptions[1]).toHaveTextContent('Second-Position-Rate')
            expect(dropdownOptions[2]).toHaveTextContent('Third-Position-Rate')
        })

        it('removes the selected option from the dropdown list', async () => {
            const rateID = 'test-abc-123'
            const { user } = renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_RATE_DETAILS}
                        element={<RateDetailsV2 type="MULTI" />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            indexRatesMockSuccess(),
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftRateMockSuccess({ id: rateID }),
                            fetchContractMockSuccess({
                                contract: {
                                    id: 'test-abc-123',
                                },
                            }),
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
                        route: `/submissions/test-abc-123/edit/rate-details`,
                    },
                    featureFlags: {
                        'link-rates': true,
                        'rate-edit-unlock': false,
                    },
                }
            )

            //Making sure page loads
            await screen.findByText('Rate Details')
            expect(
                screen.getByText(
                    'Was this rate certification included with another submission?'
                )
            ).toBeInTheDocument()

            //Click the yes button to trigger dropdown
            const yesRadioButton = screen.getByRole('radio', {
                name: 'Yes, this rate certification is part of another submission',
            })
            await user.click(yesRadioButton)

            // Assert that the selected value is removed from the list of options
            const dropdown = screen.getByRole('combobox')
            expect(dropdown).toBeInTheDocument()
            await user.click(dropdown)
            const option = screen
                .getByRole('listbox')
                .querySelector('#react-select-2-option-0')
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            await user.click(option!)

            await waitFor(() => {
                expect(screen.getByRole('listbox')).toBeInTheDocument()
                expect(option).not.toBeInTheDocument()
            })
        })

        it('returns the unselected option to the dropdown list', async () => {
            const rateID = 'test-abc-123'
            const { user } = renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_RATE_DETAILS}
                        element={<RateDetailsV2 type="MULTI" />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            indexRatesMockSuccess(),
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchDraftRateMockSuccess({ id: rateID }),
                            fetchContractMockSuccess({
                                contract: {
                                    id: 'test-abc-123',
                                },
                            }),
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
                        route: `/submissions/test-abc-123/edit/rate-details`,
                    },
                    featureFlags: {
                        'link-rates': true,
                        'rate-edit-unlock': false,
                    },
                }
            )

            //Making sure page loads
            await screen.findByText('Rate Details')
            expect(
                screen.getByText(
                    'Was this rate certification included with another submission?'
                )
            ).toBeInTheDocument()

            //Click the yes button to trigger dropdown
            const yesRadioButton = screen.getByRole('radio', {
                name: 'Yes, this rate certification is part of another submission',
            })
            await user.click(yesRadioButton)

            // Checking that the selected value is removed from the list of options
            const dropdown = screen.getByRole('combobox')
            expect(dropdown).toBeInTheDocument()
            await user.click(dropdown)
            const option = screen
                .getByRole('listbox')
                .querySelector('#react-select-2-option-0')
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            await user.click(option!)

            const clearSelectionButton = screen
                .getByRole('combobox')
                .querySelector('.select__clear-indicator')
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            await user.click(clearSelectionButton!)

            const open = screen
                .getByRole('combobox')
                .querySelector('.select__dropdown-indicator')
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            await user.click(open!)
            expect(screen.getByRole('listbox')).toBeInTheDocument()

            await waitFor(() => {
                const options = screen.getAllByRole('option')
                expect(options).toHaveLength(3)
            })
        })
    })

    describe('error summary displays as expected', () => {
        it('when rate previously submitted question is not answered', async () => {
            const contractID = 'test-abc-123'
            const { user } = renderWithProviders(
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
                            fetchContractMockSuccess({
                                contract: {
                                    id: contractID,
                                    draftRates: [], //clear out rates
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${contractID}/edit/rate-details`,
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

            // do nothing and try to continue to trigger validations
            await user.click(
                screen.getByRole('button', {
                    name: 'Continue',
                })
            )
            await screen.findByTestId('error-summary')

            // check that both inline and error summary validations appear for radio buttons being empty
            expect(
                screen.getAllByText('You must select yes or no')
            ).toHaveLength(2)

            // check that focus travels to radio buttons when clicking error in summary
            await user.click(
                screen.getByRole('link', {
                    name: 'You must select yes or no',
                })
            )

            expect(
                screen.getByLabelText(
                    'No, this rate certification was not included with any other submissions'
                )
            ).toHaveFocus()
        })

        it('when rate previously submitted question is answered with YES', async () => {
            const contractID = 'test-abc-123'
            const { user } = renderWithProviders(
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
                            fetchContractMockSuccess({
                                contract: {
                                    id: contractID,
                                    draftRates: [], //clear out rates
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${contractID}/edit/rate-details`,
                    },
                    featureFlags: {
                        'link-rates': true,
                        'rate-edit-unlock': false,
                    },
                }
            )

            await screen.findByText('Rate Details')

            // select yes and trigger validations
            await user.click(
                screen.getByRole('radio', {
                    name: 'Yes, this rate certification is part of another submission',
                })
            )
            await screen.findByText('Which rate certification was it?')
            await user.click(
                screen.getByRole('button', {
                    name: 'Continue',
                })
            )

            // check that both inline and error summary validations appear for dropdown being empty
            await screen.findByTestId('error-summary')
            expect(
                screen.getAllByText('You must select a rate certification')
            ).toHaveLength(2)

            // check that focus travels to dropdown when clicking link from summary
            expect(
                screen.getByRole('link', {
                    name: 'You must select a rate certification',
                })
            ).toBeInTheDocument()

            await user.click(
                screen.getByRole('link', {
                    name: 'You must select a rate certification',
                })
            )

            expect(
                screen.getByRole('combobox', { name: /linked rate/ })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('combobox', { name: /linked rate/ })
            ).toHaveFocus()
        })

        it('when rate previously submitted question is answered with NO', async () => {
            const contractID = 'test-abc-123'
            const { user } = renderWithProviders(
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
                            fetchContractMockSuccess({
                                contract: {
                                    id: contractID,
                                    draftRates: [], //clear out rates
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${contractID}/edit/rate-details`,
                    },
                    featureFlags: {
                        'link-rates': true,
                        'rate-edit-unlock': false,
                    },
                }
            )

            await screen.findByText('Rate Details')

            // select no and trigger validations
            await user.click(
                screen.getByRole('radio', {
                    name: 'No, this rate certification was not included with any other submissions',
                })
            )
            await user.click(
                screen.getByRole('button', {
                    name: 'Continue',
                })
            )

            // check that general form errors appear both in summary and inline
            await screen.findByTestId('error-summary')
            expect(
                screen.getAllByText('You must upload a rate certification')
            ).toHaveLength(2)
            expect(
                screen.getAllByText(
                    'You must select which rate(s) are included in this certification'
                )
            ).toHaveLength(2)
            expect(
                screen.getAllByText('You must choose a rate certification type')
            ).toHaveLength(2)
            expect(
                screen.getAllByText(
                    "You must select whether you're certifying rates or rate ranges"
                )
            ).toHaveLength(2)
            expect(
                screen.getAllByText('You must select an actuarial firm')
            ).toHaveLength(2)
            // check that linked rates errors do not appear
            expect(
                screen.queryAllByText('You must select a rate certification')
            ).toHaveLength(0)
        })
    })

    describe('handles multiple actuary contacts', () => {
        it('should be able to add and remove additional actuary contacts', async () => {
            const rateID = 'test-abc-123'
            const { user } = renderWithProviders(
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

            //Making sure page loads
            await screen.findByText('Rate Details')
            expect(
                screen.getByText(
                    'Was this rate certification included with another submission?'
                )
            ).toBeInTheDocument()

            //Clicking no for the proper form flow
            const noRadioButton = screen.getByRole('radio', {
                name: 'No, this rate certification was not included with any other submissions',
            })
            expect(noRadioButton).toBeInTheDocument()
            await user.click(noRadioButton)
            expect(noRadioButton).toBeChecked()

            //Add actuary contact button should render
            const addActuaryContact = screen.getByRole('button', {
                name: 'Add a certifying actuary',
            })
            expect(addActuaryContact).toBeInTheDocument()

            await user.click(addActuaryContact)

            //Additional actuary contacts
            const contacts = screen.getAllByTestId('addtnl-actuary-contact')
            expect(contacts).toHaveLength(2)

            //Adding another addtional actuary contact
            await user.click(addActuaryContact)

            const contactsPostClick = screen.getAllByTestId(
                'addtnl-actuary-contact'
            )
            expect(contactsPostClick).toHaveLength(3)

            //Testing removal of actuary contact
            const removeButtons = screen.getAllByTestId('removeContactBtn')
            expect(removeButtons).toHaveLength(3)
            await user.click(removeButtons[0])

            const removeButtonsPostRemoval =
                screen.getAllByTestId('removeContactBtn')
            expect(removeButtonsPostRemoval).toHaveLength(2)
        })
    })
})
