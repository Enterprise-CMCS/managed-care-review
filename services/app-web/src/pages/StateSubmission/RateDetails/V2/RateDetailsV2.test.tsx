import { screen, waitFor } from '@testing-library/react'
import { RateDetailsV2 } from './RateDetailsV2'
import { renderWithProviders } from '../../../../testHelpers'
import {
    fetchCurrentUserMock,
    fetchRateMockSuccess,
} from '../../../../testHelpers/apolloMocks'
import { Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '../../../../constants'

describe('RateDetails', () => {
    describe('handles editing a single rate', () => {
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
        })

        it.todo('displays correct form guidance')
        it.todo('loads with empty rate type and document upload fields visible')
        it.todo('cannot continue without selecting rate type')

        it.todo('cannot continue without selecting rate capitation type')

        it.todo('cannot continue if no documents are added')
        it.todo('progressively disclose new rate form fields as expected')
        it.todo('displays program options based on current user state')

        describe('handles documents and file upload', () => {
            it.todo('renders file upload')
            it.todo('accepts documents on new rate')
            it.todo('accepts a single file for rate cert')

            it.todo(
                'accepts multiple pdf, word, excel documents for supporting documents'
            )
            it.todo('handles multiple rates')
            it.todo(
                'renders add another rate button, which adds another set of rate certification fields to the form'
            )
            it.todo(
                'renders remove rate certification button, which removes set of rate certification fields from the form'
            )
            it.todo('accepts documents on second rate')
            it.todo(
                'cannot continue without selecting rate type for a second rate'
            )
            it.todo(
                'cannot continue if no documents are added to the second rate'
            )
        })

        describe('handles rates across submissions', () => {
            it.todo(
                'correctly checks shared rate certification radios and selects shared package'
            )
            it.todo('cannot continue when shared rate radio is unchecked')
            it.todo(
                'cannot continue when shared rate radio is checked and no package is selected'
            )
        })

        describe('Continue button', () => {
            it.todo('enabled when valid files are present')

            it.todo(
                'enabled when invalid files have been dropped but valid files are present'
            )

            it.todo(
                'disabled with alert after first attempt to continue with zero files'
            )
            it.todo(
                'disabled with alert if previously submitted with more than one rate cert file'
            )

            it.todo(
                'disabled with alert after first attempt to continue with invalid duplicate files'
            )

            it.todo(
                'disabled with alert after first attempt to continue with invalid files'
            )
            // eslint-disable-next-line jest/no-disabled-tests
            it.todo(
                'disabled with alert when trying to continue while a file is still uploading'
            )
        })

        describe('Save as draft button', () => {
            it.todo('enabled when valid files are present')

            it.todo(
                'enabled when invalid files have been dropped but valid files are present'
            )
            it.todo(
                'when zero files present, does not trigger missing documents alert on click but still saves the in progress draft'
            )
            it.todo(
                'when existing file is removed, does not trigger missing documents alert on click but still saves the in progress draft'
            )
            it.todo(
                'when duplicate files present, triggers error alert on click'
            )
        })

        describe('Back button', () => {
            it.todo('enabled when valid files are present')

            it.todo(
                'enabled when invalid files have been dropped but valid files are present'
            )

            it.todo(
                'when zero files present, does not trigger missing documents alert on click'
            )

            it.todo(
                'when duplicate files present, does not trigger duplicate documents alert on click and silently updates rate and supporting documents lists without duplicates'
            )
        })
    })
})
