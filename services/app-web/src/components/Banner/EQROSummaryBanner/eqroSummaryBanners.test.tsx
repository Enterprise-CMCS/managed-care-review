import { render, screen, within } from '@testing-library/react'
import { EqroReviewDeterminationBanners } from './eqroSummaryBanners'

describe('EqroSummaryBanners', () => {
    describe('Initial submission banner', () => {
        it('renders subject to review banner for state user', () => {
            render(
                <EqroReviewDeterminationBanners
                    subjectToReview={true}
                    stateUser={true}
                />
            )

            expect(screen.getByText('Subject to review')).toBeInTheDocument()
            expect(
                screen.getByText(
                    /this submission is subject to formal review and approval/
                )
            ).toBeInTheDocument()
            expect(screen.getByText('What comes next:')).toBeInTheDocument()
        })

        it('renders not subject to review banner for state user', () => {
            render(
                <EqroReviewDeterminationBanners
                    subjectToReview={false}
                    stateUser={true}
                />
            )

            expect(
                screen.getByText('Not subject to review')
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    /this submission is not subject to formal review and approval/
                )
            ).toBeInTheDocument()
            expect(
                screen.getByText(/all contracts with EQROs must/)
            ).toBeInTheDocument()
        })

        it('renders only the one-sentence summary for CMS user subject to review status', () => {
            render(
                <EqroReviewDeterminationBanners
                    subjectToReview={true}
                    stateUser={false}
                />
            )

            const banner = screen.getByTestId('eqroSummaryBanner')

            // CMS-specific sentence is present
            expect(
                within(banner).getByText(
                    /based on the state's responses, this submission is subject to formal review and approval/i
                )
            ).toBeInTheDocument()

            // Content for State user is absent
            expect(
                within(banner).queryByText('What comes next:')
            ).not.toBeInTheDocument()
            expect(
                within(banner).queryByText(/all contracts with EQROs must/i)
            ).not.toBeInTheDocument()

            // No list items for CMS user banner
            expect(banner.querySelectorAll('li')).toHaveLength(0)
        })

        it('renders only the one-sentence summary for CMS user NOT subject to review status', () => {
            render(
                <EqroReviewDeterminationBanners
                    subjectToReview={false}
                    stateUser={false}
                />
            )

            const banner = screen.getByTestId('eqroSummaryBanner')

            // CMS-specific sentence is present
            expect(
                within(banner).getByText(
                    /based on the state's responses, this submission is not subject to formal review and approval/i
                )
            ).toBeInTheDocument()

            // Content for State user is absent
            expect(
                within(banner).queryByText('What comes next:')
            ).not.toBeInTheDocument()
            expect(
                within(banner).queryByText(/all contracts with EQROs must/i)
            ).not.toBeInTheDocument()

            // No list items for CMS user banner
            expect(banner.querySelectorAll('li')).toHaveLength(0)
        })

        it('does not show State user step-by-step guidance to CMS user', () => {
            render(
                <EqroReviewDeterminationBanners
                    subjectToReview={true}
                    stateUser={false}
                />
            )

            const banner = screen.getByTestId('eqroSummaryBanner')

            // None of the detailed State user steps should appear for CMS user
            expect(
                within(banner).queryByText(/check for completeness/i)
            ).not.toBeInTheDocument()
            expect(
                within(banner).queryByText(/cms review/i)
            ).not.toBeInTheDocument()
            expect(
                within(banner).queryByText(
                    /you may receive questions via email/i
                )
            ).not.toBeInTheDocument()
            expect(
                within(banner).queryByText(/determination/i)
            ).not.toBeInTheDocument()
        })
    })

    describe('Resubmission banner', () => {
        const mockUpdateInfo = {
            __typename: 'UpdateInformation' as const,
            updatedAt: '2024-12-18T16:54:39.173Z',
            updatedBy: {
                email: 'example@state.com',
                role: 'STATE_USER' as const,
                givenName: 'John',
                familyName: 'Vila',
            },
            updatedReason: 'Updated EQRO contract documents',
        }

        it('renders Submission updated banner for state user (subject to review)', () => {
            render(
                <EqroReviewDeterminationBanners
                    subjectToReview={true}
                    stateUser={true}
                    updateInfo={mockUpdateInfo}
                />
            )

            const banner = screen.getByTestId('eqroSummaryBanner')
            expect(
                within(banner).getByText('Submission updated')
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/example@state.com/)
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/Subject to review/)
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/Updated EQRO contract documents/)
            ).toBeInTheDocument()
            // State users see "What comes next" guidance
            expect(
                within(banner).getByText(/What comes next/)
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/Check for completeness/)
            ).toBeInTheDocument()
            expect(within(banner).getByText(/CMS review/)).toBeInTheDocument()
            expect(
                within(banner).getByText(/Determination/)
            ).toBeInTheDocument()
        })

        it('renders Submission updated banner for state user (not subject to review)', () => {
            render(
                <EqroReviewDeterminationBanners
                    subjectToReview={false}
                    stateUser={true}
                    updateInfo={mockUpdateInfo}
                />
            )

            const banner = screen.getByTestId('eqroSummaryBanner')
            expect(
                within(banner).getByText('Submission updated')
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/example@state.com/)
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/Not subject to review/)
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/Updated EQRO contract documents/)
            ).toBeInTheDocument()
            // State users see EQRO reminder
            expect(
                within(banner).getByText(
                    /As a reminder, all contracts with EQROs must/
                )
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(
                    /Meet competence and independence requirements/
                )
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(
                    /Require the mandatory review activities/
                )
            ).toBeInTheDocument()
        })

        it('renders Submission updated banner for CMS user (subject to review) without additional text', () => {
            render(
                <EqroReviewDeterminationBanners
                    subjectToReview={true}
                    stateUser={false}
                    updateInfo={mockUpdateInfo}
                />
            )

            const banner = screen.getByTestId('eqroSummaryBanner')
            expect(
                within(banner).getByText('Submission updated')
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/example@state.com/)
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/Subject to review/)
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/Updated EQRO contract documents/)
            ).toBeInTheDocument()
            // CMS users should NOT see state user additional text
            expect(
                within(banner).queryByText(/What comes next/)
            ).not.toBeInTheDocument()
            expect(
                within(banner).queryByText(/Check for completeness/)
            ).not.toBeInTheDocument()
        })

        it('renders Submission updated banner for CMS user (not subject to review) without additional text', () => {
            render(
                <EqroReviewDeterminationBanners
                    subjectToReview={false}
                    stateUser={false}
                    updateInfo={mockUpdateInfo}
                />
            )

            const banner = screen.getByTestId('eqroSummaryBanner')
            expect(
                within(banner).getByText('Submission updated')
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/example@state.com/)
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/Not subject to review/)
            ).toBeInTheDocument()
            expect(
                within(banner).getByText(/Updated EQRO contract documents/)
            ).toBeInTheDocument()
            // CMS users should NOT see state user additional text
            expect(
                within(banner).queryByText(
                    /As a reminder, all contracts with EQROs must/
                )
            ).not.toBeInTheDocument()
            expect(
                within(banner).queryByText(
                    /Require the mandatory review activities/
                )
            ).not.toBeInTheDocument()
        })
    })
})
