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
    mockValidStateUser,
    mockContractWithLinkedRateDraft,
} from '../../../../testHelpers/apolloMocks'
import { Route, Routes } from 'react-router-dom'
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
import { Formik } from 'formik'
import { LinkYourRates } from '../../../LinkYourRates/LinkYourRates'
import { Rate } from '../../../../gen/gqlClient'

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

        it('display rest of the form when linked rates question is answered', async () => {
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
        })
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
                    screen.getByText('You must select yes or no')
                ).toBeInTheDocument()
            })
        })
    })

    describe('can link existing rate', () => {
        it('renders without errors', async () => {
            renderWithProviders(
                <Formik
                    initialValues={{ ratePreviouslySubmitted: '' }}
                    onSubmit={(values) => console.info('submitted', values)}
                >
                    <form>
                        <LinkYourRates
                            fieldNamePrefix="rateForms.1"
                            index={1}
                            autofill={jest.fn()}
                        />
                    </form>
                </Formik>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                                user: mockValidStateUser(),
                            }),
                            indexRatesMockSuccess(),
                        ],
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.queryByText(
                        'Was this rate certification included with another submission?'
                    )
                ).toBeInTheDocument()
            })
        })

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

        it('displays dropdown menu if yes is selected', async () => {
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

            // Assert the options menu is open
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

            // Assert the options menu is open
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
})
