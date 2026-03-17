import { render, screen } from '@testing-library/react'
import { EqroSummaryBanner } from './eqroSummaryBanner'

describe('EqroSummaryBanner', () => {
    it('renders subject to review banner for state user', () => {
        render(<EqroSummaryBanner subjectToReview={true} stateUser={true} />)

        expect(screen.getByText('Subject to review')).toBeInTheDocument()
        expect(
            screen.getByText(
                /this submission is subject to formal review and approval/
            )
        ).toBeInTheDocument()
        expect(screen.getByText('What comes next:')).toBeInTheDocument()
    })

    it('renders not subject to review banner for state user', () => {
        render(<EqroSummaryBanner subjectToReview={false} stateUser={true} />)

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

    it('renders subject to review banner for CMS user', () => {
        render(<EqroSummaryBanner subjectToReview={true} stateUser={false} />)

        expect(screen.getByText('Subject to review')).toBeInTheDocument()
        expect(
            screen.getByText(
                /this submission is subject to formal review and approval/
            )
        ).toBeInTheDocument()
        expect(screen.queryByText('What comes next:')).not.toBeInTheDocument()
        expect(
            screen.queryByText(/all contracts with EQROs must/)
        ).not.toBeInTheDocument()
    })

    it('renders not subject to review banner for CMS user', () => {
        render(<EqroSummaryBanner subjectToReview={false} stateUser={false} />)

        expect(screen.getByText('Not subject to review')).toBeInTheDocument()
        expect(
            screen.getByText(
                /this submission is not subject to formal review and approval/
            )
        ).toBeInTheDocument()
        expect(screen.queryByText('What comes next:')).not.toBeInTheDocument()
        expect(
            screen.queryByText(/all contracts with EQROs must/)
        ).not.toBeInTheDocument()
    })
})
