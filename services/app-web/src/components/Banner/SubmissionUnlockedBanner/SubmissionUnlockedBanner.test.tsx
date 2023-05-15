import { render, screen } from '@testing-library/react'
import { SubmissionUnlockedBanner } from './SubmissionUnlockedBanner'
import { dayjs } from '@managed-care-review/common-code/dateHelpers'

describe('SubmissionUnlockBanner', () => {
    it('renders without errors and correct background color for CMS User', () => {
        const testDate = new Date()
        render(
            <SubmissionUnlockedBanner
                userType="CMS_USER"
                unlockedBy="Loremipsum@email.com"
                unlockedOn={testDate}
                reason="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Curabitur."
            />
        )
        expect(screen.getByRole('alert')).toHaveClass('usa-alert--warning')
        expect(screen.getByText('Loremipsum@email.com')).toBeInTheDocument()
        expect(
            screen.getByText(
                `${dayjs
                    .utc(testDate)
                    .tz('America/New_York')
                    .format('MM/DD/YY h:mma')} ET`
            )
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Curabitur.'
            )
        ).toBeInTheDocument()
    })

    it('renders without errors and correct background color for State user', () => {
        const testDate = new Date()
        render(
            <SubmissionUnlockedBanner
                userType="STATE_USER"
                unlockedBy="Loremipsum@email.com"
                unlockedOn={testDate}
                reason="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Curabitur."
            />
        )
        expect(screen.getByRole('alert')).toHaveClass('usa-alert--info')
        expect(screen.getByText('Loremipsum@email.com')).toBeInTheDocument()
        expect(
            screen.getByText(
                `${dayjs
                    .utc(testDate)
                    .tz('America/New_York')
                    .format('MM/DD/YY h:mma')} ET`
            )
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Curabitur.'
            )
        ).toBeInTheDocument()
    })
})
