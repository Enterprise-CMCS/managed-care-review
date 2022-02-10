import { render, screen } from '@testing-library/react'
import { SubmissionUnlockedBanner } from "./SubmissionUnlockedBanner";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(advancedFormat)
dayjs.extend(timezone)

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
        expect(screen.getByText(dayjs(testDate).format('MM/DD/YYYY hh:mma z'))).toBeInTheDocument()
        expect(screen.getByText('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Curabitur.')).toBeInTheDocument()
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
        expect(screen.getByText(dayjs(testDate).format('MM/DD/YYYY hh:mma z'))).toBeInTheDocument()
        expect(screen.getByText('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Curabitur.')).toBeInTheDocument()
    })
})
