import { Button } from '@trussworks/react-uswds'
import { GovBanner } from './GovBanner'
import './Header.scss'
import medicaidLogo from '../../assets/images/headerlogo-medicaid.png'
import { ReactComponent as VaIcon } from '../../assets/icons/va-icon.svg'
import { ReactComponent as MnIcon } from '../../assets/icons/mn-icon.svg'

const getStateInfo = (
    stateAbbrev: SupportedStateCodes
): { stateName: string; StateIcon: React.FunctionComponent } => {
    switch (stateAbbrev) {
        case 'MN':
            return { stateName: 'Minnesota', StateIcon: MnIcon }
        case 'VA':
            return { stateName: 'Virginia', StateIcon: VaIcon }
        default:
            return {
                stateName: 'STATE UNKNOWN',
                StateIcon: () => <span></span>,
            }
    }
}

const StateCodes = {
    MN: 'MN',
    VA: 'VA',
} as const
type SupportedStateCodes = typeof StateCodes[keyof typeof StateCodes]
export type HeaderProps = {
    stateCode: SupportedStateCodes
    activePage?: string
    loggedIn: boolean
    user: {
        name: string
        email: string
    }
}

/**
 * CMS Header
 */
export const Header = ({
    stateCode,
    activePage = 'Managed Care Dashboard',
    loggedIn,
    user,
}: HeaderProps): React.ReactElement => {
    const { stateName, StateIcon } = getStateInfo(stateCode)

    return (
        <header className="usa-header">
            {/* <USWDSGovBanner /> */}
            <GovBanner />
            <div className="banner-row">
                <div className="usa-logo">
                    <img
                        src={medicaidLogo}
                        alt="Medicaid.gov-Keeping America Healthy"
                    />
                </div>
                {loggedIn ? (
                    <div className="user-info">
                        <span>{user.email}</span>
                        <span className="divider">|</span>

                        <Button
                            type="button"
                            unstyled
                            onClick={() => console.log('Sign out')}
                        >
                            Sign out
                        </Button>
                    </div>
                ) : (
                    <Button
                        type="button"
                        outline
                        onClick={() => console.log('Sign In')}
                    >
                        Sign In
                    </Button>
                )}
            </div>
            <div className="heading-row">
                <div>
                    <StateIcon />
                </div>
                <h1 className="margin-0">
                    <span>{stateName}</span>
                    <span className="font-heading-lg text-light">
                        {activePage}
                    </span>
                </h1>
            </div>
        </header>
    )
}
