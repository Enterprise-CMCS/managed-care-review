import { render, screen, within } from '@testing-library/react'
import { EqroReviewDeterminationBanners } from './eqroSummaryBanners'

describe('EqroSummaryBanners', () => {
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

        expect(screen.getByText('Not subject to review')).toBeInTheDocument()
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
            within(banner).queryByText(/you may receive questions via email/i)
        ).not.toBeInTheDocument()
        expect(
            within(banner).queryByText(/determination/i)
        ).not.toBeInTheDocument()
    })
})
