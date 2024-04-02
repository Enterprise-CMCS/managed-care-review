import { screen, waitFor } from '@testing-library/react'
import {
    fetchContractMockSuccess,
    fetchCurrentUserMock,
    indexRatesMockSuccess,
    mockValidStateUser,
} from '../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { LinkYourRates } from './LinkYourRates'
import { Formik } from 'formik'
import { Routes, Route } from 'react-router-dom'
import { RoutesRecord } from '../../constants'
import { fetchDraftRateMockSuccess } from '../../testHelpers/apolloMocks/rateGQLMocks'
import { RateDetailsV2 } from '../StateSubmission/RateDetails/V2/RateDetailsV2'
import { rateRevisionDataMock } from '../../testHelpers/apolloMocks/rateDataMock'

describe('LinkYourRates', () => {
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

        // Checking the options menu is open
        const dropdownMenu = document.querySelector('.select__menu')
        expect(dropdownMenu).toBeInTheDocument()

        // Checking options are present
        const dropdownOptions = screen.getAllByRole('option')
        expect(dropdownOptions).toHaveLength(3)
    })

    it('removes the selected option from the dropdown menu', async () => {
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

        // Assert the dropdown has rendered
        await waitFor(() => {
            expect(
                screen.getByText('Which rate certification was it?')
            ).toBeInTheDocument()
            expect(screen.getByRole('combobox')).toBeInTheDocument()
        })

        // Checking that the selected value is removed from the list of options
        const dropdownOptions = screen.getAllByRole('option')
        expect(dropdownOptions).toHaveLength(3)
        await user.click(dropdownOptions[0])
        await waitFor(() => {
            expect(screen.getAllByRole('option')).toHaveLength(2)
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

        // Assert the dropdown has rendered
        await waitFor(() => {
            expect(
                screen.getByText('Which rate certification was it?')
            ).toBeInTheDocument()
            expect(screen.getByRole('combobox')).toBeInTheDocument()
        })

        // Checking that the selected value is removed from the list of options
        const dropdownOptions = screen.getAllByRole('option')
        await user.click(dropdownOptions[0])
        await waitFor(() => {
            expect(screen.getAllByRole('option')).toHaveLength(2)
        })

        // Checking that the unselected option is added back to the list
        const clearSelectionButton = document.querySelector(
            '.select__clear-indicator'
        )
        expect(clearSelectionButton).toBeInTheDocument()
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        await user.click(clearSelectionButton!)
        await waitFor(() => {
            expect(screen.getAllByRole('option')).toHaveLength(3)
        })
    })
})
