import { render, screen } from '@testing-library/react'
import { SubmissionUnlockedBanner } from './SubmissionUnlockedBanner'
import { UpdateInformation } from '../../../gen/gqlClient'
import { mockValidCMSUser, mockValidStateUser } from '@mc-review/mocks'

describe('SubmissionUnlockBanner', () => {
    const mockUnlockInfo = (
        unlockInfo?: Partial<UpdateInformation>
    ): UpdateInformation => ({
        updatedAt: new Date('2024-10-08'),
        updatedBy: {
            email: 'Loremipsum@email.com',
            role: 'CMS_USER',
            givenName: 'Bob',
            familyName: 'Vila',
        },
        updatedReason:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Curabitur.',
        ...unlockInfo,
    })

    it('renders without errors and correct background color for CMS User', () => {
        const unlockInfo = mockUnlockInfo()
        render(
            <SubmissionUnlockedBanner
                loggedInUser={mockValidCMSUser()}
                unlockedInfo={unlockInfo}
            />
        )
        expect(screen.getByRole('status')).toHaveClass('usa-alert--warning')
        expect(screen.getByText('Loremipsum@email.com')).toBeInTheDocument()
        // API returns UTC timezone, we display timestamped dates in PT timezone so 1 day before on these tests.
        expect(screen.getByText('10/07/2024 5:00pm PT')).toBeInTheDocument()
        expect(
            screen.getByText(
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Curabitur.'
            )
        ).toBeInTheDocument()
    })

    it('renders without errors and correct background color for State user', () => {
        const unlockInfo = mockUnlockInfo()
        render(
            <SubmissionUnlockedBanner
                loggedInUser={mockValidStateUser()}
                unlockedInfo={unlockInfo}
            />
        )
        expect(screen.getByRole('status')).toHaveClass('usa-alert--info')
        expect(screen.getByText('Loremipsum@email.com')).toBeInTheDocument()
        // API returns UTC timezone, we display timestamped dates in PT timezone so 1 day before on these tests.
        expect(screen.getByText('10/07/2024 5:00pm PT')).toBeInTheDocument()
        expect(
            screen.getByText(
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Curabitur.'
            )
        ).toBeInTheDocument()
    })

    it('renders Administrator for unlocked by when ADMIN_USER unlocked submission', () => {
        const unlockInfo = mockUnlockInfo({
            updatedBy: {
                email: 'Loremipsum@email.com',
                role: 'ADMIN_USER',
                givenName: 'Bob',
                familyName: 'Vila',
            },
        })

        render(
            <SubmissionUnlockedBanner
                loggedInUser={mockValidStateUser()}
                unlockedInfo={unlockInfo}
            />
        )
        expect(screen.getByRole('status')).toHaveClass('usa-alert--info')
        expect(screen.getByText('Administrator')).toBeInTheDocument()
    })
})
