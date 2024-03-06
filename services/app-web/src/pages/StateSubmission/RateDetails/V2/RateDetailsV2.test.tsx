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
    fetchRateMockSuccess,
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
} from '../../../../testHelpers/jestRateHelpers'

describe('RateDetails', () => {
    describe('handles edit  of a single rate', () => {
        it('renders without errors', async () => {
            const mockSubmit = jest.fn()
            const rateID = 'test-abc-123'
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.RATE_EDIT}
                        element={
                            <RateDetailsV2
                                type="SINGLE"
                                submitRate={mockSubmit}
                            />
                        }
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchRateMockSuccess({ id: rateID }),
                        ],
                    },
                    routerProvider: {
                        route: `/rates/${rateID}/edit`,
                    },
                }
            )
            await waitFor(() => {
                expect(
                    screen.getByText('Rate certification type')
                ).toBeInTheDocument()
            })
            expect(
                screen.getByText('Upload one rate certification document')
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: 'Submit' })
            ).not.toHaveAttribute('aria-disabled')
            const requiredLabels = await screen.findAllByText('Required')
            expect(requiredLabels).toHaveLength(6)
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
                            element={
                                <RateDetailsV2
                                    type="SINGLE"
                                    submitRate={jest.fn()}
                                />
                            }
                        />
                    </Routes>,
                    {
                        apolloProvider: {
                            mocks: [
                                fetchCurrentUserMock({ statusCode: 200 }),
                                fetchRateMockSuccess({ id: rateID }),
                            ],
                        },
                        routerProvider: {
                            route: `/rates/${rateID}/edit`,
                        },
                    }
                )

                await screen.findByText('Rate certification type')

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
                            element={
                                <RateDetailsV2
                                    type="SINGLE"
                                    submitRate={jest.fn()}
                                />
                            }
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

                await screen.findByText('Rate certification type')
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
        it.todo('handles multiple rates')
        //eslint-disable-next-line
        it.skip('add rate button will increase number of rate certification fields on the', async () => {
            const rateID = '123-dfg'
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
                            // fetchContractMockSuccess({ id: rateID }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${rateID}/edit`,
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
        //eslint-disable-next-line
        it.skip('disabled with alert after first attempt to continue with invalid duplicate files', async () => {
            const rateID = '123-dfg'
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
                            // fetchContractMockSuccess({ id: rateID }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${rateID}/edit`,
                    },
                }
            )
            await screen.findByText('Rate certification type')
            const input = screen.getByLabelText(
                'Upload one rate certification document'
            )
            const submitButton = screen.getByRole('button', {
                name: 'Submit',
            })

            await userEvent.upload(input, TEST_DOC_FILE)
            await userEvent.upload(input, [])
            await userEvent.upload(input, TEST_DOC_FILE)
            expect(submitButton).not.toHaveAttribute('aria-disabled')

            submitButton.click()

            await screen.findAllByText(
                'You must remove all documents with error messages before continuing'
            )
            expect(submitButton).toHaveAttribute('aria-disabled', 'true')
        })

        it.todo(
            'renders remove rate certification button, which removes set of rate certification fields from the form'
        )
        it.todo('accepts documents on second rate')
        it.todo('cannot continue with partially filled out second rate')
    })
})
